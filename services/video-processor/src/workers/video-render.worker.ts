// services/video-processor/src/workers/video-render.worker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

export const videoRenderWorker = new Worker(
  'realty.video.render',
  async (job: Job) => {
    logger.info(
      { jobId: job.id, data: job.data },
      '[video-render-worker] Received video-render job',
    );
    // TODO: implement render pipeline
    return { status: 'COMPLETED', jobId: job.data.jobId };
  },
  {
    connection: redis as any,
    concurrency: parseInt(process.env.MAX_RENDER_WORKERS || '2', 10),
  },
);

videoRenderWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '[video-render-worker] Job completed');
});

videoRenderWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '[video-render-worker] Job failed');
});
