import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { checkRedisHealth, getRedisClient } from './config/redis.js';
import { emailQueue, getQueueStats } from './queues/email.queue.js';
import { emailWorker } from './queues/email.worker.js';
import { SmtpService } from './services/smtp.service.js';
import { checkElasticsearchHealth } from './config/elasticsearch.js';
import { ElasticsearchService } from './services/elasticsearch.service.js';
import slackRouter from './routes/slack.routes.js';
import emailRouter from './routes/email.routes.js';
import authRouter from './routes/auth.routes.js';
import senderRouter from './routes/sender.routes.js';
import { setupBullBoard } from './config/bullBoard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Bull-Board Queue Monitoring Dashboard
app.use('/admin/queues', setupBullBoard());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/senders', senderRouter);
app.use('/api/slack', slackRouter);
app.use('/api/emails', emailRouter);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const redisHealthy = await checkRedisHealth();
  const esHealth = await checkElasticsearchHealth();
  const queueStats = await getQueueStats().catch(() => null);

  res.json({
    status: 'ok',
    service: 'reachinbox-scheduler-backend',
    timestamp: new Date().toISOString(),
    redis: {
      connected: redisHealthy,
    },
    elasticsearch: esHealth,
    queues: {
      emailQueue: queueStats,
    },
  });
});

const server = app.listen(PORT, async () => {
  console.log(`[INFO] ReachInbox Scheduler Backend running on http://localhost:${PORT}`);
  console.log(`[INFO] Health check available at http://localhost:${PORT}/health`);
  console.log(`[INFO] Bull-Board Queue Dashboard available at http://localhost:${PORT}/admin/queues`);
  
  const redisOk = await checkRedisHealth();
  if (redisOk) {
    console.log('[INFO] Redis and BullMQ Queue Engine active and ready for jobs');
  }

  // Attempt Elasticsearch initialization with non-blocking graceful fallback
  await ElasticsearchService.initIndex();
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[INFO] Received ${signal}. Gracefully terminating BullMQ workers and Express server...`);
  server.close(async () => {
    try {
      await emailWorker.close();
      await emailQueue.close();
      SmtpService.closeAllTransporters();
      await getRedisClient().quit();
      console.log('[SUCCESS] Clean shutdown completed.');
      process.exit(0);
    } catch (err) {
      console.error('[ERROR] Error during shutdown:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

