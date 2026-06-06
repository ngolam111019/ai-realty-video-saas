// services/video-processor/scripts/test-cache.ts
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.info(
      'Vui lòng cung cấp đường dẫn file! Ví dụ: pnpm ts-node scripts/test-cache.ts <path_to_file>',
    );
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Không tìm thấy file tại: ${absolutePath}`);
    process.exit(1);
  }

  const isVideo =
    absolutePath.endsWith('.mp4') ||
    absolutePath.endsWith('.webm') ||
    absolutePath.endsWith('.mov');
  const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';

  const { getCachedImageAnalysis, getCachedVideoAnalysis } =
    await import('../src/processors/vision-cache');

  // Lần 1: Gọi phân tích (Miss cache - gọi Gemini thật)
  console.info(`\n--- LẦN 1: GỌI PHÂN TÍCH (Đợi Gemini trả kết quả...) ---`);
  const t1_start = Date.now();
  let res1;
  if (isVideo) {
    res1 = await getCachedVideoAnalysis({
      assetId: 'test-cache-video-123',
      localVideoPath: absolutePath,
      mimeType,
    });
  } else {
    res1 = await getCachedImageAnalysis({
      assetId: 'test-cache-image-123',
      localImagePath: absolutePath,
      mimeType,
    });
  }
  const t1_duration = Date.now() - t1_start;
  console.info(`Kết quả Lần 1 (Thời gian: ${t1_duration}ms, Cache Hit: ${res1.cacheHit}):`);
  console.info(JSON.stringify(res1, null, 2));

  // Lần 2: Gọi phân tích (Hit cache - lấy từ Redis)
  console.info(`\n--- LẦN 2: GỌI LẠI (Sẽ lấy trực tiếp từ Redis cực nhanh) ---`);
  const t2_start = Date.now();
  let res2;
  if (isVideo) {
    res2 = await getCachedVideoAnalysis({
      assetId: 'test-cache-video-123',
      localVideoPath: absolutePath,
      mimeType,
    });
  } else {
    res2 = await getCachedImageAnalysis({
      assetId: 'test-cache-image-123',
      localImagePath: absolutePath,
      mimeType,
    });
  }
  const t2_duration = Date.now() - t2_start;
  console.info(`Kết quả Lần 2 (Thời gian: ${t2_duration}ms, Cache Hit: ${res2.cacheHit}):`);
  console.info(JSON.stringify(res2, null, 2));

  // Đóng kết nối Redis để thoát script
  const { redis } = await import('../src/lib/redis');
  await redis.quit();
}

run().catch((err) => {
  console.error('Lỗi khi kiểm tra cache:', err);
});
