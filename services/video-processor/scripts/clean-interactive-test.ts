// services/video-processor/scripts/clean-interactive-test.ts
import dotenv from 'dotenv';
import * as path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const { db } = await import('../src/lib/db');

  console.info('Đang bắt đầu dọn dẹp dữ liệu kiểm thử tương tác (Worker 1)...');

  // Tìm User test
  const user = await db.user.findUnique({
    where: { email: 'interactive-pipeline-tester@example.com' },
  });

  if (!user) {
    console.info('Không tìm thấy dữ liệu kiểm thử nào cần dọn dẹp.');
    process.exit(0);
  }

  // Xóa toàn bộ ScriptDraft liên quan
  const deletedDrafts = await db.scriptDraft.deleteMany({
    where: { userId: user.id },
  });
  console.info(`- Đã xóa ${deletedDrafts.count} bản ghi ScriptDraft.`);

  // Xóa toàn bộ MediaAsset liên quan
  const deletedAssets = await db.mediaAsset.deleteMany({
    where: { userId: user.id },
  });
  console.info(`- Đã xóa ${deletedAssets.count} bản ghi MediaAsset.`);

  // Xóa Project liên quan
  const deletedProjects = await db.project.deleteMany({
    where: { userId: user.id },
  });
  console.info(`- Đã xóa ${deletedProjects.count} bản ghi Project.`);

  // Xóa User test
  await db.user.delete({
    where: { id: user.id },
  });
  console.info('- Đã xóa User kiểm thử.');

  // Xóa VideoTemplate
  await db.videoTemplate
    .delete({
      where: { slug: 'chateau-villa-tour' },
    })
    .catch(() => {});
  console.info('- Đã xóa VideoTemplate kiểm thử.');

  await db.$disconnect();
  console.info('Dọn dẹp hoàn tất cơ sở dữ liệu!');
}

run().catch((err) => {
  console.error('Lỗi khi dọn dẹp dữ liệu:', err);
});
