// services/video-processor/src/processors/media-downloader.test.ts
import { downloadMediaAssets, AssetDownloadError, AssetNotFoundError } from './media-downloader';
import { db } from '../lib/db';
import { downloadFromR2 } from '../lib/s3';
import * as fs from 'fs/promises';

// Mock DB and S3 methods
jest.mock('../lib/db', () => ({
  db: {
    mediaAsset: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../lib/s3', () => ({
  downloadFromR2: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  stat: jest.fn(),
}));

describe('downloadMediaAssets', () => {
  const mockDbAssets = [
    { id: 'asset-1', type: 'IMAGE', storageKey: 'keys/1.jpg', mimeType: 'image/jpeg' },
    { id: 'asset-2', type: 'VIDEO_CLIP', storageKey: 'keys/2.mp4', mimeType: 'video/mp4' },
    { id: 'portrait-1', type: 'PORTRAIT', storageKey: 'keys/port.png', mimeType: 'image/png' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (db.mediaAsset.findMany as jest.Mock).mockResolvedValue(mockDbAssets);
    (downloadFromR2 as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue({ size: 100 });
  });

  test('TC-01: Download thành công 5 ảnh', async () => {
    const fiveAssetsInput = {
      draftId: 'draft-five',
      mediaAssetIds: ['a1', 'a2', 'a3', 'a4', 'a5'],
    };
    const fiveDbAssets = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i + 1}`,
      type: 'IMAGE',
      storageKey: `keys/${i + 1}.jpg`,
      mimeType: 'image/jpeg',
    }));
    (db.mediaAsset.findMany as jest.Mock).mockResolvedValueOnce(fiveDbAssets);

    const result = await downloadMediaAssets(fiveAssetsInput);
    expect(db.mediaAsset.findMany).toHaveBeenCalledTimes(1);
    expect(downloadFromR2).toHaveBeenCalledTimes(5);
    expect(result.assetMap.size).toBe(5);
    expect(result.localMediaDir).toContain('draft-five');
  });

  test('TC-02: Download 1 ảnh + 1 portrait', async () => {
    const input = {
      draftId: 'draft-one-port',
      mediaAssetIds: ['asset-1'],
      portraitAssetId: 'portrait-1',
    };
    const assets = [mockDbAssets[0], mockDbAssets[2]];
    (db.mediaAsset.findMany as jest.Mock).mockResolvedValueOnce(assets);

    const result = await downloadMediaAssets(input);
    expect(result.assetMap.size).toBe(2);
    expect(result.assetMap.has('asset-1')).toBe(true);
    expect(result.assetMap.has('portrait-1')).toBe(true);
  });

  test('TC-03: Download song song không conflict', async () => {
    const tenAssetsInput = {
      draftId: 'draft-ten',
      mediaAssetIds: Array.from({ length: 10 }, (_, i) => `asset-${i}`),
    };
    const tenDbAssets = Array.from({ length: 10 }, (_, i) => ({
      id: `asset-${i}`,
      type: 'IMAGE',
      storageKey: `keys/${i}.jpg`,
      mimeType: 'image/jpeg',
    }));
    (db.mediaAsset.findMany as jest.Mock).mockResolvedValueOnce(tenDbAssets);

    const result = await downloadMediaAssets(tenAssetsInput);
    expect(result.assetMap.size).toBe(10);
    expect(downloadFromR2).toHaveBeenCalledTimes(10);
  });

  test('TC-04: Retry khi R2 lỗi lần 1 và 2, thành công lần 3', async () => {
    let callCount = 0;
    (downloadFromR2 as jest.Mock).mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error('Network error');
      }
      return undefined;
    });

    const result = await downloadMediaAssets({ draftId: 'test-retry', mediaAssetIds: ['asset-1'] });
    expect(result.assetMap.has('asset-1')).toBe(true);
    expect(callCount).toBe(3);
  });

  test('TC-05: Throw AssetDownloadError sau 3 lần fail', async () => {
    (downloadFromR2 as jest.Mock).mockRejectedValue(new Error('R2 unavailable'));

    await expect(
      downloadMediaAssets({ draftId: 'test-fail', mediaAssetIds: ['asset-1'] }),
    ).rejects.toThrow(AssetDownloadError);
  });

  test('TC-06: Throw nếu assetId không tồn tại trong DB', async () => {
    (db.mediaAsset.findMany as jest.Mock).mockResolvedValueOnce([]);

    await expect(
      downloadMediaAssets({ draftId: 'test-notfound', mediaAssetIds: ['nonexistent-id'] }),
    ).rejects.toThrow(AssetNotFoundError);
  });
});
