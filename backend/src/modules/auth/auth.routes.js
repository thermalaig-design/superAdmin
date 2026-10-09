import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { getCurrentAdmin, loginSuperAdmin } from './auth.controller.js';

const router = Router();

router.post('/login', loginSuperAdmin);
router.get('/me', requireAuth, getCurrentAdmin);

export default router;
