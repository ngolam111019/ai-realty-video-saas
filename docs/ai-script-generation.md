# 🤖 AI Vision Script Generation — Giải Pháp Tự Động Xem Ảnh & Viết Kịch Bản

**Tài liệu:** Kiến trúc AI multimodal cho script generation + image mapping
**Ngày tạo:** 2026-06-05

---

## 1. Tổng Quan Giải Pháp

```
INPUT:
  📸 Ảnh/Video upload (5-50 files)
  📋 Thông tin dự án (tên, giá, diện tích, tiện ích...)
  🎬 Template chọn ("Tour căn hộ", "Hot deal", ...)

          AI LÀM VIỆC:
          ┌──────────────────────────────────────────┐
          │  BƯỚC 1: Vision Analysis                 │
          │  → AI xem từng ảnh → hiểu nội dung       │
          │  → "Đây là phòng khách hiện đại, view đẹp"│
          │                                          │
          │  BƯỚC 2: Script Generation + Mapping     │
          │  → AI viết kịch bản theo template        │
          │  → AI chỉ định ảnh nào vào scene nào     │
          │  → Trả về JSON có cấu trúc               │
          └──────────────────────────────────────────┘

OUTPUT:
  📝 Script từng scene (narration + caption)
  🗺️  Mapping: scene 1 → [ảnh 3, ảnh 7] | scene 2 → [ảnh 1, ảnh 2, ảnh 5]
  ⏱️  Suggested duration mỗi scene
  🏷️  Auto-tags cho từng ảnh
```

---

## 2. Công Nghệ — Google Gemini 1.5 Pro (Lựa Chọn Tối Ưu)

```
Tại sao Gemini 1.5 Pro cho task này?

✅ Context window: 1 triệu tokens (đủ gửi 50 ảnh cùng lúc)
✅ Hỗ trợ multimodal: text + image + video frames cùng lúc
✅ Hiểu tiếng Việt tốt
✅ JSON output mode (structured output, không hallucinate format)
✅ Chi phí: rẻ hơn GPT-4o Vision ~60%
✅ Phân tích được video (extract frames tự động)

So sánh alternatives:
  GPT-4o Vision: tốt nhưng đắt hơn, giới hạn ảnh
  Claude 3.5 Sonnet: vision tốt nhưng không hỗ trợ video
  Gemini 1.5 Flash: nhanh hơn, rẻ hơn nhưng kém chất lượng hơn Pro
```

---

## 3. Pipeline 2 Bước (Recommended)

### Bước 1: Vision Analysis — AI Xem & Mô Tả Từng Ảnh

**Mục đích:** Hiểu nội dung từng ảnh trước khi gen script

```ts
// src/services/ai.service.ts

interface ImageAnalysis {
  assetId: string;
  description: string; // "Phòng khách rộng rãi, sofa da màu xám, view ra hồ bơi"
  detectedRoom: MediaTag; // LIVING_ROOM, BEDROOM, EXTERIOR...
  quality: 'excellent' | 'good' | 'poor'; // đánh giá chất lượng ảnh
  suggestedUsage: string; // "Dùng cho scene giới thiệu hoặc scene tổng quan"
  visualHighlights: string[]; // ["ánh sáng tự nhiên", "view đẹp", "nội thất hiện đại"]
}

async function analyzeImages(assets: MediaAsset[]): Promise<ImageAnalysis[]> {
  const imageParts = await Promise.all(
    assets.map(async (asset) => {
      if (asset.type === 'IMAGE') {
        // Download ảnh → convert to base64
        const imageData = await downloadAsBase64(asset.storageUrl);
        return {
          inlineData: { data: imageData, mimeType: asset.mimeType },
        };
      } else {
        // VIDEO: extract keyframe ở giây thứ 2
        const framePath = await extractVideoFrame(asset.localPath, 2);
        const frameData = await readFileAsBase64(framePath);
        return {
          inlineData: { data: frameData, mimeType: 'image/jpeg' },
        };
      }
    }),
  );

  const prompt = `
Bạn là chuyên gia marketing bất động sản. 
Hãy phân tích ${assets.length} ảnh/video sau đây của một dự án bất động sản.

Cho mỗi ảnh, hãy trả về JSON với cấu trúc:
{
  "analyses": [
    {
      "index": 0,
      "description": "mô tả ngắn gọn nội dung ảnh bằng tiếng Việt",
      "detectedRoom": "LIVING_ROOM|BEDROOM|BATHROOM|KITCHEN|EXTERIOR|LOBBY|BALCONY|AMENITY|PORTRAIT|OTHER",
      "quality": "excellent|good|poor",
      "visualHighlights": ["điểm nổi bật 1", "điểm nổi bật 2"],
      "suggestedUsage": "gợi ý dùng scene nào trong video"
    }
  ]
}

