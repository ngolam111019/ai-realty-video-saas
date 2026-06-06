// services/video-processor/src/processors/vision-cache.ts
import * as crypto from 'crypto';
import * as fs from 'fs';
import { redis } from '../lib/redis';
import { analyzeImage, AnalyzeImageInput, ImageAnalysisResult } from './ai-vision-image';
import { analyzeVideo, AnalyzeVideoInput, VideoAnalysisResult } from './ai-vision-video';

const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export function getFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

export async function getCachedImageAnalysis(
  input: AnalyzeImageInput,
): Promise<ImageAnalysisResult> {
  const hash = await getFileSha256(input.localImagePath);
  const cacheKey = `vision:cache:image:${hash}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        assetId: input.assetId,
        cacheHit: true,
      };
    } catch (e) {
      // Ignore parse error and proceed to live analysis
    }
  }

  const result = await analyzeImage(input);
  await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
  return result;
}

export async function getCachedVideoAnalysis(
  input: AnalyzeVideoInput,
): Promise<VideoAnalysisResult> {
  const hash = await getFileSha256(input.localVideoPath);
  const cacheKey = `vision:cache:video:${hash}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        assetId: input.assetId,
        cacheHit: true,
      };
    } catch (e) {
      // Ignore parse error and proceed to live analysis
    }
  }

  const result = await analyzeVideo(input);
  await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
  return result;
}
