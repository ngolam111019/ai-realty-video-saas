// services/video-processor/src/processors/media-downloader.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import pLimit from 'p-limit';
import mime from 'mime-types';
import { db } from '../lib/db';
import { downloadFromR2 } from '../lib/s3';
import { logger } from '../lib/logger';
import { MediaType } from '../types';

export class AssetDownloadError extends Error {
  constructor(
    public assetId: string,
    public originalError: any,
  ) {
    super(`Failed to download asset ${assetId}: ${originalError?.message || originalError}`);
    this.name = 'AssetDownloadError';
  }
}

export class AssetNotFoundError extends Error {
  constructor(public assetId: string) {
    super(`Asset ${assetId} not found in database`);
    this.name = 'AssetNotFoundError';
  }
}

interface MediaDownloaderInput {
  draftId: string;
  mediaAssetIds: string[];
  portraitAssetId?: string;
}

interface MediaDownloaderOutput {
  localMediaDir: string;
  assetMap: Map<
    string,
    {
      localPath: string;
      type: MediaType;
      mimeType: string;
      fileSizeBytes: number;
    }
  >;
}

export async function downloadMediaAssets(
  input: MediaDownloaderInput,
): Promise<MediaDownloaderOutput> {
  const tempDir = process.env.TEMP_DIR || '/tmp/video-processor';
  const mediaDir = path.join(tempDir, input.draftId, 'media');
  await fs.mkdir(mediaDir, { recursive: true });

  const allAssetIds = [...input.mediaAssetIds, input.portraitAssetId].filter(Boolean) as string[];

  if (allAssetIds.length === 0) {
    return { localMediaDir: mediaDir, assetMap: new Map() };
  }

  // Lookup asset records từ DB
  const assets = await db.mediaAsset.findMany({
    where: {
      id: { in: allAssetIds },
    },
  });

  const assetDbMap = new Map(assets.map((a) => [a.id, a]));

  // Verify that all requested asset IDs exist
  for (const assetId of allAssetIds) {
    if (!assetDbMap.has(assetId)) {
      throw new AssetNotFoundError(assetId);
    }
  }

  // Concurrency limit of 5
  const limit = pLimit(5);

  const downloadPromises = allAssetIds.map((assetId) => {
    return limit(async () => {
      const asset = assetDbMap.get(assetId)!;
      const ext = mime.extension(asset.mimeType) || 'bin';
      const localPath = path.join(mediaDir, `${asset.id}.${ext}`);

      // Retry 3 lần
      let lastError: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          logger.info(
            { assetId, attempt, storageKey: asset.storageKey },
            '[media-downloader] Downloading asset',
          );
          await downloadFromR2(asset.storageKey, localPath);
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          logger.warn(
            { assetId, attempt, err: err.message || err },
            '[media-downloader] Download attempt failed',
          );
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          }
        }
      }

      if (lastError) {
        throw new AssetDownloadError(assetId, lastError);
      }

      // Validate
      const stat = await fs.stat(localPath);
      if (stat.size === 0) {
        throw new Error(`Asset ${assetId} downloaded as empty file`);
      }

      return {
        id: assetId,
        localPath,
        type: asset.type as MediaType,
        mimeType: asset.mimeType,
        fileSizeBytes: stat.size,
      };
    });
  });

  const results = await Promise.all(downloadPromises);

  const assetMap = new Map<
    string,
    {
      localPath: string;
      type: MediaType;
      mimeType: string;
      fileSizeBytes: number;
    }
  >();

  for (const r of results) {
    assetMap.set(r.id, {
      localPath: r.localPath,
      type: r.type,
      mimeType: r.mimeType,
      fileSizeBytes: r.fileSizeBytes,
    });
  }

  return { localMediaDir: mediaDir, assetMap };
}
