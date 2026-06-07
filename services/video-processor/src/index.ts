import './lib/env';
import { logger } from './lib/logger';
import { scriptGenWorker } from './workers/script-gen.worker';
import { videoRenderWorker } from './workers/video-render.worker';

logger.info('[video-processor] Workers starting up...');

// Active workers
logger.info(
  {
    scriptGenQueue: scriptGenWorker.name,
    videoRenderQueue: videoRenderWorker.name,
  },
  '[video-processor] Service successfully initialized. Waiting for jobs.',
);
