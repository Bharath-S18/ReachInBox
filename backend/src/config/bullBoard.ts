import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from '../queues/email.queue.js';
import { Router } from 'express';

/**
 * Initializes Bull-Board monitoring dashboard mounted at /admin/queues
 */
export function setupBullBoard(): Router {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  return serverAdapter.getRouter();
}
