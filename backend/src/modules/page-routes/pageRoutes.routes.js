import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { editPageRoute, fetchPageRoutes } from './pageRoutes.controller.js';

const router = Router();

router.get('/', requireAuth, fetchPageRoutes);
router.patch('/:id', requireAuth, editPageRoute);

export default router;
