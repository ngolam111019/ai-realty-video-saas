// services/video-processor/scripts/test-full-pipeline-interactive.ts
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
  },
} as any;

async function run() {
  console.info('================================================================');
  console.info('    KIỂM THỬ TOÀN BỘ PIPELINE WORKER 1 (SCRIPT GENERATION)     ');
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

  console.info('\nStep 1: Khởi tạo dữ liệu mẫu trong Postgres (Không tự động xóa)...');

  // Tạo User mẫu
  const user = await db.user.upsert({
    where: { email: 'interactive-pipeline-tester@example.com' },
    update: {},
    create: {
      email: 'interactive-pipeline-tester@example.com',
      name: 'Tester Đức Lâm',
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  // Tạo Project mẫu
  const project = await db.project.create({
    data: {
      userId: user.id,
      name: 'Biệt Thự Đơn Lập Chateau Quận 7',
      propertyType: 'VILLA',
      address: 'Khu biệt thự Chateau, Phú Mỹ Hưng',
      district: 'Quận 7',
      city: 'Hồ Chí Minh',
      area: 500,
      bedrooms: 4,
      bathrooms: 5,
      salePrice: 120000000000, // 120 Tỷ
      amenities: ['Hồ bơi riêng', 'Sân vườn rộng', 'An ninh 24/7', 'Bến du thuyền'],
      highlights: [
        'Sổ hồng chính chủ',
        'Vị trí góc 2 mặt tiền sông',
        'Khu biệt thự VIP nhất Phú Mỹ Hưng',
      ],
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
      scenes: [
        {
          id: 'scene-intro',
          name: 'Mặt tiền biệt thự',
          duration: 5,
          mediaSlots: [{ type: 'IMAGE', requiredTag: 'EXTERIOR' }],
          textSlots: [{ position: 'top-left', style: 'badge' }],
        },
        {
          id: 'scene-living',
          name: 'Phòng khách Chateau',
          duration: 10,
          mediaSlots: [{ type: 'IMAGE', requiredTag: 'LIVING_ROOM' }],
          textSlots: [{ position: 'bottom-left', style: 'highlight' }],
        },
        {
          id: 'scene-video-highlight',
          name: 'Không gian sống động',
          duration: 10,
          mediaSlots: [{ type: 'VIDEO_CLIP', requiredTag: 'LIVING_ROOM' }],
          textSlots: [{ position: 'bottom-right', style: 'subtitle' }],
        },
        {
          id: 'scene-bedroom',
          name: 'Phòng ngủ Master',
          duration: 5,
          mediaSlots: [{ type: 'IMAGE', requiredTag: 'BEDROOM' }],
          textSlots: [{ position: 'top-right', style: 'badge' }],
        },
        {
          id: 'scene-outro',
          name: 'Thông tin liên hệ',
          duration: 5,
          mediaSlots: [{ type: 'IMAGE', requiredTag: 'PORTRAIT' }],
          textSlots: [{ position: 'center', style: 'subtitle' }],
        },
      ],
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
      id: 'asset-chateau-living',
      fileName: 'livingroom.jpg',
      type: 'IMAGE' as const,
      tag: 'LIVING_ROOM' as const,
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
      id: 'asset-chateau-portrait',
      fileName: 'avatar.jpg',
      type: 'PORTRAIT' as const,
      tag: 'PORTRAIT' as const,
      storageKey: 'avatar.jpg',
      storageUrl: 'http://localhost/avatar.jpg',
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
    await db.mediaAsset.create({
      data: {
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

  // Tạo ScriptDraft
  const draft = await db.scriptDraft.create({
    data: {
      userId: user.id,
      projectId: project.id,
      templateId: template.id,
      status: 'PROCESSING',
      progress: 0,
      currentStep: 'QUEUED',
    },
  });

  console.info(`-> Đã khởi tạo thành công.`);
  console.info(`   - User Email: interactive-pipeline-tester@example.com`);
  console.info(`   - Project ID: ${project.id} (Tên: Biệt Thự Chateau Quận 7)`);
  console.info(`   - ScriptDraft ID: ${draft.id}`);

  // 2. Khởi chạy Worker thực tế
  console.info('\nStep 2: Khởi chạy Worker BullMQ...');
  const { scriptGenWorker } = await import('../src/workers/script-gen.worker');

  // 3. Gửi job vào queue
  console.info('\nStep 3: Gửi Job vào BullMQ để bắt đầu pipeline...');
  const queue = new Queue('realty.script.generate', {
    connection: redis as any,
  });
  await queue.add('interactive-job', { draftId: draft.id });

  // 4. Lắng nghe cập nhật
  console.info('\nStep 4: Bắt đầu xử lý (Giải thích chi tiết tiến trình):');
  let isDone = false;
  let lastStep = '';

  for (let i = 0; i < 45; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const currentDraft = await db.scriptDraft.findUnique({
      where: { id: draft.id },
    });

    if (currentDraft && currentDraft.currentStep !== lastStep) {
      lastStep = currentDraft.currentStep || '';
      console.info(`\n   --- CHUYỂN BƯỚC: ${lastStep} (${currentDraft.progress}%) ---`);
      if (lastStep === 'FETCHING_DATA') {
        console.info(
          '   [Giải thích]: Worker đã nhận job, tải thông tin dự án, cấu hình template từ database.',
        );
      } else if (lastStep === 'DOWNLOADING_MEDIA') {
        console.info(
          '   [Giải thích]: Tiến hành tải các tệp ảnh và video của dự án về thư mục tạm cục bộ.',
        );
      } else if (lastStep === 'VISION_ANALYSIS') {
        console.info(
          '   [Giải thích]: Chạy phân tích AI Vision. Đối với ảnh, kiểm tra bố cục và chất lượng. Đối với video, dùng FFmpeg trích xuất 3 keyframes và gửi Gemini phân tích chuyển động, crop.',
        );
      } else if (lastStep === 'SCRIPT_GENERATION') {
        console.info(
          '   [Giải thích]: Gửi toàn bộ dữ liệu dự án và kết quả phân tích hình ảnh vào Gemini 2.5 Flash để dựng kịch bản chi tiết bằng tiếng Việt, gán asset phù hợp với từng cảnh.',
        );
      } else if (lastStep === 'SAVING_DRAFT') {
        console.info(
          '   [Giải thích]: Lưu kịch bản hoàn chỉnh dạng cấu trúc JSON vào bảng ScriptDraft trong database.',
        );
      }
    }

    if (currentDraft && (currentDraft.status === 'READY' || currentDraft.status === 'FAILED')) {
      console.info(`\n================================================================`);
      console.info(
        `   HOÀN THÀNH: Trạng thái: ${currentDraft.status} | Tiến độ: ${currentDraft.progress}%`,
      );
      console.info(`================================================================`);
      console.info('\nKịch bản chi tiết đã được cập nhật vĩnh viễn trong database.');
      console.info('Bạn có thể mở Prisma Studio hoặc pgAdmin để xem bản ghi này.');
      console.info(`   - Bảng: script_drafts`);
      console.info(`   - ScriptDraft ID: ${draft.id}`);
      isDone = true;
      break;
    }
  }

  if (!isDone) {
    console.warn('\nTimeout: Quá thời gian chờ xử lý.');
  }

  // Tắt kết nối (không xóa dữ liệu mẫu)
  await queue.close();
  await scriptGenWorker.close();
  await redis.quit();
  await db.$disconnect();
  console.info('\nLưu ý: Dữ liệu mẫu vẫn được giữ nguyên trong database để bạn kiểm tra.');
  console.info('Khi nào muốn xóa dữ liệu test này, bạn hãy yêu cầu tôi dọn dẹp.');
}

run().catch((err) => {
  console.error('Lỗi khi chạy thử pipeline:', err);
});
