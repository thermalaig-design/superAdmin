import { Router } from 'express';

import appTemplatesRoutes from '../modules/app-templates/appTemplates.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import marketingRoutes from '../modules/marketing/marketing.routes.js';
import memberInsightsRoutes from '../modules/member-insights/memberInsights.routes.js';
import pageRoutesRoutes from '../modules/page-routes/pageRoutes.routes.js';
import registrationsRoutes from '../modules/registrations/registrations.routes.js';
import targetsRoutes from '../modules/targets/targets.routes.js';
import trustInsightsRoutes from '../modules/trust-insights/trustInsights.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/app-templates', appTemplatesRoutes);
router.use('/trust-insights', trustInsightsRoutes);
router.use('/member-insights', memberInsightsRoutes);
router.use('/marketing', marketingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/registrations', registrationsRoutes);
router.use('/targets', targetsRoutes);
router.use('/page-routes', pageRoutesRoutes);

export default router;
