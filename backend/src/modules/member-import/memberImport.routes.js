import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { analyze, fetchTrusts, runImport } from './memberImport.controller.js';

const router = Router();

router.get('/trusts', requireAuth, fetchTrusts);
router.post('/analyze', requireAuth, analyze);
router.post('/import', requireAuth, runImport);

export default router;
