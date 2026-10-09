import { timingSafeEqual } from "node:crypto";
import { supabase } from "../../config/supabase.js";

async function findMemberIdByPhone(phoneNo) {
    const { data, error } = await supabase
        .from('Members')
        .select('members_id')
        .eq('Mobile', phoneNo)
        .maybeSingle();

    if (error) throw error;

    return data?.members_id ?? null;
}

async function findSuperAdminByMemberId(memberId) {
    const { data, error } = await supabase
        .from('superAdmin')
        .select('id,secretcode')
        .eq('members_id', memberId)
        .maybeSingle();

    if (error) throw error;

    return data;
}

function secretCodeMatches(stored, provided) {
    const a = Buffer.from(String(stored ?? ''));
    const b = Buffer.from(String(provided ?? ''));
    return a.length === b.length && timingSafeEqual(a, b);
}

// Resolves to { ok: true, memberId, superAdminId } or { ok: false, reason }.
async function verifyAdmin(phoneNo, secretCode) {
    const memberId = await findMemberIdByPhone(phoneNo);
    if (!memberId) return { ok: false, reason: 'MEMBER_NOT_FOUND' };

    const superAdmin = await findSuperAdminByMemberId(memberId);
    if (!superAdmin) return { ok: false, reason: 'NOT_SUPER_ADMIN' };

    if (!secretCodeMatches(superAdmin.secretcode, secretCode)) {
        return { ok: false, reason: 'INVALID_SECRET_CODE' };
    }

    return { ok: true, memberId, superAdminId: superAdmin.id };
}

export { findMemberIdByPhone, findSuperAdminByMemberId, verifyAdmin };
