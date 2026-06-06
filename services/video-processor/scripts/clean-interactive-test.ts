// services/video-processor/scripts/clean-interactive-test.ts
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  const { db } = await import('../src/lib/db');

  console.info('Đang bắt đầu dọn dẹp dữ liệu kiểm thử tương tác (Worker 1)...');

  const emails = [
    'interactive-pipeline-tester@example.com',
    'interactive-render-tester@example.com',
  ];

  for (const email of emails) {
    console.info(`Đang dọn dẹp dữ liệu của user: ${email}...`);
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.info(`- Không tìm thấy dữ liệu cho ${email}.`);
      continue;
    }

    // Xóa toàn bộ VideoJob liên quan trước
    const deletedJobs = await db.videoJob.deleteMany({
      where: { userId: user.id },
    });
    console.info(`- Đã xóa ${deletedJobs.count} bản ghi VideoJob.`);

    // Xóa Wallet
    await db.tokenWallet.deleteMany({
      where: { userId: user.id },
    });
    console.info('- Đã xóa TokenWallet.');

    // Xóa Transaction
    await db.transaction.deleteMany({
      where: { userId: user.id },
    });
    console.info('- Đã xóa Transaction.');

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
    console.info(`- Đã xóa User: ${email}.`);
  }

  // Xóa VideoTemplate
  await db.videoTemplate
    .delete({
      where: { slug: 'chateau-villa-tour' },
    })
    .catch(() => {});
  console.info('- Đã xóa VideoTemplate kiểm thử.');

  // Xóa các file kết quả kiểm thử trong test-assets
  const testAssetsDir = path.resolve(__dirname, '../test-assets');
  if (fs.existsSync(testAssetsDir)) {
    const files = fs.readdirSync(testAssetsDir);
    const originals = ['livingroom.jpg', 'bedroom.jpg', 'avatar.jpg', 'test-property.mp4'];
    let deletedFilesCount = 0;
    for (const file of files) {
      if (!originals.includes(file)) {
        try {
          fs.unlinkSync(path.join(testAssetsDir, file));
          deletedFilesCount++;
        } catch (err) {
          // ignore
        }
      }
    }
    console.info(`- Đã dọn dẹp ${deletedFilesCount} file media tạm trong test-assets.`);
  }

  await db.$disconnect();
  console.info('Dọn dẹp hoàn tất cơ sở dữ liệu!');
}

run().catch((err) => {
  console.error('Lỗi khi dọn dẹp dữ liệu:', err);
});
