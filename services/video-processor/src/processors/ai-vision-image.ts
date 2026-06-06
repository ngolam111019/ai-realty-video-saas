// services/video-processor/src/processors/ai-vision-image.ts
import * as fs from 'fs/promises';
import { genAI } from '../lib/gemini';
import { MediaTag, Quality } from '../types';

export interface AnalyzeImageInput {
  assetId: string;
  localImagePath: string;
  mimeType: string;
}

export interface ImageAnalysisResult {
  assetId: string;
  detectedRoom: MediaTag;
  quality: Quality;
  description: string;
  highlights: string[];
  qualityIssues: string[];
  suggestedUsage: string;
  cacheHit: boolean;
}

const ANALYZE_IMAGE_PROMPT = `
Bạn là chuyên gia nhiếp ảnh bất động sản Việt Nam.
Phân tích ảnh này và trả về JSON có cấu trúc chính xác như sau:

{
  "detectedRoom": "LIVING_ROOM|BEDROOM|BATHROOM|KITCHEN|EXTERIOR|LOBBY|BALCONY|AMENITY|PORTRAIT|OTHER",
  "quality": "excellent|good|poor",
  "description": "mô tả ngắn gọn bằng tiếng Việt (max 50 từ)",
  "highlights": ["điểm mạnh 1", "điểm mạnh 2"],
  "qualityIssues": ["vấn đề nếu có"],
  "suggestedUsage": "gợi ý dùng ở scene nào trong video BĐS"
}

Tiêu chí đánh giá chất lượng:
- excellent: ánh sáng tốt, rõ nét, góc chụp đẹp, không rung
- good: dùng được nhưng có 1-2 điểm cần cải thiện
- poor: tối, mờ, rung tay, góc xấu — nhưng vẫn dùng được
(poor khác unusable: poor vẫn dùng được, chỉ không lý tưởng)

LƯU Ý: Chỉ được chọn detectedRoom trong các giá trị: LIVING_ROOM, BEDROOM, BATHROOM, KITCHEN, EXTERIOR, LOBBY, BALCONY, AMENITY, PORTRAIT, OTHER.
`;

export async function analyzeImage(input: AnalyzeImageInput): Promise<ImageAnalysisResult> {
  const fileBuffer = await fs.readFile(input.localImagePath);
  const base64Data = fileBuffer.toString('base64');

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: ANALYZE_IMAGE_PROMPT },
          {
            inlineData: {
              data: base64Data,
              mimeType: input.mimeType,
            },
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
    throw new Error('Gemini API returned an empty response');
  }

  const parsed = JSON.parse(text);

  // Validate properties
  const detectedRoom = parsed.detectedRoom || 'OTHER';
  const quality = parsed.quality || 'good';
  const description = parsed.description || '';
  const highlights = Array.isArray(parsed.highlights) ? parsed.highlights : [];
  const qualityIssues = Array.isArray(parsed.qualityIssues) ? parsed.qualityIssues : [];
  const suggestedUsage = parsed.suggestedUsage || '';

  return {
    assetId: input.assetId,
    detectedRoom: detectedRoom as MediaTag,
    quality: quality as Quality,
    description,
    highlights,
    qualityIssues,
    suggestedUsage,
    cacheHit: false,
  };
}
