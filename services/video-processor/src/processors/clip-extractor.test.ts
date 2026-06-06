// services/video-processor/src/processors/clip-extractor.test.ts
import { extractClip } from './clip-extractor';
import { exec } from 'child_process';
import * as fsPromises from 'fs/promises';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
}));

describe('clip-extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-01: Cắt clip thành công với các mốc thời gian đề xuất', async () => {
    (exec as unknown as jest.Mock).mockImplementation((cmd, callback) => {
      callback(null, { stdout: '' }, '');
    });

    const result = await extractClip({
      localVideoPath: '/tmp/source.mp4',
      startSeconds: 2.5,
      endSeconds: 7.5,
      localOutputPath: '/tmp/output/cut.mp4',
    });

    expect(result).toBe('/tmp/output/cut.mp4');
    expect(fsPromises.mkdir).toHaveBeenCalled();
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('ffmpeg -ss 2.500 -to 7.500 -i "/tmp/source.mp4"'),
      expect.any(Function),
    );
  });

  test('TC-02: Lỗi khi chạy lệnh FFmpeg', async () => {
    (exec as unknown as jest.Mock).mockImplementation((cmd, callback) => {
      callback(new Error('FFmpeg not found'), null, null);
    });

    await expect(
      extractClip({
        localVideoPath: '/tmp/source.mp4',
        startSeconds: 0,
        endSeconds: 5,
        localOutputPath: '/tmp/output/cut.mp4',
      }),
    ).rejects.toThrow('FFmpeg clip extraction failed');
  });
});
