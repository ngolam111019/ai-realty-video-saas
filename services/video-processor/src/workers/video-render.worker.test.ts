// services/video-processor/src/workers/video-render.worker.test.ts
import { videoRenderWorker } from './video-render.worker';
import { db } from '../lib/db';
import { downloadMediaAssets } from '../processors/media-downloader';
import { getCachedTts } from '../processors/tts-cache';
import { buildTimeline } from '../processors/timeline-builder';
import { renderWithFFmpeg } from '../processors/ffmpeg-renderer';
import { uploadVideo } from '../processors/uploader';

jest.mock('../lib/db', () => ({
  db: {
    videoJob: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tokenWallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(db)),
  },
}));

jest.mock('../lib/redis', () => ({
  redis: {
    publish: jest.fn(),
  },
}));

jest.mock('../processors/media-downloader', () => ({
  downloadMediaAssets: jest.fn(),
}));

jest.mock('../processors/tts-cache', () => ({
  getCachedTts: jest.fn(),
}));

jest.mock('../processors/clip-extractor', () => ({
  extractClip: jest.fn(),
}));

jest.mock('../processors/timeline-builder', () => ({
  buildTimeline: jest.fn(),
}));

jest.mock('../processors/ffmpeg-renderer', () => ({
  renderWithFFmpeg: jest.fn(),
}));

jest.mock('../processors/uploader', () => ({
  uploadVideo: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  rm: jest.fn(),
  stat: jest.fn().mockResolvedValue({ size: 12345 }),
}));

jest.mock('fs', () => ({
  createWriteStream: jest.fn().mockReturnValue({
    on: jest.fn().mockImplementation((event, cb) => {
      if (event === 'finish') process.nextTick(cb);
    }),
    pipe: jest.fn(),
  }),
}));

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      pipe: jest.fn(),
    },
  }),
}));

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation((name, processor) => {
      return {
        name,
        processor,
        on: jest.fn(),
      };
    }),
  };
});

describe('video-render.worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-01: Orchestrator runs render pipeline successfully', async () => {
    const processor = (videoRenderWorker as any).processor;

    const mockJob = {
      id: 'job-1',
      userId: 'u1',
      tokenCost: 5,
      tokenRefunded: false,
      ttsProvider: 'fptai',
      ttsVoiceId: 'lannhi',
      user: {
        avatarUrl: 'https://avatar.png',
      },
      project: {
        mediaAssets: [],
      },
      scriptDraft: {
        id: 'draft-1',
        scenes: [
          {
            id: 's1',
            order: 1,
            narration: 'Hello',
            caption: 'Hi',
            assignedAssets: [{ assetId: 'a1', type: 'IMAGE' }],
          },
        ],
      },
    };

    (db.videoJob.findUnique as jest.Mock).mockResolvedValueOnce(mockJob);

    const mockAssetMap = new Map();
    mockAssetMap.set('a1', { localPath: '/tmp/a1.jpg', type: 'IMAGE', mimeType: 'image/jpeg' });

    (downloadMediaAssets as jest.Mock).mockResolvedValueOnce({
      localMediaDir: '/tmp/d1/media',
      assetMap: mockAssetMap,
    });

    (getCachedTts as jest.Mock).mockResolvedValueOnce('/tmp/audio1.mp3');

    (buildTimeline as jest.Mock).mockResolvedValueOnce({
      totalDuration: 10,
      tracks: [],
    });

    (renderWithFFmpeg as jest.Mock).mockResolvedValueOnce({
      outputPath: '/tmp/final.mp4',
      durationSeconds: 10,
      fileSizeBytes: 12345,
    });

    (uploadVideo as jest.Mock).mockResolvedValueOnce({
      videoUrl: 'https://cdn.com/out.mp4',
      thumbnailUrl: 'https://cdn.com/thumb.jpg',
      videoKey: 'videos/out.mp4',
      thumbnailKey: 'videos/thumb.jpg',
      fileSizeBytes: 12345,
      durationSeconds: 10,
    });

    const result = await processor({ id: 'bull-1', data: { jobId: 'job-1' } } as any);

    expect(result).toEqual({ status: 'COMPLETED', jobId: 'job-1' });
    expect(db.videoJob.findUnique).toHaveBeenCalled();
    expect(downloadMediaAssets).toHaveBeenCalled();
    expect(getCachedTts).toHaveBeenCalled();
    expect(buildTimeline).toHaveBeenCalled();
    expect(renderWithFFmpeg).toHaveBeenCalled();
    expect(uploadVideo).toHaveBeenCalled();
    expect(db.videoJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          outputUrl: 'https://cdn.com/out.mp4',
        }),
      }),
    );
  });

  test('TC-02: Pipeline fails -> updates job to FAILED and refunds tokens', async () => {
    const processor = (videoRenderWorker as any).processor;

    (db.videoJob.findUnique as jest.Mock).mockRejectedValueOnce(new Error('Render error'));

    // For transaction mocks
    const mockJobRecord = {
      id: 'job-2',
      userId: 'u1',
      tokenCost: 5,
      tokenRefunded: false,
    };
    const mockWallet = {
      balance: 10,
    };
    (db.videoJob.findUnique as jest.Mock).mockResolvedValueOnce(mockJobRecord);
    (db.tokenWallet.findUnique as jest.Mock).mockResolvedValueOnce(mockWallet);

    await expect(processor({ id: 'bull-2', data: { jobId: 'job-2' } } as any)).rejects.toThrow(
      'Render error',
    );

    expect(db.videoJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-2' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Render error',
        }),
      }),
    );
    expect(db.tokenWallet.update).toHaveBeenCalled();
    expect(db.transaction.create).toHaveBeenCalled();
  });
});
