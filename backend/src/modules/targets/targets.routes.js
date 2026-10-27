import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { fetchTargetCampaigns, fetchTargetHistory, updateAdSetTargets } from './targets.controller.js';

const router = Router();

router.get('/campaigns', requireAuth, fetchTargetCampaigns);
router.get('/history', requireAuth, fetchTargetHistory);
router.put('/adsets', requireAuth, updateAdSetTargets);

export default router;
