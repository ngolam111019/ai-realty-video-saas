// services/video-processor/scripts/test-vision.ts
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.info(
      'Vui lòng cung cấp đường dẫn ảnh! Ví dụ: pnpm ts-node scripts/test-vision.ts <path_to_image>',
    );
    process.exit(1);
  }

  const absolutePath = path.resolve(imagePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Không tìm thấy file ảnh tại: ${absolutePath}`);
    process.exit(1);
  }

  // Determine mimeType
  let mimeType = 'image/jpeg';
  if (absolutePath.endsWith('.png')) {
    mimeType = 'image/png';
  } else if (absolutePath.endsWith('.webp')) {
    mimeType = 'image/webp';
  }

  console.info(`Đang phân tích ảnh: ${absolutePath} sử dụng Gemini API...`);
  try {
    const { analyzeImage } = await import('../src/processors/ai-vision-image');
    const result = await analyzeImage({
      assetId: 'test-asset-123',
      localImagePath: absolutePath,
      mimeType,
    });
    console.info('\n--- KẾT QUẢ PHÂN TÍCH GEMINI AI ---');
    console.info(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Lỗi khi gọi Gemini API:', error);
  }
}

run();
