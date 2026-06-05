# 📋 Video Processor — Task Breakdown Chi Tiết

**Service:** `services/video-processor`
**Cập nhật:** 2026-06-05
**Kiến trúc:** 2-Phase Pipeline (Worker 1: Script Gen | Worker 2: Video Render)

---

## 📌 Bối Cảnh Quan Trọng (Đọc Trước Khi Làm Bất Kỳ Task Nào)

```
LUỒNG TỔNG QUÁT:

apps/web gửi 2 loại job:

JOB TYPE 1 → Queue: realty.script.generate
  Input:  { draftId, mediaAssetIds, projectInfo, templateId, targetPlatform }
  Worker: Download media → AI Vision → AI Script Gen → Save draft
  Output: ScriptDraft.status = READY (user review trên apps/web)
          Dữ liệu trả về có cấu trúc dạng danh sách scene:
          [
            {
              id: string,
              order: number,
              name: string,
              narration: string (kịch bản giọng nói),
              caption: string (phụ đề chính),
              suggestedDurationSeconds: number,
              assignedAssets: [ (danh sách hình ảnh/video gán cho scene này)
                {
                  assetId: string,
                  type: "IMAGE" | "VIDEO_CLIP",
                  thumbnailUrl: string,
                  detectedRoom: string,
                  assignmentReason: string,
                  clipStartSeconds?: number, (chỉ cho video clip)
                  clipEndSeconds?: number    (chỉ cho video clip)
                }
              ],
              textOverlays: [ (chữ đè lên video)
                { text: string, position: string, style: string }
              ]
            }
          ]

                    ↓ USER REVIEW & APPROVE ↓

JOB TYPE 2 → Queue: realty.video.render
  Input:  { jobId, scriptDraftId, ttsProvider, ttsVoiceId, renderEngine }
  Worker: TTS → Clip Extraction → Render → Upload
  Output: VideoJob.status = COMPLETED + outputUrl

AUDIO-FIRST: TTS chạy TRƯỚC, đo duration thực → build timeline THEO audio
             KHÔNG build timeline trước rồi cắt audio vào
```

---

## 🗺️ Bảng Tổng Hợp Tất Cả Tasks

| Task                        | Tên                     | Phase    | Estimate | Phụ thuộc    | Người làm | Trạng thái |
| --------------------------- | ----------------------- | -------- | -------- | ------------ | --------- | ---------- |
| **SETUP**                   |                         |          |          |              |           |            |
| S-01                        | Project Init            | Setup    | 2h       | —            |           | ⬜ TODO    |
| S-02                        | Redis + BullMQ scaffold | Setup    | 2h       | S-01         |           | ⬜ TODO    |
| S-03                        | Prisma client           | Setup    | 1h       | S-01         |           | ⬜ TODO    |
| S-04                        | R2/S3 client            | Setup    | 2h       | S-01         |           | ⬜ TODO    |
| **WORKER 1 — Script Gen**   |                         |          |          |              |           |            |
| W1-01                       | Media Downloader        | Worker 1 | 4h       | S-04         |           | ⬜ TODO    |
| W1-02                       | AI Vision — Images      | Worker 1 | 6h       | W1-01        |           | ⬜ TODO    |
| W1-03                       | AI Vision — Videos      | Worker 1 | 5h       | W1-01        |           | ⬜ TODO    |
| W1-04                       | Vision Cache            | Worker 1 | 2h       | W1-02, W1-03 |           | ⬜ TODO    |
| W1-05                       | Script Generator        | Worker 1 | 8h       | W1-02, W1-03 |           | ⬜ TODO    |
| W1-06                       | Draft Saver + Notifier  | Worker 1 | 3h       | W1-05, S-03  |           | ⬜ TODO    |
| W1-07                       | Worker 1 Orchestrator   | Worker 1 | 4h       | W1-01~W1-06  |           | ⬜ TODO    |
| **WORKER 2 — Video Render** |                         |          |          |              |           |            |
| W2-01                       | FPT.AI TTS              | Worker 2 | 6h       | S-01         |           | ⬜ TODO    |
| W2-02                       | ElevenLabs TTS          | Worker 2 | 4h       | S-01         |           | ⬜ TODO    |
| W2-03                       | TTS Cache               | Worker 2 | 3h       | W2-01        |           | ⬜ TODO    |
| W2-04                       | Clip Extractor (FFmpeg) | Worker 2 | 5h       | S-01         |           | ⬜ TODO    |
| W2-05                       | Timeline Builder        | Worker 2 | 4h       | W2-01, W2-04 |           | ⬜ TODO    |
| W2-06                       | FFmpeg Renderer         | Worker 2 | 10h      | W2-05        |           | ⬜ TODO    |
| W2-07                       | Remotion Renderer       | Worker 2 | 8h       | W2-05        |           | ⬜ TODO    |
| W2-08                       | Uploader                | Worker 2 | 4h       | S-04         |           | ⬜ TODO    |
| W2-09                       | Worker 2 Orchestrator   | Worker 2 | 6h       | W2-01~W2-08  |           | ⬜ TODO    |

**Tổng estimate:** ~83 giờ (~11 ngày làm việc)

---

## 📁 Cấu Trúc File Target

```
services/video-processor/src/
├── index.ts                         ← S-02
├── workers/
│   ├── script-gen.worker.ts         ← W1-07
│   └── video-render.worker.ts       ← W2-09
├── processors/
│   ├── media-downloader.ts          ← W1-01
│   ├── ai-vision-image.ts           ← W1-02
│   ├── ai-vision-video.ts           ← W1-03
│   ├── script-generator.ts          ← W1-05
│   ├── draft-saver.ts               ← W1-06
│   ├── tts-fptai.ts                 ← W2-01
│   ├── tts-elevenlabs.ts            ← W2-02
│   ├── tts.service.ts               ← W2-03 (factory + cache)
│   ├── clip-extractor.ts            ← W2-04
│   ├── timeline-builder.ts          ← W2-05
│   ├── ffmpeg-renderer.ts           ← W2-06
│   ├── remotion-renderer.ts         ← W2-07
│   └── uploader.ts                  ← W2-08
├── templates/                       ← W2-06, W2-07
│   ├── remotion-root.tsx
│   ├── template-tour/
│   └── template-deal/
├── lib/
│   ├── db.ts                        ← S-03
│   ├── redis.ts                     ← S-02
│   ├── s3.ts                        ← S-04
│   ├── gemini.ts                    ← W1-02
│   ├── vision-cache.ts              ← W1-04
│   ├── tts-cache.ts                 ← W2-03
│   ├── ffmpeg.ts                    ← W2-04
│   └── logger.ts                    ← S-01
└── types/
    └── index.ts                     ← S-01
```

---

---

# PHASE SETUP

---

## ✅ S-01 — Project Init

**Estimate:** 2 giờ
**Phụ thuộc:** Không có

### Mục Đích

Tạo cấu trúc project TypeScript cho `services/video-processor`, cấu hình build, logger, shared types.

### Input

- Thư mục rỗng `services/video-processor/`

### Output

- `package.json` với scripts: `dev`, `build`, `start`, `test`
- `tsconfig.json` (strict mode)
- `.env.example` đầy đủ
- `src/index.ts` chạy được: in ra `"[video-processor] Started"`
- `src/types/index.ts` định nghĩa shared interfaces
- `src/lib/logger.ts` — Pino logger

### Acceptance Criteria

```bash
cd services/video-processor
pnpm install
pnpm dev
# → Console: "[video-processor] Started — waiting for jobs"
pnpm test
# → Tests pass (chỉ có smoke test lúc này)
```

### File Cần Tạo

**`.env.example`:**

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/realty_db
REDIS_URL=redis://localhost:6379
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_MEDIA=realty-media
R2_BUCKET_VIDEOS=realty-videos
CDN_BASE_URL=https://cdn.yoursite.com
GEMINI_API_KEY=
FPT_AI_API_KEY=
ELEVENLABS_API_KEY=
SENTRY_DSN=
TEMP_DIR=/tmp/video-processor
MAX_SCRIPT_WORKERS=3
MAX_RENDER_WORKERS=2
LOG_LEVEL=info
NODE_ENV=development
```

**`src/types/index.ts`** (shared types cho toàn service):

```ts
export interface ProjectInfo {
  name: string;
  propertyType: string;
  address: string;
  district: string;
  city: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  salePrice?: number;
  amenities: string[];
  highlights: string[];
  legalStatus?: string;
  handoverDate?: string;
  priceNote?: string;
  contactName: string;
  contactPhone: string;
}

