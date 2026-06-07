// services/main-api/src/script-draft/script-draft.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ScriptDraftService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('realty.script.generate') private scriptQueue: Queue,
  ) {}

  async createDraft(userId: string, data: any) {
    const {
      projectId,
      templateId,
      mediaAssetIds,
      portraitAssetId,
      targetPlatform,
    } = data;

    // Verify project exists and belongs to user
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify template exists
    const template = await this.prisma.videoTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException('Video template not found');
    }

    // Create Draft record
    const draft = await this.prisma.scriptDraft.create({
      data: {
        userId,
        projectId,
        templateId,
        status: 'PROCESSING',
        progress: 0,
        currentStep: 'QUEUED',
      },
    });

    // Enqueue script generation job
    await this.scriptQueue.add('generate-script', {
      draftId: draft.id,
      userId,
      projectId,
      templateId,
      mediaAssetIds,
      portraitAssetId,
      targetPlatform,
    });

    return {
      draftId: draft.id,
      status: 'PROCESSING',
      estimatedSeconds: 60,
      message: 'AI đang phân tích ảnh và viết kịch bản...',
    };
  }

  async getDraft(userId: string, id: string) {
    const draft = await this.prisma.scriptDraft.findFirst({
      where: { id, userId },
      include: {
        project: true,
        template: true,
      },
    });
    if (!draft) {
      throw new NotFoundException('Script draft not found');
    }
    return draft;
  }

  async updateDraft(userId: string, id: string, data: any) {
    await this.getDraft(userId, id);

    // Build update payload
    const updateData: any = {};
    if (data.scenes !== undefined) {
      updateData.scenes = data.scenes;
    }
    if (data.suggestedCaption !== undefined) {
      updateData.suggestedCaption = data.suggestedCaption;
    }
    if (data.suggestedHashtags !== undefined) {
      updateData.suggestedHashtags = data.suggestedHashtags;
    }
    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    return this.prisma.scriptDraft.update({
      where: { id },
      data: updateData,
    });
  }
}
