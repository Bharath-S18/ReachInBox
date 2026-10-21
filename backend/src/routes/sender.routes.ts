import { Router } from 'express';
import { getSenders, createSender, deleteSender } from '../controllers/sender.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, getSenders);
router.post('/', requireAuth, createSender);
router.delete('/:id', requireAuth, deleteSender);

export default router;