Chỉ trả về JSON, không thêm text khác.
`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: imageAnalysisSchema, // Structured output
    },
  });

  const response = await model.generateContent([prompt, ...imageParts]);
  const result = JSON.parse(response.response.text());

  return result.analyses.map((analysis, i) => ({
    assetId: assets[i].id,
    ...analysis,
  }));
}
```

---

### Bước 2: Script Generation + Image Mapping

**Mục đích:** Viết kịch bản hoàn chỉnh + quyết định ảnh nào vào scene nào

```ts
interface GeneratedScene {
  id: string;
  name: string;
  narration: string; // Văn bản đọc voiceover
  caption: string; // Text hiện trên màn hình
  suggestedDurationSeconds: number;
  assignedAssetIds: string[]; // Danh sách assetId được map vào scene này
  assignmentReason: string; // Lý do chọn ảnh này
  textOverlays: TextOverlay[]; // Icon, số liệu hiện lên
}

interface GeneratedScript {
  title: string;
  totalDurationSeconds: number;
  scenes: GeneratedScene[];
  suggestedHashtags: string[];
  suggestedCaption: string; // Caption để post lên mạng xã hội
}

async function generateScriptWithMapping(
  projectInfo: ProjectInfo,
  imageAnalyses: ImageAnalysis[],
  template: VideoTemplate,
): Promise<GeneratedScript> {
  // Build image inventory string
  const imageInventory = imageAnalyses
    .map(
      (a, i) =>
        `[${a.assetId}] ${a.detectedRoom}: ${a.description}
     Chất lượng: ${a.quality} | Highlights: ${a.visualHighlights.join(', ')}`,
    )
    .join('\n\n');

  // Build template structure string
  const templateStructure = (template.scenes as TemplateScene[])
    .map(
      (scene) =>
        `Scene ${scene.order}: "${scene.name}" — ${scene.durationHint}s
     Mục đích: ${scene.purpose}
     Media slots: ${scene.mediaSlotCount} ảnh/video`,
    )
    .join('\n');

  const prompt = `
Bạn là chuyên gia content marketing bất động sản Việt Nam với 10 năm kinh nghiệm.
Nhiệm vụ: Tạo kịch bản video hoàn chỉnh cho nhân viên sale bất động sản.

## THÔNG TIN DỰ ÁN:
Tên: ${projectInfo.name}
Loại: ${projectInfo.propertyType}
Vị trí: ${projectInfo.address}, ${projectInfo.city}
Diện tích: ${projectInfo.area}m²
Số phòng ngủ: ${projectInfo.bedrooms} PN / ${projectInfo.bathrooms} WC
Giá bán: ${formatPrice(projectInfo.salePrice)}
Tiện ích: ${projectInfo.amenities.join(', ')}
Điểm nổi bật: ${projectInfo.highlights.join(', ')}
Tên sale: ${projectInfo.contactName}
Hotline: ${projectInfo.contactPhone}

## KHO ẢNH CÓ SẴN (${imageAnalyses.length} ảnh/video):
${imageInventory}

## CẤU TRÚC TEMPLATE "${template.name}":
${templateStructure}

## YÊU CẦU:
1. Viết narration (voiceover) cho từng scene — tiếng Việt tự nhiên, giọng sale chuyên nghiệp
2. Viết caption ngắn gọn (tối đa 6 từ) hiện trên màn hình
3. CHỌN ảnh từ kho có sẵn cho từng scene — ưu tiên ảnh chất lượng "excellent" hoặc "good"
4. Mỗi scene cần 1-4 ảnh phù hợp với nội dung
5. KHÔNG dùng ảnh "poor" quality trừ khi không còn lựa chọn
6. Thời lượng narration phải khớp với suggestedDurationSeconds (±20%)
7. Kết thúc bằng CTA mạnh mẽ với hotline

Trả về JSON với cấu trúc:
{
  "title": "tiêu đề video",
  "totalDurationSeconds": số,
  "scenes": [
    {
      "id": "scene-1",
      "name": "tên scene",
      "narration": "văn bản đọc voiceover đầy đủ",
      "caption": "caption ngắn",
      "suggestedDurationSeconds": số,
      "assignedAssetIds": ["assetId-1", "assetId-2"],
      "assignmentReason": "lý do chọn ảnh này",
      "textOverlays": [
        {"text": "68m²", "position": "bottom-left", "style": "badge"},
        {"text": "3.5 tỷ", "position": "bottom-right", "style": "highlight"}
      ]
    }
  ],
  "suggestedHashtags": ["#bdssg", "#canhogiare", ...],
  "suggestedCaption": "caption để đăng social media"
}

Chỉ trả về JSON, không thêm text khác.
`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      responseSchema: generatedScriptSchema,
    },
  });

  const response = await model.generateContent(prompt);
  return JSON.parse(response.response.text());
}
```

---

