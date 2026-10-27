import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { addAppTemplate, editAppTemplate, fetchAppTemplates, fetchTrustOptions, removeAppTemplate } from './appTemplates.controller.js';

const router = Router();

router.get('/', requireAuth, fetchAppTemplates);
router.get('/trusts', requireAuth, fetchTrustOptions);
router.post('/', requireAuth, addAppTemplate);
router.put('/:id', requireAuth, editAppTemplate);
router.delete('/:id', requireAuth, removeAppTemplate);

export default router;