export type MediaType = 'IMAGE' | 'VIDEO_CLIP' | 'PORTRAIT';
export type MediaTag =
  | 'EXTERIOR'
  | 'LOBBY'
  | 'LIVING_ROOM'
  | 'BEDROOM'
  | 'BATHROOM'
  | 'KITCHEN'
  | 'BALCONY'
  | 'AMENITY'
  | 'PORTRAIT'
  | 'OTHER';
export type Quality = 'excellent' | 'good' | 'poor' | 'unusable';

export interface MediaAssetRecord {
  id: string;
  type: MediaType;
  storageKey: string;
  storageUrl: string;
  mimeType: string;
}

export interface AssignedAsset {
  assetId: string;
  type: 'IMAGE' | 'VIDEO_CLIP';
  detectedRoom: MediaTag;
  quality: Quality;
  assignmentReason: string;
  thumbnailUrl?: string;
  clipStartSeconds?: number; // chỉ VIDEO_CLIP
  clipEndSeconds?: number; // chỉ VIDEO_CLIP
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

export interface GeneratedScript {
  title: string;
  scenes: GeneratedScene[];
  suggestedCaption: string;
  suggestedHashtags: string[];
}

// Sau khi TTS xong, mỗi scene có thêm:
export interface RenderedScene extends GeneratedScene {
  mediaLocalPaths: string[]; // paths local sau download
  audioLocalPath: string; // /tmp/{jobId}/audio/scene_N.mp3
  audioDurationSeconds: number; // từ ffprobe (audio-first!)
  wordTimestamps: WordTimestamp[];
}

export interface WordTimestamp {
  word: string;
  startSeconds: number;
  endSeconds: number;
}
```

### Unit Test

```ts
// src/lib/logger.test.ts
import { logger } from './logger';

test('logger tạo được mà không throw', () => {
  expect(() => logger.info('test')).not.toThrow();
});

test('logger có method info, warn, error', () => {
  expect(typeof logger.info).toBe('function');
  expect(typeof logger.warn).toBe('function');
  expect(typeof logger.error).toBe('function');
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] Vấn đề gặp phải:
[ ] Thực tế mất bao lâu:
[ ] Ghi chú quan trọng:
```

---

## ✅ S-02 — Redis + BullMQ Scaffold

**Estimate:** 2 giờ
**Phụ thuộc:** S-01

### Mục Đích

Kết nối Redis, tạo 2 BullMQ Workers lắng nghe 2 queues. Verify job được nhận thành công.

### Input

- Redis đang chạy (Docker Compose: `docker-compose up redis`)

### Output

- `src/lib/redis.ts` — ioredis singleton
- `src/workers/script-gen.worker.ts` — Worker 1 scaffold (log job + mark done)
- `src/workers/video-render.worker.ts` — Worker 2 scaffold
- `src/index.ts` — khởi động cả 2 workers
- `scripts/test-publish.ts` — CLI script để publish job test

### Acceptance Criteria

```bash
# Terminal 1: chạy workers
pnpm dev

# Terminal 2: publish test job
pnpm tsx scripts/test-publish.ts script-gen
# → Worker 1 log: "Received script-gen job: test-draft-001"

pnpm tsx scripts/test-publish.ts video-render
# → Worker 2 log: "Received video-render job: test-job-001"
```

### Implementation Notes

```ts
// src/lib/redis.ts
import IORedis from 'ioredis';
export const redis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // BullMQ yêu cầu null
});

// src/workers/script-gen.worker.ts
import { Worker } from 'bullmq';
export const scriptGenWorker = new Worker(
  'realty.script.generate',
  async (job) => {
    logger.info({ draftId: job.data.draftId }, 'Script gen job received');
    // TODO: implement processors
  },
  { connection: redis, concurrency: parseInt(process.env.MAX_SCRIPT_WORKERS || '3') },
);
```

### Unit Test

```ts
// src/workers/script-gen.worker.test.ts
import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

test('Worker 1 lắng nghe đúng queue name', async () => {
  const queue = new Queue('realty.script.generate', { connection: redis });
  const job = await queue.add('test', { draftId: 'test-123' });
  expect(job.id).toBeDefined();
  await queue.close();
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] Redis connect thành công chưa:
[ ] Job publish/consume test pass chưa:
[ ] Vấn đề gặp phải:
[ ] Thực tế mất bao lâu:
```

---

## ✅ S-03 — Prisma Client

**Estimate:** 1 giờ
**Phụ thuộc:** S-01

### Mục Đích

Setup Prisma client để video-processor có thể đọc/ghi DB (update ScriptDraft status, update VideoJob status).

### Output

- `src/lib/db.ts` — Prisma singleton
- Verify: đọc được 1 record từ DB

### Implementation Notes

```ts
// src/lib/db.ts
// NOTE: video-processor KHÔNG chạy migrate
// Schema.prisma copy từ apps/web/prisma/schema.prisma
// Chỉ generate client: pnpm prisma generate
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.LOG_LEVEL === 'debug' ? ['query'] : [],
  });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] DB connect được chưa:
[ ] Prisma generate thành công chưa:
[ ] Vấn đề gặp phải:
```

---

## ✅ S-04 — R2/S3 Client

**Estimate:** 2 giờ
**Phụ thuộc:** S-01

### Mục Đích

Tạo R2 client (AWS SDK v3, S3-compatible). Test download và upload file thành công.

### Output

- `src/lib/s3.ts` — R2 client + helper functions
- Test: download 1 ảnh test từ bucket, upload 1 file lên bucket

### Interface Cần Implement

```ts
// src/lib/s3.ts
export async function downloadFromR2(storageKey: string, localPath: string): Promise<void>;

export async function uploadToR2(
  localPath: string,
  destKey: string,
  contentType: string,
): Promise<string>; // returns CDN URL

export async function fileExistsOnR2(key: string): Promise<boolean>;
```

### Unit Test

```ts
// src/lib/s3.test.ts
// Dùng MinIO local thay thế R2
test('download file từ R2 về local', async () => {
  await downloadFromR2('test/sample.jpg', '/tmp/test-download.jpg');
  expect(fs.existsSync('/tmp/test-download.jpg')).toBe(true);
  const size = fs.statSync('/tmp/test-download.jpg').size;
  expect(size).toBeGreaterThan(0);
});

test('upload file lên R2', async () => {
  const url = await uploadToR2('/tmp/test-upload.txt', 'test/uploaded.txt', 'text/plain');
  expect(url).toContain('uploaded.txt');
  expect(await fileExistsOnR2('test/uploaded.txt')).toBe(true);
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] MinIO local chạy được chưa:
[ ] Download test pass:
[ ] Upload test pass:
[ ] Vấn đề gặp phải:
```

---

---

# PHASE WORKER 1 — Script Generation

---

## ✅ W1-01 — Media Downloader

**Estimate:** 4 giờ
**Phụ thuộc:** S-03, S-04

### Mục Đích

Download tất cả ảnh + video từ R2 về `/tmp/{draftId}/media/` song song. Validate file sau download.

### Input

```ts
interface MediaDownloaderInput {
  draftId: string;
  mediaAssetIds: string[]; // IDs trong DB
  portraitAssetId?: string;
}
```

### Output

```ts
interface MediaDownloaderOutput {
  localMediaDir: string; // '/tmp/{draftId}/media/'
  assetMap: Map<
    string,
    {
      localPath: string; // '/tmp/{draftId}/media/asset-abc.jpg'
      type: MediaType;
      mimeType: string;
      fileSizeBytes: number;
    }
  >;
}
```

### Implementation

```ts
// src/processors/media-downloader.ts
export async function downloadMediaAssets(
  input: MediaDownloaderInput,
): Promise<MediaDownloaderOutput> {
  const mediaDir = path.join(process.env.TEMP_DIR!, input.draftId, 'media');
  await fs.mkdir(mediaDir, { recursive: true });

  // Lookup asset records từ DB
  const assets = await db.mediaAsset.findMany({
    where: {
      id: { in: [...input.mediaAssetIds, input.portraitAssetId].filter(Boolean) as string[] },
    },
  });

  // Download song song, max 5 concurrent
  const results = await pLimit(5)(
    assets.map((asset) => async () => {
      const ext = mime.extension(asset.mimeType) || 'bin';
      const localPath = path.join(mediaDir, `${asset.id}.${ext}`);

      // Retry 3 lần
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await downloadFromR2(asset.storageKey, localPath);
          break;
        } catch (err) {
          if (attempt === 3) throw new AssetDownloadError(asset.id, err);
          await sleep(attempt * 1000);
        }
      }

      // Validate
      const stat = await fs.stat(localPath);
      if (stat.size === 0) throw new Error(`Asset ${asset.id} downloaded as empty file`);

      return [
        asset.id,
        { localPath, type: asset.type, mimeType: asset.mimeType, fileSizeBytes: stat.size },
      ];
    }),
  );

  return { localMediaDir: mediaDir, assetMap: new Map(results) };
}
```

### Unit Tests (6 cases)

```ts
// src/processors/media-downloader.test.ts

