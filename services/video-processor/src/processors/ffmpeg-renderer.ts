// services/video-processor/src/processors/ffmpeg-renderer.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { FinalTimeline } from './timeline-builder';
import { logger } from '../lib/logger';

const execAsync = promisify(exec);

export interface FFmpegRendererInput {
  timeline: FinalTimeline;
  outputPath: string;
  jobId: string;
  avatarLocalPath?: string;
  backgroundMusicPath?: string;
}

export interface RendererOutput {
  outputPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
}

function getFontPath(): string {
  const macFont = '/System/Library/Fonts/Supplemental/Arial.ttf';
  const linuxFont = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const linuxFont2 = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';

  if (fs.existsSync(macFont)) return macFont;
  if (fs.existsSync(linuxFont)) return linuxFont;
  if (fs.existsSync(linuxFont2)) return linuxFont2;
  return 'Arial';
}

function escapeDrawtextText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
}

export async function renderWithFFmpeg(input: FFmpegRendererInput): Promise<RendererOutput> {
  const jobId = input.jobId;
  const tempDir = path.join('/tmp', 'video-processor', jobId);
  const segmentsDir = path.join(tempDir, 'segments');
  await fsPromises.mkdir(segmentsDir, { recursive: true });

  const fontPath = getFontPath();
  const segmentPaths: string[] = [];

  // Step 1: Render each scene individually
  for (const track of input.timeline.tracks) {
    const segmentPath = path.join(segmentsDir, `scene_${track.order}.mp4`);
    segmentPaths.push(segmentPath);

    const asset = track.assets[0];
    if (!asset) {
      throw new Error(`No asset assigned to scene: ${track.sceneId}`);
    }

    const duration = track.audioDuration;
    const escapedCaption = escapeDrawtextText(track.captionText);

    // Common video filters: scale and pad to 1080x1920 (9:16)
    // and draw the caption at the bottom center.
    const drawtextFilter = `drawtext=text='${escapedCaption}':fontfile='${fontPath}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-220:box=1:boxcolor=black@0.6:boxborderw=15`;
    const scaleFilter = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2`;

    let command = '';

    if (asset.type === 'IMAGE') {
      // Input 0: Image, Input 1: Narration audio
      command = [
        'ffmpeg',
        '-loop 1',
        `-i "${asset.localPath}"`,
        `-i "${track.audioPath}"`,
        `-t ${duration}`,
        `-vf "${scaleFilter},${drawtextFilter}"`,
        '-map 0:v:0',
        '-map 1:a:0',
        '-c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p',
        '-c:a aac -ar 44100 -ac 2',
        `-y "${segmentPath}"`,
      ].join(' ');
    } else {
      // Input 0: Video, Input 1: Narration audio
      const startStr = asset.startCrop.toFixed(3);
      const durationStr = (asset.endCrop - asset.startCrop).toFixed(3);
      const speedPts = (1 / asset.speedFactor).toFixed(6);

      command = [
        'ffmpeg',
        `-ss ${startStr}`,
        `-t ${durationStr}`,
        `-i "${asset.localPath}"`,
        `-i "${track.audioPath}"`,
        `-t ${duration}`,
        `-vf "${scaleFilter},setpts=${speedPts}*PTS,${drawtextFilter}"`,
        '-map 0:v:0',
        '-map 1:a:0',
        '-c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p',
        '-c:a aac -ar 44100 -ac 2',
        `-y "${segmentPath}"`,
      ].join(' ');
    }

    try {
      logger.info({ order: track.order, command }, '[ffmpeg-renderer] Rendering scene segment...');
      await execAsync(command);
    } catch (err: any) {
      throw new Error(`Failed to render scene segment ${track.order}: ${err.message || err}`);
    }
  }

  // Step 2: Concat all scene segments
  const concatListPath = path.join(tempDir, 'concat.txt');
  const concatContent = segmentPaths.map((p) => `file '${p}'`).join('\n');
  await fsPromises.writeFile(concatListPath, concatContent);

  const mergedPath = path.join(tempDir, 'merged.mp4');
  const concatCommand = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${mergedPath}"`;

  try {
    logger.info({ concatCommand }, '[ffmpeg-renderer] Concatenating scene segments...');
    await execAsync(concatCommand);
  } catch (err: any) {
    throw new Error(`Failed to concatenate segments: ${err.message || err}`);
  }

  // Step 3: Mix background music and overlay circular portrait avatar
  const outDir = path.dirname(input.outputPath);
  await fsPromises.mkdir(outDir, { recursive: true });

  const inputs: string[] = [`-i "${mergedPath}"`];
  let filterComplex = '';
  let mapArgs = '';

  if (input.avatarLocalPath && input.backgroundMusicPath) {
    inputs.push(`-i "${input.avatarLocalPath}"`);
    inputs.push(`-i "${input.backgroundMusicPath}"`);
    filterComplex = [
      '-filter_complex "',
      `[1:v]crop='min(iw,ih)':'min(iw,ih)',scale=150:150,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-75,Y-75),75),255,0)'[avatar];`,
      `[0:v][avatar]overlay=50:main_h-overlay_h-50[vout];`,
      `[2:a]volume=0.08[bgm];`,
      `[0:a][bgm]amix=inputs=2:duration=first[aout]`,
      '"',
    ].join('');
    mapArgs = '-map "[vout]" -map "[aout]"';
  } else if (input.avatarLocalPath) {
    inputs.push(`-i "${input.avatarLocalPath}"`);
    filterComplex = [
      '-filter_complex "',
      `[1:v]crop='min(iw,ih)':'min(iw,ih)',scale=150:150,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-75,Y-75),75),255,0)'[avatar];`,
      `[0:v][avatar]overlay=50:main_h-overlay_h-50[vout]`,
      '"',
    ].join('');
    mapArgs = '-map "[vout]" -map 0:a';
  } else if (input.backgroundMusicPath) {
    inputs.push(`-i "${input.backgroundMusicPath}"`);
    filterComplex = [
      '-filter_complex "',
      `[1:a]volume=0.08[bgm];`,
      `[0:a][bgm]amix=inputs=2:duration=first[aout]`,
      '"',
    ].join('');
    mapArgs = '-map 0:v -map "[aout]"';
  }

  let finalCommand = '';
  if (filterComplex) {
    finalCommand = [
      'ffmpeg',
      ...inputs,
      filterComplex,
      mapArgs,
      '-c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p',
      '-c:a aac -ar 44100 -ac 2',
      `-y "${input.outputPath}"`,
    ].join(' ');
  } else {
    finalCommand = `ffmpeg -i "${mergedPath}" -c copy -y "${input.outputPath}"`;
  }

  try {
    logger.info({ finalCommand }, '[ffmpeg-renderer] Finalizing video render...');
    await execAsync(finalCommand);
  } catch (err: any) {
    throw new Error(`Failed to finalize video render: ${err.message || err}`);
  }

  // Get output file details
  const stats = await fsPromises.stat(input.outputPath);
  return {
    outputPath: input.outputPath,
    durationSeconds: input.timeline.totalDuration,
    fileSizeBytes: stats.size,
  };
}
