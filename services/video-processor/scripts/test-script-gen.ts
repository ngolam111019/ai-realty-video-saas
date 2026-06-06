// services/video-processor/scripts/test-script-gen.ts
import dotenv from 'dotenv';
import * as path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function run() {
  console.info('Đang khởi tạo dữ liệu giả lập dự án BĐS và gọi Gemini để sinh kịch bản (W1-05)...');

  // Giả lập thông tin một căn hộ chung cư
  const project = {
    name: 'Căn Hộ Sunwah Pearl 2 Phòng Ngủ',
    propertyType: 'APARTMENT',
    address: '90 Nguyễn Hữu Cảnh',
    district: 'Bình Thạnh',
    city: 'Hồ Chí Minh',
    area: 88,
    bedrooms: 2,
    bathrooms: 2,
    salePrice: 8500000000, // 8.5 Tỷ
    amenities: ['Hồ bơi chân mây', 'Gym', 'Khu BBQ', 'Công viên ven sông'],
    highlights: [
      'Sổ hồng sẵn sàng sang tên',
      'View trực diện sông Sài Gòn và Quận 1',
      'Nội thất bàn giao cao cấp',
    ],
    contactName: 'Đức Lâm BĐS',
    contactPhone: '0909123456',
  };

  // Giả lập template cảnh của video
  const templateScenes = [
    {
      id: 'scene-intro',
      name: 'Mở đầu',
      duration: 5,
      mediaSlots: [{ type: 'IMAGE' as const, requiredTag: 'EXTERIOR' as const }],
      textSlots: [{ position: 'top-left' as const, style: 'badge' as const }],
    },
    {
      id: 'scene-living',
      name: 'Phòng khách',
      duration: 6,
      mediaSlots: [{ type: 'VIDEO_CLIP' as const, requiredTag: 'LIVING_ROOM' as const }],
      textSlots: [{ position: 'bottom-left' as const, style: 'highlight' as const }],
    },
    {
      id: 'scene-bedroom',
      name: 'Phòng ngủ',
      duration: 5,
      mediaSlots: [{ type: 'IMAGE' as const, requiredTag: 'BEDROOM' as const }],
      textSlots: [{ position: 'top-right' as const, style: 'badge' as const }],
    },
    {
      id: 'scene-outro',
      name: 'Liên hệ',
      duration: 4,
      mediaSlots: [{ type: 'IMAGE' as const, requiredTag: 'PORTRAIT' as const }],
      textSlots: [{ position: 'center' as const, style: 'subtitle' as const }],
    },
  ];

  // Giả lập các file ảnh/video của dự án đã được AI Vision phân tích trước đó
  const analyzedAssets = [
    {
      id: 'asset-exterior-img',
      type: 'IMAGE' as const,
      storageUrl: 'https://r2.example.com/sunwah-exterior.jpg',
      detectedRoom: 'EXTERIOR' as const,
      quality: 'excellent' as const,
      description: 'Ảnh chụp mặt tiền tòa nhà Sunwah Pearl lộng lẫy vào buổi tối.',
    },
    {
      id: 'asset-living-vid',
      type: 'VIDEO_CLIP' as const,
      storageUrl: 'https://r2.example.com/sunwah-living.mp4',
      detectedRoom: 'LIVING_ROOM' as const,
      quality: 'excellent' as const,
      description:
        'Video quay lia góc rộng toàn bộ phòng khách có ban công ngập tràn ánh sáng và view sông.',
      durationSeconds: 15.0,
      cropStartSeconds: 2.0,
      cropEndSeconds: 12.0,
    },
    {
      id: 'asset-bedroom-img',
      type: 'IMAGE' as const,
      storageUrl: 'https://r2.example.com/sunwah-bedroom.jpg',
      detectedRoom: 'BEDROOM' as const,
      quality: 'good' as const,
      description: 'Ảnh chụp phòng ngủ Master ấm cúng, lát sàn gỗ sạch sẽ.',
    },
    {
      id: 'asset-sale-portrait',
      type: 'IMAGE' as const,
      storageUrl: 'https://r2.example.com/lam-agent.jpg',
      detectedRoom: 'PORTRAIT' as const,
      quality: 'excellent' as const,
      description: 'Ảnh chân dung chuyên nghiệp của môi giới Đức Lâm.',
    },
  ];

  try {
    const { generateScript } = await import('../src/processors/script-generator');
    const script = await generateScript({
      project,
      templateScenes,
      analyzedAssets,
    });

    console.info('\n--- KỊCH BẢN VIDEO ĐƯỢC AI TẠO RA ---');
    console.info(JSON.stringify(script, null, 2));
  } catch (error) {
    console.error('Lỗi khi sinh kịch bản:', error);
  }
}

run();