## 4. One-Shot Multimodal (Alternative — Gửi Ảnh Và Viết Script Cùng Lúc)

Cách này gửi ảnh trực tiếp vào prompt AI thay vì 2 bước:

```ts
async function generateScriptOneShot(
  projectInfo: ProjectInfo,
  assets: MediaAsset[],
  template: VideoTemplate,
): Promise<GeneratedScript> {
  // Prepare image parts — gửi tất cả ảnh vào 1 request
  const imageParts = [];
  const assetRefs = [];

  for (const asset of assets) {
    const imageData = await downloadAsBase64(asset.storageUrl);
    imageParts.push({
      inlineData: { data: imageData, mimeType: asset.mimeType },
    });
    assetRefs.push(`[REF-${asset.id}] = Ảnh ${assets.indexOf(asset) + 1}`);
  }

  const prompt = `
Bạn là chuyên gia content marketing bất động sản.

Tôi đang gửi cho bạn ${assets.length} ảnh của dự án bất động sản (được đánh số từ 1 đến ${assets.length}).
Tham chiếu ảnh để mapping: ${assetRefs.join(' | ')}

THÔNG TIN DỰ ÁN:
${JSON.stringify(projectInfo, null, 2)}

TEMPLATE VIDEO: "${template.name}"
${JSON.stringify(template.scenes, null, 2)}

NHIỆM VỤ:
1. Xem kỹ tất cả ảnh và hiểu nội dung từng ảnh
2. Viết kịch bản video theo template
3. Quyết định ảnh nào đặt ở scene nào (dùng REF-{assetId} để reference)
4. Ưu tiên ảnh đẹp, ánh sáng tốt, góc chụp tốt

Trả về JSON...
[cùng schema như trên]
`;

  const response = await model.generateContent([prompt, ...imageParts]);
  return JSON.parse(response.response.text());
}
```

**So sánh 2 cách:**

|                      | 2 Bước             | 1 Bước      |
| -------------------- | ------------------ | ----------- |
| Độ chính xác mapping | ⭐⭐⭐⭐⭐         | ⭐⭐⭐⭐    |
| Token cost           | 2x API calls       | 1x API call |
| Khả năng debug       | Dễ (thấy analysis) | Khó hơn     |
| Latency              | +3-5s              | Nhanh hơn   |
| Recommend            | ✅ Production      | Dev/Testing |

---

## 5. Schema Validation (Zod)

```ts
// src/lib/validations/ai-script.schema.ts
import { z } from 'zod';

const TextOverlaySchema = z.object({
  text: z.string(),
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']),
  style: z.enum(['badge', 'highlight', 'subtitle', 'watermark']),
});

const GeneratedSceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  narration: z.string().min(10).max(500),
  caption: z.string().max(50),
  suggestedDurationSeconds: z.number().min(3).max(30),
  assignedAssetIds: z.array(z.string()).min(1).max(6),
  assignmentReason: z.string(),
  textOverlays: z.array(TextOverlaySchema).optional().default([]),
});

export const GeneratedScriptSchema = z.object({
  title: z.string(),
  totalDurationSeconds: z.number(),
  scenes: z.array(GeneratedSceneSchema).min(2).max(10),
  suggestedHashtags: z.array(z.string()).max(20),
  suggestedCaption: z.string().max(500),
});

// Validate AI output trước khi lưu DB
export function validateAIScript(raw: unknown): GeneratedScript {
  const result = GeneratedScriptSchema.safeParse(raw);
  if (!result.success) {
    throw new AIOutputError('AI trả về kịch bản không hợp lệ', result.error);
  }

  // Validate: mọi assignedAssetId phải tồn tại trong inventory
  const allAssetIds = new Set(mediaAssets.map((a) => a.id));
  for (const scene of result.data.scenes) {
    const invalid = scene.assignedAssetIds.filter((id) => !allAssetIds.has(id));
    if (invalid.length > 0) {
      throw new AIOutputError(`AI reference ảnh không tồn tại: ${invalid.join(', ')}`);
    }
  }

  return result.data;
}
```

---

## 6. Xử Lý Video Input (Extract Frames)

```ts
// src/processors/video-analyzer.ts
import { execSync } from 'child_process';

// Extract keyframe từ video để AI phân tích
export async function extractVideoKeyframes(
  videoPath: string,
  jobId: string,
  assetId: string,
): Promise<string[]> {
  const outputDir = `/tmp/${jobId}/frames/${assetId}`;
  await fs.mkdir(outputDir, { recursive: true });

  // Lấy duration của video
  const duration = parseFloat(
    execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
    ).toString(),
  );

  // Extract 3 frames: đầu, giữa, cuối
  const timestamps = [
    Math.min(1, duration * 0.1),
    duration * 0.5,
    Math.max(duration - 1, duration * 0.9),
  ];

  const framePaths: string[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const outputPath = `${outputDir}/frame_${i}.jpg`;
    execSync(`ffmpeg -ss ${timestamps[i]} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}" -y`);
    framePaths.push(outputPath);
  }

  return framePaths; // Gửi 3 frames này cho Gemini Vision
}
```

---

## 7. Prompt Engineering — Tinh Chỉnh Cho BĐS Việt Nam

```ts
// src/lib/prompts/script-generator.prompt.ts

