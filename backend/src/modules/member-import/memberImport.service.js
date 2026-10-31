import { supabase } from '../../config/supabase.js';

const CHUNK = 150;
const INSERT_CHUNK = 200;

const httpError = (status, message) => Object.assign(new Error(message), { status });

const chunks = (list, size) => {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
};

const check = ({ data, error }) => {
    if (error) throw error;
    return data;
};

/** A 10 digit Indian mobile number (starting 6-9) from "+91 98765-43210", "098765 43210" ...; null if it is not one. */
export function normalizePhone(raw) {
    if (!raw) return null;
    let phone = String(raw).trim().replace(/[\s\-().]/g, '').replace(/^\+/, '');
    if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
    if (phone.length === 11 && phone.startsWith('0')) phone = phone.slice(1);
    return /^[6-9]\d{9}$/.test(phone) ? phone : null;
}

const nameKey = (name, phone) => `${String(name).trim().toLowerCase()}||${phone}`;

/** Keeps the rows that can be imported (name and a valid mobile), with the mobile cleaned up. */
function usableRows(rows) {
    if (!Array.isArray(rows)) throw httpError(400, 'rows must be a list');
    return rows
        .map((row) => ({ ...row, name: String(row.name ?? '').trim(), phone: normalizePhone(row.phone ?? row.rawPhone) }))
        .filter((row) => row.name && row.phone && Number.isInteger(row.rowNumber));
}

async function loadTrust(trustId) {
    const trust = check(await supabase.from('Trust').select('id, name').eq('id', trustId).maybeSingle());
    if (!trust) throw httpError(404, 'Trust not found');
    return trust;
}

export async function listTrusts() {
    return check(await supabase.from('Trust').select('id, name').order('name'));
}

/**
 * Decides, for every row, what an import would do. Buckets:
 *  new      - nobody with this mobile exists yet: a new member is created
 *  link     - same name and mobile already exist as a member: no new member is made. In this trust they are added to
 *             (inTrust false) or updated (inTrust true)
 *  review   - this mobile exists under a different name: the user decides
 *  ambiguous- this mobile exists under several members: the user picks one
 * Only the members whose mobile appears in the file are loaded.
 */
async function classify(trustId, rows) {
    const phones = [...new Set(rows.map((row) => row.phone))];
    const members = [];
    for (const group of chunks(phones, CHUNK)) {
        // Older records may be saved with the 91 country code, so both spellings are asked for.
        const numbers = group.flatMap((phone) => [Number(phone), Number(`91${phone}`)]);
        members.push(...check(await supabase.from('Members').select('members_id, Name, Mobile').in('Mobile', numbers)));
    }

    const byPhone = new Map();
    for (const member of members) {
        const phone = normalizePhone(member.Mobile);
        if (!phone) continue;
        if (!byPhone.has(phone)) byPhone.set(phone, []);
        byPhone.get(phone).push({ membersId: member.members_id, name: member.Name ?? '' });
    }

    const registered = new Set();
    for (const group of chunks(members.map((m) => m.members_id), CHUNK)) {
        const found = check(await supabase.from('reg_members').select('members_id').eq('trust_id', trustId).in('members_id', group));
        found.forEach((r) => registered.add(r.members_id));
    }

    const results = rows.map((row) => {
        const matches = byPhone.get(row.phone) ?? [];
        const same = matches.find((m) => nameKey(m.name, row.phone) === nameKey(row.name, row.phone));
        if (same) {
            return { row, bucket: 'link', existing: same, inTrust: registered.has(same.membersId) };
        }
        if (matches.length > 1) return { row, bucket: 'ambiguous', matches };
        if (matches.length === 1) return { row, bucket: 'review', existing: matches[0] };
        return { row, bucket: 'new' };
    });
    return { results, registered };
}

export async function analyzeRows(trustId, rawRows) {
    await loadTrust(trustId);
    const { results } = await classify(trustId, usableRows(rawRows));
    return results.map(({ row, bucket, existing, matches, inTrust }) => ({ rowNumber: row.rowNumber, bucket, existing, matches, inTrust }));
}

