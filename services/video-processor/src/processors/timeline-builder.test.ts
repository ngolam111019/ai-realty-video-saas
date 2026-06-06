// services/video-processor/src/processors/timeline-builder.test.ts
import { buildTimeline } from './timeline-builder';
import { exec } from 'child_process';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('timeline-builder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-01: Dựng trục thời gian thành công từ các tệp audio thực tế', async () => {
    // Mock ffprobe returning 6.5 seconds duration
    (exec as unknown as jest.Mock).mockImplementation((cmd, callback) => {
      callback(null, { stdout: '6.500000\n' }, '');
    });

    const mockScenes = [
      {
        id: 'sc-1',
        order: 1,
        name: 'Mở đầu',
        narration: 'Lời thoại mở đầu',
        caption: 'Phụ đề',
        suggestedDurationSeconds: 5,
        assignedAssets: [
          {
            assetId: 'img-1',
            type: 'IMAGE' as const,
            detectedRoom: 'EXTERIOR' as const,
            quality: 'excellent' as const,
            assignmentReason: 'Đẹp',
          },
        ],
        textOverlays: [],
      },
    ];

    const result = await buildTimeline({
      scenes: mockScenes,
      audioLocalPaths: { 'sc-1': '/tmp/audio1.mp3' },
      assetLocalPaths: { 'img-1': '/tmp/img1.jpg' },
    });

    expect(result.totalDuration).toBe(6.5);
    expect(result.tracks[0].audioDuration).toBe(6.5);
    expect(result.tracks[0].assets[0].duration).toBe(6.5);
    expect(result.tracks[0].assets[0].type).toBe('IMAGE');
  });
});
