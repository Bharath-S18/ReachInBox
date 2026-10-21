import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { checkRedisHealth, getRedisClient } from './config/redis.js';
import { emailQueue, getQueueStats } from './queues/email.queue.js';
import { emailWorker } from './queues/email.worker.js';
import slackRouter from './routes/slack.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/slack', slackRouter);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const redisHealthy = await checkRedisHealth();
  const queueStats = await getQueueStats().catch(() => null);

  res.json({
    status: 'ok',
    service: 'reachinbox-scheduler-backend',
    timestamp: new Date().toISOString(),
    redis: {
      connected: redisHealthy,
    },
    queues: {
      emailQueue: queueStats,
    },
  });
});

const server = app.listen(PORT, async () => {
  console.log(`🚀 ReachInbox Scheduler Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  
  const redisOk = await checkRedisHealth();
  if (redisOk) {
    console.log('⚡ Redis & BullMQ Queue Engine active and ready for jobs');
  }
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Gracefully terminating BullMQ workers and Express server...`);
  server.close(async () => {
    try {
      await emailWorker.close();
      await emailQueue.close();
      await getRedisClient().quit();
      console.log('✅ Clean shutdown completed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

