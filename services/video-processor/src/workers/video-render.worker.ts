// services/video-processor/src/workers/video-render.worker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { db } from '../lib/db';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import * as fs from 'fs';

import { downloadMediaAssets } from '../processors/media-downloader';
import { getCachedTts } from '../processors/tts-cache';
import { extractClip } from '../processors/clip-extractor';
import { buildTimeline } from '../processors/timeline-builder';
import { renderWithFFmpeg } from '../processors/ffmpeg-renderer';
import { uploadVideo } from '../processors/uploader';
import { GeneratedScene } from '../types';

async function updateJobProgress(jobId: string, progress: number, currentStep: string) {
  await db.videoJob.update({
    where: { id: jobId },
    data: { progress, currentStep },
  });
  await redis.publish(
    `realty:v1:job:${jobId}:progress`,
    JSON.stringify({ jobId, progress, currentStep }),
  );
}

export const videoRenderWorker = new Worker(
  'realty.video.render',
  async (job: Job) => {
    const { jobId } = job.data;
    logger.info(
      { jobId: job.id, videoJobId: jobId },
      '[video-render-worker] Received video-render job',
    );

    let currentStep = 'STARTING';
    const tempJobDir = path.join('/tmp', 'video-processor', jobId);

    try {
      // Step 1: Fetch VideoJob and ScriptDraft details
      await updateJobProgress(jobId, 5, currentStep);

      const videoJob = await db.videoJob.findUnique({
        where: { id: jobId },
        include: {
          user: true,
          project: {
            include: {
              mediaAssets: {
                where: { deletedAt: null },
              },
            },
          },
          scriptDraft: true,
        },
      });

      if (!videoJob) {
        throw new Error(`VideoJob with ID ${jobId} not found`);
      }

      const user = videoJob.user;
      const project = videoJob.project;
      const draft = videoJob.scriptDraft;

      if (!draft || !draft.scenes) {
        throw new Error(`ScriptDraft or scenes not found for job: ${jobId}`);
      }

      const scenes = draft.scenes as any as GeneratedScene[];

      // Step 2: Download Media Assets
      currentStep = 'DOWNLOADING_MEDIA';
      await updateJobProgress(jobId, 15, currentStep);

      // Collect asset IDs from the scenes
      const mediaAssetIdsSet = new Set<string>();
      for (const scene of scenes) {
        for (const assigned of scene.assignedAssets) {
          mediaAssetIdsSet.add(assigned.assetId);
        }
      }
      const mediaAssetIds = Array.from(mediaAssetIdsSet);
      const portraitAsset = project.mediaAssets.find((a) => a.type === 'PORTRAIT');

      const { localMediaDir, assetMap } = await downloadMediaAssets({
        draftId: draft.id,
        mediaAssetIds,
        portraitAssetId: portraitAsset?.id,
      });

      // Download user avatar/portrait if available
      let avatarLocalPath: string | undefined;
      if (user.avatarUrl) {
        avatarLocalPath = path.join(tempJobDir, 'avatar.png');
        await fsPromises.mkdir(path.dirname(avatarLocalPath), { recursive: true });

        try {
          const downloadResp = await axios.get(user.avatarUrl, { responseType: 'stream' });
          const writer = fs.createWriteStream(avatarLocalPath);
          downloadResp.data.pipe(writer);
          await new Promise<void>((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
        } catch (avatarErr) {
          logger.warn(
            { avatarErr },
            '[video-render-worker] Failed to download user avatar, proceeding without overlay',
          );
          avatarLocalPath = undefined;
        }
      }

      // Step 3: Generate TTS Audios
      currentStep = 'AUDIO_GENERATION';
      await updateJobProgress(jobId, 30, currentStep);

      const audioLocalPaths: Record<string, string> = {};
      await Promise.all(
        scenes.map(async (scene) => {
          const localOutputPath = path.join(tempJobDir, 'audio', `scene_${scene.order}.mp3`);
          await getCachedTts({
            provider: videoJob.ttsProvider as any,
            text: scene.narration,
            voice: videoJob.ttsVoiceId,
            localOutputPath,
          });
          audioLocalPaths[scene.id] = localOutputPath;
        }),
      );

      // Step 4: Extract Video Clips (crops and deshakes)
      currentStep = 'CLIP_EXTRACTION';
      await updateJobProgress(jobId, 45, currentStep);

      const assetLocalPaths: Record<string, string> = {};
      await Promise.all(
        scenes.map(async (scene) => {
          for (const assigned of scene.assignedAssets) {
            const downloaded = assetMap.get(assigned.assetId);
            if (!downloaded) continue;

            if (assigned.type === 'IMAGE' || (assigned.type as string) === 'PORTRAIT') {
              assetLocalPaths[assigned.assetId] = downloaded.localPath;
            } else {
              const localOutputPath = path.join(
                tempJobDir,
                'clips',
                `clip_${assigned.assetId}.mp4`,
              );
              const startSeconds = assigned.clipStartSeconds || 0;
              const endSeconds = assigned.clipEndSeconds || startSeconds + 5;

              await extractClip({
                localVideoPath: downloaded.localPath,
                startSeconds,
                endSeconds,
                localOutputPath,
              });

              assetLocalPaths[assigned.assetId] = localOutputPath;
            }
          }
        }),
      );

      // Step 5: Build Timeline
      currentStep = 'TIMELINE_BUILDING';
      const timeline = await buildTimeline({
        scenes,
        audioLocalPaths,
        assetLocalPaths,
      });

      // Step 6: Render Final Video with FFmpeg
      currentStep = 'RENDERING';
      await updateJobProgress(jobId, 60, currentStep);

      const renderOutputPath = path.join(tempJobDir, 'output.mp4');
      const renderResult = await renderWithFFmpeg({
        timeline,
        outputPath: renderOutputPath,
        jobId,
        avatarLocalPath,
      });

      // Step 7: Upload Video & Thumbnail
      currentStep = 'UPLOAD';
      await updateJobProgress(jobId, 90, currentStep);

      const uploadResult = await uploadVideo({
        localVideoPath: renderResult.outputPath,
        userId: videoJob.userId,
        jobId,
      });

      // Step 8: Update Job Success
      await db.videoJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          outputUrl: uploadResult.videoUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
          outputKey: uploadResult.videoKey,
          outputSizeBytes: uploadResult.fileSizeBytes,
          duration: renderResult.durationSeconds,
          completedAt: new Date(),
          progress: 100,
          currentStep: 'COMPLETE',
        },
      });

      await redis.publish(
        `realty:v1:job:${jobId}:completed`,
        JSON.stringify({
          jobId,
          outputUrl: uploadResult.videoUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
        }),
      );

      // Clean up local files
      try {
        await fsPromises.rm(tempJobDir, { recursive: true, force: true });
        await fsPromises.rm(localMediaDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        logger.warn({ jobId, err: cleanupErr }, '[video-render-worker] Temp files cleanup failed');
      }

      logger.info({ jobId }, '[video-render-worker] Job completed successfully');
      return { status: 'COMPLETED', jobId };
    } catch (err: any) {
      logger.error(
        { jobId, err, failedStep: currentStep },
        '[video-render-worker] Pipeline execution failed',
      );

      // Update Job Failure
      await db.videoJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: err.message || 'Unknown render engine error',
          failedStep: currentStep,
          progress: 0,
        },
      });

      // Refund Wallet Tokens
      try {
        await db.$transaction(async (tx) => {
          const jobRecord = await tx.videoJob.findUnique({ where: { id: jobId } });
          if (jobRecord && !jobRecord.tokenRefunded && jobRecord.tokenCost > 0) {
            const wallet = await tx.tokenWallet.findUnique({ where: { userId: jobRecord.userId } });
            const balanceBefore = wallet ? wallet.balance : 0;
            const balanceAfter = balanceBefore + jobRecord.tokenCost;

            await tx.tokenWallet.update({
              where: { userId: jobRecord.userId },
              data: { balance: { increment: jobRecord.tokenCost } },
            });

            await tx.videoJob.update({
              where: { id: jobId },
              data: { tokenRefunded: true },
            });

            await tx.transaction.create({
              data: {
                userId: jobRecord.userId,
                type: 'TOKEN_REFUND',
                status: 'COMPLETED',
                tokenAmount: jobRecord.tokenCost,
                balanceBefore,
                balanceAfter,
                videoJobId: jobId,
                description: `Hoàn tiền tạo video thất bại cho job: ${jobId}`,
              },
            });
          }
        });
      } catch (refundErr) {
        logger.error(
          { jobId, err: refundErr },
          '[video-render-worker] Failed to refund wallet tokens',
        );
      }

      // Publish failure notification
      await redis.publish(
        `realty:v1:job:${jobId}:failed`,
        JSON.stringify({
          jobId,
          failedStep: currentStep,
          userMessage: 'Video tạo thất bại. Token đã được hoàn lại.',
        }),
      );

      // Clean up temp files
      try {
        await fsPromises.rm(tempJobDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        // ignore
      }

      throw err;
    }
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