export const SYSTEM_PROMPT = `
Bạn là chuyên gia content marketing bất động sản Việt Nam với 10 năm kinh nghiệm.
Bạn hiểu sâu về:
- Tâm lý người mua/thuê BĐS Việt Nam
- Ngôn ngữ sale BĐS chuyên nghiệp ("sổ hồng trao tay", "view triệu đô", "đẳng cấp thượng lưu")
- Các platform video: TikTok hook mạnh đầu 3s, Reels cần visual đẹp

Phong cách viết:
- Tiếng Việt tự nhiên, không cứng nhắc
- Giọng sale tự tin nhưng không áp lực
- Hook mạnh ở 3 giây đầu
- CTA rõ ràng ở cuối
`;

export function buildScriptPrompt(
  projectInfo: ProjectInfo,
  imageInventory: string,
  template: VideoTemplate,
  targetPlatform: 'tiktok' | 'reels' | 'youtube_shorts' | 'facebook',
): string {

  const platformGuidance = {
    tiktok: "Hook phải ĐỘT NGỘ trong 3 giây đầu. Dùng từ ngữ trẻ trung.",
    reels: "Visual-first. Caption ngắn, chữ lớn. Nhạc nền trending.",
    youtube_shorts: "Thông tin đầy đủ hơn. Có thể dài hơn 45 giây.",
    facebook: "Thông tin chi tiết. Người xem lớn tuổi hơn.",
  }[targetPlatform];

  return `
${SYSTEM_PROMPT}

TARGET PLATFORM: ${targetPlatform.toUpperCase()}
${platformGuidance}

THÔNG TIN DỰ ÁN:
- Tên: ${projectInfo.name}
- Loại hình: ${getPropertyTypeLabel(projectInfo.propertyType)}
- Địa chỉ: ${projectInfo.address}, ${projectInfo.district}, ${projectInfo.city}
- Diện tích: ${projectInfo.area}m² | ${projectInfo.bedrooms}PN/${projectInfo.bathrooms}WC
- Giá: ${formatPrice(projectInfo.salePrice)} (${formatPricePerSqm(projectInfo.pricePerSqm)}/m²)
- Tiện ích: ${projectInfo.amenities.join(' | ')}
- USP: ${projectInfo.highlights.join(' | ')}
- Pháp lý: ${projectInfo.legalStatus}
- Bàn giao: ${projectInfo.handoverDate}
- Chính sách: ${projectInfo.priceNote}
- Liên hệ: ${projectInfo.contactName} — ${projectInfo.contactPhone}

KHO ẢNH/VIDEO (${imageInventory đã analyze}):
${imageInventory}

TEMPLATE: "${template.name}" — ${template.duration}s
${buildTemplateStructure(template)}

YÊU CẦU ĐẶC BIỆT:
- Narration phải đọc ĐÚNG trong ${template.duration}s (±10%)
- Mỗi câu narration tối đa 15 từ (dễ đọc)
- Câu đầu scene 1 phải là hook (gây tò mò hoặc shock về giá/tiện ích)
- Câu cuối cùng phải là CTA có hotline

Trả về JSON theo schema đã định nghĩa.
`;
}
```

---

## 8. API Endpoint — Luồng Hoàn Chỉnh

```ts
// apps/web/src/app/api/scripts/generate/route.ts

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { projectId, templateId, platform } = await req.json();

  // 1. Load project info
  const project = await projectRepository.findById(projectId, session.user.id);
  if (!project) return notFound('Dự án không tìm thấy');

  // 2. Load media assets của project
  const assets = await mediaRepository.findByProject(projectId);
  if (assets.length < 2) {
    return badRequest('Cần ít nhất 2 ảnh để tạo kịch bản');
  }

  // 3. Load template
  const template = await templateRepository.findById(templateId);
  if (!template) return notFound('Template không tìm thấy');

  // 4. Check token balance (gen script tốn 1 token)
  const wallet = await tokenService.getWallet(session.user.id);
  if (wallet.balance < 1) return paymentRequired('Không đủ token');

  // 5. Deduct token
  await tokenService.deductTokens(session.user.id, 1, null, 'AI script generation');

  try {
    // 6. Download assets (cần để analyze)
    const localAssets = await mediaService.downloadForAnalysis(assets);

    // 7. Bước 1: Vision analysis
    const imageAnalyses = await aiService.analyzeImages(localAssets);

    // 8. Bước 2: Generate script + mapping
    const generatedScript = await aiService.generateScriptWithMapping(
      project,
      imageAnalyses,
      template,
      platform,
    );

    // 9. Validate output
    const validatedScript = validateAIScript(generatedScript);

    // 10. Save script to DB
    const script = await scriptRepository.create({
      userId: session.user.id,
      projectId,
      templateId,
      scenes: validatedScript.scenes,
      totalDuration: validatedScript.totalDurationSeconds,
      aiModel: 'gemini-1.5-pro',
      isEdited: false,
    });

    // 11. Update MediaAsset tags từ AI analysis
    await Promise.all(
      imageAnalyses.map((analysis) =>
        mediaRepository.updateTag(analysis.assetId, analysis.detectedRoom),
      ),
    );

    return success({
      scriptId: script.id,
      script: validatedScript,
      imageAnalyses, // Trả về để FE hiển thị "AI đã phát hiện: phòng khách, phòng ngủ..."
    });
  } catch (error) {
    // Hoàn token nếu AI fail
    await tokenService.refundTokens(session.user.id, 1, null, 'AI generation failed');
    throw error;
  } finally {
    // Cleanup temp files
    await cleanupLocalAssets(localAssets);
  }
}
```

---

## 9. UX Flow — Người Dùng Thấy Gì

```
User nhấn "Tạo kịch bản với AI"
    │
    ▼
