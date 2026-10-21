import { Router } from 'express';
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  getEmailStats,
  searchEmails,
} from '../controllers/email.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/schedule', requireAuth, scheduleEmails);
router.get('/scheduled', requireAuth, getScheduledEmails);
router.get('/sent', requireAuth, getSentEmails);
router.get('/stats', requireAuth, getEmailStats);
router.get('/search', optionalAuth, searchEmails);

export default router;
