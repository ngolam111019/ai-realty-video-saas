# API Contracts — AI Realty Video SaaS

**Cập nhật:** 2026-06-05 v3.0
**Kiến trúc:** 2-Phase Pipeline — User review script trước khi render

---

## ⭐ Luồng Tổng Quát (2 Phase)

```
PHASE 1 — Script Generation (nhanh, ~30-60s, miễn phí token render)
  User upload media + điền thông tin + chọn template
  → POST /api/script-drafts
  → video-processor: AI Vision + Script Gen + Scene Mapping
  → Trả về draft script cho user xem

USER REVIEW
  Xem AI đã viết gì, ảnh nào vào scene nào
  Chỉnh sửa nếu muốn (narration, caption, đổi ảnh)
  → Hài lòng → Click "Tạo video"

PHASE 2 — Video Production (chậm, 3-8 phút, trừ token)
  POST /api/video-jobs với scriptId đã approved
  → Trừ token
  → video-processor: TTS + Clip Extraction + Render + Upload
  → Video hoàn thành
```

---

## 1. Phase 1: Script Draft Generation

### POST `/api/script-drafts`

**Mục đích:** Tạo script draft — AI tự xem ảnh + viết kịch bản + gán ảnh vào scene
**Token cost:** 0 (script gen = miễn phí, chỉ tốn token khi render)

```ts
// Request
interface CreateScriptDraftRequest {
  projectId: string;
  templateId: string;
  mediaAssetIds: string[];     // Ảnh/video user chọn
  portraitAssetId?: string;
  targetPlatform: 'tiktok' | 'reels' | 'facebook' | 'youtube_shorts';
}

// Response (202 Accepted — async processing)
{
  success: true,
  data: {
    draftId: string;
    status: 'PROCESSING';
    estimatedSeconds: 30-60;
    message: "AI đang phân tích ảnh và viết kịch bản...";
  }
}
```

### GET `/api/script-drafts/{id}`

**Polling mỗi 3s để xem trạng thái:**

```ts
// Response khi đang xử lý
{
  success: true,
  data: {
    draftId: string;
    status: 'PROCESSING';
    progress: 60;
    step: 'SCRIPT_GENERATION';
    message: "AI đang viết kịch bản...";
  }
}

// Response khi hoàn thành
{
  success: true,
  data: {
    draftId: string;
    status: 'READY';
    script: {
      title: string;
      totalDurationHint: number;  // giây (ước tính)
      scenes: [
        {
          id: "scene-1",
          order: 1,
          name: "Giới thiệu",
          narration: "Chào mừng bạn đến với Vinhomes Grand Park...",
          caption: "Vinhomes Grand Park",
          suggestedDurationSeconds: 5,
          assignedAssets: [
            {
              assetId: "asset-003",
              type: "IMAGE",
              thumbnailUrl: "https://cdn.../thumb.jpg",
              detectedRoom: "EXTERIOR",
              assignmentReason: "Ảnh mặt tiền đẹp, ánh sáng tốt"
            }
          ],
          textOverlays: [
            { text: "Vinhomes Grand Park", position: "center", style: "highlight" }
          ]
        },
        {
          id: "scene-2",
          order: 2,
          name: "Tour phòng khách",
          narration: "Phòng khách rộng 25m², view hồ bơi tuyệt đẹp...",
          assignedAssets: [
            { assetId: "asset-001", type: "IMAGE", detectedRoom: "LIVING_ROOM", ... },
            { assetId: "asset-005", type: "VIDEO_CLIP", detectedRoom: "LIVING_ROOM",
              clipStartSeconds: 15.0, clipEndSeconds: 38.0,
              assignmentReason: "Clip cho thấy toàn cảnh phòng khách tự nhiên" }
          ],
          ...
        }
      ],
      suggestedCaption: "🏡 Vinhomes Grand Park - Căn hộ mơ ước...",
      suggestedHashtags: ["#vinhomes", "#bdssg", "#canhogiare"]
    }
  }
}
```

