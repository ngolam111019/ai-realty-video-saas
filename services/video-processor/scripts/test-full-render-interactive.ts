// services/video-processor/scripts/test-full-render-interactive.ts
/* eslint-disable @typescript-eslint/no-var-requires */
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Queue } from 'bullmq';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const TEST_ASSETS_DIR = path.resolve(__dirname, '../test-assets');

// Stub the s3 module in require.cache before other files import it
const s3Path = require.resolve('../src/lib/s3');
const originalS3 = require(s3Path);
require.cache[s3Path] = {
  id: s3Path,
  filename: s3Path,
  loaded: true,
  path: path.dirname(s3Path),
  exports: {
    ...originalS3,
    downloadFromR2: async (storageKey: string, localPath: string) => {
      const sourcePath = path.join(TEST_ASSETS_DIR, storageKey);
      console.info(`   [Mock R2 S3]: Đang sao chép file cục bộ từ ${sourcePath} -> ${localPath}`);
      await fs.promises.copyFile(sourcePath, localPath);
    },
    uploadToR2: async (localPath: string, destKey: string, _contentType: string) => {
      const destPath = path.join(TEST_ASSETS_DIR, path.basename(destKey));
      console.info(
        `   [Mock R2 S3]: Uploading file lên CDN R2 (giả lập copy cục bộ): ${localPath} -> ${destPath}`,
      );
      await fs.promises.copyFile(localPath, destPath);
      return `http://mock-cdn.realty-video.com/${destKey}`;
    },
  },
} as any;