Loading screen với progress:
  🔍 "AI đang phân tích 12 ảnh của bạn..." (5-10s)
  ✍️  "AI đang viết kịch bản..." (10-20s)
  ✅  "Kịch bản đã sẵn sàng!"
    │
    ▼
Preview kịch bản:
  ┌──────────────────────────────────────────┐
  │  Scene 1: Giới thiệu (5s)               │
  │  🎤 "Bạn đang tìm căn hộ view đẹp..."   │
  │  📸 [Ảnh mặt tiền] [Ảnh lobby]          │
  │  💡 AI chọn vì: "Ảnh có ánh sáng tốt"   │
  ├──────────────────────────────────────────┤
  │  Scene 2: Tour phòng (20s)              │
  │  🎤 "Phòng khách rộng 25m², view hồ..." │
  │  📸 [Phòng khách] [Bếp] [Phòng ngủ]    │
  │  💡 AI chọn vì: "Ảnh chất lượng excellent"│
  └──────────────────────────────────────────┘

  [✏️ Chỉnh sửa kịch bản]  [🎬 Tạo video ngay]
    │                              │
User có thể sửa tay            Trừ token → queue
```

---

## 10. Chi Phí AI Ước Tính

```
Gen kịch bản 1 video (60s, 10 ảnh):

  Bước 1: Vision analysis (10 ảnh)
    → ~10,000 image tokens × 10 = 100,000 tokens
    → Gemini 1.5 Pro: $0.00125/1k tokens → ~$0.125

  Bước 2: Script generation
    → Input: ~5,000 tokens | Output: ~2,000 tokens
    → ~$0.009 + ~$0.005 = $0.014

  TỔNG: ~$0.14 per script generation

  Với token package:
    User trả 1 token = ~5,000 VND (trong gói Pro)
    Chi phí AI thực tế: ~3,500 VND
    Margin: ~30%

Tối ưu chi phí:
  → Cache analysis result: nếu ảnh không đổi, reuse phân tích cũ
  → Dùng Gemini Flash cho bước 1 (analysis) — rẻ hơn 10x
  → Dùng Gemini Pro chỉ cho bước 2 (script gen)
```

---

## 11. Quyết Định Implement

```
Phase 1 (MVP):
  ✅ 2-Step pipeline (analyze → gen script)
  ✅ Gemini 1.5 Flash cho analysis (rẻ hơn)
  ✅ Gemini 1.5 Pro cho script gen
  ✅ JSON structured output
  ✅ Zod validation
  ✅ User có thể edit kết quả AI

Phase 2:
  ✅ Cache image analysis (Redis, 7 ngày)
  ✅ Regenerate script với context khác nhau
  ✅ A/B test nhiều phiên bản kịch bản
  ✅ Fine-tune prompt theo feedback user
```

---

## 12. Xử Lý Video Input — AI Hiểu Video Native

> **Video khác ảnh ở chỗ:** Có chiều thời gian, có chuyển động, có thể dài 1-10 phút.
> Không thể chỉ extract 1 frame — cần hiểu **chuỗi cảnh** và **chọn đoạn clip tốt nhất**.

---

### 12.1 Gemini 1.5 Pro — Native Video Understanding (Khác Biệt Lớn)

```
Gemini 1.5 Pro THỰC SỰ hiểu video (không chỉ xem ảnh):

