// services/video-processor/src/processors/tts-fpt.ts
import axios from 'axios';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { logger } from '../lib/logger';

export interface TtsFptInput {
  text: string;
  voice: string;
  localOutputPath: string;
}

export async function generateTtsFpt(input: TtsFptInput): Promise<string> {
  const apiKey = process.env.FPT_API_KEY;
  if (!apiKey) {
    throw new Error('Missing FPT_API_KEY in environment variables');
  }

  // Create directory if not exists
  const dir = path.dirname(input.localOutputPath);
  await fsPromises.mkdir(dir, { recursive: true });

  logger.info({ voice: input.voice }, '[tts-fpt] Calling FPT.AI TTS API...');

  // Call FPT.AI TTS API v5
  const response = await axios.post('https://api.fpt.ai/hmi/tts/v5', input.text, {
    headers: {
      api_key: apiKey,
      voice: input.voice,
      speed: '0',
      'Content-Type': 'text/plain',
    },
  });

  const asyncUrl = response.data.async || response.data.message;
  if (!asyncUrl || response.data.success === 'false') {
    throw new Error(`FPT.AI TTS API error: ${response.data.message || 'Unknown error'}`);
  }

  logger.info({ asyncUrl }, '[tts-fpt] Synthesis initiated. Polling for audio file...');

  // Poll the async URL until it is ready (200 OK)
  let fileReady = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const headResponse = await axios.head(asyncUrl);
      if (headResponse.status === 200) {
        fileReady = true;
        break;
      }
    } catch (err) {
      // 404/403 means the file is not generated yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  if (!fileReady) {
    throw new Error('Timeout waiting for FPT.AI TTS audio file to be ready');
  }

  logger.info('[tts-fpt] Audio file ready. Downloading...');

  // Download the file
  const downloadResponse = await axios.get(asyncUrl, { responseType: 'stream' });
  const writer = fs.createWriteStream(input.localOutputPath);
  downloadResponse.data.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', () => resolve());
    writer.on('error', (err) => reject(err));
  });

  return input.localOutputPath;
}
