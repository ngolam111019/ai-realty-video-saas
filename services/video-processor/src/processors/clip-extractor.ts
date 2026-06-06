// services/video-processor/src/processors/clip-extractor.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ClipExtractorInput {
  localVideoPath: string;
  startSeconds: number;
  endSeconds: number;
  localOutputPath: string;
}

export async function extractClip(input: ClipExtractorInput): Promise<string> {
  const dir = path.dirname(input.localOutputPath);
  await fsPromises.mkdir(dir, { recursive: true });

  const startStr = input.startSeconds.toFixed(3);
  const endStr = input.endSeconds.toFixed(3);

  // Re-encode to ensure perfect keyframe alignment and stream stability
  const command = `ffmpeg -ss ${startStr} -to ${endStr} -i "${input.localVideoPath}" -c:v libx264 -c:a aac -avoid_negative_ts make_zero -y "${input.localOutputPath}"`;

  try {
    await execAsync(command);
  } catch (error: any) {
    throw new Error(`FFmpeg clip extraction failed: ${error.message || error}`);
  }

  return input.localOutputPath;
}
