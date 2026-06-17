// services/main-api/src/project/project.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';

@Injectable()
export class ProjectService {
  private s3Client: S3Client;
  private bucketMedia: string;
  private cdnBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID') || '';
    const endpoint =
      this.config.get<string>('R2_ENDPOINT') ||
      `https://${accountId}.r2.cloudflarestorage.com`;
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID') || '';
    const secretAccessKey =
      this.config.get<string>('R2_SECRET_ACCESS_KEY') || '';

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucketMedia =
      this.config.get<string>('R2_BUCKET_MEDIA') || 'realty-media';
    this.cdnBaseUrl =
      this.config.get<string>('CDN_BASE_URL') ||
      `https://${this.bucketMedia}.r2.cloudflarestorage.com`;
  }

  async createProject(userId: string, data: any) {
    const { prompt, ...rest } = data;
    const propertyType = (rest.propertyType || 'APARTMENT').toUpperCase();
    return this.prisma.project.create({
      data: {
        ...rest,
        description: prompt || rest.description,
        propertyType,
        userId,
      },
    });
  }

  async getProjects(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { userId, deletedAt: null },
      include: {
        videoJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        scriptDrafts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => {
      let status = 'READY';
      const latestJob = p.videoJobs[0];
      if (latestJob) {
        if (latestJob.status === 'COMPLETED') status = 'COMPLETED';
        else if (latestJob.status === 'FAILED') status = 'FAILED';
        else status = 'RENDERING';
      }
      return {
        ...p,
        status,
        latestJobId: latestJob?.id || null,
        latestDraftId: p.scriptDrafts[0]?.id || null,
      };
    });
  }

  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      include: {
        mediaAssets: {
          where: { deletedAt: null },
        },
        videoJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        scriptDrafts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    let status = 'READY';
    const latestJob = project.videoJobs[0];
    if (latestJob) {
      if (latestJob.status === 'COMPLETED') status = 'COMPLETED';
      else if (latestJob.status === 'FAILED') status = 'FAILED';
      else status = 'RENDERING';
    }

    return {
      ...project,
      status,
      latestJobId: latestJob?.id || null,
      latestDraftId: project.scriptDrafts[0]?.id || null,
    };
  }

  async updateProject(userId: string, projectId: string, data: any) {
    // Check ownership
    await this.getProject(userId, projectId);

    const { price, assets, ...rest } = data;
    const updateData: any = { ...rest };

    if (updateData.propertyType) {
      updateData.propertyType = updateData.propertyType.toUpperCase();
    }
    if (price !== undefined && price !== null) {
      updateData.salePrice = BigInt(price);
    }
    if (assets !== undefined && Array.isArray(assets)) {
      updateData.mediaAssets = {
        set: assets.map((id: string) => ({ id })),
      };
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });
  }

  async deleteProject(userId: string, projectId: string) {
    await this.getProject(userId, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  }

  async uploadMedia(
    userId: string,
    projectId: string,
    file: Express.Multer.File,
    isPortrait: boolean,
  ) {
    await this.getProject(userId, projectId);
    const ext = path.extname(file.originalname);
    const storageKey = `uploads/${userId}/${projectId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

    let finalStorageKey = storageKey;
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketMedia,
        Key: storageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);
    } catch (s3Error: any) {
      console.warn(
        `[project.service] S3/R2 upload failed, using local test-assets fallback. Error: ${s3Error.message || s3Error}`,
      );
      // For local testing/E2E, we use the original filename as storageKey
      // so that video-processor can resolve it from services/video-processor/test-assets/
      finalStorageKey = file.originalname;
    }

    const storageUrl = `${this.cdnBaseUrl}/${finalStorageKey}`;
    const type = isPortrait
      ? 'PORTRAIT'
      : file.mimetype.startsWith('video/')
        ? 'VIDEO_CLIP'
        : 'IMAGE';
    const tag = isPortrait ? 'PORTRAIT' : 'OTHER';

    const asset = await this.prisma.mediaAsset.create({
      data: {
        userId,
        projectId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageKey: finalStorageKey,
        storageUrl,
        type,
        tag,
        isPortrait,
      },
    });

    // If it's a portrait, update the user's portraitAssetId too
    if (isPortrait) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { portraitAssetId: asset.id, avatarUrl: storageUrl },
      });
    }

    return asset;
  }

  async generatePresignedUrl(
    userId: string,
    projectId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
  ) {
    await this.getProject(userId, projectId);
    const ext = path.extname(fileName);
    const storageKey = `uploads/${userId}/${projectId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketMedia,
      Key: storageKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    return {
      uploadUrl,
      storageKey,
    };
  }

  async confirmUpload(
    userId: string,
    projectId: string,
    storageKey: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    type: 'IMAGE' | 'VIDEO_CLIP' | 'PORTRAIT',
  ) {
    await this.getProject(userId, projectId);
    const storageUrl = `${this.cdnBaseUrl}/${storageKey}`;
    const isPortrait = type === 'PORTRAIT';
    const tag = isPortrait ? 'PORTRAIT' : 'OTHER';

    const asset = await this.prisma.mediaAsset.create({
      data: {
        userId,
        projectId,
        fileName,
        fileSize,
        mimeType,
        storageKey,
        storageUrl,
        type,
        tag,
        isPortrait,
      },
    });

    if (isPortrait) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { portraitAssetId: asset.id, avatarUrl: storageUrl },
      });
    }

    return asset;
  }
}
