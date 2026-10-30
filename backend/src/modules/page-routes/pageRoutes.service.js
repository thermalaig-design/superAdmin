import { supabase } from '../../config/supabase.js';

const COLUMNS = 'id, route, platform, module, name, help_link';

const unwrap = ({ data, error }) => {
    if (error) throw error;
    return data;
};

/** Every page route, grouped by platform then module. */
export async function getPageRoutes() {
    const rows = [];
    for (let from = 0; ; from += 1000) {
        const page = unwrap(
            await supabase.from('page_routes').select(COLUMNS).order('platform').order('module').order('name').order('id').range(from, from + 999)
        );
        rows.push(...page);
        if (page.length < 1000) break;
    }
    return rows;
}

/** Updates the editable columns (module, name, help_link) of one route. Returns null when the route does not exist. */
export async function updatePageRoute(id, changes) {
    return unwrap(
        await supabase.from('page_routes').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select(COLUMNS).maybeSingle()
    );
}
