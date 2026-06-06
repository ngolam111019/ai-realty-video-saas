// services/video-processor/scripts/test-orchestrator.ts
import dotenv from 'dotenv';
import * as path from 'path';
import { Queue } from 'bullmq';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const { db } = await import('../src/lib/db');
  const { redis } = await import('../src/lib/redis');

  console.info('1. Khởi tạo dữ liệu giả lập trong cơ sở dữ liệu...');

  // Tạo User giả lập
  const user = await db.user.upsert({
    where: { email: 'test-orchestrator@example.com' },
    update: {},
    create: {
      email: 'test-orchestrator@example.com',
      name: 'Tester Orchestrator',
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  // Tạo Project giả lập
  const project = await db.project.create({
    data: {
      userId: user.id,
      name: 'Estella Heights Quận 2',
      propertyType: 'APARTMENT',
      city: 'Hồ Chí Minh',
      contactName: 'Đức Lâm BĐS',
      contactPhone: '0909123456',
    },
  });

  // Tạo Template giả lập
  const template = await db.videoTemplate.upsert({
    where: { slug: 'simple-tour-template' },
    update: {},
    create: {
      name: 'Tour Căn Hộ Đơn Giản',
      slug: 'simple-tour-template',
      duration: 15,
      tokenCost: 1,
      scenes: [
        {
          id: 'sc-1',
          name: 'Phòng khách',
          duration: 15,
          mediaSlots: [{ type: 'IMAGE', requiredTag: 'LIVING_ROOM' }],
          textSlots: [],
        },
      ],
    },
  });

  // Tạo ScriptDraft giả lập
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

  console.info(`-> Đã tạo ScriptDraft nháp trong DB với ID: ${draft.id}`);

  // 2. Khởi chạy Worker
  console.info('\n2. Đang khởi chạy Worker lắng nghe hàng đợi...');
  const { scriptGenWorker } = await import('../src/workers/script-gen.worker');

  // 3. Gửi job vào hàng đợi BullMQ
  console.info('\n3. Đang đẩy job tạo kịch bản vào hàng đợi realty.script.generate...');
  const queue = new Queue('realty.script.generate', {
    connection: redis as any,
  });

  const job = await queue.add('generate-script-job', { draftId: draft.id });
  console.info(`-> Đã gửi job thành công. Job ID: ${job.id}`);

  // 4. Chờ Job hoàn thành
  console.info('\n4. Đang đợi Worker xử lý job (bao gồm các bước trong pipeline)...');

  // Đợi job hoàn thành trong tối đa 60 giây
  let isDone = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const currentDraft = await db.scriptDraft.findUnique({
      where: { id: draft.id },
    });

    if (currentDraft) {
      console.info(
        `   [Tiến trình]: Bước: ${currentDraft.currentStep} | Progress: ${currentDraft.progress}% | Trạng thái: ${currentDraft.status}`,
      );
      if (currentDraft.status === 'READY' || currentDraft.status === 'FAILED') {
        console.info(`\n-> Job đã hoàn tất với trạng thái cuối cùng: ${currentDraft.status}`);
        console.info('\n--- KỊCH BẢN ĐÃ ĐƯỢC LƯU TRONG DB ---');
        console.info(JSON.stringify(currentDraft, null, 2));
        isDone = true;
        break;
      }
    }
  }

  if (!isDone) {
    console.warn('\nTimeout: Quá 60 giây chưa thấy job hoàn thành.');
  }

  // 5. Dọn dẹp dữ liệu giả lập
  console.info('\n5. Đang dọn dẹp dữ liệu giả lập...');
  await db.scriptDraft.delete({ where: { id: draft.id } }).catch(() => {});
  await db.project.delete({ where: { id: project.id } }).catch(() => {});
  await queue.close();
  await scriptGenWorker.close();
  await redis.quit();
  await db.$disconnect();
  console.info('Hoàn tất kiểm tra.');
}

run().catch((err) => {
  console.error('Lỗi khi chạy thử orchestrator:', err);
});
