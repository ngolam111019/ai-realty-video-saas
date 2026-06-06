// services/video-processor/src/processors/ffmpeg-renderer.test.ts
import { renderWithFFmpeg } from './ffmpeg-renderer';
import { exec } from 'child_process';
import * as fsPromises from 'fs/promises';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  stat: jest.fn().mockResolvedValue({ size: 12345 }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

describe('ffmpeg-renderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTimeline = {
    totalDuration: 10,
    tracks: [
      {
        sceneId: 'scene-1',
        order: 1,
        audioPath: '/tmp/audio1.mp3',
        audioDuration: 5,
        startAbsSeconds: 0,
        endAbsSeconds: 5,
        narrationText: 'Hello',
        captionText: 'Welcome to Sunwah',
        textOverlays: [],
        assets: [
          {
            assetId: 'a1',
            type: 'IMAGE' as const,
            localPath: '/tmp/image1.jpg',
            startCrop: 0,
            endCrop: 5,
            duration: 5,
            speedFactor: 1,
          },
        ],
      },
      {
        sceneId: 'scene-2',
        order: 2,
        audioPath: '/tmp/audio2.mp3',
        audioDuration: 5,
        startAbsSeconds: 5,
        endAbsSeconds: 10,
        narrationText: 'Inside',
        captionText: 'Beautiful Living Room',
        textOverlays: [],
        assets: [
          {
            assetId: 'a2',
            type: 'VIDEO_CLIP' as const,
            localPath: '/tmp/video2.mp4',
            startCrop: 2,
            endCrop: 7,
            duration: 5,
            speedFactor: 1.0,
          },
        ],
      },
    ],
  };

  test('TC-01: Renders segments, concats them, and outputs final MP4 details', async () => {
    (exec as unknown as jest.Mock).mockImplementation((cmd, cb) => {
      cb(null, { stdout: '', stderr: '' });
    });

    const result = await renderWithFFmpeg({
      timeline: mockTimeline,
      outputPath: '/tmp/output.mp4',
      jobId: 'job-123',
      avatarLocalPath: '/tmp/avatar.png',
      backgroundMusicPath: '/tmp/bgm.mp3',
    });

    expect(result.outputPath).toBe('/tmp/output.mp4');
    expect(result.durationSeconds).toBe(10);
    expect(result.fileSizeBytes).toBe(12345);

    expect(fsPromises.mkdir).toHaveBeenCalled();
    expect(fsPromises.writeFile).toHaveBeenCalled();

    // Verify exec was called multiple times (2 scenes + 1 concat + 1 final)
    expect(exec).toHaveBeenCalledTimes(4);
  });
});