test('TC-01: Download thành công 5 ảnh', async () => {
  // Setup: mock 5 asset records trong DB, mock R2 trả về file thật
  const result = await downloadMediaAssets({
    draftId: 'draft-test-001',
    mediaAssetIds: ['a1', 'a2', 'a3', 'a4', 'a5'],
  });
  expect(result.assetMap.size).toBe(5);
  for (const [id, info] of result.assetMap) {
    expect(fs.existsSync(info.localPath)).toBe(true);
    expect(info.fileSizeBytes).toBeGreaterThan(0);
  }
});

test('TC-02: Download 1 ảnh + 1 portrait', async () => {
  const result = await downloadMediaAssets({
    draftId: 'draft-test-002',
    mediaAssetIds: ['a1'],
    portraitAssetId: 'portrait-001',
  });
  expect(result.assetMap.size).toBe(2);
  expect(result.assetMap.has('portrait-001')).toBe(true);
});

test('TC-03: Download song song không conflict', async () => {
  // Download 10 assets song song, verify tất cả file distinct và đúng
  const result = await downloadMediaAssets({
    draftId: 'draft-test-003',
    mediaAssetIds: Array.from({ length: 10 }, (_, i) => `asset-${i}`),
  });
  expect(result.assetMap.size).toBe(10);
});

test('TC-04: Retry khi R2 lỗi lần 1 và 2, thành công lần 3', async () => {
  let callCount = 0;
  mockDownloadFromR2.mockImplementation(async () => {
    callCount++;
    if (callCount < 3) throw new Error('Network error');
    // lần 3: success
  });
  const result = await downloadMediaAssets({ draftId: 'test', mediaAssetIds: ['a1'] });
  expect(result.assetMap.has('a1')).toBe(true);
  expect(callCount).toBe(3);
});

test('TC-05: Throw AssetDownloadError sau 3 lần fail', async () => {
  mockDownloadFromR2.mockRejectedValue(new Error('R2 unavailable'));
  await expect(downloadMediaAssets({ draftId: 'test', mediaAssetIds: ['a1'] })).rejects.toThrow(
    AssetDownloadError,
  );
});

