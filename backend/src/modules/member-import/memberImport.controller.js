import { analyzeRows, importRows, listTrusts } from './memberImport.service.js';

const handler = (label, work) => async (req, res) => {
    try {
        const data = await work(req);
        return res.json({ success: true, data });
    } catch (error) {
        console.error(`${label} failed:`, error);
        return res.status(error.status ?? 500).json({
            success: false,
            message: error.status ? error.message : `Failed: ${label}${error.message ? ` (${error.message})` : ''}`,
        });
    }
};

const trustIdOf = (req) => {
    const { trustId } = req.body ?? {};
    if (!trustId) throw Object.assign(new Error('Choose a trust first'), { status: 400 });
    return trustId;
};

export const fetchTrusts = handler('load trusts', () => listTrusts());
export const analyze = handler('check members', (req) => analyzeRows(trustIdOf(req), req.body.rows));
export const runImport = handler('import members', (req) => importRows(trustIdOf(req), req.body.rows, req.body.decisions));