async function run() {
  console.info('================================================================');
  console.info('    KIỂM THỬ TOÀN BỘ PIPELINE WORKER 2 (VIDEO RENDERING)       ');
  console.info('================================================================');

  // Bước 1: Kiểm tra thư mục test-assets
  if (!fs.existsSync(TEST_ASSETS_DIR)) {
    fs.mkdirSync(TEST_ASSETS_DIR);
    console.info(`\n[Thông báo]: Thư mục test-assets đã được tạo tại: ${TEST_ASSETS_DIR}`);
    console.info('Vui lòng bỏ vào thư mục trên các file sau:');
    console.info('  1. livingroom.jpg (Ảnh phòng khách)');
    console.info('  2. bedroom.jpg (Ảnh phòng ngủ)');
    console.info('  3. test-property.mp4 (Video ngắn quảng cáo)');
    console.info('  4. avatar.jpg (Ảnh chân dung sale)');
    console.info('\nHãy chuẩn bị các file trên rồi chạy lại lệnh này.');
    process.exit(0);
  }

  const requiredFiles = ['livingroom.jpg', 'bedroom.jpg', 'test-property.mp4', 'avatar.jpg'];
  const missingFiles = requiredFiles.filter((f) => !fs.existsSync(path.join(TEST_ASSETS_DIR, f)));

  if (missingFiles.length > 0) {
    console.warn(
      `\n[Cảnh báo]: Thư mục test-assets đang thiếu các file sau: ${missingFiles.join(', ')}`,
    );
    console.info('Hãy copy đủ các file này vào thư mục test-assets rồi chạy lại script.');
    process.exit(0);
  }

  const { db } = await import('../src/lib/db');
  const { redis } = await import('../src/lib/redis');

  console.info('\nStep 1: Tạo dữ liệu giả lập trong Postgres...');

  // Tạo User mẫu
  const user = await db.user.upsert({
    where: { email: 'interactive-render-tester@example.com' },
    update: {},
    create: {
      email: 'interactive-render-tester@example.com',
      name: 'Đức Lâm BĐS',
      role: 'USER',
      status: 'ACTIVE',
      avatarUrl: 'http://mock-cdn.realty-video.com/avatar.jpg',
    },
  });

  // Tạo Project mẫu
  const project = await db.project.create({
    data: {
      userId: user.id,
      name: 'Vinhomes Grand Park Quận 9',
      propertyType: 'APARTMENT',
      address: 'Nguyễn Xiển, Long Thạnh Mỹ',
      district: 'Quận 9',
      city: 'Hồ Chí Minh',
      area: 80,
      bedrooms: 2,
      bathrooms: 2,
      salePrice: 3500000000,
      contactName: 'Đức Lâm BĐS',
      contactPhone: '0909123456',
    },
  });

  // Tạo VideoTemplate mẫu
  const template = await db.videoTemplate.upsert({
    where: { slug: 'chateau-villa-tour' },
    update: {},
    create: {
      name: 'Tour Biệt Thự Chateau Sang Trọng',
      slug: 'chateau-villa-tour',
      duration: 35,
      tokenCost: 2,
      scenes: [],
    },
  });

  // Tạo các bản ghi MediaAsset tương ứng với file cục bộ
  const assetData = [
    {
      id: 'asset-chateau-ext',
      fileName: 'livingroom.jpg',
      type: 'IMAGE' as const,
      tag: 'EXTERIOR' as const,
      storageKey: 'livingroom.jpg',
      storageUrl: 'http://localhost/livingroom.jpg',
      mimeType: 'image/jpeg',
    },
    {
      id: 'asset-chateau-bedroom',
      fileName: 'bedroom.jpg',
      type: 'IMAGE' as const,
      tag: 'BEDROOM' as const,
      storageKey: 'bedroom.jpg',
      storageUrl: 'http://localhost/bedroom.jpg',
      mimeType: 'image/jpeg',
    },
    {
      id: 'asset-chateau-video',
      fileName: 'test-property.mp4',
      type: 'VIDEO_CLIP' as const,
      tag: 'LIVING_ROOM' as const,
      storageKey: 'test-property.mp4',
      storageUrl: 'http://localhost/test-property.mp4',
      mimeType: 'video/mp4',
    },
  ];

  for (const asset of assetData) {
    await db.mediaAsset.upsert({
      where: { id: asset.id },
      update: {
        projectId: project.id,
        storageKey: asset.storageKey,
        storageUrl: asset.storageUrl,
      },
      create: {
        id: asset.id,
        userId: user.id,
        projectId: project.id,
        type: asset.type,
        tag: asset.tag,
        fileName: asset.fileName,
        fileSize: 1024,
        mimeType: asset.mimeType,
        storageKey: asset.storageKey,
        storageUrl: asset.storageUrl,
      },
    });
  }

  // Tạo ScriptDraft chứa các scene đã được duyệt (APPROVED)
  const scenesJson = [
    {
      id: 'scene-1',
      order: 1,
      narration: 'Chào mừng bạn đến với căn hộ hai phòng ngủ cực đẹp tại Vinhomes Grand Park.',
      caption: 'Vinhomes Grand Park view cực đỉnh',
      assignedAssets: [{ assetId: 'asset-chateau-ext', type: 'IMAGE' }],
    },
    {
      id: 'scene-2',
      order: 2,
      narration: 'Không gian phòng khách rộng rãi, đón gió tự nhiên thông thoáng.',
      caption: 'Thiết kế hiện đại, sang trọng',
      assignedAssets: [
        {
          assetId: 'asset-chateau-video',
          type: 'VIDEO_CLIP',
          clipStartSeconds: 1.0,
          clipEndSeconds: 5.0,
        },
      ],
    },
    {
      id: 'scene-3',
      order: 3,
      narration: 'Phòng ngủ master ấm cúng, nội thất cao cấp nhập khẩu.',
      caption: 'Phòng ngủ master ấm cúng',
      assignedAssets: [{ assetId: 'asset-chateau-bedroom', type: 'IMAGE' }],
    },
  ];

  const draft = await db.scriptDraft.create({
    data: {
      userId: user.id,
      projectId: project.id,
      templateId: template.id,
      status: 'READY',
      scenes: scenesJson as any,
    },
  });

  // Tạo Wallet và cộng token
  await db.tokenWallet.upsert({
    where: { userId: user.id },
    update: { balance: 10 },
    create: { userId: user.id, balance: 10 },
  });

  // Tạo VideoJob
  const videoJob = await db.videoJob.create({
    data: {
      userId: user.id,
      projectId: project.id,
      templateId: template.id,
      scriptDraftId: draft.id,
      status: 'QUEUED',
      tokenCost: 2,
      ttsProvider: 'fptai',
      ttsVoiceId: 'lannhi',
      renderEngine: 'ffmpeg',
    },
  });

  console.info(`-> Đã khởi tạo thành công.`);
  console.info(`   - VideoJob ID: ${videoJob.id}`);
  console.info(`   - ScriptDraft ID: ${draft.id}`);

  // 2. Khởi chạy Worker thực tế
  console.info('\nStep 2: Khởi chạy Worker Render BullMQ...');
  const { videoRenderWorker } = await import('../src/workers/video-render.worker');

  // 3. Gửi job vào queue
  console.info('\nStep 3: Gửi Job vào BullMQ để bắt đầu pipeline...');
  const queue = new Queue('realty.video.render', {
    connection: redis as any,
  });
  await queue.add('interactive-render-job', { jobId: videoJob.id });

  // 4. Lắng nghe cập nhật
  console.info('\nStep 4: Bắt đầu xử lý (Giải thích chi tiết tiến trình):');
  let isDone = false;
  let lastStep = '';

  for (let i = 0; i < 90; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const currentJob = await db.videoJob.findUnique({
      where: { id: videoJob.id },
    });

    if (currentJob && currentJob.currentStep !== lastStep) {
      lastStep = currentJob.currentStep || '';
      console.info(`\n   --- CHUYỂN BƯỚC: ${lastStep} (${currentJob.progress}%) ---`);
      if (lastStep === 'STARTING') {
        console.info(
          '   [Giải thích]: Worker đã nhận job, tải thông tin video job, script draft đã duyệt từ database.',
        );
      } else if (lastStep === 'DOWNLOADING_MEDIA') {
        console.info(
          '   [Giải thích]: Tải các tệp ảnh, video gốc và ảnh chân dung (avatar) của user về folder tạm.',
        );
      } else if (lastStep === 'AUDIO_GENERATION') {
        console.info(
          '   [Giải thích]: Gọi FPT.AI TTS API để tạo file thuyết minh (.mp3) cho từng phân cảnh, lưu đệm vào Redis + R2.',
        );
      } else if (lastStep === 'CLIP_EXTRACTION') {
        console.info(
          '   [Giải thích]: Dùng FFmpeg cắt các đoạn sub-clips từ video gốc theo đúng mốc thời gian AI gợi ý.',
        );
      } else if (lastStep === 'TIMELINE_BUILDING') {
        console.info(
          '   [Giải thích]: Đo chính xác thời lượng file nói thực tế của FPT.AI bằng ffprobe, sau đó đồng bộ trục thời gian.',
        );
      } else if (lastStep === 'RENDERING') {
        console.info(
          '   [Giải thích]: FFmpeg render từng cảnh (scale 1080x1920, khớp tốc độ video, chèn phụ đề Việt), ghép các cảnh lại, trộn nhạc nền và đè avatar góc trái.',
        );
      } else if (lastStep === 'UPLOAD') {
        console.info(
          '   [Giải thích]: Dùng FFmpeg trích xuất thumbnail tại giây thứ 2, sau đó tải cả video hoàn chỉnh và ảnh thumbnail lên R2.',
        );
      }
    }

    if (currentJob && (currentJob.status === 'COMPLETED' || currentJob.status === 'FAILED')) {
      console.info(`\n================================================================`);
      console.info(
        `   HOÀN THÀNH: Trạng thái: ${currentJob.status} | Tiến độ: ${currentJob.progress}%`,
      );
      console.info(`================================================================`);
      if (currentJob.status === 'COMPLETED') {
        console.info('\nVideo render thành công!');
        console.info(`   - Video CDN URL: ${currentJob.outputUrl}`);
        console.info(`   - Thumbnail CDN URL: ${currentJob.thumbnailUrl}`);
        console.info(
          `   - Dung lượng: ${(Number(currentJob.outputSizeBytes) / 1024 / 1024).toFixed(2)} MB`,
        );
        console.info(`   - Thời lượng: ${currentJob.duration} giây`);
      } else {
        console.error(`\nVideo render thất bại: ${currentJob.errorMessage}`);
      }
      isDone = true;
      break;
    }
  }

  if (!isDone) {
    console.warn('\nTimeout: Quá thời gian chờ xử lý.');
  }

  // Tắt kết nối
  await queue.close();
  await videoRenderWorker.close();
  await redis.quit();
  await db.$disconnect();
}

run().catch((err) => {
  console.error('Lỗi khi chạy thử render:', err);
});
