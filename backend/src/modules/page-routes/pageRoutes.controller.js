import { getPageRoutes, updatePageRoute } from './pageRoutes.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LENGTH = 500;

const isHttpUrl = (value) => {
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
        return false;
    }
};

/**
 * Reads the fields a request wants to change. Only module, name and helpLink are editable (route and platform are read only).
 * An empty helpLink removes the link. Returns { error } for invalid input.
 */
function readChanges(body) {
    const changes = {};

    for (const [field, column, label] of [['module', 'module', 'Module'], ['name', 'name', 'Page name']]) {
        if (body?.[field] === undefined) continue;
        const value = typeof body[field] === 'string' ? body[field].trim() : '';
        if (!value) return { error: `${label} cannot be empty` };
        if (value.length > MAX_LENGTH) return { error: `${label} is too long` };
        changes[column] = value;
    }

    if (body?.helpLink !== undefined) {
        const value = typeof body.helpLink === 'string' ? body.helpLink.trim() : '';
        if (value && !isHttpUrl(value)) return { error: 'Help link must be a valid http(s) link' };
        if (value.length > 2000) return { error: 'Help link is too long' };
        changes.help_link = value || null;
    }

    if (Object.keys(changes).length === 0) return { error: 'Nothing to update' };
    return { changes };
}

/** The page routes, for the Page Directory table. */
export async function fetchPageRoutes(_req, res) {
    try {
        return res.json({ success: true, data: await getPageRoutes() });
    } catch (error) {
        console.error('fetchPageRoutes failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load page routes' });
    }
}

/** Edits one route: { module?, name?, helpLink? }. */
export async function editPageRoute(req, res) {
    try {
        const { id } = req.params;
        if (!UUID.test(id)) return res.status(400).json({ success: false, message: 'Invalid page route' });
        const { changes, error } = readChanges(req.body);
        if (error) return res.status(400).json({ success: false, message: error });

        const data = await updatePageRoute(id, changes);
        if (!data) return res.status(404).json({ success: false, message: 'Page route not found' });
        return res.json({ success: true, data });
    } catch (error) {
        console.error('editPageRoute failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to update page route' });
    }
}
