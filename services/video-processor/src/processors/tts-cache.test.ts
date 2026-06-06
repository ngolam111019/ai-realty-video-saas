// services/video-processor/src/processors/tts-cache.test.ts
import { getCachedTts } from './tts-cache';
import { redis } from '../lib/redis';
import { downloadFromR2, uploadToR2 } from '../lib/s3';
import { generateTtsFpt } from './tts-fpt';

jest.mock('../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('../lib/s3', () => ({
  downloadFromR2: jest.fn(),
  uploadToR2: jest.fn(),
}));

jest.mock('./tts-fpt', () => ({
  generateTtsFpt: jest.fn(),
}));

describe('tts-cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-01: Cache miss - Sinh giọng nói từ API và đẩy vào cache R2', async () => {
    (redis.get as jest.Mock).mockResolvedValueOnce(null);
    (generateTtsFpt as jest.Mock).mockResolvedValueOnce('/tmp/tts.mp3');
    (uploadToR2 as jest.Mock).mockResolvedValueOnce('https://cdn.com/tts-cache/abc.mp3');

    const result = await getCachedTts({
      provider: 'fptai',
      text: 'Chào bạn',
      voice: 'lannhi',
      localOutputPath: '/tmp/tts.mp3',
    });

    expect(result).toBe('/tmp/tts.mp3');
    expect(redis.get).toHaveBeenCalled();
    expect(generateTtsFpt).toHaveBeenCalled();
    expect(uploadToR2).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
  });

  test('TC-02: Cache hit - Tải trực tiếp từ R2 mà không gọi FPT API', async () => {
    (redis.get as jest.Mock).mockResolvedValueOnce('tts-cache/abc.mp3');
    (downloadFromR2 as jest.Mock).mockResolvedValueOnce(undefined);

    const result = await getCachedTts({
      provider: 'fptai',
      text: 'Chào bạn',
      voice: 'lannhi',
      localOutputPath: '/tmp/tts-hit.mp3',
    });

    expect(result).toBe('/tmp/tts-hit.mp3');
    expect(redis.get).toHaveBeenCalled();
    expect(downloadFromR2).toHaveBeenCalledWith('tts-cache/abc.mp3', '/tmp/tts-hit.mp3');
    expect(generateTtsFpt).not.toHaveBeenCalled();
    expect(uploadToR2).not.toHaveBeenCalled();
  });
});
