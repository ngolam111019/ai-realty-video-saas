// services/video-processor/scripts/test-tts-cache.ts
import dotenv from 'dotenv';
import * as path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const text = process.argv[2] || 'Căn hộ view sông Sài Gòn cực đẹp.';
  const voice = process.argv[3] || 'lannhi';
  const outputPath = path.resolve(__dirname, '../test-tts-cache-out.mp3');

  console.info(`Kiểm tra bộ nhớ đệm TTS Cache...`);
  console.info(`- Nội dung: "${text}"`);
  console.info(`- Giọng đọc: ${voice}`);

  const { getCachedTts } = await import('../src/processors/tts-cache');

  // Lần 1: Gọi sinh (Cache Miss nếu là lần đầu chạy nội dung này)
  console.info('\n--- LẦN 1: GỌI PHÂN TÍCH (Cache Miss / Sinh mới) ---');
  const t1_start = Date.now();
  await getCachedTts({
    provider: 'fptai',
    text,
    voice,
    localOutputPath: outputPath,
  });
  console.info(
    `-> Lần 1 hoàn tất sau ${Date.now() - t1_start}ms. File lưu tại: test-tts-cache-out.mp3`,
  );

  // Lần 2: Gọi sinh lại (Cache Hit)
  console.info('\n--- LẦN 2: GỌI LẠI (Sẽ là Cache Hit - Tải cực nhanh từ R2/S3 hoặc cache) ---');
  const t2_start = Date.now();
  await getCachedTts({
    provider: 'fptai',
    text,
    voice,
    localOutputPath: outputPath,
  });
  console.info(`-> Lần 2 hoàn tất sau ${Date.now() - t2_start}ms (Cache Hit).`);

  const { redis } = await import('../src/lib/redis');
  await redis.quit();
}

run().catch((err) => {
  console.error('Lỗi khi test cache:', err);
});
