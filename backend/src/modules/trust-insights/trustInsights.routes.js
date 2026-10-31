import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { fetchTrustActivity, fetchTrustMemberActions } from './trustActivity.controller.js';
import {
    fetchBankDetails,
    fetchCompanyDetails,
    putBankDetails,
    putCompanyDetails,
    removeBankDetails,
    removeCompanyDetails,
} from './trustDetails.controller.js';
import { fetchTrustInsights } from './trustInsights.controller.js';
import { fetchTrustMemberLogins } from './trustMembers.controller.js';

const router = Router();

router.get('/', requireAuth, fetchTrustInsights);
router.get('/:trustId/activity', requireAuth, fetchTrustActivity);
router.get('/:trustId/member-actions', requireAuth, fetchTrustMemberActions);
router.get('/:trustId/members', requireAuth, fetchTrustMemberLogins);

router.get('/:trustId/bank-details', requireAuth, fetchBankDetails);
router.put('/:trustId/bank-details', requireAuth, putBankDetails);
router.delete('/:trustId/bank-details', requireAuth, removeBankDetails);

router.get('/:trustId/company-details', requireAuth, fetchCompanyDetails);
router.put('/:trustId/company-details', requireAuth, putCompanyDetails);
router.delete('/:trustId/company-details', requireAuth, removeCompanyDetails);

export default router;