✅ Phân tích được video dài tới 1 giờ
✅ Hiểu chuyển động: camera di chuyển, pan, zoom
✅ Nhận ra chuỗi cảnh: "0:00-0:20 sảnh, 0:20-0:55 phòng khách, 0:55-1:30 bếp"
✅ Đánh giá chất lượng từng đoạn: rung tay, mờ, tối, ánh sáng tốt
✅ Hiểu audio trong video: có giọng người, tiếng nhạc nền, tiếng ồn
✅ Gợi ý timestamp của đoạn đẹp nhất để cắt ra dùng

Limit:
  - File < 20MB: gửi inline (base64)
  - File > 20MB: upload qua Gemini File API trước → dùng URI
  - Tối đa: 1 giờ video / 1 request
```

---

### 12.2 Pipeline Phân Tích Video — 3 Bước

```
VIDEO INPUT (raw walkthrough 3 phút)
         │
         ▼
  BƯỚC A: Pre-processing (FFmpeg)
    → Đo duration, resolution, codec
    → Nếu > 20MB: compress nhẹ hoặc dùng File API
    → Extract audio track riêng (phát hiện giọng nói, nhạc)
         │
         ▼
  BƯỚC B: Gemini Video Analysis
    → Gửi video + prompt → nhận scene timeline
    → Output: [{room, startSec, endSec, quality, description}]
         │
         ▼
  BƯỚC C: Smart Clip Extraction (FFmpeg)
    → Cắt các đoạn được AI chọn ra file riêng
    → Mỗi clip: trim, stabilize (nếu rung)
    → Dùng clips này trong template video cuối
```

---

### 12.3 Bước B — Gemini Video Analysis Code

```ts
// src/processors/video-analyzer.ts

interface VideoScene {
  room: MediaTag; // LIVING_ROOM, BEDROOM, EXTERIOR...
  startSeconds: number; // 15.5
  endSeconds: number; // 42.0
  durationSeconds: number; // 26.5
  quality: 'excellent' | 'good' | 'poor' | 'unusable';
  qualityIssues: string[]; // ["camera_shake", "too_dark", "blurry"]
  description: string; // "Phòng khách rộng, ánh sáng tự nhiên, view hồ bơi"
  highlights: string[]; // ["view đẹp", "nội thất hiện đại"]
  suggestedClipStart: number; // 18.0 (bắt đầu sau khi camera đã ổn định)
  suggestedClipEnd: number; // 38.0 (kết thúc trước khi camera rung)
  suggestedClipDuration: number; // 20.0 — đoạn đẹp nhất trong scene này
}

interface VideoAnalysisResult {
  assetId: string;
  totalDuration: number;
  hasVoiceOver: boolean; // Video gốc có giọng người không?
  hasBackgroundNoise: boolean; // Có tiếng ồn không?
  overallQuality: 'excellent' | 'good' | 'poor';
  scenes: VideoScene[];
  unusableSegments: { startSec: number; endSec: number; reason: string }[];
}

export async function analyzeVideo(
  asset: MediaAsset,
  localPath: string,
): Promise<VideoAnalysisResult> {
  const fileSize = fs.statSync(localPath).size;
  let videoPartForGemini: Part;

  if (fileSize < 20 * 1024 * 1024) {
    // < 20MB: gửi inline
    const videoData = fs.readFileSync(localPath);
    videoPartForGemini = {
      inlineData: {
        data: videoData.toString('base64'),
        mimeType: asset.mimeType,
      },
    };
  } else {
    // > 20MB: upload lên Gemini File API trước
    const uploadedFile = await uploadToGeminiFileAPI(localPath, asset.mimeType);
    videoPartForGemini = {
      fileData: {
        mimeType: asset.mimeType,
        fileUri: uploadedFile.uri,
      },
    };
  }

  const prompt = `
Bạn là chuyên gia quay phim bất động sản. Hãy phân tích video walkthrough này.

NHIỆM VỤ:
1. Chia video thành các cảnh (scenes) theo phòng/khu vực
2. Đánh giá chất lượng từng cảnh
3. Tìm đoạn clip đẹp nhất trong mỗi cảnh (camera ổn định, ánh sáng tốt)
4. Gắn cờ các đoạn không dùng được (rung tay nghiêm trọng, quá tối, mờ)

Trả về JSON:
{
  "totalDuration": số_giây,
  "hasVoiceOver": true/false,
  "hasBackgroundNoise": true/false,
  "overallQuality": "excellent|good|poor",
  "scenes": [
    {
      "room": "LIVING_ROOM|BEDROOM|BATHROOM|KITCHEN|EXTERIOR|LOBBY|BALCONY|AMENITY|OTHER",
      "startSeconds": số,
      "endSeconds": số,
      "quality": "excellent|good|poor|unusable",
      "qualityIssues": ["camera_shake", "too_dark", "blurry", "overexposed"],
      "description": "mô tả cảnh bằng tiếng Việt",
      "highlights": ["điểm nổi bật 1", "điểm nổi bật 2"],
      "suggestedClipStart": số,
      "suggestedClipEnd": số
    }
  ],
  "unusableSegments": [
    {"startSec": số, "endSec": số, "reason": "lý do"}
  ]
}

Chỉ trả về JSON.
`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const response = await model.generateContent([prompt, videoPartForGemini]);
  const raw = JSON.parse(response.response.text());

  // Cleanup Gemini File API nếu đã upload
  if (fileSize >= 20 * 1024 * 1024) {
    await deleteGeminiFile(raw._fileUri);
  }

  return { assetId: asset.id, ...raw };
}
```

---

### 12.4 Bước C — Smart Clip Extraction (FFmpeg)

```ts
// src/processors/clip-extractor.ts

