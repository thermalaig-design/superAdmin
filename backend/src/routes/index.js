import { Router } from 'express';

import authRoutes from '../modules/auth/auth.routes.js';
import trustInsightsRoutes from '../modules/trust-insights/trustInsights.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/trust-insights', trustInsightsRoutes);

export default router;
