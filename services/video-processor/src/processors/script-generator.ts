// services/video-processor/src/processors/script-generator.ts
import { genAI } from '../lib/gemini';
import { ProjectInfo, GeneratedScript, MediaTag, Quality, MediaType } from '../types';

export interface TemplateScene {
  id: string;
  name: string;
  duration: number;
  mediaSlots: {
    type: 'IMAGE' | 'VIDEO_CLIP';
    requiredTag: MediaTag;
  }[];
  textSlots: {
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    style: 'badge' | 'highlight' | 'subtitle' | 'watermark';
  }[];
}

export interface AnalyzedMediaAsset {
  id: string;
  type: MediaType;
  storageUrl: string;
  thumbnailUrl?: string;
  detectedRoom: MediaTag;
  quality: Quality;
  description: string;
  durationSeconds?: number;
  cropStartSeconds?: number;
  cropEndSeconds?: number;
}

export interface ScriptGeneratorInput {
  project: ProjectInfo;
  templateScenes: TemplateScene[];
  analyzedAssets: AnalyzedMediaAsset[];
}

const GENERATE_SCRIPT_PROMPT = `
Bạn là một đạo diễn và biên kịch video quảng cáo bất động sản chuyên nghiệp tại Việt Nam.
Hãy lên kịch bản chi tiết cho video giới thiệu dựa trên thông tin dự án, danh sách các cảnh (scenes) trong template, và các file media (ảnh/video) đã được phân tích.

Mục tiêu:
1. Gán các media asset phù hợp nhất vào các slot của từng scene dựa trên room tag tương ứng (ví dụ: LIVING_ROOM gán vào cảnh Phòng khách).
2. Viết lời bình (narration) bằng tiếng Việt tự nhiên, lôi cuốn, phù hợp với thời lượng của scene. Tốc độ nói trung bình là 3 từ/giây (ví dụ: 5 giây -> viết tối đa 15 từ).
3. Thiết kế phụ đề ngắn (caption) và chữ hiển thị nổi trên màn hình (textOverlays) để làm nổi bật các điểm bán hàng độc nhất (USP) của bất động sản.
4. Đề xuất caption và hashtag hấp dẫn để đăng mạng xã hội (TikTok, Facebook, Instagram).

Quy tắc gán asset:
- Chỉ sử dụng các assetId có trong danh sách được cung cấp. Không tự chế ra assetId mới.
- Nếu là video (VIDEO_CLIP), bạn phải cung cấp clipStartSeconds và clipEndSeconds nằm trong khoảng [cropStartSeconds, cropEndSeconds] đề xuất của video đó, sao cho thời lượng (clipEndSeconds - clipStartSeconds) tương ứng hoặc gần bằng thời lượng của scene.

Hãy trả về định dạng JSON chính xác như sau:
{
  "title": "Tiêu đề video (max 10 từ)",
  "scenes": [
    {
      "id": "scene_id từ template",
      "order": 1,
      "name": "tên cảnh",
      "narration": "Lời thuyết minh tiếng Việt lôi cuốn (max 3 từ mỗi giây của cảnh)",
      "caption": "Phụ đề chữ chạy bên dưới (max 10 từ)",
      "suggestedDurationSeconds": 5,
      "assignedAssets": [
        {
          "assetId": "id của asset",
          "type": "IMAGE|VIDEO_CLIP",
          "detectedRoom": "room tag của asset",
          "quality": "quality của asset",
          "assignmentReason": "lý do gán ngắn gọn",
          "thumbnailUrl": "URL thumbnail của asset nếu có",
          "clipStartSeconds": 0,
          "clipEndSeconds": 5
        }
      ],
      "textOverlays": [
        {
          "text": "Nội dung chữ nổi bật (ví dụ: 'Giá chỉ 2.5 Tỷ', 'Sổ hồng riêng')",
          "position": "top-left|top-right|bottom-left|bottom-right|center",
          "style": "badge|highlight|subtitle|watermark"
        }
      ]
    }
  ],
  "suggestedCaption": "Nội dung bài viết đăng MXH đi kèm video",
  "suggestedHashtags": ["hashtag1", "hashtag2"]
}
`;

export async function generateScript(input: ScriptGeneratorInput): Promise<GeneratedScript> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const projectJson = JSON.stringify(input.project, null, 2);
  const templateJson = JSON.stringify(input.templateScenes, null, 2);
  const assetsJson = JSON.stringify(input.analyzedAssets, null, 2);

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: GENERATE_SCRIPT_PROMPT },
          {
            text: `
=== THÔNG TIN DỰ ÁN ===
${projectJson}

=== DANH SÁCH SCENE TRONG TEMPLATE ===
${templateJson}

=== DANH SÁCH MEDIA ASSET ĐÃ PHÂN TÍCH ===
${assetsJson}
`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const text = response.response.text();
  if (!text) {
    throw new Error('Gemini API returned an empty script response');
  }

  const parsed = JSON.parse(text);

  // Validate or set default schema structure
  const title = parsed.title || 'Giới thiệu Bất động sản';
  const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  const suggestedCaption = parsed.suggestedCaption || '';
  const suggestedHashtags = Array.isArray(parsed.suggestedHashtags) ? parsed.suggestedHashtags : [];

  const formattedScenes = scenes.map((s: any, idx: number) => {
    return {
      id: s.id || `scene_${idx + 1}`,
      order: typeof s.order === 'number' ? s.order : idx + 1,
      name: s.name || 'Cảnh',
      narration: s.narration || '',
      caption: s.caption || '',
      suggestedDurationSeconds:
        typeof s.suggestedDurationSeconds === 'number' ? s.suggestedDurationSeconds : 5,
      assignedAssets: Array.isArray(s.assignedAssets) ? s.assignedAssets : [],
      textOverlays: Array.isArray(s.textOverlays) ? s.textOverlays : [],
    };
  });

  return {
    title,
    scenes: formattedScenes,
    suggestedCaption,
    suggestedHashtags,
  };
}