interface ExtractedClip {
  assetId: string;
  room: MediaTag;
  localClipPath: string; // /tmp/{jobId}/clips/clip_001.mp4
  durationSeconds: number;
  quality: string;
  description: string;
}

export async function extractBestClips(
  videoAnalysis: VideoAnalysisResult,
  sourceVideoPath: string,
  jobId: string,
): Promise<ExtractedClip[]> {
  const clipsDir = `/tmp/${jobId}/clips`;
  await fs.mkdir(clipsDir, { recursive: true });

  const clips: ExtractedClip[] = [];

  // Chỉ extract cảnh quality >= "good"
  const usableScenes = videoAnalysis.scenes.filter(
    (s) => s.quality === 'excellent' || s.quality === 'good',
  );

  for (let i = 0; i < usableScenes.length; i++) {
    const scene = usableScenes[i];
    const outputPath = `${clipsDir}/clip_${String(i).padStart(3, '0')}.mp4`;

    const start = scene.suggestedClipStart;
    const duration = scene.suggestedClipEnd - scene.suggestedClipStart;

    // FFmpeg: cắt clip + remove audio (dùng TTS audio thay thế) + stabilize
    const ffmpegCmd = [
      `ffmpeg`,
      `-ss ${start}`, // seek to start (fast)
      `-i "${sourceVideoPath}"`,
      `-t ${duration}`, // duration
      `-an`, // remove original audio
      // Video stabilization (nếu có camera shake nhẹ)
      ...(scene.qualityIssues.includes('camera_shake')
        ? [`-vf "deshake=x=-1:y=-1:w=-1:h=-1:rx=16:ry=16"`]
        : []),
      `-c:v libx264`,
      `-preset fast`,
      `-crf 22`, // chất lượng tốt
      `-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"`, // 9:16
      `"${outputPath}"`,
      `-y`,
    ].join(' ');

    execSync(ffmpegCmd, { timeout: 60000 });

    clips.push({
      assetId: videoAnalysis.assetId,
      room: scene.room,
      localClipPath: outputPath,
      durationSeconds: duration,
      quality: scene.quality,
      description: scene.description,
    });
  }

  return clips;
}
```

---

### 12.5 Cách Dùng Clips Trong Template Remotion

```ts
// Trong video pipeline — kết hợp ảnh VÀ video clips
// Remotion hỗ trợ cả <Img> lẫn <Video> components

