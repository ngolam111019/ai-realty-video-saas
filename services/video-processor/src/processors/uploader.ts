// services/video-processor/src/processors/uploader.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { uploadToR2 } from '../lib/s3';
import { getFileDuration } from './timeline-builder';
import { logger } from '../lib/logger';

const execAsync = promisify(exec);

export interface UploaderInput {
  localVideoPath: string;
  userId: string;
  jobId: string;
}

export interface UploaderOutput {
  videoUrl: string;
  thumbnailUrl: string;
  videoKey: string;
  thumbnailKey: string;
  fileSizeBytes: number;
  durationSeconds: number;
}

export async function uploadVideo(input: UploaderInput): Promise<UploaderOutput> {
  const tempDir = path.dirname(input.localVideoPath);
  const localThumbnailPath = path.join(tempDir, 'thumbnail.jpg');

  logger.info(
    { localVideoPath: input.localVideoPath },
    '[uploader] Extracting thumbnail at 2s mark...',
  );

  // Extract thumbnail at 2 seconds
  // Fallback to 0 seconds if 2s fails (e.g. video is too short)
  try {
    await execAsync(
      `ffmpeg -ss 2 -i "${input.localVideoPath}" -vframes 1 -q:v 2 -y "${localThumbnailPath}"`,
    );
  } catch (err) {
    logger.warn({ err }, '[uploader] Thumbnail extraction at 2s failed, falling back to 0s');
    await execAsync(
      `ffmpeg -ss 0 -i "${input.localVideoPath}" -vframes 1 -q:v 2 -y "${localThumbnailPath}"`,
    );
  }

  const videoKey = `videos/${input.userId}/${input.jobId}/output.mp4`;
  const thumbnailKey = `videos/${input.userId}/${input.jobId}/thumbnail.jpg`;

  logger.info({ videoKey, thumbnailKey }, '[uploader] Uploading video and thumbnail to R2...');

  // Upload video
  const videoUrl = await uploadToR2(input.localVideoPath, videoKey, 'video/mp4');

  // Upload thumbnail
  const thumbnailUrl = await uploadToR2(localThumbnailPath, thumbnailKey, 'image/jpeg');

  // Get metadata
  const stats = await fsPromises.stat(input.localVideoPath);
  const durationSeconds = await getFileDuration(input.localVideoPath);

  // Clean up thumbnail local file
  try {
    await fsPromises.unlink(localThumbnailPath);
  } catch (cleanErr) {
    // ignore cleanup error
  }

  return {
    videoUrl,
    thumbnailUrl,
    videoKey,
    thumbnailKey,
    fileSizeBytes: stats.size,
    durationSeconds,
  };
}
