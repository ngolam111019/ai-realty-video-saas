// services/video-processor/scripts/test-draft-saver.ts
import dotenv from 'dotenv';
import * as path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const { db } = await import('../src/lib/db');
  const { saveDraftSuccess } = await import('../src/processors/draft-saver');

  console.info('Khởi tạo kết nối DB và tạo bản ghi giả lập để test Draft Saver (W1-06)...');

  // 1. Tạo hoặc lấy User giả lập
  const user = await db.user.upsert({
    where: { email: 'test-agent@example.com' },
    update: {},
    create: {
      email: 'test-agent@example.com',
      name: 'Agent Đức Lâm',
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  // 2. Tạo hoặc lấy Project giả lập
  const project = await db.project.create({
    data: {
      userId: user.id,
      name: 'Vinhomes Central Park',
      propertyType: 'APARTMENT',
      city: 'Hồ Chí Minh',
      contactName: 'Đức Lâm',
      contactPhone: '0909123456',
    },
  });

  // 3. Tạo hoặc lấy VideoTemplate giả lập
  const template = await db.videoTemplate.upsert({
    where: { slug: 'can-ho-hien-dai-slug' },
    update: {},
    create: {
      name: 'Giới Thiệu Căn Hộ Hiện Đại',
      slug: 'can-ho-hien-dai-slug',
      duration: 30,
      tokenCost: 1,
      scenes: [],
    },
  });

  // 4. Tạo bản ghi ScriptDraft ban đầu ở trạng thái PROCESSING
  const draft = await db.scriptDraft.create({
    data: {
      userId: user.id,
      projectId: project.id,
      templateId: template.id,
      status: 'PROCESSING',
      progress: 0,
      currentStep: 'INITIALIZED',
    },
  });

  console.info(`Đã tạo ScriptDraft nháp trong DB với ID: ${draft.id}, Status: ${draft.status}`);

  // 5. Giả lập kịch bản được tạo từ W1-05
  const mockScript = {
    title: 'Căn Hộ Vinhomes Sang Trọng',
    scenes: [
      {
        id: 'scene-1',
        order: 1,
        name: 'Phòng khách',
        narration: 'Không gian phòng khách Vinhomes sang trọng hiện đại.',
        caption: 'Phòng khách Vinhomes Central Park.',
        suggestedDurationSeconds: 10,
        assignedAssets: [],
        textOverlays: [],
      },
    ],
    suggestedCaption: 'Bán căn hộ Vinhomes 2 phòng ngủ giá tốt...',
    suggestedHashtags: ['vinhomes', 'quan2', 'bds'],
  };

  console.info('\n--- ĐANG GỌI DRAFT SAVER ĐỂ LƯU KỊCH BẢN ---');
  await saveDraftSuccess({
    draftId: draft.id,
    script: mockScript,
  });

  // 6. Truy vấn lại từ DB để đối chiếu
  const updatedDraft = await db.scriptDraft.findUnique({
    where: { id: draft.id },
  });

  console.info('\n--- KẾT QUẢ TRONG DATABASE SAU KHI LƯU ---');
  console.info(JSON.stringify(updatedDraft, null, 2));

  // Dọn dẹp bản ghi nháp để tránh rác DB
  await db.scriptDraft.delete({ where: { id: draft.id } });
  await db.project.delete({ where: { id: project.id } });
  console.info('\nĐã dọn dẹp các bản ghi giả lập sau khi kiểm tra xong.');
}

run()
  .catch((err) => {
    console.error('Lỗi khi test Draft Saver:', err);
  })
  .finally(async () => {
    const { db } = await import('../src/lib/db');
    await db.$disconnect();
  });
