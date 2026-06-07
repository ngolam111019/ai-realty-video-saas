// services/video-processor/src/lib/s3.ts
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { logger } from './logger';

const s3Client = new S3Client({
  region: 'auto',
  endpoint:
    process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const bucketMedia = process.env.R2_BUCKET_MEDIA || 'realty-media';
const bucketVideos = process.env.R2_BUCKET_VIDEOS || 'realty-videos';

export async function downloadFromR2(storageKey: string, localPath: string): Promise<void> {
  const dir = path.dirname(localPath);
  await fs.promises.mkdir(dir, { recursive: true });

  const command = new GetObjectCommand({
    Bucket: bucketMedia,
    Key: storageKey,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error(`Empty body returned for R2 object: ${storageKey}`);
  }

  const writeStream = fs.createWriteStream(localPath);
  await pipeline(response.Body as NodeJS.ReadableStream, writeStream);
}

export async function uploadToR2(
  localPath: string,
  destKey: string,
  contentType: string,
): Promise<string> {
  try {
    if (!process.env.R2_ACCESS_KEY_ID) {
      throw new Error('R2_ACCESS_KEY_ID environment variable is missing');
    }
    const fileStream = fs.createReadStream(localPath);

    const command = new PutObjectCommand({
      Bucket: bucketVideos,
      Key: destKey,
      Body: fileStream,
      ContentType: contentType,
    });

    await s3Client.send(command);
    const cdnBase = process.env.CDN_BASE_URL || `https://${bucketVideos}.r2.cloudflarestorage.com`;
    return `${cdnBase}/${destKey}`;
  } catch (error: any) {
    logger.warn(
      { destKey, localPath, error: error.message },
      '[s3] R2 upload failed or not configured, returning local absolute file path as fallback',
    );
    return `file://${path.resolve(localPath)}`;
  }
}

export async function fileExistsOnR2(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketMedia,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}
