import { supabase } from '../../config/supabase.js';

// Fields the popups can edit. Payment setup (razorpay_id, vendor_share, tei_share) and the QR file size are left alone.
const BANK_FIELDS = [
    'name', 'mobile', 'email_id', 'beneficiary_name', 'account_no', 'bank_name',
    'branch', 'ifsc_code', 'swift_code', 'upi_id', 'qr',
];
const COMPANY_FIELDS = [
    'legal_name', 'gst_number', 'pan_number', 'website', 'email_id', 'mobile',
    'keyword', 'expected_members', 'remark',
];

const pick = (body, fields) =>
    Object.fromEntries(
        fields
            .filter((field) => body?.[field] !== undefined)
            .map((field) => {
                const value = typeof body[field] === 'string' ? body[field].trim() : body[field];
                return [field, value === '' ? null : value];
            })
    );

const check = ({ error }) => {
    if (error) throw error;
};

// ---- Bank details: trust_bank_details, one row per trust ----

export async function getBankDetails(trustId) {
    const { data, error } = await supabase
        .from('trust_bank_details')
        .select(['id', 'trust_id', 'created_at', 'updated_at', ...BANK_FIELDS].join(', '))
        .eq('trust_id', trustId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data;
}

/** Creates the trust's bank details, or updates them when they exist already. */
export async function saveBankDetails(trustId, body) {
    const values = pick(body, BANK_FIELDS);
    const existing = await getBankDetails(trustId);

    if (existing) {
        if (values.name === null || values.mobile === null) {
            throw Object.assign(new Error('Contact Name and Mobile are required'), { status: 400 });
        }
        check(await supabase.from('trust_bank_details').update({ ...values, updated_at: new Date().toISOString() }).eq('id', existing.id));
    } else {
        // The table requires a contact name and mobile on every row.
        if (!values.name || !values.mobile) {
            throw Object.assign(new Error('Contact Name and Mobile are required'), { status: 400 });
        }
        check(await supabase.from('trust_bank_details').insert({ ...values, trust_id: trustId }));
    }
    return getBankDetails(trustId);
}

export async function deleteBankDetails(trustId) {
    check(await supabase.from('trust_bank_details').delete().eq('trust_id', trustId));
}

// ---- Company details: columns on the Trust row itself ----

export async function getCompanyDetails(trustId) {
    const { data, error } = await supabase
        .from('Trust')
        .select(['id', 'name', ...COMPANY_FIELDS].join(', '))
        .eq('id', trustId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function saveCompanyDetails(trustId, body) {
    const values = pick(body, COMPANY_FIELDS);
    if (values.expected_members != null) {
        values.expected_members = Number(values.expected_members);
        if (!Number.isFinite(values.expected_members)) throw Object.assign(new Error('Expected members must be a number'), { status: 400 });
    }
    check(await supabase.from('Trust').update(values).eq('id', trustId));
    return getCompanyDetails(trustId);
}

/** The trust itself stays: "delete" empties its company fields (the name and app type are kept). */
export async function clearCompanyDetails(trustId) {
    const cleared = Object.fromEntries(COMPANY_FIELDS.filter((f) => f !== 'keyword').map((f) => [f, null]));
    check(await supabase.from('Trust').update(cleared).eq('id', trustId));
    return getCompanyDetails(trustId);
}
