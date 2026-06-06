// services/video-processor/src/processors/ai-vision-image.test.ts
import { analyzeImage } from './ai-vision-image';
import { genAI } from '../lib/gemini';
import * as fs from 'fs/promises';

jest.mock('../lib/gemini', () => ({
  genAI: {
    getGenerativeModel: jest.fn(),
  },
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('analyzeImage', () => {
  const mockGenerateContent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (genAI.getGenerativeModel as jest.Mock).mockReturnValue({
      generateContent: mockGenerateContent,
    });
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('fake-image-data'));
  });

  test('TC-01: Phân tích ảnh phòng khách', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            detectedRoom: 'LIVING_ROOM',
            quality: 'excellent',
            description: 'Phòng khách rộng rãi, ánh sáng tự nhiên tốt',
            highlights: ['view hồ bơi', 'nội thất hiện đại'],
            qualityIssues: [],
            suggestedUsage: 'Phù hợp cho scene giới thiệu tổng quan',
          }),
      },
    });

    const result = await analyzeImage({
      assetId: 'a1',
      localImagePath: '/tmp/living-room.jpg',
      mimeType: 'image/jpeg',
    });

    expect(result.detectedRoom).toBe('LIVING_ROOM');
    expect(result.quality).toBe('excellent');
    expect(result.description).toBe('Phòng khách rộng rãi, ánh sáng tự nhiên tốt');
    expect(result.highlights).toContain('view hồ bơi');
    expect(result.assetId).toBe('a1');
  });

  test('TC-02: Phân tích ảnh mặt tiền (exterior)', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            detectedRoom: 'EXTERIOR',
            quality: 'good',
            description: 'Mặt tiền tòa nhà',
            highlights: [],
            qualityIssues: [],
            suggestedUsage: 'Phù hợp cho scene mở đầu',
          }),
      },
    });

    const result = await analyzeImage({
      assetId: 'a2',
      localImagePath: '/tmp/exterior.jpg',
      mimeType: 'image/jpeg',
    });

    expect(result.detectedRoom).toBe('EXTERIOR');
    expect(result.quality).toBe('good');
  });

  test('TC-03: Phân tích ảnh chân dung sale', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            detectedRoom: 'PORTRAIT',
            quality: 'excellent',
            description: 'Ảnh chân dung sale chuyên nghiệp',
            highlights: [],
            qualityIssues: [],
            suggestedUsage: 'Phù hợp làm avatar góc màn hình',
          }),
      },
    });

    const result = await analyzeImage({
      assetId: 'p1',
      localImagePath: '/tmp/portrait.jpg',
      mimeType: 'image/jpeg',
    });

    expect(result.detectedRoom).toBe('PORTRAIT');
    expect(result.quality).toBe('excellent');
  });

  test('TC-04: Output JSON hợp lệ (không throw parse error)', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            detectedRoom: 'KITCHEN',
            quality: 'poor',
            description: 'Nhà bếp hơi bừa bộn',
            highlights: [],
            qualityIssues: ['bừa bộn'],
            suggestedUsage: 'Hạn chế hiển thị lâu',
          }),
      },
    });

    const result = await analyzeImage({
      assetId: 'a3',
      localImagePath: '/tmp/kitchen.jpg',
      mimeType: 'image/jpeg',
    });

    expect(result).toMatchObject({
      assetId: 'a3',
      detectedRoom: 'KITCHEN',
      quality: 'poor',
      description: 'Nhà bếp hơi bừa bộn',
    });
  });

  test('TC-05: Throw nếu file không tồn tại', async () => {
    (fs.readFile as jest.Mock).mockRejectedValueOnce(
      new Error('ENOENT: no such file or directory'),
    );

    await expect(
      analyzeImage({
        assetId: 'a99',
        localImagePath: '/tmp/nonexistent.jpg',
        mimeType: 'image/jpeg',
      }),
    ).rejects.toThrow();
  });
});
