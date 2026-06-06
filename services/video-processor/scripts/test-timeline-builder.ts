// services/video-processor/scripts/test-timeline-builder.ts
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const audioPath = path.resolve(__dirname, '../test-tts-out.mp3');
  const videoPath = path.resolve(__dirname, '../test-property.mp4');

  if (!fs.existsSync(audioPath)) {
    console.error(`Không tìm thấy file audio test tại: ${audioPath}`);
    console.info('Vui lòng chạy lệnh pnpm test:tts-fpt trước để tạo file test-tts-out.mp3.');
    process.exit(1);
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`Không tìm thấy file video test tại: ${videoPath}`);
    console.info(
      'Vui lòng chuẩn bị file test-property.mp4 trong thư mục services/video-processor.',
    );
    process.exit(1);
  }

  console.info('Đang giả lập kịch bản và dựng trục thời gian Audio-First (W2-05)...');

  // Giả lập kịch bản 2 cảnh
  const mockScenes = [
    {
      id: 'scene-1',
      order: 1,
      name: 'Giới thiệu',
      narration: 'Chào mừng bạn đến với căn hộ cao cấp.',
      caption: 'Sunwah Pearl view sông',
      suggestedDurationSeconds: 5,
      assignedAssets: [
        {
          assetId: 'asset-video',
          type: 'VIDEO_CLIP' as const,
          detectedRoom: 'LIVING_ROOM' as const,
          quality: 'excellent' as const,
          assignmentReason: 'Phù hợp phòng khách',
          clipStartSeconds: 1.0,
          clipEndSeconds: 6.0,
        },
      ],
      textOverlays: [],
    },
  ];

  try {
    const { buildTimeline } = await import('../src/processors/timeline-builder');
    const timeline = await buildTimeline({
      scenes: mockScenes,
      audioLocalPaths: { 'scene-1': audioPath },
      assetLocalPaths: { 'asset-video': videoPath },
    });

    console.info('\n--- KẾT QUẢ DỰNG TRỤC THỜI GIAN (AUDIO-FIRST TIMELINE) ---');
    console.info(JSON.stringify(timeline, null, 2));
    console.info('\nGiải thích:');
    console.info(`- Audio-first đã tự động đo thời lượng thực của file test-tts-out.mp3.`);
    console.info(
      `- Video clip được gán tốc độ chạy (speedFactor) phù hợp để khớp hoàn hảo thời lượng audio.`,
    );
  } catch (error) {
    console.error('Lỗi khi dựng trục thời gian:', error);
  }
}

run();
