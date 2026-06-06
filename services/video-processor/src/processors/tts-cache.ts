// services/video-processor/src/processors/tts-cache.ts
import * as crypto from 'crypto';
import { redis } from '../lib/redis';
import { downloadFromR2, uploadToR2 } from '../lib/s3';
import { generateTtsFpt, TtsFptInput } from './tts-fpt';
import { logger } from '../lib/logger';

const CACHE_TTL = 90 * 24 * 60 * 60; // 90 days cache

export function getTtsTextHash(text: string, voice: string, provider: string): string {
  return crypto.createHash('sha256').update(`${provider}:${voice}:${text.trim()}`).digest('hex');
}

export interface CachedTtsInput extends TtsFptInput {
  provider: 'fptai';
}

export async function getCachedTts(input: CachedTtsInput): Promise<string> {
  const hash = getTtsTextHash(input.text, input.voice, input.provider);
  const cacheKey = `tts:cache:${hash}`;

  // Step 1: Check Redis cache
  const cachedStorageKey = await redis.get(cacheKey);
  if (cachedStorageKey) {
    try {
      logger.info(
        { hash, voice: input.voice, storageKey: cachedStorageKey },
        '[tts-cache] Cache hit. Downloading audio...',
      );
      await downloadFromR2(cachedStorageKey, input.localOutputPath);
      return input.localOutputPath;
    } catch (err) {
      logger.warn(
        { hash, err },
        '[tts-cache] Failed to download cached audio, falling back to synthesis',
      );
    }
  }

  // Step 2: Cache miss - Synthesize audio
  logger.info(
    { hash, voice: input.voice },
    '[tts-cache] Cache miss. Generating audio from provider...',
  );
  await generateTtsFpt(input);

  // Step 3: Upload generated audio to R2/S3 backup cache
  const storageKey = `tts-cache/${hash}.mp3`;
  try {
    await uploadToR2(input.localOutputPath, storageKey, 'audio/mpeg');
    await redis.set(cacheKey, storageKey, 'EX', CACHE_TTL);
  } catch (uploadErr) {
    logger.warn({ hash, uploadErr }, '[tts-cache] Failed to save audio to cache storage');
  }

  return input.localOutputPath;
}
