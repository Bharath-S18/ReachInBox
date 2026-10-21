import { Router } from 'express';
import { searchEmails } from '../controllers/email.controller.js';

const router = Router();

/**
 * GET /api/emails/search
 * Full-text multi-field search across recipientEmail, subject, and body
 * Supports status filtering and pagination, with automated database fallback
 */
router.get('/search', searchEmails);

export default router;
