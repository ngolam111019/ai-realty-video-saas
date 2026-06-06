// services/video-processor/src/workers/script-gen.worker.test.ts
import { scriptGenWorker } from './script-gen.worker';
import { db } from '../lib/db';
import { downloadMediaAssets } from '../processors/media-downloader';
import { getCachedImageAnalysis, getCachedVideoAnalysis } from '../processors/vision-cache';
import { generateScript } from '../processors/script-generator';
import { saveDraftSuccess, saveDraftFailure } from '../processors/draft-saver';
import * as fs from 'fs/promises';

jest.mock('../lib/db', () => ({
  db: {
    scriptDraft: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../lib/redis', () => ({
  redis: {},
}));

jest.mock('../processors/media-downloader', () => ({
  downloadMediaAssets: jest.fn(),
}));

jest.mock('../processors/vision-cache', () => ({
  getCachedImageAnalysis: jest.fn(),
  getCachedVideoAnalysis: jest.fn(),
}));

jest.mock('../processors/script-generator', () => ({
  generateScript: jest.fn(),
}));

jest.mock('../processors/draft-saver', () => ({
  updateDraftProgress: jest.fn(),
  saveDraftSuccess: jest.fn(),
  saveDraftFailure: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  rm: jest.fn(),
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

describe('script-gen.worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-01: Chạy thành công toàn bộ pipeline của orchestrator', async () => {
    // Get processor function from worker mock
    const processor = (scriptGenWorker as any).processor;

    const mockDraft = {
      id: 'd1',
      project: {
        name: 'Vinhomes',
        propertyType: 'APARTMENT',
        amenities: [],
        highlights: [],
        mediaAssets: [
          { id: 'a1', type: 'IMAGE', storageUrl: 'url1' },
          { id: 'a2', type: 'VIDEO_CLIP', storageUrl: 'url2' },
        ],
      },
      template: {
        scenes: [],
      },
    };

    (db.scriptDraft.findUnique as jest.Mock).mockResolvedValueOnce(mockDraft);

    const mockAssetMap = new Map();
    mockAssetMap.set('a1', { localPath: '/tmp/a1.jpg', type: 'IMAGE', mimeType: 'image/jpeg' });
    mockAssetMap.set('a2', { localPath: '/tmp/a2.mp4', type: 'VIDEO_CLIP', mimeType: 'video/mp4' });

    (downloadMediaAssets as jest.Mock).mockResolvedValueOnce({
      localMediaDir: '/tmp/d1/media',
      assetMap: mockAssetMap,
    });

    (getCachedImageAnalysis as jest.Mock).mockResolvedValueOnce({
      detectedRoom: 'LIVING_ROOM',
      quality: 'excellent',
      description: 'Phòng khách đẹp',
    });

    (getCachedVideoAnalysis as jest.Mock).mockResolvedValueOnce({
      detectedRoom: 'BEDROOM',
      quality: 'good',
      description: 'Phòng ngủ rộng',
      durationSeconds: 10,
      cropStartSeconds: 0,
      cropEndSeconds: 10,
    });

    (generateScript as jest.Mock).mockResolvedValueOnce({
      title: 'Nhà Vinhomes',
      scenes: [],
      suggestedCaption: 'Caption...',
      suggestedHashtags: [],
    });

    const result = await processor({ id: 'j1', data: { draftId: 'd1' } } as any);

    expect(result).toEqual({ status: 'READY', draftId: 'd1' });
    expect(db.scriptDraft.findUnique).toHaveBeenCalled();
    expect(downloadMediaAssets).toHaveBeenCalled();
    expect(getCachedImageAnalysis).toHaveBeenCalled();
    expect(getCachedVideoAnalysis).toHaveBeenCalled();
    expect(generateScript).toHaveBeenCalled();
    expect(saveDraftSuccess).toHaveBeenCalled();
    expect(fs.rm).toHaveBeenCalledWith('/tmp/d1/media', { recursive: true, force: true });
  });

  test('TC-02: Pipeline thất bại - gọi saveDraftFailure và ném lỗi', async () => {
    const processor = (scriptGenWorker as any).processor;

    (db.scriptDraft.findUnique as jest.Mock).mockRejectedValueOnce(new Error('Lỗi database'));

    await expect(processor({ id: 'j1', data: { draftId: 'd2' } } as any)).rejects.toThrow(
      'Lỗi database',
    );

    expect(saveDraftFailure).toHaveBeenCalledWith({
      draftId: 'd2',
      errorMessage: 'Lỗi database',
      failedStep: 'FETCHING_DATA',
    });
  });
});
