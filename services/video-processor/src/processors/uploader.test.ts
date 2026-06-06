// services/video-processor/src/processors/uploader.test.ts
import { uploadVideo } from './uploader';
import { uploadToR2 } from '../lib/s3';
import { getFileDuration } from './timeline-builder';
import { exec } from 'child_process';
import * as fsPromises from 'fs/promises';

jest.mock('../lib/s3', () => ({
  uploadToR2: jest.fn(),
}));

jest.mock('./timeline-builder', () => ({
  getFileDuration: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  stat: jest.fn().mockResolvedValue({ size: 98765 }),
  unlink: jest.fn(),
}));

describe('uploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-01: Extracts thumbnail, uploads both files, and returns CDN URLs and metadata', async () => {
    (exec as unknown as jest.Mock).mockImplementation((cmd, cb) => {
      cb(null, { stdout: '', stderr: '' });
    });

    (uploadToR2 as jest.Mock)
      .mockResolvedValueOnce('https://cdn.com/videos/u1/j1/output.mp4')
      .mockResolvedValueOnce('https://cdn.com/videos/u1/j1/thumbnail.jpg');

    (getFileDuration as jest.Mock).mockResolvedValueOnce(15.5);

    const result = await uploadVideo({
      localVideoPath: '/tmp/render-out.mp4',
      userId: 'user-001',
      jobId: 'job-123',
    });

    expect(result.videoUrl).toBe('https://cdn.com/videos/u1/j1/output.mp4');
    expect(result.thumbnailUrl).toBe('https://cdn.com/videos/u1/j1/thumbnail.jpg');
    expect(result.videoKey).toBe('videos/user-001/job-123/output.mp4');
    expect(result.thumbnailKey).toBe('videos/user-001/job-123/thumbnail.jpg');
    expect(result.fileSizeBytes).toBe(98765);
    expect(result.durationSeconds).toBe(15.5);

    expect(exec).toHaveBeenCalled();
    expect(uploadToR2).toHaveBeenCalledTimes(2);
    expect(fsPromises.unlink).toHaveBeenCalled();
  });
});