const memberPayload = (row, trustId) => ({
    Name: row.name,
    Mobile: Number(row.phone),
    Email: row.email || null,
    'Address Home': row.addressHome || null,
    'Company Name': row.companyName || null,
    'Address Office': row.addressOffice || null,
    'Resident Landline': row.residentLandline || null,
    'Office Landline': row.officeLandline || null,
    company_description: row.remarks || null,
    trust_id: String(trustId),
    contact: row.contact || null,
});

/**
 * Imports the rows into the trust. The rows are classified again here (never trusting the browser), so running
 * this a second time after a failure does not create anyone twice: people created the first time now simply match.
 * `decisions` = { [rowNumber]: { type: 'link' | 'create' | 'update_name', membersId? } } for review / ambiguous rows.
 */
export async function importRows(trustId, rawRows, decisions = {}) {
    await loadTrust(trustId);
    const { results, registered } = await classify(trustId, usableRows(rawRows));

    const memberOf = new Map(); // rowNumber -> members_id
    const toCreate = []; // rows that need a new Members record
    const unresolved = [];

    for (const { row, bucket, existing, matches } of results) {
        const decision = decisions[row.rowNumber];
        if (bucket === 'new') toCreate.push(row);
        else if (bucket === 'link') memberOf.set(row.rowNumber, existing.membersId);
        else if (!decision) unresolved.push(row.rowNumber);
        else if (decision.type === 'create') toCreate.push(row);
        else if (bucket === 'review') {
            memberOf.set(row.rowNumber, existing.membersId);
            if (decision.type === 'update_name') {
                check(await supabase.from('Members').update({ Name: row.name }).eq('members_id', existing.membersId));
            }
        } else if (matches.some((m) => m.membersId === decision.membersId)) {
            memberOf.set(row.rowNumber, decision.membersId);
        } else {
            unresolved.push(row.rowNumber);
        }
    }
    if (unresolved.length) throw httpError(400, `${unresolved.length} conflicts are still not resolved`);

    // New people: one Members record per distinct name + mobile.
    const created = new Map(); // nameKey -> members_id
    const distinct = toCreate.filter((row, i) => toCreate.findIndex((r) => nameKey(r.name, r.phone) === nameKey(row.name, row.phone)) === i);
    for (const group of chunks(distinct, INSERT_CHUNK)) {
        const inserted = check(
            await supabase.from('Members').insert(group.map((row) => memberPayload(row, trustId))).select('members_id, Name, Mobile')
        );
        inserted.forEach((m) => created.set(nameKey(m.Name, String(m.Mobile)), m.members_id));
    }
    toCreate.forEach((row) => memberOf.set(row.rowNumber, created.get(nameKey(row.name, row.phone))));

    // Add everyone to the trust: people not in it yet get a new reg_members record; people already in it
    // keep theirs and only get the file's name, mobile, role and membership number.
    const joinedDate = new Date().toISOString().split('T')[0];
    const people = results
        .filter(({ row }) => memberOf.get(row.rowNumber))
        .map(({ row }) => {
            const membersId = memberOf.get(row.rowNumber);
            return {
                row,
                inTrust: registered.has(membersId),
                payload: {
                    trust_id: trustId,
                    members_id: membersId,
                    Name: row.name,
                    Mobile: Number(row.phone),
                    role: row.role || null,
                    'Membership number': row.membershipNumber || null,
                },
            };
        });

    let added = 0;
    let updated = 0;
    const failedLinks = [];
    const save = async (list, extra, countInto) => {
        for (const group of chunks(list, INSERT_CHUNK)) {
            const { data, error } = await supabase
                .from('reg_members')
                .upsert(group.map((p) => ({ ...p.payload, ...extra })), { onConflict: 'trust_id,members_id' })
                .select('id');
            if (error) {
                group.forEach(({ row }) => failedLinks.push({ rowNumber: row.rowNumber, name: row.name, mobile: row.phone, reason: error.message }));
            } else {
                countInto(data.length);
            }
        }
    };
    await save(people.filter((p) => !p.inTrust), { joined_date: joinedDate, is_active: true }, (n) => (added += n));
    await save(people.filter((p) => p.inTrust), {}, (n) => (updated += n));

    return {
        created: created.size,
        added,
        updated,
        failedLinks,
    };
}