### PUT `/api/script-drafts/{id}`

**User chỉnh sửa draft:**

```ts
// Request — chỉ gửi những gì thay đổi
interface UpdateScriptDraftRequest {
  scenes?: {
    id: string;
    narration?: string;       // Sửa văn bản voiceover
    caption?: string;         // Sửa caption
    assignedAssetIds?: string[]; // Thay ảnh
    textOverlays?: TextOverlay[];
  }[];
  suggestedCaption?: string;
  suggestedHashtags?: string[];
}

// Response
{ success: true, data: { draftId, updatedAt } }
```

---

## 2. Phase 2: Video Production (sau khi user approve)

### POST `/api/video-jobs`

**Mục đích:** User đã review draft → approve → bắt đầu render
**Token cost:** Trừ theo template (5-10 token)

```ts
// Request
interface CreateVideoJobRequest {
  scriptDraftId: string;      // Draft đã approved
  ttsProvider: 'fptai' | 'elevenlabs';  // fptai = mặc định (rẻ hơn)
  ttsVoiceId: string;         // 'lannhi', 'giahuy', ...
  renderEngine?: 'ffmpeg' | 'remotion';  // ffmpeg = mặc định
  resolution?: '1080x1920' | '1080x1080';
}

// Response (202 Accepted)
{
  success: true,
  data: {
    jobId: string;
    status: 'QUEUED';
    estimatedMinutes: 3-8;
    tokenDeducted: number;
    remainingTokens: number;
    message: "Video đang được tạo, vui lòng chờ 3-5 phút";
  }
}
```

### GET `/api/video-jobs/{id}/status`

**Polling progress:**

```ts
{
  success: true,
  data: {
    jobId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;    // 0-100
    step: JobRenderStep;
    message: string;

    // Chỉ có khi COMPLETED:
    outputUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
  }
}

type JobRenderStep =
  | 'AUDIO_GENERATION'   // 15% — Đang tạo giọng đọc
  | 'CLIP_EXTRACTION'    // 35% — Đang xử lý video clips
  | 'RENDERING'          // 70% — Đang render video
  | 'UPLOAD'             // 90% — Đang tải lên
  | 'COMPLETE'           // 100%
```

---

## 3. BullMQ Queues (2 queues riêng biệt)

### Queue 1: `realty.script.generate`

**Nhanh (~30-60s), không tốn token render**

```ts
// Job payload
interface ScriptGenerateJob {
  draftId: string;
  userId: string;
  projectId: string;
  templateId: string;
  mediaAssetIds: string[];
  portraitAssetId?: string;
  targetPlatform: string;
  projectInfo: ProjectInfo; // Snapshot của project
}
```

**video-processor xử lý:**

```
1. Download media (10%)
2. AI Vision: Gemini Flash-8B xem ảnh/video (40%)
3. Script Gen: Gemini Flash viết script + gán ảnh (80%)
4. Update ScriptDraft: status=READY + scenes JSON (100%)
5. Redis pub/sub → apps/web → thông báo user
```

### Queue 2: `realty.video.render`

**Chậm (3-8 phút), tốn token**

```ts
// Job payload
interface VideoRenderJob {
  jobId: string;
  userId: string;
  draftId: string; // Script draft đã approved (có scenes + assignedAssets)
  ttsProvider: string;
  ttsVoiceId: string;
  renderEngine: string;
  resolution: string;
  tokenCost: number; // Để refund nếu fail
}
```

**video-processor xử lý:**

```
1. Load ScriptDraft từ DB (scenes + assignedAssets đã có)
2. Download media (media đã biết từ draft) (10%)
3. TTS: FPT.AI → MP3 từng scene + word timestamps (35%)
4. Clip Extraction: FFmpeg cắt video clips nếu có (55%)
5. Render: FFmpeg/Remotion (80%)
6. Upload MP4 + thumbnail → R2 (92%)
7. Update VideoJob: COMPLETED (100%)
```

