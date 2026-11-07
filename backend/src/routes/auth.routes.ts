import { Router } from 'express';
import { googleAuth, getMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Exclusively Google OAuth 2.0 authentication & account creation
router.post('/google', googleAuth);
router.get('/me', requireAuth, getMe);

export default router;
