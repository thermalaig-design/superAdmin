import { createAppTemplate, deleteAppTemplate, getAppTemplates, getTrustOptions, updateAppTemplate } from './appTemplates.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** Reads the form fields; returns { error } when a mandatory one is missing. Purpose is optional. */
function readForm(body) {
    const name = text(body?.name);
    const purpose = text(body?.purpose);
    const trustId = text(body?.trustId);
    if (!name) return { error: 'Display name is required' };
    if (!UUID.test(trustId)) return { error: 'Please choose a trust' };
    return { name, purpose, trustId };
}

/** The trusts offered in the form's Trust dropdown. */
export async function fetchTrustOptions(_req, res) {
    try {
        return res.json({ success: true, data: await getTrustOptions() });
    } catch (error) {
        console.error('fetchTrustOptions failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load trusts' });
    }
}

/** The templates saved so far. */
export async function fetchAppTemplates(_req, res) {
    try {
        return res.json({ success: true, data: await getAppTemplates() });
    } catch (error) {
        console.error('fetchAppTemplates failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to load app templates' });
    }
}

/** Saves a template from the form: { name, trustId, purpose }. */
export async function addAppTemplate(req, res) {
    try {
        const form = readForm(req.body);
        if (form.error) return res.status(400).json({ success: false, message: form.error });

        const data = await createAppTemplate(form);
        if (!data) return res.status(400).json({ success: false, message: 'Trust not found' });
        return res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('addAppTemplate failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to save app template' });
    }
}

/** Updates a saved template with the edited form. */
export async function editAppTemplate(req, res) {
    try {
        const { id } = req.params;
        if (!UUID.test(id)) return res.status(400).json({ success: false, message: 'Invalid template' });
        const form = readForm(req.body);
        if (form.error) return res.status(400).json({ success: false, message: form.error });

        const data = await updateAppTemplate(id, form);
        if (!data) return res.status(404).json({ success: false, message: 'Template or trust not found' });
        return res.json({ success: true, data });
    } catch (error) {
        console.error('editAppTemplate failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to update app template' });
    }
}

/** Removes a saved template. */
export async function removeAppTemplate(req, res) {
    try {
        const { id } = req.params;
        if (!UUID.test(id)) return res.status(400).json({ success: false, message: 'Invalid template' });
        if (!(await deleteAppTemplate(id))) return res.status(404).json({ success: false, message: 'Template not found' });
        return res.json({ success: true, data: { id } });
    } catch (error) {
        console.error('removeAppTemplate failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete app template' });
    }
}