test('TC-06: Throw nếu assetId không tồn tại trong DB', async () => {
  await expect(
    downloadMediaAssets({ draftId: 'test', mediaAssetIds: ['nonexistent-id'] }),
  ).rejects.toThrow('Asset not found');
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] TC-01 pass:
[ ] TC-02 pass:
[ ] TC-03 pass:
[ ] TC-04 pass:
[ ] TC-05 pass:
[ ] TC-06 pass:
[ ] Thực tế tốc độ download: ___ MB/s
[ ] Vấn đề gặp phải:
[ ] Quyết định kỹ thuật quan trọng:
```

---

## ✅ W1-02 — AI Vision — Images

**Estimate:** 6 giờ
**Phụ thuộc:** W1-01

### Mục Đích

Dùng Gemini Flash-8B phân tích từng ảnh, nhận diện phòng/khu vực, đánh giá chất lượng.

### Input

```ts
interface AnalyzeImageInput {
  assetId: string;
  localImagePath: string; // '/tmp/{draftId}/media/asset-xxx.jpg'
  mimeType: string; // 'image/jpeg' | 'image/png'
}
```

### Output

```ts
interface ImageAnalysisResult {
  assetId: string;
  detectedRoom: MediaTag;
  quality: Quality; // 'excellent' | 'good' | 'poor'
  description: string; // "Phòng khách rộng rãi, ánh sáng tự nhiên tốt"
  highlights: string[]; // ["view hồ bơi", "nội thất hiện đại"]
  qualityIssues: string[]; // ["hơi tối", "góc chụp hơi thấp"]
  suggestedUsage: string; // "Phù hợp cho scene giới thiệu tổng quan"
  cacheHit: boolean;
}
```

### Gemini Prompt Template

```ts
const ANALYZE_IMAGE_PROMPT = `
Bạn là chuyên gia nhiếp ảnh bất động sản Việt Nam.
Phân tích ảnh này và trả về JSON:

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

Chỉ trả về JSON, không thêm text.
`;
```

### Unit Tests (5 cases)

```ts
test('TC-01: Phân tích ảnh phòng khách', async () => {
  const result = await analyzeImage({
    assetId: 'a1',
    localImagePath: 'test-fixtures/living-room.jpg',
    mimeType: 'image/jpeg',
  });
  expect(result.detectedRoom).toBe('LIVING_ROOM');
  expect(['excellent', 'good', 'poor']).toContain(result.quality);
  expect(result.description.length).toBeGreaterThan(5);
  expect(result.assetId).toBe('a1');
});

test('TC-02: Phân tích ảnh mặt tiền (exterior)', async () => {
  const result = await analyzeImage({
    assetId: 'a2',
    localImagePath: 'test-fixtures/exterior.jpg',
    mimeType: 'image/jpeg',
  });
  expect(['EXTERIOR', 'LOBBY']).toContain(result.detectedRoom);
});

test('TC-03: Phân tích ảnh chân dung sale', async () => {
  const result = await analyzeImage({
    assetId: 'portrait-1',
    localImagePath: 'test-fixtures/portrait.jpg',
    mimeType: 'image/jpeg',
  });
  expect(result.detectedRoom).toBe('PORTRAIT');
});

test('TC-04: Output JSON hợp lệ (không throw parse error)', async () => {
  // Gemini đôi khi trả về text thay vì JSON
  const result = await analyzeImage({
    assetId: 'a3',
    localImagePath: 'test-fixtures/kitchen.jpg',
    mimeType: 'image/jpeg',
  });
  // Validate schema
  expect(result).toMatchObject({
    assetId: expect.any(String),
    detectedRoom: expect.any(String),
    quality: expect.stringMatching(/^(excellent|good|poor)$/),
    description: expect.any(String),
  });
});

test('TC-05: Throw nếu file không tồn tại', async () => {
  await expect(
    analyzeImage({
      assetId: 'a99',
      localImagePath: '/tmp/nonexistent.jpg',
      mimeType: 'image/jpeg',
    }),
  ).rejects.toThrow();
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] Gemini API key setup:
[ ] TC-01~TC-05 pass:
[ ] Thực tế: Gemini mất bao lâu/ảnh: ___ giây
[ ] Quality của output tiếng Việt (1-5): ___
[ ] Vấn đề phổ biến: Gemini hallucinate JSON format không?
[ ] Cách fix JSON parse error:
[ ] Quyết định: dùng responseMimeType: 'application/json' chưa?
```

---

## ✅ W1-03 — AI Vision — Videos

**Estimate:** 5 giờ
**Phụ thuộc:** W1-01

### Mục Đích

Phân tích video clip: extract keyframes → Gemini xem → nhận diện scene timeline + đoạn đẹp nhất để dùng.

### Input

```ts
interface AnalyzeVideoInput {
  assetId: string;
  localVideoPath: string; // '/tmp/{draftId}/media/asset-xxx.mp4'
  mimeType: string; // 'video/mp4'
}
```

### Output

```ts
interface VideoAnalysisResult {
  assetId: string;
  totalDurationSeconds: number;
  hasOriginalAudio: boolean; // video gốc có audio không (để bỏ đi)
  overallQuality: Quality;
  scenes: VideoSceneSegment[];
  unusableSegments: { startSec: number; endSec: number; reason: string }[];
  cacheHit: boolean;
}

interface VideoSceneSegment {
  room: MediaTag;
  startSeconds: number;
  endSeconds: number;
  quality: Quality;
  qualityIssues: string[]; // ['camera_shake', 'too_dark', 'blurry']
  description: string;
  highlights: string[];
  suggestedClipStart: number; // đoạn đẹp nhất bắt đầu
  suggestedClipEnd: number; // đoạn đẹp nhất kết thúc
}
```

### Implementation Steps

```
1. ffprobe → lấy duration, resolution, has_audio
2. FFmpeg extract 3 keyframes: tại 10%, 50%, 90% của video
3. Gửi 3 frames + metadata → Gemini Flash-8B
4. Gemini trả về scene timeline
5. Validate timestamps (không vượt quá duration)
```

### Unit Tests (4 cases)

```ts
test('TC-01: Phân tích video 60s với phòng khách + bếp', async () => {
  const result = await analyzeVideo({
    assetId: 'v1',
    localVideoPath: 'test-fixtures/apartment-tour.mp4',
    mimeType: 'video/mp4',
  });
  expect(result.totalDurationSeconds).toBeGreaterThan(0);
  expect(result.scenes.length).toBeGreaterThan(0);
  result.scenes.forEach((scene) => {
    expect(scene.suggestedClipStart).toBeGreaterThanOrEqual(0);
    expect(scene.suggestedClipEnd).toBeLessThanOrEqual(result.totalDurationSeconds);
    expect(scene.suggestedClipStart).toBeLessThan(scene.suggestedClipEnd);
  });
});

test('TC-02: Detect đoạn rung tay là unusable hoặc poor', async () => {
  const result = await analyzeVideo({
    assetId: 'v2',
    localVideoPath: 'test-fixtures/shaky-video.mp4',
    mimeType: 'video/mp4',
  });
  const hasShakeIssue = result.scenes.some(
    (s) => s.qualityIssues.includes('camera_shake') || result.unusableSegments.length > 0,
  );
  expect(hasShakeIssue).toBe(true);
});

test('TC-03: Timestamps hợp lệ (không vượt duration)', async () => {
  const result = await analyzeVideo({
    assetId: 'v3',
    localVideoPath: 'test-fixtures/short-clip.mp4',
    mimeType: 'video/mp4',
  });
  result.scenes.forEach((scene) => {
    expect(scene.startSeconds).toBeLessThan(result.totalDurationSeconds);
    expect(scene.endSeconds).toBeLessThanOrEqual(result.totalDurationSeconds);
  });
});

test('TC-04: ffprobe đo đúng duration', async () => {
  // video 30s test fixture
  const result = await analyzeVideo({
    assetId: 'v4',
    localVideoPath: 'test-fixtures/30s-clip.mp4',
    mimeType: 'video/mp4',
  });
  expect(result.totalDurationSeconds).toBeCloseTo(30, 1); // ±1 giây
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] ffprobe command hoạt động:
[ ] FFmpeg keyframe extract thành công:
[ ] TC-01~TC-04 pass:
[ ] Thực tế: analyze 1 video 60s mất bao lâu: ___ giây
[ ] Gemini nhận diện scene có chính xác không:
[ ] Vấn đề với video có codec lạ (HEVC, VP9):
```

---

## ✅ W1-04 — Vision Cache

**Estimate:** 2 giờ
**Phụ thuộc:** W1-02, W1-03

### Mục Đích

Cache kết quả AI Vision theo hash nội dung file, TTL 30 ngày. Cùng ảnh upload nhiều lần → không re-analyze.

### Input/Output

```ts
// Cache key = SHA-256 của file content (16 chars đầu)
// → Cùng ảnh, khác filename, khác assetId → vẫn hit cache

interface VisionCacheService {
  getImageAnalysis(fileHash: string): Promise<ImageAnalysisResult | null>;
  setImageAnalysis(fileHash: string, result: ImageAnalysisResult): Promise<void>;
  getVideoAnalysis(fileHash: string): Promise<VideoAnalysisResult | null>;
  setVideoAnalysis(fileHash: string, result: VideoAnalysisResult): Promise<void>;
  computeFileHash(filePath: string): Promise<string>;
}
```

### Unit Tests (3 cases)

```ts
test('TC-01: Cache miss → get trả về null', async () => {
  const result = await cache.getImageAnalysis('nonexistent-hash');
  expect(result).toBeNull();
});

test('TC-02: Cache set → get trả về đúng data', async () => {
  const mockResult = { assetId: 'a1', detectedRoom: 'LIVING_ROOM', quality: 'excellent', ... };
  await cache.setImageAnalysis('hash-123', mockResult);
  const retrieved = await cache.getImageAnalysis('hash-123');
  expect(retrieved).toEqual(mockResult);
});

test('TC-03: Cùng file → cùng hash', async () => {
  const hash1 = await cache.computeFileHash('test-fixtures/living-room.jpg');
  const hash2 = await cache.computeFileHash('test-fixtures/living-room-copy.jpg'); // same content
  expect(hash1).toBe(hash2);
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] TC-01~TC-03 pass:
[ ] TTL có hoạt động đúng không (test với TTL ngắn):
[ ] Savings thực tế sau 1 tuần dùng: ~___% cache hit
```

---

## ✅ W1-05 — Script Generator

**Estimate:** 8 giờ
**Phụ thuộc:** W1-02, W1-03

### Mục Đích

Dùng Gemini Flash để viết kịch bản dựa trên vision analysis + project info + template. AI tự chọn ảnh cho từng scene.

### Input

```ts
interface ScriptGeneratorInput {
  draftId: string;
  imageAnalyses: ImageAnalysisResult[];
  videoAnalyses: VideoAnalysisResult[];
  projectInfo: ProjectInfo;
  template: {
    id: string;
    name: string;
    duration: number;
    scenes: {
      order: number;
      name: string;
      durationHint: number;
      purpose: string; // "Giới thiệu, tạo kết nối cá nhân"
      mediaSlotCount: number;
    }[];
  };
  targetPlatform: 'tiktok' | 'reels' | 'facebook' | 'youtube_shorts';
}
```

### Output

```ts
// GeneratedScript (từ types/index.ts)
// + validation đã chạy qua Zod
```

### Zod Schema Validation

```ts
const AssignedAssetSchema = z.object({
  assetId: z.string(),
  type: z.enum(['IMAGE', 'VIDEO_CLIP']),
  detectedRoom: z.string(),
  quality: z.enum(['excellent', 'good', 'poor']),
  assignmentReason: z.string(),
  clipStartSeconds: z.number().optional(),
  clipEndSeconds: z.number().optional(),
});

const GeneratedSceneSchema = z.object({
  id: z.string(),
  order: z.number().int().min(1),
  name: z.string().min(1),
  narration: z.string().min(10).max(500),
  caption: z.string().max(60),
  suggestedDurationSeconds: z.number().min(2).max(30),
  assignedAssets: z.array(AssignedAssetSchema).min(1).max(6),
  textOverlays: z.array(TextOverlaySchema).max(5),
});

const GeneratedScriptSchema = z.object({
  title: z.string(),
  scenes: z.array(GeneratedSceneSchema).min(2).max(10),
  suggestedCaption: z.string().max(500),
  suggestedHashtags: z.array(z.string()).max(30),
});

// Sau Zod, validate cross-field:
function validateAssetReferences(script: GeneratedScript, knownAssetIds: Set<string>): void {
  for (const scene of script.scenes) {
    for (const asset of scene.assignedAssets) {
      if (!knownAssetIds.has(asset.assetId)) {
        throw new ScriptValidationError(
          `Scene "${scene.name}": AI reference assetId "${asset.assetId}" không tồn tại`,
        );
      }
    }
  }
}
```

### Unit Tests (5 cases)

```ts
test('TC-01: Gen script hợp lệ với 10 ảnh + project info', async () => {
  const result = await generateScript(mockInput);
  expect(result.scenes.length).toBeGreaterThanOrEqual(2);
  expect(result.scenes.length).toBeLessThanOrEqual(10);
  expect(result.suggestedCaption.length).toBeGreaterThan(0);
});

test('TC-02: Tất cả assignedAssetIds đều có trong inventory', async () => {
  const knownIds = new Set(mockInput.imageAnalyses.map((a) => a.assetId));
  const result = await generateScript(mockInput);
  result.scenes.forEach((scene) => {
    scene.assignedAssets.forEach((asset) => {
      expect(knownIds.has(asset.assetId)).toBe(true);
    });
  });
});

test('TC-03: Narration tiếng Việt (không phải tiếng Anh)', async () => {
  const result = await generateScript(mockInput);
  // Check có dấu tiếng Việt
  const allNarration = result.scenes.map((s) => s.narration).join(' ');
  const hasVietnamese =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(allNarration);
  expect(hasVietnamese).toBe(true);
});

test('TC-04: Zod validation reject nếu Gemini trả JSON sai format', async () => {
  mockGemini.mockResolvedValueOnce('{"scenes": "not an array"}');
  await expect(generateScript(mockInput)).rejects.toThrow(ScriptValidationError);
});

test('TC-05: Scene cuối phải có CTA với hotline', async () => {
  const result = await generateScript(mockInput);
  const lastScene = result.scenes[result.scenes.length - 1];
  expect(lastScene.narration).toContain(mockInput.projectInfo.contactPhone);
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] TC-01~TC-05 pass:
[ ] Thực tế: gen script mất bao lâu: ___ giây
[ ] Chất lượng kịch bản (1-10, đánh giá chủ quan):
[ ] Gemini có hay hallucinate assetId không tồn tại không:
[ ] Prompt cần điều chỉnh gì:
[ ] Vietnamese quality (1-10):
[ ] Hook 3 giây đầu có mạnh không:
[ ] Quyết định prompt thay đổi gì so với plan:
```

---

## ✅ W1-06 — Draft Saver + Notifier

**Estimate:** 3 giờ
**Phụ thuộc:** W1-05, S-03

### Mục Đích

Lưu kết quả AI (GeneratedScript) vào DB (ScriptDraft), notify apps/web qua Redis pub/sub.

### Input

```ts
interface DraftSaverInput {
  draftId: string;
  userId: string;
  script: GeneratedScript;
  aiModel: string; // 'gemini-1.5-flash'
  aiInputTokens?: number;
  aiOutputTokens?: number;
}
```

### Output

- `ScriptDraft.status = 'READY'`
- `ScriptDraft.scenes = JSON.stringify(script.scenes)`
- Redis publish: `realty:v1:draft:{draftId}:complete`

### Unit Tests (3 cases)

```ts
test('TC-01: ScriptDraft được update status=READY', async () => {
  await saveDraft(mockDraftSaverInput);
  const draft = await db.scriptDraft.findUnique({ where: { id: 'draft-001' } });
  expect(draft?.status).toBe('READY');
  expect(draft?.scenes).toBeTruthy();
});

test('TC-02: Redis event được publish đúng channel', async () => {
  const messages: string[] = [];
  await redis.subscribe(`realty:v1:draft:draft-001:complete`, (msg) => messages.push(msg));
  await saveDraft(mockDraftSaverInput);
  await sleep(100);
  expect(messages.length).toBe(1);
  const event = JSON.parse(messages[0]);
  expect(event.status).toBe('READY');
});

test('TC-03: Update status=FAILED nếu có lỗi', async () => {
  await saveDraftError({
    draftId: 'draft-002',
    errorMessage: 'Gemini API timeout',
    failedStep: 'SCRIPT_GENERATION',
  });
  const draft = await db.scriptDraft.findUnique({ where: { id: 'draft-002' } });
  expect(draft?.status).toBe('FAILED');
  expect(draft?.errorMessage).toBe('Gemini API timeout');
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] TC-01~TC-03 pass:
[ ] Redis pub/sub có latency bao nhiêu ms:
[ ] Vấn đề gặp phải:
```

---

## ✅ W1-07 — Worker 1 Orchestrator

**Estimate:** 4 giờ
**Phụ thuộc:** W1-01 → W1-06 (tất cả)

### Mục Đích

Kết nối toàn bộ các processors của Worker 1 thành pipeline hoàn chỉnh. Report progress sau mỗi bước.

### Flow

```
Job nhận từ BullMQ
  │
  ▼ updateProgress(10%, 'MEDIA_DOWNLOAD', 'Đang tải ảnh/video...')
W1-01: downloadMediaAssets()
  │
  ▼ updateProgress(30%, 'AI_VISION', 'AI đang xem ảnh...')
W1-02: analyzeImages()  +  W1-03: analyzeVideos()  [song song]
W1-04: vision cache (tự động trong W1-02/W1-03)
  │
  ▼ updateProgress(70%, 'SCRIPT_GENERATION', 'AI đang viết kịch bản...')
W1-05: generateScript()
  │
  ▼ updateProgress(100%, 'COMPLETE', 'Kịch bản đã sẵn sàng!')
W1-06: saveDraft()
  │
  ▼ Cleanup /tmp/{draftId}/
```

### End-to-End Test (Integration Test)

```ts
test('E2E-01: Worker 1 xử lý job từ đầu đến cuối', async () => {
  // Setup: insert ScriptDraft vào DB, upload ảnh test lên MinIO
  const draftId = 'e2e-draft-001';
  await db.scriptDraft.create({ data: { id: draftId, status: 'PROCESSING', ... } });

  // Publish job
  await scriptGenQueue.add('generate', {
    draftId,
    mediaAssetIds: ['test-asset-living-room', 'test-asset-bedroom'],
    projectInfo: mockProjectInfo,
    templateId: 'tour-template',
    targetPlatform: 'tiktok',
  });

  // Chờ xử lý (max 2 phút)
  const draft = await waitFor(async () => {
    const d = await db.scriptDraft.findUnique({ where: { id: draftId } });
    if (d?.status === 'READY' || d?.status === 'FAILED') return d;
    return null;
  }, { timeout: 120000, interval: 3000 });

  // Assertions
  expect(draft?.status).toBe('READY');
  expect(draft?.scenes).toBeTruthy();
  const scenes = JSON.parse(draft?.scenes as string);
  expect(scenes.length).toBeGreaterThanOrEqual(2);
  expect(draft?.suggestedCaption?.length).toBeGreaterThan(0);

  // Verify temp cleanup
  expect(fs.existsSync(`/tmp/video-processor/${draftId}`)).toBe(false);
}, 120000);
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] E2E-01 pass:
[ ] Thực tế: toàn bộ Worker 1 mất bao lâu: ___ giây
[ ] Breakdown thời gian từng bước:
    Download: ___ s
    AI Vision: ___ s
    Script Gen: ___ s
    Save: ___ s
[ ] Temp file cleanup thành công:
[ ] Vấn đề gặp phải:
[ ] Quyết định thay đổi so với plan:
```

---

---

# PHASE WORKER 2 — Video Render

---

## ✅ W2-01 — FPT.AI TTS Provider

**Estimate:** 6 giờ
**Phụ thuộc:** S-01

### Mục Đích

Gọi FPT.AI TTS API, nhận MP3 audio + word timestamps. Đây là provider chính (rẻ nhất, tiếng Việt tốt nhất).

### Input

```ts
interface TTSInput {
  text: string;
  voiceId: string; // 'lannhi' | 'giahuy' | 'myan' | 'ngoclam'
  jobId: string;
  sceneId: string;
}
```

### Output

```ts
interface TTSOutput {
  audioLocalPath: string; // '/tmp/{jobId}/audio/scene_N.mp3'
  durationSeconds: number; // từ ffprobe — đây là THẬT SỰ
  wordTimestamps: WordTimestamp[];
  provider: 'fptai';
}
```

### FPT.AI API Notes

```
POST https://api.fpt.ai/hmi/tts/v5
Headers:
  api-key: {FPT_AI_API_KEY}
  speed: '0'          (tốc độ bình thường)
  voice: '{voiceId}'
  Content-Type: text/plain
Body: {text thuần}

Response:
  {
    "error": 0,
    "message": "OK",
    "async": "https://fptai.vn/api/tts/v5/url/to/audio.mp3"
  }

→ Dùng URL đó để download MP3 (async, cần poll hoặc download ngay)
```

### Unit Tests (5 cases)

```ts
test('TC-01: Gen audio tiếng Việt thành công', async () => {
  const result = await fptAiTTS({
    text: 'Chào mừng bạn đến với căn hộ Vinhomes Grand Park',
    voiceId: 'lannhi',
    jobId: 'job-001',
    sceneId: 'scene-1',
  });
  expect(fs.existsSync(result.audioLocalPath)).toBe(true);
  expect(result.durationSeconds).toBeGreaterThan(0);
  expect(result.durationSeconds).toBeLessThan(30); // text ngắn → < 30s
});

test('TC-02: Word timestamps có đủ từ', async () => {
  const text = 'Phòng khách rộng hai mươi lăm mét vuông';
  const result = await fptAiTTS({ text, voiceId: 'lannhi', jobId: 'j1', sceneId: 's1' });
  expect(result.wordTimestamps.length).toBeGreaterThan(0);
  // Số từ trong timestamps phải gần bằng số từ trong text
  const wordCount = text.split(' ').length;
  expect(result.wordTimestamps.length).toBeGreaterThanOrEqual(Math.floor(wordCount * 0.7));
});

test('TC-03: Duration từ ffprobe gần đúng (±0.5s)', async () => {
  const result = await fptAiTTS({
    text: 'Xin chào', // text rất ngắn, khoảng 0.5-1s
    voiceId: 'giahuy',
    jobId: 'j2',
    sceneId: 's2',
  });
  expect(result.durationSeconds).toBeGreaterThan(0);
  expect(result.durationSeconds).toBeLessThan(3);
});

test('TC-04: Throw nếu FPT.AI API error', async () => {
  // Mock API trả về error code
  mockFetch.mockResolvedValueOnce({ json: () => ({ error: 1, message: 'Invalid API key' }) });
  await expect(
    fptAiTTS({ text: 'test', voiceId: 'lannhi', jobId: 'j3', sceneId: 's3' }),
  ).rejects.toThrow('FPT.AI TTS error');
});

test('TC-05: File MP3 valid (có thể play)', async () => {
  const result = await fptAiTTS({
    text: 'test text',
    voiceId: 'lannhi',
    jobId: 'j4',
    sceneId: 's4',
  });
  // Kiểm tra file là MP3 hợp lệ (magic bytes)
  const buffer = Buffer.alloc(3);
  const fd = await fs.open(result.audioLocalPath, 'r');
  await fd.read(buffer, 0, 3, 0);
  await fd.close();
  // MP3 magic bytes: ID3 hoặc 0xFF 0xFB
  const isMP3 = buffer[0] === 0x49 || buffer[0] === 0xff;
  expect(isMP3).toBe(true);
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] FPT.AI API key setup:
[ ] TC-01~TC-05 pass:
[ ] Giọng tốt nhất cho BĐS (đánh giá chủ quan):
    lannhi: ___/10
    giahuy: ___/10
    myan: ___/10
[ ] Latency trung bình FPT.AI: ___ ms
[ ] Word timestamps có chính xác không:
[ ] Vấn đề gặp phải:
[ ] Quyết định: voice ID mặc định sẽ là: ___
```

---

## ✅ W2-02 — ElevenLabs TTS Provider

**Estimate:** 4 giờ
**Phụ thuộc:** S-01

### Mục Đích

ElevenLabs provider cho premium users. Output format giống W2-01 để dễ swap.

### Input/Output

Giống W2-01, chỉ khác `provider: 'elevenlabs'`.

### Key Difference từ FPT.AI

```
ElevenLabs endpoint: POST /v1/text-to-speech/{voiceId}/with-timestamps
→ Trả về base64 audio + character-level timestamps
→ Cần parse characters → words
```

### Unit Tests (3 cases)

```ts
test('TC-01: Gen audio thành công', async () => { ... });
test('TC-02: Word timestamps parse từ character timestamps', async () => {
  // ElevenLabs trả về character timestamps, phải convert sang word timestamps
  const result = await elevenLabsTTS({ text: 'Xin chào thế giới', ... });
  expect(result.wordTimestamps.length).toBe(3); // 3 từ
  expect(result.wordTimestamps[0].word).toBe('Xin');
});
test('TC-03: Interface giống FPT.AI (có thể swap)', async () => {
  // Cùng input → cùng output shape
  const result = await elevenLabsTTS({ text: 'test', voiceId: 'xxx', ... });
  expect(result).toHaveProperty('audioLocalPath');
  expect(result).toHaveProperty('durationSeconds');
  expect(result).toHaveProperty('wordTimestamps');
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] TC-01~TC-03 pass:
[ ] Quality tiếng Việt so với FPT.AI: ___
[ ] Latency: ___ ms
```

---

## ✅ W2-03 — TTS Cache + Factory

**Estimate:** 3 giờ
**Phụ thuộc:** W2-01

### Mục Đích

- Factory pattern: chọn provider dựa trên `ttsProvider` field
- Cache TTS: cùng text + voiceId → reuse audio từ R2 (TTL 7 ngày)

### Interface

```ts
// src/processors/tts.service.ts
export async function generateTTS(
  input: TTSInput,
  provider: 'fptai' | 'elevenlabs',
): Promise<TTSOutput>;
// → Tự check cache trước, miss thì gọi provider, sau đó cache kết quả
```

### Unit Tests (3 cases)

```ts
test('TC-01: Cache miss → gọi FPT.AI → cache kết quả', async () => {
  const result = await generateTTS({ text: 'unique text xyz123', voiceId: 'lannhi', ... }, 'fptai');
  expect(mockFptAiTTS).toHaveBeenCalledTimes(1);
  // Gọi lần 2 → cache hit
  await generateTTS({ text: 'unique text xyz123', voiceId: 'lannhi', ... }, 'fptai');
  expect(mockFptAiTTS).toHaveBeenCalledTimes(1); // vẫn 1, không gọi lại
});

test('TC-02: Factory chọn đúng provider', async () => {
  await generateTTS({ ...input }, 'elevenlabs');
  expect(mockElevenLabsTTS).toHaveBeenCalledTimes(1);
  expect(mockFptAiTTS).toHaveBeenCalledTimes(0);
});

test('TC-03: Cache key phân biệt theo text + voiceId', async () => {
  await generateTTS({ text: 'hello', voiceId: 'lannhi', ... }, 'fptai');
  await generateTTS({ text: 'hello', voiceId: 'giahuy', ... }, 'fptai'); // khác voiceId
  expect(mockFptAiTTS).toHaveBeenCalledTimes(2); // 2 lần (2 cache key khác nhau)
});
```

---

## ✅ W2-04 — Clip Extractor

**Estimate:** 5 giờ
**Phụ thuộc:** S-01 (ffmpeg)

### Mục Đích

Cắt đoạn video được AI chọn (từ VideoAnalysisResult), remove audio gốc, deshake nếu cần.

### Input

```ts
interface ClipExtractorInput {
  assetId: string;
  localVideoPath: string;
  scene: VideoSceneSegment; // có suggestedClipStart, suggestedClipEnd
  jobId: string;
  clipIndex: number;
}
```

### Output

```ts
interface ExtractedClip {
  assetId: string;
  room: MediaTag;
  localClipPath: string; // '/tmp/{jobId}/clips/clip_001.mp4'
  durationSeconds: number; // từ ffprobe
  hasAudio: false; // luôn false (đã remove)
}
```

### FFmpeg Command Template

```ts
function buildFFmpegCommand(input: ClipExtractorInput, outputPath: string): string {
  const duration = input.scene.suggestedClipEnd - input.scene.suggestedClipStart;
  const deshakeFilter = input.scene.qualityIssues?.includes('camera_shake')
    ? ',deshake=x=-1:y=-1:w=-1:h=-1:rx=16:ry=16'
    : '';

  return [
    'ffmpeg',
    `-ss ${input.scene.suggestedClipStart}`,
    `-i "${input.localVideoPath}"`,
    `-t ${duration}`,
    `-an`, // remove audio
    `-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2${deshakeFilter}"`,
    `-c:v libx264 -preset fast -crf 22`,
    `"${outputPath}" -y`,
  ].join(' ');
}
```

### Unit Tests (4 cases)

```ts
test('TC-01: Extract clip 15s từ video 60s', async () => {
  const result = await extractClip({
    assetId: 'v1',
    localVideoPath: 'test-fixtures/60s-video.mp4',
    scene: { suggestedClipStart: 10, suggestedClipEnd: 25, qualityIssues: [] },
    jobId: 'job-001', clipIndex: 0,
  });
  expect(fs.existsSync(result.localClipPath)).toBe(true);
  expect(result.durationSeconds).toBeCloseTo(15, 1);
  expect(result.hasAudio).toBe(false);
});

test('TC-02: Output là 1080x1920 (9:16)', async () => {
  const result = await extractClip({ ... });
  const info = await ffprobe(result.localClipPath);
  expect(info.width).toBe(1080);
  expect(info.height).toBe(1920);
});

test('TC-03: Deshake được apply khi có camera_shake', async () => {
  // Không thể test giảm rung trực quan, nhưng có thể verify command có deshake filter
  const cmd = buildFFmpegCommand({
    ...input,
    scene: { qualityIssues: ['camera_shake'], ... }
  }, 'output.mp4');
  expect(cmd).toContain('deshake');
});

test('TC-04: Audio đã bị remove', async () => {
  const result = await extractClip({ ... });
  const info = await ffprobe(result.localClipPath);
  expect(info.audioStreams.length).toBe(0);
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] TC-01~TC-04 pass:
[ ] Thực tế: extract 1 clip 30s mất bao lâu: ___ giây
[ ] Deshake có lag nhiều không: ___
[ ] Vấn đề với codec lạ:
```

---

## ✅ W2-05 — Timeline Builder

**Estimate:** 4 giờ
**Phụ thuộc:** W2-01 (TTS), W2-04 (clips)

### Mục Đích

Sau khi có audio duration thực tế từ TTS, build timeline chính xác cho renderer. Đây là bước implement "audio-first".

### Input

```ts
interface TimelineBuilderInput {
  scenes: GeneratedScene[];
  ttsResults: Map<string, TTSOutput>; // sceneId → TTS output
  mediaLocalPaths: Map<string, string>; // assetId → local path
  extractedClips: Map<string, ExtractedClip>; // assetId → clip
  fps: 30;
}
```

### Output

```ts
interface Timeline {
  totalDurationSeconds: number;
  totalFrames: number;
  fps: 30;
  scenes: TimelineScene[];
}

interface TimelineScene {
  id: string;
  order: number;
  startFrame: number;
  durationFrames: number;
  durationSeconds: number; // = audio duration (audio-first!)
  audioLocalPath: string;
  wordTimestamps: WordTimestamp[];
  mediaItems: TimelineMediaItem[];
  caption: string;
  textOverlays: TextOverlay[];
  narration: string;
}

interface TimelineMediaItem {
  type: 'image' | 'clip';
  localPath: string;
  startFrame: number; // relative to scene start
  durationFrames: number; // ảnh chia đều, clip có thể khác
  kenBurns?: boolean; // true cho ảnh
}
```

### Unit Tests (4 cases)

```ts
test('TC-01: Timeline duration = tổng audio duration', async () => {
  const timeline = buildTimeline(mockInput);
  const expectedTotal = Array.from(mockTtsResults.values())
    .reduce((sum, tts) => sum + tts.durationSeconds, 0);
  expect(timeline.totalDurationSeconds).toBeCloseTo(expectedTotal, 2);
});

test('TC-02: Scenes không overlap (frames kế tiếp)', async () => {
  const timeline = buildTimeline(mockInput);
  for (let i = 1; i < timeline.scenes.length; i++) {
    const prev = timeline.scenes[i - 1];
    const curr = timeline.scenes[i];
    expect(curr.startFrame).toBe(prev.startFrame + prev.durationFrames);
  }
});

test('TC-03: Ảnh chia đều thời gian trong scene', async () => {
  // Scene 2s với 2 ảnh → mỗi ảnh 1s = 30 frames
  const tts = new Map([['s1', { durationSeconds: 2 }]]);
  const scene = { assignedAssets: [{ assetId: 'a1', type: 'IMAGE' }, { assetId: 'a2', type: 'IMAGE' }] };
  const timeline = buildTimeline({ scenes: [scene], ttsResults: tts, ... });
  expect(timeline.scenes[0].mediaItems[0].durationFrames).toBe(30);
  expect(timeline.scenes[0].mediaItems[1].durationFrames).toBe(30);
});

test('TC-04: Frames = duration × 30fps', async () => {
  const timeline = buildTimeline(mockInput);
  timeline.scenes.forEach(scene => {
    expect(scene.durationFrames).toBe(Math.round(scene.durationSeconds * 30));
  });
});
```

---

## ✅ W2-06 — FFmpeg Renderer

**Estimate:** 10 giờ
**Phụ thuộc:** W2-05

### Mục Đích

Render MP4 từ timeline dùng FFmpeg. Đây là renderer mặc định (nhanh, không cần Node.js process nặng).

### Input

```ts
interface FFmpegRendererInput {
  timeline: Timeline;
  outputPath: string;
  jobId: string;
}
```

### Output

```ts
interface RendererOutput {
  outputPath: string; // '/tmp/{jobId}/output.mp4'
  durationSeconds: number;
  fileSizeBytes: number;
}
```

### Layer Stack

```
Layer 4 (top): Caption text (drawtext, word highlight)
Layer 3:       Text overlays (tên, giá, icon badge)
Layer 2:       Portrait avatar (circle, bottom-left)
Layer 1 (bg):  Ảnh (Ken Burns zoompan) | Video clips
Audio:         Concatenated TTS audio
```

### Unit Tests (4 cases)

```ts
test('TC-01: Output MP4 tồn tại và có data', async () => {
  const result = await renderWithFFmpeg(mockTimeline);
  expect(fs.existsSync(result.outputPath)).toBe(true);
  expect(result.fileSizeBytes).toBeGreaterThan(100 * 1024); // > 100KB
});

test('TC-02: Duration đúng (±1s)', async () => {
  const result = await renderWithFFmpeg(mockTimeline);
  const info = await ffprobe(result.outputPath);
  expect(info.duration).toBeCloseTo(mockTimeline.totalDurationSeconds, 0);
});

test('TC-03: Resolution 1080x1920', async () => {
  const result = await renderWithFFmpeg(mockTimeline);
  const info = await ffprobe(result.outputPath);
  expect(info.width).toBe(1080);
  expect(info.height).toBe(1920);
});

test('TC-04: Có audio track', async () => {
  const result = await renderWithFFmpeg(mockTimeline);
  const info = await ffprobe(result.outputPath);
  expect(info.audioStreams.length).toBeGreaterThan(0);
});
```

### Nhật Ký Phát Triển

```
[ ] Ngày bắt đầu:
[ ] Người thực hiện:
[ ] TC-01~TC-04 pass:
[ ] Thực tế: render video 60s mất bao lâu: ___ giây
[ ] Render video 30s mất: ___ giây
[ ] Ken Burns effect trông tự nhiên không:
[ ] Caption có đọc được không (font size, vị trí):
[ ] Portrait avatar overlay OK:
[ ] Vấn đề gặp phải với FFmpeg filter_complex:
[ ] Quyết định thay đổi so với plan:
```

---

## ✅ W2-07 — Remotion Renderer (Premium)

**Estimate:** 8 giờ
**Phụ thuộc:** W2-05

### Mục Đích

Renderer dùng React + Remotion cho premium templates với animation phức tạp hơn.

### Notes

```
- Chỉ dùng khi renderEngine = 'remotion'
- Default: ffmpeg (rẻ, nhanh)
- Remotion: chậm hơn ~3x nhưng animation đẹp hơn
```

### Unit Tests (2 cases)

```ts
test('TC-01: Remotion render output hợp lệ', async () => {
  const result = await renderWithRemotion(mockTimeline);
  expect(fs.existsSync(result.outputPath)).toBe(true);
});

test('TC-02: Duration đúng', async () => {
  const result = await renderWithRemotion(mockTimeline);
  const info = await ffprobe(result.outputPath);
  expect(info.duration).toBeCloseTo(mockTimeline.totalDurationSeconds, 0);
});
```

---

## ✅ W2-08 — Uploader

**Estimate:** 4 giờ
**Phụ thuộc:** S-04

### Mục Đích

Upload MP4 + thumbnail lên R2. Verify CDN URL accessible.

### Input

```ts
interface UploaderInput {
  localVideoPath: string;
  userId: string;
  jobId: string;
}
```

### Output

```ts
interface UploaderOutput {
  videoUrl: string; // CDN URL public
  thumbnailUrl: string;
  videoKey: string; // R2 object key
  thumbnailKey: string;
  fileSizeBytes: number;
  durationSeconds: number;
}
```

### Unit Tests (4 cases)

```ts
test('TC-01: Upload MP4 thành công, trả về CDN URL', async () => {
  const result = await uploadVideo(mockInput);
  expect(result.videoUrl).toContain('cdn.');
  expect(result.videoUrl).toContain('.mp4');
});

test('TC-02: Thumbnail được tạo từ frame giây thứ 2', async () => {
  const result = await uploadVideo(mockInput);
  expect(result.thumbnailUrl).toBeTruthy();
  expect(result.thumbnailUrl).toMatch(/\.(jpg|jpeg|webp)$/);
});

test('TC-03: CDN URL accessible (200 status)', async () => {
  const result = await uploadVideo(mockInput);
  const response = await fetch(result.videoUrl, { method: 'HEAD' });
  expect(response.status).toBe(200);
});

test('TC-04: File path đúng cấu trúc: videos/{userId}/{jobId}/output.mp4', async () => {
  const result = await uploadVideo({ userId: 'u1', jobId: 'j1', ... });
  expect(result.videoKey).toBe('videos/u1/j1/output.mp4');
});
```

---

## ✅ W2-09 — Worker 2 Orchestrator

**Estimate:** 6 giờ
**Phụ thuộc:** W2-01 → W2-08 (tất cả)

### Flow

```
Job nhận từ BullMQ (có scriptDraftId)
  │
  ▼ Load ScriptDraft từ DB (có scenes + assignedAssets)
  │
  ▼ updateProgress(5%, 'STARTING', 'Đang chuẩn bị...')
W1-01: Download media (dùng lại mediaAssetIds từ draft)
  │
  ▼ updateProgress(15%, 'AUDIO_GENERATION', 'Đang tạo giọng đọc...')
W2-03: generateTTS() cho từng scene (song song)
  │
  ▼ updateProgress(40%, 'CLIP_EXTRACTION', 'Đang xử lý video...')
W2-04: extractClip() cho các assets là VIDEO_CLIP (song song)
  │
  ▼ updateProgress(55%, 'RENDERING', 'Đang tạo video...')
W2-05: buildTimeline()
W2-06/W2-07: render() → output.mp4
  │
  ▼ updateProgress(90%, 'UPLOAD', 'Đang tải lên...')
W2-08: uploadVideo()
  │
  ▼ updateProgress(100%, 'COMPLETE', 'Video đã sẵn sàng!')
Update VideoJob: status=COMPLETED, outputUrl, thumbnailUrl, duration
Redis pub/sub: complete event
Cleanup /tmp/{jobId}/
```

### Error Handling

```ts
// Trong try/catch:
} catch (error) {
  await db.videoJob.update({
    where: { id: jobId },
    data: { status: 'FAILED', errorMessage: error.message, failedStep: currentStep }
  });
  // Hoàn token
  await db.$transaction(async (tx) => {
    await tx.tokenWallet.update({
      where: { userId },
      data: { balance: { increment: tokenCost } }
    });
    await tx.transaction.create({
      data: { userId, type: 'TOKEN_REFUND', tokenAmount: tokenCost, videoJobId: jobId, ... }
    });
  });
  // Notify user
  await redis.publish(`realty:v1:job:${jobId}:failed`, JSON.stringify({
    jobId, userId, failedStep: currentStep,
    userMessage: 'Video tạo thất bại. Token đã được hoàn lại.',
    refundTokens: tokenCost,
  }));
} finally {
  // LUÔN cleanup dù thành công hay thất bại
  await fs.rm(`/tmp/video-processor/${jobId}`, { recursive: true, force: true });
}
```

### End-to-End Test (Integration Test)

```ts
test('E2E-01: Worker 2 render video hoàn chỉnh', async () => {
  // Setup: ScriptDraft đã APPROVED, VideoJob QUEUED
  const jobId = 'e2e-job-001';
  const draftId = 'e2e-draft-001';

  // Publish render job
  await videoRenderQueue.add('render', {
    jobId, userId: 'u1', scriptDraftId: draftId,
    ttsProvider: 'fptai', ttsVoiceId: 'lannhi',
    renderEngine: 'ffmpeg', tokenCost: 5,
  });

  // Chờ xử lý (max 10 phút)
  const job = await waitFor(async () => {
    const j = await db.videoJob.findUnique({ where: { id: jobId } });
    if (j?.status === 'COMPLETED' || j?.status === 'FAILED') return j;
    return null;
  }, { timeout: 600000, interval: 5000 });

  // Assertions
  expect(job?.status).toBe('COMPLETED');
  expect(job?.outputUrl).toBeTruthy();
  expect(job?.thumbnailUrl).toBeTruthy();
  expect(job?.duration).toBeGreaterThan(0);

  // CDN URL accessible
  const response = await fetch(job!.outputUrl!, { method: 'HEAD' });
  expect(response.status).toBe(200);

  // Temp cleanup
  expect(fs.existsSync(`/tmp/video-processor/${jobId}`)).toBe(false);
}, 600000);

test('E2E-02: Token được hoàn khi render fail', async () => {
  // Mock FFmpeg fail
  mockFFmpegRender.mockRejectedValue(new Error('FFmpeg crash'));

  const walletBefore = await db.tokenWallet.findUnique({ where: { userId: 'u1' } });
  await videoRenderQueue.add('render', { jobId: 'fail-job-001', tokenCost: 5, userId: 'u1', ... });

  await sleep(30000); // chờ fail + retry

  const walletAfter = await db.tokenWallet.findUnique({ where: { userId: 'u1' } });
  expect(walletAfter!.balance).toBe(walletBefore!.balance); // balance không đổi = đã refund
}, 60000);
```

---

---

# 📓 Nhật Ký Phát Triển Tổng Hợp

> Cập nhật sau khi hoàn thành mỗi task. Ai làm task nào thì ghi vào đó.

## Phase Setup

| Task | Ngày xong | Người làm | Thực tế (h) | Ghi chú quan trọng |
| ---- | --------- | --------- | ----------- | ------------------ |
| S-01 |           |           |             |                    |
| S-02 |           |           |             |                    |
| S-03 |           |           |             |                    |
| S-04 |           |           |             |                    |

## Phase Worker 1

| Task  | Ngày xong | Người làm | Thực tế (h) | Phát hiện quan trọng       |
| ----- | --------- | --------- | ----------- | -------------------------- |
| W1-01 |           |           |             |                            |
| W1-02 |           |           |             | Gemini tiếng Việt quality: |
| W1-03 |           |           |             | Video analysis accuracy:   |
| W1-04 |           |           |             |                            |
| W1-05 |           |           |             | Script quality (1-10):     |
| W1-06 |           |           |             |                            |
| W1-07 |           |           |             | E2E duration:              |

## Phase Worker 2

| Task  | Ngày xong | Người làm | Thực tế (h) | Phát hiện quan trọng        |
| ----- | --------- | --------- | ----------- | --------------------------- |
| W2-01 |           |           |             | FPT.AI best voice:          |
| W2-02 |           |           |             |                             |
| W2-03 |           |           |             |                             |
| W2-04 |           |           |             |                             |
| W2-05 |           |           |             |                             |
| W2-06 |           |           |             | Render 60s mất: \_\_\_ giây |
| W2-07 |           |           |             |                             |
| W2-08 |           |           |             |                             |
| W2-09 |           |           |             | Full E2E mất: \_\_\_ phút   |

## Câu Hỏi Cần Trả Lời (điền trong quá trình dev)

```
❓ Gemini Flash-8B nhận diện phòng tiếng Việt có chính xác không?
   → Trả lời sau W1-02: ___

❓ FPT.AI giọng nào tốt nhất cho video BĐS?
   → Trả lời sau W2-01: ___

❓ FFmpeg render video 60s mất bao lâu trên Railway Starter ($5)?
   → Trả lời sau W2-06: ___

❓ FPT.AI word timestamps có chính xác không (sync caption)?
   → Trả lời sau W2-01: ___

❓ Clip extraction deshake có tốt không (so với không deshake)?
   → Trả lời sau W2-04: ___

❓ Worker 1 E2E (gen draft): bao nhiêu giây tổng?
   → Trả lời sau W1-07: ___

❓ Worker 2 E2E (render video): bao nhiêu phút tổng?
   → Trả lời sau W2-09: ___
```

## Quyết Định Kỹ Thuật (ghi lại khi thay đổi so với plan)

```
[Ngày] [Task] [Quyết định] [Lý do]
---
```
