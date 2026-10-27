import { supabase } from '../../config/supabase.js';

const COLUMNS = 'id, name, trust_id, trust_name, purpose';

const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
};

/** Every trust (id + name) for the Trust dropdown, A to Z. */
export async function getTrustOptions() {
    const rows = [];
    for (let from = 0; ; from += 1000) {
        const page = unwrap(await supabase.from('Trust').select('id, name').order('name', { ascending: true }).range(from, from + 999));
        rows.push(...page);
        if (page.length < 1000) break;
    }
    return rows.filter((trust) => trust.name).map((trust) => ({ id: trust.id, name: trust.name }));
}

/** The saved app templates (sample_app rows). */
export async function getAppTemplates() {
    return unwrap(await supabase.from('sample_app').select(COLUMNS).order('name', { ascending: true }).limit(1000));
}

/** Saves one template; the trust name is stored next to its id. Returns null when the trust does not exist. */
export async function createAppTemplate({ name, trustId, purpose }) {
    const trust = unwrap(await supabase.from('Trust').select('id, name').eq('id', trustId).maybeSingle());
    if (!trust) return null;
    return unwrap(await supabase.from('sample_app').insert({ name, trust_id: trust.id, trust_name: trust.name, purpose: purpose || null }).select(COLUMNS).single());
}

/** Updates one template. Returns null when the trust or the template does not exist. */
export async function updateAppTemplate(id, { name, trustId, purpose }) {
    const trust = unwrap(await supabase.from('Trust').select('id, name').eq('id', trustId).maybeSingle());
    if (!trust) return null;
    return unwrap(await supabase.from('sample_app').update({ name, trust_id: trust.id, trust_name: trust.name, purpose: purpose || null }).eq('id', id).select(COLUMNS).maybeSingle());
}

/** Deletes one template; false when it was not there. */
export async function deleteAppTemplate(id) {
    const rows = unwrap(await supabase.from('sample_app').delete().eq('id', id).select('id'));
    return rows.length > 0;
}