---

## 4. Redis Pub/Sub Events

### Script Draft Events

**Channel: `realty:v1:draft:{draftId}:progress`**

```ts
interface DraftProgressEvent {
  draftId: string;
  userId: string;
  progress: number;
  step: 'MEDIA_DOWNLOAD' | 'AI_VISION' | 'SCRIPT_GENERATION' | 'COMPLETE';
  message: string;
}
```

**Channel: `realty:v1:draft:{draftId}:complete`**

```ts
interface DraftCompleteEvent {
  draftId: string;
  userId: string;
  status: 'READY';
  sceneCount: number;
  totalDurationHint: number;
}
```

### Video Job Events

**Channel: `realty:v1:job:{jobId}:progress`**

```ts
interface JobProgressEvent {
  jobId: string;
  userId: string;
  progress: number;
  step: JobRenderStep;
  message: string;
}
```

**Channel: `realty:v1:job:{jobId}:complete`**

```ts
interface JobCompleteEvent {
  jobId: string;
  userId: string;
  outputUrl: string;
  thumbnailUrl: string;
  duration: number;
}
```

**Channel: `realty:v1:job:{jobId}:failed`**

```ts
interface JobFailedEvent {
  jobId: string;
  userId: string;
  step: string;
  userMessage: string;
  refundTokens: number;
}
```

---

## 5. Shared Types (`packages/shared-types`)

```ts
// enums.ts
export enum ScriptDraftStatus {
  PROCESSING = 'PROCESSING', // AI đang gen
  READY = 'READY', // Xong, chờ user review
  APPROVED = 'APPROVED', // User đã approve → video job created
  FAILED = 'FAILED', // AI gen lỗi
}

export enum VideoJobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ScriptGenStep {
  MEDIA_DOWNLOAD = 'MEDIA_DOWNLOAD',
  AI_VISION = 'AI_VISION',
  SCRIPT_GENERATION = 'SCRIPT_GENERATION',
  COMPLETE = 'COMPLETE',
}

export enum VideoRenderStep {
  AUDIO_GENERATION = 'AUDIO_GENERATION',
  CLIP_EXTRACTION = 'CLIP_EXTRACTION',
  RENDERING = 'RENDERING',
  UPLOAD = 'UPLOAD',
  COMPLETE = 'COMPLETE',
}

export enum MediaTag {
  EXTERIOR = 'EXTERIOR',
  LOBBY = 'LOBBY',
  LIVING_ROOM = 'LIVING_ROOM',
  BEDROOM = 'BEDROOM',
  BATHROOM = 'BATHROOM',
  KITCHEN = 'KITCHEN',
  BALCONY = 'BALCONY',
  AMENITY = 'AMENITY',
  PORTRAIT = 'PORTRAIT',
  OTHER = 'OTHER',
}

// entities.ts
export interface AssignedAsset {
  assetId: string;
  type: 'IMAGE' | 'VIDEO_CLIP';
  detectedRoom: MediaTag;
  quality: 'excellent' | 'good' | 'poor';
  assignmentReason: string;
  thumbnailUrl?: string;
  // Chỉ cho VIDEO_CLIP:
  clipStartSeconds?: number;
  clipEndSeconds?: number;
}

export interface GeneratedScene {
  id: string;
  order: number;
  name: string;
  narration: string;
  caption: string;
  suggestedDurationSeconds: number;
  assignedAssets: AssignedAsset[];
  textOverlays: TextOverlay[];
}

export interface TextOverlay {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  style: 'badge' | 'highlight' | 'subtitle' | 'watermark';
}
```

---

## 6. Payment Webhooks (không đổi)

### PayOS: `POST /api/billing/payos/webhook`

```
Verify HMAC → credit tokens → Notification
```

### Stripe: `POST /api/billing/stripe/webhook`

```
Verify stripe-signature → credit tokens → Notification
```
