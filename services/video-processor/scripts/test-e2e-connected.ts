// services/video-processor/scripts/test-e2e-connected.ts
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
  console.info('   KIỂM THỬ LIÊN THÔNG TOÀN DIỆN E2E (WORKER 1 -> WORKER 2)    ');
  console.info('================================================================');

  // Bước 1: Kiểm tra thư mục test-assets
  if (!fs.existsSync(TEST_ASSETS_DIR)) {
    fs.mkdirSync(TEST_ASSETS_DIR);
    console.info(`\n[Thông báo]: Thư mục test-assets đã được tạo tại: ${TEST_ASSETS_DIR}`);
    console.info('Vui lòng chuẩn bị các file sau trong thư mục test-assets:');
    console.info('  1. livingroom.jpg (Ảnh phòng khách)');
    console.info('  2. bedroom.jpg (Ảnh phòng ngủ)');
    console.info('  3. test-property.mp4 (Video ngắn quảng cáo)');
    console.info('  4. avatar.jpg (Ảnh chân dung sale)');
    process.exit(0);
  }

  const requiredFiles = ['livingroom.jpg', 'bedroom.jpg', 'test-property.mp4', 'avatar.jpg'];
  const missingFiles = requiredFiles.filter((f) => !fs.existsSync(path.join(TEST_ASSETS_DIR, f)));

  if (missingFiles.length > 0) {
    console.warn(`\n[Cảnh báo]: Thư mục test-assets đang thiếu: ${missingFiles.join(', ')}`);
    process.exit(0);
  }

  const { db } = await import('../src/lib/db');
  const { redis } = await import('../src/lib/redis');

  console.info('\nStep 1: Khởi tạo dữ liệu mẫu trong Postgres...');

  // Tạo User test
  const user = await db.user.upsert({
    where: { email: 'interactive-pipeline-tester@example.com' },
    update: {},
    create: {
      email: 'interactive-pipeline-tester@example.com',
      name: 'Tester Đức Lâm',
      role: 'USER',
      status: 'ACTIVE',
      avatarUrl: 'http://mock-cdn.realty-video.com/avatar.jpg',
    },
  });

  // Tạo Project test
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
      salePrice: 120000000000,
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
          mediaSlots: [{ type: 'IMAGE', requiredTag: 'LIVING_ROOM' }],
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

  console.info(`-> Khởi tạo thành công: ScriptDraft ID = ${draft.id}`);

  // ----------------------------------------------------
  // PHẦN 1: CHẠY WORKER 1 (SCRIPT GENERATION)
  // ----------------------------------------------------
  console.info('\nStep 2: Khởi chạy Worker 1 để tạo kịch bản nháp...');
  const { scriptGenWorker } = await import('../src/workers/script-gen.worker');

  const scriptQueue = new Queue('realty.script.generate', { connection: redis as any });
  await scriptQueue.add('interactive-script-job', { draftId: draft.id });

  console.info('-> Đã gửi Job tạo kịch bản. Chờ xử lý...');
  let draftReady = false;
  let lastW1Step = '';

  for (let i = 0; i < 45; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const currentDraft = await db.scriptDraft.findUnique({ where: { id: draft.id } });

    if (currentDraft && currentDraft.currentStep !== lastW1Step) {
      lastW1Step = currentDraft.currentStep || '';
      console.info(`   [Worker 1 - Step]: ${lastW1Step} (${currentDraft.progress}%)`);
    }

    if (currentDraft && currentDraft.status === 'READY') {
      console.info('\n✅ [Worker 1] ĐÃ TẠO XONG KỊCH BẢN CHUYÊN SÂU!');
      console.info(`   - Tiến độ: ${currentDraft.progress}%`);
      console.info('   - Danh sách phân cảnh chi tiết do AI sinh ra:');

      const scenes = currentDraft.scenes as any[];
      scenes.forEach((scene) => {
        console.info(`     * Cảnh ${scene.order}: ${scene.name}`);
        console.info(`       LỜI THOẠI: "${scene.narration}"`);
        console.info(`       PHỤ ĐỀ:    "${scene.caption}"`);
      });
      draftReady = true;
      break;
    }

    if (currentDraft && currentDraft.status === 'FAILED') {
      console.error(`❌ Worker 1 thất bại: ${currentDraft.errorMessage}`);
      break;
    }
  }

  await scriptQueue.close();
  await scriptGenWorker.close();

  if (!draftReady) {
    console.error('Không thể tiếp tục vì Worker 1 thất bại hoặc quá thời gian chờ.');
    await redis.quit();
    await db.$disconnect();
    process.exit(1);
  }

  // ----------------------------------------------------
  // PHẦN 2: CHẠY WORKER 2 (VIDEO RENDER)
  // ----------------------------------------------------
  console.info('\nStep 3: Khởi tạo VideoJob liên kết với kịch bản vừa sinh của Worker 1...');

  // Tạo Wallet và cộng token
  await db.tokenWallet.upsert({
    where: { userId: user.id },
    update: { balance: 10 },
    create: { userId: user.id, balance: 10 },
  });

  const videoJob = await db.videoJob.create({
    data: {
      userId: user.id,
      projectId: project.id,
      templateId: template.id,
      scriptDraftId: draft.id, // Sử dụng trực tiếp ScriptDraft ID sinh từ W1
      status: 'QUEUED',
      tokenCost: 2,
      ttsProvider: 'fptai',
      ttsVoiceId: 'lannhi',
      renderEngine: 'ffmpeg',
    },
  });

  console.info(`-> Khởi tạo VideoJob thành công: Job ID = ${videoJob.id}`);

  console.info('\nStep 4: Khởi chạy Worker 2 để dựng video từ kịch bản trên...');
  const { videoRenderWorker } = await import('../src/workers/video-render.worker');

  const renderQueue = new Queue('realty.video.render', { connection: redis as any });
  await renderQueue.add('interactive-render-job', { jobId: videoJob.id });

  let renderDone = false;
  let lastW2Step = '';

  for (let i = 0; i < 90; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const currentJob = await db.videoJob.findUnique({ where: { id: videoJob.id } });

    if (currentJob && currentJob.currentStep !== lastW2Step) {
      lastW2Step = currentJob.currentStep || '';
      console.info(`   [Worker 2 - Step]: ${lastW2Step} (${currentJob.progress}%)`);
    }

    if (currentJob && currentJob.status === 'COMPLETED') {
      console.info(`\n✅ [Worker 2] DỰNG VIDEO THÀNH CÔNG!`);
      console.info(`   - Video URL: ${currentJob.outputUrl}`);
      console.info(`   - Thumbnail URL: ${currentJob.thumbnailUrl}`);
      console.info(
        `   - Dung lượng: ${(Number(currentJob.outputSizeBytes) / 1024 / 1024).toFixed(2)} MB`,
      );
      console.info(`   - Thời lượng: ${currentJob.duration} giây`);
      renderDone = true;
      break;
    }

    if (currentJob && currentJob.status === 'FAILED') {
      console.error(`❌ Worker 2 thất bại: ${currentJob.errorMessage}`);
      break;
    }
  }

  await renderQueue.close();
  await videoRenderWorker.close();
  await redis.quit();
  await db.$disconnect();

  if (renderDone) {
    console.info('\n================================================================');
    console.info('   🎉 KIỂM THỬ LIÊN THÔNG E2E HOÀN TẤT THÀNH CÔNG MỸ MÃN!     ');
    console.info('================================================================');
    console.info('Tệp video dọc hoàn chỉnh đã được xuất ra tại thư mục:');
    console.info(`   - [Video]:     ${path.join(TEST_ASSETS_DIR, 'output.mp4')}`);
    console.info(`   - [Thumbnail]: ${path.join(TEST_ASSETS_DIR, 'thumbnail.jpg')}`);
    console.info('\nBạn có thể mở xem trực quan. Để dọn dẹp dữ liệu test, hãy chạy:');
    console.info('   pnpm test:pipeline-clean');
  } else {
    console.error('\nQuá trình dựng video bị lỗi hoặc quá thời gian chờ.');
  }
}

run().catch((err) => {
  console.error('Lỗi khi chạy thử E2E liên thông:', err);
});
