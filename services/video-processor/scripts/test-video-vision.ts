// services/video-processor/scripts/test-video-vision.ts
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const videoPath = process.argv[2];
  if (!videoPath) {
    console.info(
      'Vui lòng cung cấp đường dẫn video! Ví dụ: pnpm ts-node scripts/test-video-vision.ts <path_to_video>',
    );
    process.exit(1);
  }

  const absolutePath = path.resolve(videoPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Không tìm thấy file video tại: ${absolutePath}`);
    process.exit(1);
  }

  // Determine mimeType
  let mimeType = 'video/mp4';
  if (absolutePath.endsWith('.webm')) {
    mimeType = 'video/webm';
  } else if (absolutePath.endsWith('.mov')) {
    mimeType = 'video/quicktime';
  }

  console.info(
    `Đang phân tích video: ${absolutePath} (đang trích xuất keyframes và gọi Gemini API)...`,
  );
  try {
    const { analyzeVideo } = await import('../src/processors/ai-vision-video');
    const result = await analyzeVideo({
      assetId: 'test-video-123',
      localVideoPath: absolutePath,
      mimeType,
    });
    console.info('\n--- KẾT QUẢ PHÂN TÍCH VIDEO GEMINI AI ---');
    console.info(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Lỗi khi gọi Gemini API cho video:', error);
  }
}

run();
