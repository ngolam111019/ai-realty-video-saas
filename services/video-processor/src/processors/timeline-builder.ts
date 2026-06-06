// services/video-processor/src/processors/timeline-builder.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { GeneratedScene } from '../types';

const execAsync = promisify(exec);

export interface TimelineAsset {
  assetId: string;
  type: 'IMAGE' | 'VIDEO_CLIP';
  localPath: string;
  startCrop: number;
  endCrop: number;
  duration: number;
  speedFactor: number;
}

export interface TimelineSceneTrack {
  sceneId: string;
  order: number;
  audioPath: string;
  audioDuration: number;
  startAbsSeconds: number;
  endAbsSeconds: number;
  assets: TimelineAsset[];
  narrationText: string;
  captionText: string;
  textOverlays: {
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    style: 'badge' | 'highlight' | 'subtitle' | 'watermark';
  }[];
}

export interface FinalTimeline {
  totalDuration: number;
  tracks: TimelineSceneTrack[];
}

export async function getFileDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
  );
  const duration = parseFloat(stdout.trim());
  if (isNaN(duration)) {
    throw new Error(`Failed to extract duration for: ${filePath}`);
  }
  return duration;
}

export interface BuildTimelineInput {
  scenes: GeneratedScene[];
  audioLocalPaths: Record<string, string>; // Maps sceneId to local TTS mp3 path
  assetLocalPaths: Record<string, string>; // Maps assetId to local downloaded path
}

export async function buildTimeline(input: BuildTimelineInput): Promise<FinalTimeline> {
  const tracks: TimelineSceneTrack[] = [];
  let currentAbsTime = 0;

  for (const scene of input.scenes) {
    const audioPath = input.audioLocalPaths[scene.id];
    if (!audioPath) {
      throw new Error(`Missing audio path for scene: ${scene.id}`);
    }

    // Audio-first: Read actual audio duration using ffprobe
    const audioDuration = await getFileDuration(audioPath);
    const sceneStart = currentAbsTime;
    const sceneEnd = currentAbsTime + audioDuration;

    const assets: TimelineAsset[] = [];

    for (const assigned of scene.assignedAssets) {
      const localPath = input.assetLocalPaths[assigned.assetId];
      if (!localPath) {
        throw new Error(`Missing local path for asset: ${assigned.assetId}`);
      }

      if (assigned.type === 'IMAGE') {
        assets.push({
          assetId: assigned.assetId,
          type: 'IMAGE',
          localPath,
          startCrop: 0,
          endCrop: audioDuration,
          duration: audioDuration,
          speedFactor: 1.0,
        });
      } else {
        // Video clip: Calculate crops and speeds
        const cropStart = assigned.clipStartSeconds || 0;
        let cropEnd = assigned.clipEndSeconds || audioDuration;

        let videoDuration = cropEnd - cropStart;
        if (videoDuration <= 0) {
          videoDuration = audioDuration;
          cropEnd = cropStart + videoDuration;
        }

        // Calculate speed factor to stretch/compress video to match audio duration
        // speedFactor = videoDuration / audioDuration
        // E.g., if video crop is 10s and audio is 5s, speedFactor = 2.0 (we speed up video)
        // If video crop is 2.5s and audio is 5s, speedFactor = 0.5 (we slow down video)
        const speedFactor = videoDuration / audioDuration;

        assets.push({
          assetId: assigned.assetId,
          type: 'VIDEO_CLIP',
          localPath,
          startCrop: cropStart,
          endCrop: cropEnd,
          duration: audioDuration,
          speedFactor,
        });
      }
    }

    tracks.push({
      sceneId: scene.id,
      order: scene.order,
      audioPath,
      audioDuration,
      startAbsSeconds: sceneStart,
      endAbsSeconds: sceneEnd,
      assets,
      narrationText: scene.narration,
      captionText: scene.caption,
      textOverlays: scene.textOverlays,
    });

    currentAbsTime = sceneEnd;
  }

  return {
    totalDuration: currentAbsTime,
    tracks,
  };
}
