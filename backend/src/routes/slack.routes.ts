import { Router } from 'express';
import { SlackController } from '../controllers/slack.controller.js';

const router = Router();

router.get('/authorize', SlackController.authorize);
router.get('/callback', SlackController.callback);
router.get('/status', SlackController.getStatus);
router.post('/disconnect', SlackController.disconnect);
router.post('/test-alert', SlackController.testAlert);

export default router;
