import { Router } from 'express';
import { googleAuth, getMe, demoAuth } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/google', googleAuth);
router.post('/demo', demoAuth);
router.get('/me', requireAuth, getMe);

export default router;
