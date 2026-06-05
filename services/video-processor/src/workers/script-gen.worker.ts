// services/video-processor/src/workers/script-gen.worker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

export const scriptGenWorker = new Worker(
  'realty.script.generate',
  async (job: Job) => {
    logger.info({ jobId: job.id, data: job.data }, '[script-gen-worker] Received script-gen job');
    // TODO: implement script gen pipeline
    return { status: 'READY', draftId: job.data.draftId };
  },
  {
    connection: redis as any,
    concurrency: parseInt(process.env.MAX_SCRIPT_WORKERS || '3', 10),
  },
);

scriptGenWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '[script-gen-worker] Job completed');
});

scriptGenWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '[script-gen-worker] Job failed');
});
