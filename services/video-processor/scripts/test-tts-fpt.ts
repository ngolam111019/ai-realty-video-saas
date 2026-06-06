// services/video-processor/scripts/test-tts-fpt.ts
import dotenv from 'dotenv';
import * as path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const text = process.argv[2] || 'Chào mừng bạn đến với dự án biệt thự Chateau Quận 7 đẳng cấp.';
  const voice = process.argv[3] || 'lannhi';
  const outputPath = path.resolve(__dirname, '../test-tts-out.mp3');

  console.info(`Đang gọi FPT.AI TTS để chuyển văn bản thành giọng nói...`);
  console.info(`- Nội dung: "${text}"`);
  console.info(`- Giọng đọc: ${voice}`);
  console.info(`- Đầu ra: ${outputPath}`);

  try {
    const { generateTtsFpt } = await import('../src/processors/tts-fpt');
    await generateTtsFpt({
      text,
      voice,
      localOutputPath: outputPath,
    });
    console.info('\n-> Thành công! File âm thanh đã được tải về tại: test-tts-out.mp3');
  } catch (error) {
    console.error('Lỗi khi sinh TTS:', error);
  }
}

run();
