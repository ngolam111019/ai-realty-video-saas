// services/video-processor/src/workers/script-gen.worker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { db } from '../lib/db';
import * as fs from 'fs/promises';
import { downloadMediaAssets } from '../processors/media-downloader';
import { getCachedImageAnalysis, getCachedVideoAnalysis } from '../processors/vision-cache';
import { generateScript, AnalyzedMediaAsset, TemplateScene } from '../processors/script-generator';
import { updateDraftProgress, saveDraftSuccess, saveDraftFailure } from '../processors/draft-saver';
import { ProjectInfo } from '../types';

export const scriptGenWorker = new Worker(
  'realty.script.generate',
  async (job: Job) => {
    const { draftId } = job.data;
    logger.info({ jobId: job.id, draftId }, '[script-gen-worker] Received script-gen job');

    let currentStep = 'FETCHING_DATA';
    try {
      // Step 1: Fetch ScriptDraft, Project, and Template info from DB
      await updateDraftProgress({ draftId, progress: 10, currentStep });

      const draft = await db.scriptDraft.findUnique({
        where: { id: draftId },
        include: {
          project: {
            include: {
              mediaAssets: {
                where: { deletedAt: null },
              },
            },
          },
          template: true,
        },
      });

      if (!draft) {
        throw new Error(`ScriptDraft with ID ${draftId} not found`);
      }

      const project = draft.project;
      const template = draft.template;

      // Map DB project model to ProjectInfo
      const projectInfo: ProjectInfo = {
        name: project.name,
        propertyType: project.propertyType,
        address: project.address || '',
        district: project.district || '',
        city: project.city,
        area: project.area ? Number(project.area) : undefined,
        bedrooms: project.bedrooms || undefined,
        bathrooms: project.bathrooms || undefined,
        salePrice: project.salePrice ? Number(project.salePrice) : undefined,
        amenities: project.amenities,
        highlights: project.highlights,
        legalStatus: project.legalStatus || undefined,
        handoverDate: project.handoverDate || undefined,
        priceNote: project.priceNote || undefined,
        contactName: project.contactName || '',
        contactPhone: project.contactPhone || '',
      };

      // Step 2: Download Media Assets
      currentStep = 'DOWNLOADING_MEDIA';
      await updateDraftProgress({ draftId, progress: 30, currentStep });

      const mediaAssetIds = project.mediaAssets
        .filter((a) => a.type !== 'PORTRAIT')
        .map((a) => a.id);
      const portraitAsset = project.mediaAssets.find((a) => a.type === 'PORTRAIT');

      const { localMediaDir, assetMap } = await downloadMediaAssets({
        draftId,
        mediaAssetIds,
        portraitAssetId: portraitAsset?.id,
      });

      // Step 3: Vision Analysis (Images & Videos)
      currentStep = 'VISION_ANALYSIS';
      await updateDraftProgress({ draftId, progress: 50, currentStep });

      const analyzedAssets: AnalyzedMediaAsset[] = [];

      for (const [assetId, localAsset] of assetMap.entries()) {
        const dbAsset = project.mediaAssets.find((a) => a.id === assetId)!;

        if (localAsset.type === 'IMAGE' || localAsset.type === 'PORTRAIT') {
          const result = await getCachedImageAnalysis({
            assetId,
            localImagePath: localAsset.localPath,
            mimeType: localAsset.mimeType,
          });
          analyzedAssets.push({
            id: assetId,
            type: localAsset.type,
            storageUrl: dbAsset.storageUrl,
            thumbnailUrl: dbAsset.thumbnailUrl || undefined,
            detectedRoom: result.detectedRoom,
            quality: result.quality,
            description: result.description,
          });
        } else if (localAsset.type === 'VIDEO_CLIP') {
          const result = await getCachedVideoAnalysis({
            assetId,
            localVideoPath: localAsset.localPath,
            mimeType: localAsset.mimeType,
          });
          analyzedAssets.push({
            id: assetId,
            type: 'VIDEO_CLIP',
            storageUrl: dbAsset.storageUrl,
            thumbnailUrl: dbAsset.thumbnailUrl || undefined,
            detectedRoom: result.detectedRoom,
            quality: result.quality,
            description: result.description,
            durationSeconds: result.durationSeconds,
            cropStartSeconds: result.cropStartSeconds,
            cropEndSeconds: result.cropEndSeconds,
          });
        }
      }

      // Step 4: Script Generation via Gemini
      currentStep = 'SCRIPT_GENERATION';
      await updateDraftProgress({ draftId, progress: 80, currentStep });

      const templateScenes = template.scenes as any as TemplateScene[];

      const generatedScript = await generateScript({
        project: projectInfo,
        templateScenes,
        analyzedAssets,
      });

      // Step 5: Save ScriptDraft to DB
      currentStep = 'SAVING_DRAFT';
      await updateDraftProgress({ draftId, progress: 95, currentStep });

      await saveDraftSuccess({
        draftId,
        script: generatedScript,
      });

      // Step 6: Clean up local files
      try {
        await fs.rm(localMediaDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        logger.warn({ draftId, err: cleanupErr }, '[script-gen-worker] Temp files cleanup failed');
      }

      logger.info({ draftId }, '[script-gen-worker] Draft generated successfully');
      return { status: 'READY', draftId };
    } catch (err: any) {
      logger.error(
        { draftId, err, failedStep: currentStep },
        '[script-gen-worker] Pipeline execution failed',
      );
      await saveDraftFailure({
        draftId,
        errorMessage: err.message || 'Unknown orchestrator error',
        failedStep: currentStep,
      });
      throw err;
    }
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
