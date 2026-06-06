// services/video-processor/src/processors/script-generator.test.ts
import { generateScript } from './script-generator';
import { genAI } from '../lib/gemini';

jest.mock('../lib/gemini', () => ({
  genAI: {
    getGenerativeModel: jest.fn(),
  },
}));

describe('script-generator', () => {
  const mockGenerateContent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (genAI.getGenerativeModel as jest.Mock).mockReturnValue({
      generateContent: mockGenerateContent,
    });
  });

  test('TC-01: Tạo kịch bản hoàn chỉnh từ dự án và assets', async () => {
    const mockOutput = {
      title: 'Căn Hộ Đẳng Cấp Quận 2',
      scenes: [
        {
          id: 'sc-living',
          order: 1,
          name: 'Phòng khách',
          narration: 'Chào mừng bạn đến với căn hộ 2 phòng ngủ tại Quận 2.',
          caption: 'Phòng khách sang trọng rộng rãi',
          suggestedDurationSeconds: 5,
          assignedAssets: [
            {
              assetId: 'a-living',
              type: 'IMAGE',
              detectedRoom: 'LIVING_ROOM',
              quality: 'excellent',
              assignmentReason: 'Phù hợp phòng khách',
            },
          ],
          textOverlays: [
            {
              text: 'Giá chỉ 3 Tỷ',
              position: 'top-left',
              style: 'badge',
            },
          ],
        },
      ],
      suggestedCaption: 'Bán căn hộ cao cấp đầy đủ tiện nghi...',
      suggestedHashtags: ['quan2', 'canho'],
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(mockOutput),
      },
    });

    const result = await generateScript({
      project: {
        name: 'Vinhomes Grand Park',
        propertyType: 'APARTMENT',
        address: 'Nguyen Xien',
        district: 'District 9',
        city: 'Ho Chi Minh',
        amenities: ['Pool', 'Gym'],
        highlights: ['Sổ hồng riêng'],
        contactName: 'Lâm BĐS',
        contactPhone: '0909123456',
      },
      templateScenes: [
        {
          id: 'sc-living',
          name: 'Phòng khách',
          duration: 5,
          mediaSlots: [{ type: 'IMAGE', requiredTag: 'LIVING_ROOM' }],
          textSlots: [{ position: 'top-left', style: 'badge' }],
        },
      ],
      analyzedAssets: [
        {
          id: 'a-living',
          type: 'IMAGE',
          storageUrl: 'https://cdn.example.com/living.jpg',
          detectedRoom: 'LIVING_ROOM',
          quality: 'excellent',
          description: 'Ảnh chụp phòng khách',
        },
      ],
    });

    expect(result.title).toBe('Căn Hộ Đẳng Cấp Quận 2');
    expect(result.scenes[0].id).toBe('sc-living');
    expect(result.scenes[0].assignedAssets[0].assetId).toBe('a-living');
    expect(result.suggestedHashtags).toContain('quan2');
  });
});
