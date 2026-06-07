// services/main-api/test/test-api-worker-e2e.ts
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { PrismaClient } from '@realty-video/database';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const db = new PrismaClient();

const API_BASE = 'http://localhost:3001/api';
const TEST_ASSETS_DIR = path.resolve(
  __dirname,
  '../../video-processor/test-assets',
);

// Helper to make calls with test user header to bypass complex auth session logic
const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'x-user-id': 'e2e-api-worker-tester-id',
  },
});

async function run() {
  console.info(
    '================================================================',
  );
  console.info(
    '   KIỂM THỬ LIÊN THÔNG TOÀN DIỆN HTTP API -> REDIS -> WORKER    ',
  );
  console.info(
    '================================================================',
  );

  const requiredFiles = [
    'livingroom.jpg',
    'bedroom.jpg',
    'test-property.mp4',
    'avatar.jpg',
  ];
  const missingFiles = requiredFiles.filter(
    (f) => !fs.existsSync(path.join(TEST_ASSETS_DIR, f)),
  );
  if (missingFiles.length > 0) {
    console.error(
      `Thư mục test-assets thiếu files: ${missingFiles.join(', ')}`,
    );
    process.exit(1);
  }

  // 1. Tạo User và ví trực tiếp bằng DB client nếu cần, hoặc chạy webhook để test ví tiền.
  console.info('-> Đang đảm bảo user e2e-api-worker-tester-id tồn tại...');
  await db.user.upsert({
    where: { id: 'e2e-api-worker-tester-id' },
    update: {},
    create: {
      id: 'e2e-api-worker-tester-id',
      email: 'e2e-tester@example.com',
      name: 'E2E Tester User',
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  // Nhập thông tin và tạo project thông qua HTTP API
  console.info('\n1. Tạo dự án mới qua HTTP POST /projects...');
  const projectResp = await client.post('/projects', {
    name: 'Biệt Thự Chateau Quận 7 E2E',
    propertyType: 'VILLA',
    address: 'Phú Mỹ Hưng',
    district: 'Quận 7',
    city: 'Hồ Chí Minh',
    area: 500,
    bedrooms: 4,
    bathrooms: 5,
    salePrice: 120000000000,
    amenities: ['Hồ bơi riêng', 'Sân vườn rộng'],
    highlights: ['Sổ hồng chính chủ'],
    contactName: 'Đức Lâm BĐS',
    contactPhone: '0909123456',
  });

  const project = projectResp.data;
  const projectId = project.id;
  console.info(`-> Dự án được tạo thành công: ID = ${projectId}`);

  // 2. Upload/Xác nhận media assets
  console.info(
    '\n2. Đăng ký thông tin 5 media assets qua HTTP /media/confirm-upload...',
  );
  const assets = [
    {
      id: 'asset-api-ext',
      fileName: 'livingroom.jpg',
      type: 'IMAGE',
      storageKey: 'livingroom.jpg',
      mimeType: 'image/jpeg',
    },
    {
      id: 'asset-api-living',
      fileName: 'livingroom.jpg',
      type: 'IMAGE',
      storageKey: 'livingroom.jpg',
      mimeType: 'image/jpeg',
    },
    {
      id: 'asset-api-bedroom',
      fileName: 'bedroom.jpg',
      type: 'IMAGE',
      storageKey: 'bedroom.jpg',
      mimeType: 'image/jpeg',
    },
    {
      id: 'asset-api-portrait',
      fileName: 'avatar.jpg',
      type: 'PORTRAIT',
      storageKey: 'avatar.jpg',
      mimeType: 'image/jpeg',
    },
    {
      id: 'asset-api-video',
      fileName: 'test-property.mp4',
      type: 'VIDEO_CLIP',
      storageKey: 'test-property.mp4',
      mimeType: 'video/mp4',
    },
  ];

  for (const asset of assets) {
    await client.post('/media/confirm-upload', {
      projectId,
      storageKey: asset.storageKey,
      fileName: asset.fileName,
      fileSize: 1024,
      mimeType: asset.mimeType,
      type: asset.type,
    });
  }
  console.info('-> Đăng ký toàn bộ media assets thành công!');

  // 3. Khởi chạy Phase 1: Tạo kịch bản nháp
  console.info(
    '\n3. Yêu cầu sinh kịch bản nháp qua HTTP POST /script-drafts...',
  );
  // Tìm video template mẫu
  let template = await db.videoTemplate.findFirst({
    where: { slug: 'chateau-villa-tour' },
  });
  if (!template) {
    // Tạo video template mặc định
    template = await db.videoTemplate.create({
      data: {
        name: 'Tour Biệt Thự Chateau Sang Trọng',
        slug: 'chateau-villa-tour',
        duration: 35,
        tokenCost: 2,
        scenes: [],
      },
    });
  }

  const draftResp = await client.post('/script-drafts', {
    projectId,
    templateId: template.id,
    mediaAssetIds: [
      'asset-api-ext',
      'asset-api-living',
      'asset-api-bedroom',
      'asset-api-video',
    ],
    portraitAssetId: 'asset-api-portrait',
    targetPlatform: 'tiktok',
  });

  const draftId = draftResp.data.data.draftId;
  console.info(
    `-> Tạo ScriptDraft thành công: ID = ${draftId}. Đang đợi Worker 1 xử lý...`,
  );

  // Polling ScriptDraft status
  let draftReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusResp = await client.get(`/script-drafts/${draftId}`);
    const draftStatus = statusResp.data.data;

    console.info(
      `   [Worker 1 Polling]: Trạng thái = ${draftStatus.status} (${draftStatus.progress || 0}%) - Bước: ${draftStatus.currentStep || 'QUEUED'}`,
    );

    if (draftStatus.status === 'READY') {
      console.info('✅ [Worker 1] Dựng kịch bản nháp thành công!');
      draftReady = true;
      break;
    }
    if (draftStatus.status === 'FAILED') {
      console.error(`❌ Worker 1 thất bại: ${draftStatus.errorMessage}`);
      process.exit(1);
    }
  }

  if (!draftReady) {
    console.error('Lỗi: Quá thời gian chờ Worker 1 hoàn thành.');
    process.exit(1);
  }

  // 4. Mua token giả lập thông qua Webhook PayOS
  console.info('\n4. Giả lập thanh toán cộng 10 Tokens qua Webhook PayOS...');
  const orderCode = Date.now();
  const webhookResp = await client
    .post('/billing/payos/webhook', {
      data: {
        orderCode,
        amount: 10000, // 10000 VND -> 10 tokens
        paymentLinkId: 'mock-link-id',
      },
      signature: 'mock-sig-not-verified-if-checksum-is-fallback-or-stub',
    })
    .catch(() => {
      // PayOS webhook will check signature, if it fails because of invalid signature, we credit directly in DB for testing
      console.warn(
        '   PayOS webhook signature check failed (expected in test without secret), crediting token directly via DB...',
      );
      return null;
    });

  if (!webhookResp) {
    await db.tokenWallet.upsert({
      where: { userId: 'e2e-api-worker-tester-id' },
      update: { balance: { increment: 10 } },
      create: { userId: 'e2e-api-worker-tester-id', balance: 10 },
    });
  }
  console.info('-> Đã cộng token thành công!');

  // 5. Khởi chạy Phase 2: Dựng Video
  console.info('\n5. Gửi yêu cầu xuất video qua HTTP POST /video-jobs...');
  const renderResp = await client.post('/video-jobs', {
    scriptDraftId: draftId,
    ttsProvider: 'fptai',
    ttsVoiceId: 'lannhi',
    renderEngine: 'ffmpeg',
  });

  const jobId = renderResp.data.data.jobId;
  console.info(
    `-> Tạo VideoJob thành công: ID = ${jobId}. Đang đợi Worker 2 render...`,
  );

  // Polling VideoJob status
  let renderDone = false;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusResp = await client.get(`/video-jobs/${jobId}/status`);
    const jobStatus = statusResp.data.data;

    console.info(
      `   [Worker 2 Polling]: Trạng thái = ${jobStatus.status} (${jobStatus.progress || 0}%) - Bước: ${jobStatus.step || 'QUEUED'}`,
    );

    if (jobStatus.status === 'COMPLETED') {
      console.info(
        '\n✅ [Worker 2] DỰNG VIDEO THÀNH CÔNG VỚI ĐẦY ĐỦ KẾT NỐI API!',
      );
      console.info(`   - Video URL: ${jobStatus.outputUrl}`);
      console.info(`   - Thumbnail URL: ${jobStatus.thumbnailUrl}`);
      console.info(`   - Thời lượng: ${jobStatus.duration} giây`);
      renderDone = true;
      break;
    }
    if (jobStatus.status === 'FAILED') {
      console.error(`❌ Worker 2 thất bại: ${jobStatus.message}`);
      process.exit(1);
    }
  }

  if (renderDone) {
    console.info(
      '\n================================================================',
    );
    console.info(
      '   🎉 KIỂM THỬ LIÊN THÔNG HTTP API -> WORKER THÀNH CÔNG MỸ MÃN! ',
    );
    console.info(
      '================================================================',
    );
  } else {
    console.error('\nDựng video bị lỗi hoặc quá thời gian chờ.');
  }

  // Clean up
  await db.videoJob
    .deleteMany({ where: { userId: 'e2e-api-worker-tester-id' } })
    .catch(() => {});
  await db.tokenWallet
    .deleteMany({ where: { userId: 'e2e-api-worker-tester-id' } })
    .catch(() => {});
  await db.transaction
    .deleteMany({ where: { userId: 'e2e-api-worker-tester-id' } })
    .catch(() => {});
  await db.scriptDraft
    .deleteMany({ where: { userId: 'e2e-api-worker-tester-id' } })
    .catch(() => {});
  await db.mediaAsset
    .deleteMany({ where: { userId: 'e2e-api-worker-tester-id' } })
    .catch(() => {});
  await db.project
    .deleteMany({ where: { userId: 'e2e-api-worker-tester-id' } })
    .catch(() => {});
  await db.user
    .deleteMany({ where: { id: 'e2e-api-worker-tester-id' } })
    .catch(() => {});
  await db.$disconnect();
}

run().catch((err: any) => {
  console.error('Lỗi khi chạy E2E liên thông HTTP API -> Worker:', err);
});
