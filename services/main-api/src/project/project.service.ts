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
    return this.prisma.project.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async getProjects(userId: string) {
    return this.prisma.project.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      include: {
        mediaAssets: {
          where: { deletedAt: null },
        },
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async updateProject(userId: string, projectId: string, data: any) {
    // Check ownership
    await this.getProject(userId, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data,
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

    const command = new PutObjectCommand({
      Bucket: this.bucketMedia,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);

    const storageUrl = `${this.cdnBaseUrl}/${storageKey}`;
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
        storageKey,
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
