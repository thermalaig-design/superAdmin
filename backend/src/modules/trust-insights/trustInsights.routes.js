import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { fetchTrustActivity } from './trustActivity.controller.js';
import { fetchTrustInsights } from './trustInsights.controller.js';
import { fetchTrustMemberLogins } from './trustMembers.controller.js';

const router = Router();

router.get('/', requireAuth, fetchTrustInsights);
router.get('/:trustId/activity', requireAuth, fetchTrustActivity);
router.get('/:trustId/members', requireAuth, fetchTrustMemberLogins);

export default router;
