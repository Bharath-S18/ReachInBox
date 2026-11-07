import { Router } from 'express';
import { getDrafts, saveDraft, deleteDraft } from '../controllers/draft.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getDrafts);
router.post('/', saveDraft);
router.delete('/:id', deleteDraft);

export default router;

