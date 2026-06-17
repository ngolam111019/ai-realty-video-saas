// services/main-api/src/video-job/video-job.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class VideoJobService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('realty.video.render') private renderQueue: Queue,
  ) {}

  async createVideoJob(userId: string, data: any) {
    const scriptDraftId = data.scriptDraftId || data.draftId;
    const { ttsProvider, ttsVoiceId, renderEngine } = data;

    // Fetch ScriptDraft and video template to check token cost
    const draft = await this.prisma.scriptDraft.findFirst({
      where: { id: scriptDraftId, userId },
      include: { template: true },
    });
    if (!draft) {
      throw new NotFoundException('Script draft not found');
    }

    // Map and save client-submitted scenes to the ScriptDraft
    if (data.scenes && Array.isArray(data.scenes)) {
      const projectAssets = await this.prisma.mediaAsset.findMany({
        where: { projectId: draft.projectId },
      });
      const assetTypeMap = new Map(projectAssets.map((a) => [a.id, a.type]));

      const mappedScenes = data.scenes.map((s: any) => {
        const assetId = s.assetId || s.assignedAssetId;
        const type = assetId ? (assetTypeMap.get(assetId) === 'VIDEO_CLIP' ? 'VIDEO_CLIP' : 'IMAGE') : 'IMAGE';

        return {
          id: s.id || `scene-${s.order}`,
          order: s.order,
          narration: s.narration,
          caption: s.caption,
          assignedAssets: assetId
            ? [
                {
                  assetId,
                  type,
                  detectedRoom: 'OTHER',
                  quality: 'excellent',
                  assignmentReason: 'User assigned',
                },
              ]
            : [],
          textOverlays: [],
        };
      });

      await this.prisma.scriptDraft.update({
        where: { id: scriptDraftId },
        data: {
          scenes: mappedScenes as any,
          status: 'READY',
        },
      });
    }

    const template = draft.template;
    const tokenCost = template.tokenCost;

    try {
      // Execute ACID transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Find wallet
        const wallet = await tx.tokenWallet.findUnique({
          where: { userId },
        });

        const balance = wallet ? wallet.balance : 0;
        if (balance < tokenCost) {
          throw new BadRequestException('INSUFFICIENT_TOKENS');
        }

        // Deduct tokens
        const updatedWallet = await tx.tokenWallet.update({
          where: { userId },
          data: {
            balance: { decrement: tokenCost },
            lifetimeSpent: { increment: tokenCost },
          },
        });

        // Create Video Job
        const job = await tx.videoJob.create({
          data: {
            user: { connect: { id: userId } },
            project: { connect: { id: draft.projectId } },
            template: { connect: { id: draft.templateId } },
            scriptDraft: { connect: { id: scriptDraftId } },
            status: 'QUEUED',
            tokenCost,
            ttsProvider: ttsProvider || 'fptai',
            ttsVoiceId: ttsVoiceId || 'lannhi',
            renderEngine: renderEngine || 'ffmpeg',
            progress: 0,
            currentStep: 'QUEUED',
          },
        });

        // Create Transaction record
        await tx.transaction.create({
          data: {
            user: { connect: { id: userId } },
            type: 'TOKEN_DEDUCT',
            status: 'COMPLETED',
            tokenAmount: -tokenCost,
            balanceBefore: balance,
            balanceAfter: balance - tokenCost,
            videoJob: { connect: { id: job.id } },
            description: `Trừ token tạo video cho dự án qua template: ${template.name}`,
          },
        });

        return {
          job,
          remainingTokens: updatedWallet.balance,
        };
      });

      // Enqueue render job asynchronously
      await this.renderQueue.add('render-video', {
        jobId: result.job.id,
        userId,
        draftId: scriptDraftId,
        ttsProvider: ttsProvider || 'fptai',
        ttsVoiceId: ttsVoiceId || 'lannhi',
        renderEngine: renderEngine || 'ffmpeg',
        tokenCost,
      });

      return {
        jobId: result.job.id,
        status: 'QUEUED',
        tokenDeducted: tokenCost,
        remainingTokens: result.remainingTokens,
        message: 'Video đang được tạo, vui lòng chờ 3-5 phút',
      };
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_TOKENS' || error.status === 400) {
        throw new BadRequestException(
          'Tài khoản không đủ token để thực hiện render video.',
        );
      }
      throw error;
    }
  }

  async getJobStatus(userId: string, id: string) {
    const job = await this.prisma.videoJob.findFirst({
      where: { id, userId },
    });
    if (!job) {
      throw new NotFoundException('Video job not found');
    }

    let outputUrl = job.outputUrl;
    let thumbnailUrl = job.thumbnailUrl;
    if (outputUrl && outputUrl.startsWith('file://')) {
      outputUrl = `http://localhost:3001/api/video-jobs/${job.id}/video`;
    }
    if (thumbnailUrl && thumbnailUrl.startsWith('file://')) {
      thumbnailUrl = `http://localhost:3001/api/video-jobs/${job.id}/thumbnail`;
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      step: job.currentStep,
      message:
        job.errorMessage ||
        (job.status === 'COMPLETED'
          ? 'Dựng video thành công'
          : 'Đang xử lý...'),
      outputUrl,
      thumbnailUrl,
      duration: job.duration ? Number(job.duration) : null,
    };
  }
}