const SceneTour: React.FC<{
  assets: Array<{type: 'image' | 'clip', localPath: string, description: string}>
}> = ({ assets, audioDuration }) => {

  const timings = distributeAssetTimings(audioDuration, assets.length);

  return (
    <>
      {assets.map((asset, i) => (
        <Sequence
          key={i}
          from={timings[i].startFrame}
          durationInFrames={timings[i].durationFrames}
        >
          {asset.type === 'image' ? (
            // Ảnh tĩnh: Ken Burns effect
            <KenBurnsImage src={asset.localPath} />
          ) : (
            // Video clip: phát bình thường (không có audio vì đã remove)
            <Video
              src={asset.localPath}
              startFrom={0}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {/* Fade transition giữa các asset */}
          <FadeTransition durationFrames={8} />
        </Sequence>
      ))}
    </>
  );
};
```

---

### 12.6 Script Generation — Tích Hợp Cả Ảnh Lẫn Video Analysis

```ts
// Bổ sung context video vào prompt gen script

function buildMediaInventoryString(
  imageAnalyses: ImageAnalysis[],
  videoAnalyses: VideoAnalysisResult[],
): string {
  const imageLines = imageAnalyses.map(
    (a) => `[IMG:${a.assetId}] ${a.detectedRoom}: ${a.description} | Chất lượng: ${a.quality}`,
  );

  const videoLines = videoAnalyses.flatMap((v) =>
    v.scenes
      .filter((s) => s.quality !== 'unusable')
      .map(
        (s) =>
          `[CLIP:${v.assetId}:${s.suggestedClipStart}-${s.suggestedClipEnd}s] ` +
          `${s.room}: ${s.description} | ${s.durationSeconds.toFixed(1)}s | ${s.quality}`,
      ),
  );

  return ['=== HÌNH ẢNH ===', ...imageLines, '', '=== VIDEO CLIPS ===', ...videoLines].join('\n');
}

// Trong prompt gen script, AI biết phân biệt IMG vs CLIP:
// "assignedAssetIds": ["IMG:asset-001", "CLIP:asset-005:15.0-38.0"]
// → Pipeline sau đó resolve đúng loại asset
```

---

### 12.7 Upload Video Lớn — Gemini File API

```ts
// src/lib/gemini-file-api.ts
// Cho video > 20MB (user thường upload 50-500MB)

interface GeminiUploadedFile {
  uri: string; // "https://generativelanguage.googleapis.com/v1beta/files/..."
  name: string;
  mimeType: string;
  sizeBytes: string;
  state: 'PROCESSING' | 'ACTIVE' | 'FAILED';
}

export async function uploadToGeminiFileAPI(
  localPath: string,
  mimeType: string,
): Promise<GeminiUploadedFile> {
  const fileSize = fs.statSync(localPath).size;
  const displayName = path.basename(localPath);

  // 1. Initiate resumable upload
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    },
  );

  const uploadUrl = initRes.headers.get('x-goog-upload-url')!;

  // 2. Upload file data
  const fileStream = fs.createReadStream(localPath);
  await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Length': fileSize.toString(),
    },
    body: fileStream,
    // @ts-ignore — Node.js fetch supports ReadStream
    duplex: 'half',
  });

  // 3. Poll until file is ACTIVE (Gemini processes it)
  let file: GeminiUploadedFile;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${uploadedName}`,
      { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! } },
    );
    file = await statusRes.json();
    if (file.state === 'ACTIVE') break;
    if (file.state === 'FAILED') throw new Error('Gemini file upload failed');
  }

  return file!;
}

// Xóa file sau khi dùng xong (tiết kiệm storage quota)
export async function deleteGeminiFile(fileUri: string): Promise<void> {
  const fileName = fileUri.split('/').pop();
  await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}`, {
    method: 'DELETE',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
  });
}
```

---

### 12.8 So Sánh Xử Lý Ảnh vs Video

| Tiêu chí                | Hình ảnh (Image)      | Video                            |
| ----------------------- | --------------------- | -------------------------------- |
| **AI hiểu**             | 1 frame tĩnh          | Chuỗi cảnh theo thời gian        |
| **Input cho AI**        | Base64 inline         | File API (nếu > 20MB)            |
| **Output AI**           | Tag + description     | Timeline scenes + timestamps     |
| **Processing thêm**     | Không cần             | FFmpeg cắt clip                  |
| **Thời gian phân tích** | ~2-5s/ảnh             | ~10-30s/video phút               |
| **Token AI cost**       | ~1000 tokens/ảnh      | ~5000 tokens/phút video          |
| **Kết quả trong video** | Ken Burns still image | Real motion video clip           |
| **Chất lượng output**   | Tốt                   | Tốt hơn (cảm giác chuyên nghiệp) |
| **Recommend cho MVP**   | ✅ Bắt đầu với ảnh    | ⚠️ Phase 2 trở đi                |

---

### 12.9 Chiến Lược Rollout

```
MVP (Phase 1):
  → Chỉ hỗ trợ ảnh (JPEG, PNG)
  → Video clip: extract 3 keyframes → xử lý như ảnh
  → Đơn giản, ship nhanh

Phase 2 (Sau MVP):
  → Native video analysis với Gemini
  → Smart clip extraction với FFmpeg
  → User upload walkthrough video → AI tự chọn đoạn đẹp nhất
  → "AI đã tìm thấy 5 cảnh đẹp trong video của bạn (37s phòng khách, 24s bếp...)"

Phase 3:
  → Multiple video inputs (user upload nhiều clip khác nhau)
  → AI cross-analyze: chọn cảnh tốt nhất từ nhiều video
  → Auto-color grading để video đồng đều màu sắc (FFmpeg filters)
```

---

### 12.10 Chi Phí Video Analysis

```
Video walkthrough 3 phút (user upload điển hình):

  Upload lên Gemini File API:
    → Free (Gemini Files API không charge phí upload)
    → File tồn tại 48h rồi tự xóa

  Gemini 1.5 Pro Video Understanding:
    → 3 phút video ≈ 180 frames (1fps) ≈ ~15,000 tokens input
    → $0.00125/1k tokens → ~$0.019

  FFmpeg clip extraction:
    → Chi phí CPU server (Railway): negligible

  TỔNG chi phí video analysis: ~$0.02/video
  So với ảnh: ~$0.14/10 ảnh

→ Phân tích 1 video còn RẺ hơn phân tích 10 ảnh!
  (vì AI hiểu video holistically, không cần xử lý từng frame riêng)
```
