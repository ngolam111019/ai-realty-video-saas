// services/video-processor/scripts/test-clip-extractor.ts
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const videoPath = process.argv[2] || 'test-property.mp4';
  const start = parseFloat(process.argv[3] || '2.0');
  const end = parseFloat(process.argv[4] || '7.0');
  const outputPath = path.resolve(__dirname, '../test-clip-out.mp4');

  const absoluteVideoPath = path.resolve(videoPath);
  if (!fs.existsSync(absoluteVideoPath)) {
    console.error(`Không tìm thấy file video đầu vào tại: ${absoluteVideoPath}`);
    console.info(
      'Vui lòng chuẩn bị file test-property.mp4 trong thư mục services/video-processor trước.',
    );
    process.exit(1);
  }

  console.info(`Đang cắt trích xuất video dùng FFmpeg...`);
  console.info(`- File gốc: ${absoluteVideoPath}`);
  console.info(`- Cắt từ: ${start}s đến ${end}s (Độ dài: ${end - start}s)`);
  console.info(`- File đầu ra: ${outputPath}`);

  try {
    const { extractClip } = await import('../src/processors/clip-extractor');
    await extractClip({
      localVideoPath: absoluteVideoPath,
      startSeconds: start,
      endSeconds: end,
      localOutputPath: outputPath,
    });
    console.info('\n-> Thành công! File video đã được cắt tại: test-clip-out.mp4');
  } catch (error) {
    console.error('Lỗi khi trích xuất video:', error);
  }
}

run();
