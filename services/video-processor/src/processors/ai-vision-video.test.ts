// services/video-processor/src/processors/ai-vision-video.test.ts
import { analyzeVideo } from './ai-vision-video';
import { genAI } from '../lib/gemini';
import * as fs from 'fs/promises';
import { exec } from 'child_process';

jest.mock('../lib/gemini', () => ({
  genAI: {
    getGenerativeModel: jest.fn(),
  },
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('analyzeVideo', () => {
  const mockGenerateContent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (genAI.getGenerativeModel as jest.Mock).mockReturnValue({
      generateContent: mockGenerateContent,
    });
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('fake-frame-data'));
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
  });

  test('TC-01: Phân tích video phòng khách và trích xuất thành công', async () => {
    // Mock ffprobe returning 10.0 seconds duration
    (exec as unknown as jest.Mock).mockImplementation((cmd: string, callback: any) => {
      if (cmd.includes('ffprobe')) {
        callback(null, { stdout: '10.000000\n' }, '');
      } else {
        // ffmpeg extract frame
        callback(null, { stdout: '' }, '');
      }
    });

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            detectedRoom: 'LIVING_ROOM',
            quality: 'excellent',
            description: 'Phòng khách có ánh sáng tự nhiên tốt',
            highlights: ['sáng sủa', 'rộng'],
            qualityIssues: [],
            suggestedUsage: 'Mở đầu video giới thiệu phòng khách',
            cropStartSeconds: 1.5,
            cropEndSeconds: 8.5,
          }),
      },
    });

    const result = await analyzeVideo({
      assetId: 'v1',
      localVideoPath: '/tmp/living.mp4',
      mimeType: 'video/mp4',
    });

    expect(result.detectedRoom).toBe('LIVING_ROOM');
    expect(result.quality).toBe('excellent');
    expect(result.durationSeconds).toBe(10);
    expect(result.cropStartSeconds).toBe(1.5);
    expect(result.cropEndSeconds).toBe(8.5);
    expect(fs.unlink).toHaveBeenCalledTimes(3);
  });

  test('TC-02: Xử lý lỗi nếu ffprobe thất bại', async () => {
    (exec as unknown as jest.Mock).mockImplementation((cmd: string, callback: any) => {
      callback(new Error('ffprobe command failed'), null, null);
    });

    await expect(
      analyzeVideo({
        assetId: 'v2',
        localVideoPath: '/tmp/invalid.mp4',
        mimeType: 'video/mp4',
      }),
    ).rejects.toThrow();
  });
});
