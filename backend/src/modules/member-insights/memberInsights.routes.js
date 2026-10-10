import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import {
    fetchMemberActivity,
    fetchMemberGrowth,
    fetchMembers,
    fetchMemberSummary,
    fetchMemberTrusts,
    fetchTrustOptions,
} from './memberInsights.controller.js';

const router = Router();

router.get('/', requireAuth, fetchMembers);
router.get('/summary', requireAuth, fetchMemberSummary);
router.get('/growth', requireAuth, fetchMemberGrowth);
router.get('/trusts', requireAuth, fetchTrustOptions);
router.get('/:memberId/trusts', requireAuth, fetchMemberTrusts);
router.get('/:memberId/activity', requireAuth, fetchMemberActivity);

export default router;
