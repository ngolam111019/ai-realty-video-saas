// services/video-processor/src/processors/vision-cache.test.ts
import { getCachedImageAnalysis } from './vision-cache';
import { redis } from '../lib/redis';
import { analyzeImage } from './ai-vision-image';
import * as fs from 'fs';
import { Readable } from 'stream';

jest.mock('../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('./ai-vision-image', () => ({
  analyzeImage: jest.fn(),
}));

jest.mock('./ai-vision-video', () => ({
  analyzeVideo: jest.fn(),
}));

jest.mock('fs', () => ({
  createReadStream: jest.fn(),
}));

describe('vision-cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs.createReadStream to stream a dummy buffer
    (fs.createReadStream as jest.Mock).mockImplementation(() => {
      const s = new Readable();
      s.push('dummy data');
      s.push(null);
      return s;
    });
  });

  test('TC-01: Image cache miss - calls analyzeImage and sets cache', async () => {
    (redis.get as jest.Mock).mockResolvedValueOnce(null);
    (analyzeImage as jest.Mock).mockResolvedValueOnce({
      assetId: 'a1',
      detectedRoom: 'LIVING_ROOM',
      quality: 'excellent',
      description: 'Lâm test',
      highlights: [],
      qualityIssues: [],
      suggestedUsage: '',
      cacheHit: false,
    });

    const result = await getCachedImageAnalysis({
      assetId: 'a1',
      localImagePath: '/tmp/test.jpg',
      mimeType: 'image/jpeg',
    });

    expect(redis.get).toHaveBeenCalled();
    expect(analyzeImage).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
    expect(result.cacheHit).toBe(false);
  });

  test('TC-02: Image cache hit - returns cached value without calling analyzeImage', async () => {
    const cachedResult = {
      detectedRoom: 'BEDROOM',
      quality: 'good',
      description: 'Phòng ngủ đẹp',
      highlights: [],
      qualityIssues: [],
      suggestedUsage: '',
    };
    (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedResult));

    const result = await getCachedImageAnalysis({
      assetId: 'a2',
      localImagePath: '/tmp/bedroom.jpg',
      mimeType: 'image/jpeg',
    });

    expect(redis.get).toHaveBeenCalled();
    expect(analyzeImage).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(result.cacheHit).toBe(true);
    expect(result.detectedRoom).toBe('BEDROOM');
  });
});
