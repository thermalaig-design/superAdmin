import {
    clearCompanyDetails,
    deleteBankDetails,
    getBankDetails,
    getCompanyDetails,
    saveBankDetails,
    saveCompanyDetails,
} from './trustDetails.service.js';

const handler = (label, work) => async (req, res) => {
    try {
        const data = await work(req);
        return res.json({ success: true, data });
    } catch (error) {
        console.error(`${label} failed:`, error);
        return res.status(error.status ?? 500).json({ success: false, message: error.status ? error.message : `Failed: ${label}` });
    }
};

export const fetchBankDetails = handler('load bank details', (req) => getBankDetails(req.params.trustId));
export const putBankDetails = handler('save bank details', (req) => saveBankDetails(req.params.trustId, req.body));
export const removeBankDetails = handler('delete bank details', async (req) => {
    await deleteBankDetails(req.params.trustId);
    return null;
});

export const fetchCompanyDetails = handler('load company details', (req) => getCompanyDetails(req.params.trustId));
export const putCompanyDetails = handler('save company details', (req) => saveCompanyDetails(req.params.trustId, req.body));
export const removeCompanyDetails = handler('clear company details', (req) => clearCompanyDetails(req.params.trustId));
