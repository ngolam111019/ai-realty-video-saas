# 🎬 Chiến Lược Phát Triển — Video Processor Service

**Tài liệu:** Chiến lược, task breakdown E2E, nhật ký phát triển
**Service:** `services/video-processor`
**Ngày tạo:** 2026-06-04
**Trạng thái:** 🟡 Đang lập kế hoạch

---

## 📌 Mục Lục

1. [Tại sao ưu tiên Video Processor](#1-tại-sao-ưu-tiên-video-processor)
2. [Chiến lược tổng quát](#2-chiến-lược-tổng-quát)
3. [Phân rã End-to-End](#3-phân-rã-end-to-end)
4. [Nhật Ký Phát Triển](#4-nhật-ký-phát-triển)
5. [Definition of Done](#5-definition-of-done)

---

## 1. Tại Sao Ưu Tiên Video Processor

> **Core value của sản phẩm nằm ở đây.** Nếu video không render được, toàn bộ hệ thống vô nghĩa.

```
✅ Lý do ưu tiên trước:

  1. GIẢM RỦI RO CORE: Phần phức tạp nhất (Remotion + FFmpeg + TTS)
     cần validate sớm trước khi xây UI

  2. TEST ĐỘC LẬP: Chạy được bằng CLI/script, không cần frontend

  3. KHÁM PHÁ API: Biết ElevenLabs/Remotion hoạt động thật sự như thế nào
     trước khi cam kết vào database schema

  4. TRÁNH RE-WORK: Nếu phát triển UI trước, sau đó video pipeline
     có vấn đề → phải sửa ngược lại flow

❌ Rủi ro nếu làm UI trước:
  - UI xong nhưng video render lỗi → user thất vọng ngay lần đầu
  - Schema database sai → migration tốn công
  - Estimate thời gian render sai → UX loading state sai
```

---

## 2. Chiến Lược Tổng Quát

### 2.1 Nguyên Tắc Phát Triển

```
🎯 PRINCIPLE 1: Làm thô trước, đẹp sau
   → Mỗi step cần render được video THẬT trước khi tối ưu

🎯 PRINCIPLE 2: Test từng bước độc lập
   → Mỗi processor có script test riêng chạy được bằng CLI

🎯 PRINCIPLE 3: Fail fast, fail clearly
   → Mỗi bước lỗi phải log rõ, throw error có message cụ thể

🎯 PRINCIPLE 4: Real data từ sớm
   → Dùng ảnh BĐS thật, audio thật, không mock giả

🎯 PRINCIPLE 5: Commit sau mỗi milestone nhỏ
   → Không commit code chưa chạy được
```

### 2.2 Thứ Tự Phát Triển (3 Phases)

```
PHASE A — Foundation (Ngày 1-2)
  Setup project, kết nối infra (Redis, DB, R2), chạy được worker đầu tiên

PHASE B — Pipeline Core (Ngày 3-12)
  Pipeline đầy đủ 8 bước — mỗi bước là 1 milestone:
  B1: Media Download → B2: AI Vision → B3: Script Gen
  → B4: TTS → B5: Clip Extraction → B6: Render → B7: Upload → B8: Complete

PHASE C — Templates & Polish (Ngày 13-18)
  Template đẹp, edge cases, performance, monitoring, integration test

──────────────────────────────────────────────
  Total estimate: 18 ngày để có video-processor production-ready
  (thêm 3 ngày so với trước vì pipeline có thêm AI vision + script gen)
──────────────────────────────────────────────
```

### 2.3 Tech Validation Order

Validate theo thứ tự rủi ro giảm dần:

```
1. Gemini Flash-8B Vision ← Tiếng Việt image caption có tốt không?
2. Gemini Flash Script Gen ← JSON structured output có ổn định không?
3. FPT.AI TTS              ← Chất lượng giọng tiếng Việt thực tế?
4. FFmpeg render pipeline  ← Performance trên Railway?
5. BullMQ job flow         ← Đã có kinh nghiệm, ít rủi ro
6. R2 upload               ← S3-compatible, ổn định
```

---

## 3. Phân Rã End-to-End

> Mỗi task là 1 unit hoàn chỉnh: có input rõ ràng, output rõ ràng, test được.

---

### PHASE A — Foundation

---

#### 📋 TASK A1: Khởi tạo project structure

**Estimate:** 2-3 giờ
**Input:** Thư mục rỗng `services/video-processor`
**Output:** Project chạy được `pnpm dev`, hiện "Worker started"

```
Checklist:
  [ ] Tạo services/video-processor/
  [ ] package.json với scripts: dev, build, start
  [ ] tsconfig.json (strict mode)
  [ ] .env.example với tất cả biến cần thiết
  [ ] src/index.ts — entry point (chỉ log "Worker started")
  [ ] Commit: "feat: init video-processor project structure"

Biến môi trường cần khai báo trong .env.example:
  DATABASE_URL=
  REDIS_URL=
  R2_ACCOUNT_ID=
  R2_ACCESS_KEY_ID=
  R2_SECRET_ACCESS_KEY=
  R2_BUCKET_MEDIA=
  R2_BUCKET_VIDEOS=
  CDN_BASE_URL=
  ELEVENLABS_API_KEY=
  GEMINI_API_KEY=
  TEMP_DIR=/tmp/video-processor
  MAX_CONCURRENT_RENDERS=2
  LOG_LEVEL=info
```

---

#### 📋 TASK A2: Kết nối Redis + BullMQ Worker scaffold

**Estimate:** 2-3 giờ
**Input:** Redis đang chạy (Docker Compose)
**Output:** Worker connect Redis, nhận job giả, log job data ra console

```
Checklist:
  [ ] src/lib/redis.ts — ioredis singleton
  [ ] src/workers/video.worker.ts — BullMQ Worker scaffold
  [ ] Worker listen queue: 'realty.video.create'
  [ ] Test: publish 1 job giả bằng script test-publish.ts
  [ ] Worker nhận job, log jobId, mark complete
  [ ] Commit: "feat: setup bullmq worker with redis connection"

Test script (scripts/test-publish.ts):
  → Publish job {jobId: "test-001", userId: "u1", ...}
  → Xác nhận worker nhận được và log ra
```

---

#### 📋 TASK A3: Kết nối Database (Prisma — read/write job status)

**Estimate:** 2 giờ
**Input:** PostgreSQL đang chạy, schema.prisma từ apps/web
**Output:** Worker đọc được VideoJob từ DB, update status

```
Checklist:
  [ ] Copy prisma/schema.prisma từ apps/web (hoặc dùng shared)
  [ ] src/lib/db.ts — Prisma singleton (không migrate, chỉ generate client)
  [ ] Test: đọc VideoJob theo id từ DB
  [ ] Test: update VideoJob.status = 'PROCESSING'
  [ ] Commit: "feat: add prisma client for job status updates"

NOTE: video-processor KHÔNG chạy migrations.
      Chỉ apps/web mới chạy migrate.
```

---

#### 📋 TASK A4: Setup Cloudflare R2 Client

**Estimate:** 2 giờ
**Input:** R2 bucket đã tạo trên Cloudflare
**Output:** Download được file từ R2, upload được file lên R2

```
Checklist:
  [ ] src/lib/s3.ts — R2 client (AWS SDK v3, S3-compatible)
  [ ] Test download: download 1 ảnh test từ R2 → /tmp/test.jpg
  [ ] Test upload: upload /tmp/test.jpg lên R2 bucket khác
  [ ] Verify CDN URL truy cập được
  [ ] Commit: "feat: add cloudflare r2 client"

Local dev: dùng MinIO (trong docker-compose.yml) thay thế R2
  → ENDPOINT=http://localhost:9000
  → Bucket: local-media, local-videos
```

---

### PHASE B — Pipeline Core

> **Mỗi task** là 1 unit độc lập: input rõ, output rõ, có script test CLI riêng.
> **Nguyên tắc audio-first**: TTS generate trước → đo duration → build timeline theo audio.
> **Script generation nằm trong pipeline**: video-processor TỰ viết script, không nhận script từ ngoài vào.

---

#### 📋 TASK B1: Media Downloader

**Estimate:** 4-5 giờ
**Input:** `mediaAssetIds[]` từ job payload → lookup DB → get storageKey
**Output:** Map `{assetId: "/tmp/{jobId}/media/xxx.jpg"}` — tất cả file local

```
Checklist:
  [ ] src/processors/media-downloader.ts
  [ ] Query MediaAsset records từ DB theo ids
  [ ] Download song song (Promise.all, max 5 concurrent)
  [ ] Validate file sau download: check size > 0, MIME type
  [ ] Tạo thư mục /tmp/{jobId}/media/ tự động
  [ ] Retry 3 lần nếu download thất bại
  [ ] Unit test: download 5 ảnh + 1 video test từ MinIO
  [ ] Commit: "feat: parallel media downloader with retry"

Edge cases:
  → MediaAsset không tồn tại trong DB → throw AssetNotFoundError
  → File trên R2 bị xóa → throw AssetUnavailableError
```

---

#### 📋 TASK B2: AI Vision Analysis

**Estimate:** 1 ngày
**Input:** Local file paths của tất cả ảnh/video
**Output:** `MediaInventory` — mô tả từng ảnh/video để AI dùng khi gen script

```
Checklist:
  [ ] src/processors/ai-vision.ts
  [ ] src/lib/gemini.ts — Gemini Flash-8B client
  [ ] Với IMAGE: base64 inline → Gemini analyze
  [ ] Với VIDEO:
        - ffprobe: đo duration, resolution
        - FFmpeg: extract 3 keyframes (10%, 50%, 90% timestamp)
        - Gửi 3 frames + metadata → Gemini
        - Output: scene timeline [{room, startSec, endSec, quality}]
  [ ] Cache kết quả: Redis key = hash(file content), TTL 30 ngày
      → Cùng ảnh upload lại → reuse phân tích cũ ($0 AI cost)
  [ ] Unit test: analyze 5 ảnh BĐS thật, check output JSON hợp lệ
  [ ] Commit: "feat: ai vision analysis with caching"

Output format mỗi ảnh:
  { assetId, detectedRoom, quality, description, highlights }

Output format mỗi video clip:
  { assetId, scenes: [{room, startSec, endSec, quality, suggestedClipStart, suggestedClipEnd}] }
```

---

#### 📋 TASK B3: AI Script Generation + Scene Mapping

**Estimate:** 1 ngày
**Input:** MediaInventory (từ B2) + projectInfo + template structure
**Output:** `GeneratedScript` JSON — kịch bản đầy đủ, mỗi scene biết dùng ảnh nào

```
Checklist:
  [ ] src/processors/script-generator.ts
  [ ] Build prompt chứa:
        ① Media inventory (từ B2)
        ② projectInfo (tên, giá, tiện ích...)
        ③ Template structure (số scene, mục đích từng scene)
        ④ Target platform (TikTok/Reels → hook mạnh đầu 3s)
  [ ] Gọi Gemini Flash với JSON mode (responseMimeType: 'application/json')
  [ ] Validate output với Zod schema:
        → Tất cả assignedAssetIds phải có trong inventory
        → Mỗi scene phải có narration + ít nhất 1 ảnh
  [ ] Save script vào DB (Script table)
  [ ] Unit test: gen script cho dự án mẫu, kiểm tra quality output
  [ ] Commit: "feat: ai script generator with scene mapping"

Kết quả mong đợi:
  scenes[0]: { narration: "Chào mừng bạn...", assignedAssetIds: ["a3"], ... }
  scenes[1]: { narration: "Phòng khách rộng...", assignedAssetIds: ["a1", "a5"], ... }
```

---

#### 📋 TASK B4: Text-to-Speech (Audio-First)

**Estimate:** 1 ngày
**Input:** `scene.narration` text từng scene (từ B3)
**Output:** `/tmp/{jobId}/audio/scene_{i}.mp3` + `durationSeconds` + `wordTimestamps`

```
Checklist:
  [ ] src/processors/tts.service.ts (factory pattern)
  [ ] FptAiTTSProvider: POST https://api.fpt.ai/hmi/tts/v5
  [ ] Đo duration: ffprobe -i file.mp3
  [ ] Word timestamps: parse từ FPT.AI response
  [ ] Cache TTS: key = hash(text + voiceId), TTL 7 ngày → reuse audio
  [ ] Fallback: Google WaveNet VI nếu FPT.AI lỗi
  [ ] ElevenLabsTTSProvider: cho premium users
  [ ] Test với văn bản tiếng Việt thực tế (~100-200 từ)
  [ ] Đánh giá chất lượng giọng → chọn voiceId tốt nhất
  [ ] Commit: "feat: fptai tts with word timestamps and caching"

QUAN TRỌNG: Sau bước này biết duration thực → build timeline
  → Scene duration = audio duration (không phải ngược lại!)
```

---

#### 📋 TASK B5: Clip Extraction (chỉ nếu có video input)

**Estimate:** 4-5 giờ
**Input:** Video analysis từ B2 (suggested clip timestamps)
**Output:** Video clips MP4 đã trim + remove audio, ready để composite

```
Checklist:
  [ ] src/processors/clip-extractor.ts
  [ ] FFmpeg: cắt đoạn AI đề xuất: -ss {start} -t {duration}
  [ ] Remove original audio: -an (thay bằng TTS)
  [ ] Deshake nếu quality_issues có 'camera_shake'
  [ ] Scale về 1080x1920 (9:16)
  [ ] Test: clip 30s từ video BĐS thật, verify output
  [ ] Commit: "feat: smart clip extractor with deshake"
```

---

#### 📋 TASK B6: FFmpeg Renderer (Default)

**Estimate:** 2 ngày
**Input:** Timeline: scenes với mediaPaths + audioPaths + script data
**Output:** `/tmp/{jobId}/output.mp4`

```
Checklist — Timeline Builder:
  [ ] src/processors/timeline-builder.ts
  [ ] Build scene list với duration = audioDurationSeconds × 30fps
  [ ] Assign media theo assignedAssetIds (ảnh chia đều, clips phát liên tục)

Checklist — FFmpeg Renderer:
  [ ] src/processors/ffmpeg-renderer.ts
  [ ] Layer 1: ảnh/clips (Ken Burns + crossfade)
  [ ] Layer 2: Audio concat (tất cả scene audio nối tiếp)
  [ ] Layer 3: drawtext — caption, giá, tên, hotline
  [ ] Layer 4: Portrait overlay (avatar góc dưới trái)
  [ ] Output: 1080x1920, libx264, crf 23, 30fps
  [ ] Test: render video 60s với 5 ảnh + 3 scenes
  [ ] Đo thời gian render: bao lâu trên máy local?
  [ ] Commit: "feat: ffmpeg renderer with layers"
```

---

#### 📋 TASK B7: Upload + Cleanup

**Estimate:** 3-4 giờ
**Input:** `/tmp/{jobId}/output.mp4`
**Output:** CDN URL public, /tmp đã xóa

```
Checklist:
  [ ] src/processors/uploader.ts
  [ ] Upload MP4 → R2: videos/{userId}/{jobId}/output.mp4
  [ ] Extract thumbnail (ffmpeg frame giây thứ 2)
  [ ] Upload thumbnail → R2
  [ ] Verify HeadObject: file tồn tại, size đúng
  [ ] Cleanup: rm -rf /tmp/{jobId}/ (kể cả lỗi → finally block)
  [ ] Commit: "feat: uploader with thumbnail generation"
```

---

#### 📋 TASK B8: Complete Worker Orchestration

**Estimate:** 1 ngày
**Input:** Job từ BullMQ với input thô
**Output:** Chạy toàn bộ B1→B7, update DB, notify

```
Checklist:
  [ ] src/workers/video.worker.ts — orchestrate B1-B7
  [ ] Progress update sau mỗi bước:
      10% MEDIA_DOWNLOAD → 25% AI_VISION → 40% SCRIPT_GENERATION
      → 55% AUDIO_GENERATION → 65% CLIP_EXTRACTION
      → 80% RENDERING → 92% UPLOAD → 100% COMPLETE
  [ ] Update VideoJob.status + Script record
  [ ] Error: set FAILED + refund token
  [ ] BullMQ retry: maxRetries=3, exponential backoff 30s
  [ ] End-to-end test:
        → Insert VideoJob fixture vào DB
        → Publish job với mediaAssetIds thật + projectInfo
        → Chờ xử lý (max 15 phút)
        → Verify: status=COMPLETED, outputUrl accessible, Script record tồn tại
  [ ] Commit: "feat: complete autonomous video pipeline"
```

---

#### 📋 TASK B1: Script Parser

**Estimate:** 3-4 giờ
**Input:** Script JSON (lấy từ DB hoặc file fixture)
**Output:** `ParsedScene[]` với đầy đủ thông tin từng scene

```
Checklist:
  [ ] src/processors/script-parser.ts
  [ ] Interface: ParsedScene {
        id, name, duration, narration, caption,
        mediaAssetIds, textOverlays
      }
  [ ] Validate: mỗi scene phải có narration + ít nhất 1 mediaAssetId
  [ ] Validate: tổng duration không quá 120s
  [ ] Throw lỗi rõ ràng nếu schema không hợp lệ
  [ ] Unit test: scripts/test-parser.ts với fixture JSON
  [ ] Commit: "feat: script parser with validation"

Fixture file: scripts/fixtures/sample-script.json
  → 3 scenes: intro (5s) + tour (20s) + cta (10s)
```

---

#### 📋 TASK B2: Media Downloader

**Estimate:** 4-5 giờ
**Input:** `mediaAssetIds[]` → lookup DB → get storageKey → download từ R2
**Output:** Local file paths map `{assetId: "/tmp/{jobId}/media/xxx.jpg"}`

```
Checklist:
  [ ] src/processors/media-prep.ts
  [ ] Query MediaAsset records từ DB theo ids
  [ ] Download song song (Promise.all, max 5 concurrent)
  [ ] Validate file sau download: check size > 0, MIME type
  [ ] Tự động tạo thư mục /tmp/{jobId}/media/ nếu chưa có
  [ ] Retry 3 lần nếu download thất bại
  [ ] Unit test: download 3 ảnh test từ R2
  [ ] Commit: "feat: parallel media downloader with retry"

Edge cases cần xử lý:
  → MediaAsset không tồn tại trong DB → throw AssetNotFoundError
  → File trên R2 bị xóa → throw AssetUnavailableError
  → Disk đầy → throw DiskFullError
```

---

#### 📋 TASK B3: Text-to-Speech với ElevenLabs

**Estimate:** 1 ngày
**Input:** Narration text (string), voiceId (ElevenLabs)
**Output:** `/tmp/{jobId}/audio/scene_{i}.mp3` + duration (giây)

```
Checklist:
  [ ] src/processors/tts.service.ts
  [ ] POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
  [ ] Settings: stability=0.5, similarity_boost=0.8, model_id=eleven_multilingual_v2
  [ ] Download audio stream → save MP3
  [ ] Probe MP3 duration với ffprobe (ffprobe -i file.mp3)
  [ ] Retry 2 lần nếu API lỗi
  [ ] Cache audio: nếu cùng text + voiceId → reuse (Redis key: tts:{hash})
  [ ] Test với văn bản tiếng Việt: "Chào mừng bạn đến với căn hộ..."
  [ ] Test các giọng: giọng Nam miền Nam, giọng Nữ miền Bắc
  [ ] Đánh giá chất lượng giọng đọc tiếng Việt
  [ ] Commit: "feat: elevenlabs tts with caching and retry"

Danh sách voice cần test (lấy từ ElevenLabs dashboard):
  → Ghi vào file: scripts/fixtures/voice-list.json
  → Giọng nào tự nhiên nhất → set làm default

QUAN TRỌNG — Đánh giá sau task này:
  → Nếu ElevenLabs tiếng Việt không đạt → fallback sang Azure TTS
  → Ghi kết quả vào nhật ký phát triển
```

---

#### 📋 TASK B4: Remotion Setup + Template đầu tiên (Skeleton)

**Estimate:** 2 ngày
**Input:** Danh sách scenes + media paths + audio paths
**Output:** Video MP4 đơn giản (chỉ slideshow ảnh + audio)

```
Checklist — Setup:
  [ ] npm install @remotion/bundler @remotion/renderer remotion
  [ ] src/templates/remotion-root.tsx — register compositions
  [ ] src/templates/template-skeleton/index.tsx — composition đơn giản nhất

Checklist — Template Skeleton (chỉ ảnh + audio, không animation):
  [ ] Mỗi scene: hiện 1 ảnh fullscreen
  [ ] Sync với audio: mỗi scene kéo dài bằng duration của audio MP3
  [ ] Text caption hiện ở dưới màn hình (đơn giản, không animation)
  [ ] Resolution: 1080x1920 (9:16 vertical)
  [ ] FPS: 30

Checklist — Render:
  [ ] src/processors/renderer.ts
  [ ] Gọi renderMedia() với inputProps
  [ ] Output: /tmp/{jobId}/output.mp4
  [ ] Đo thời gian render: bao nhiêu giây cho video 30s?
  [ ] Test render với ảnh thật + audio thật
  [ ] Xem output video → đánh giá chất lượng
  [ ] Commit: "feat: remotion skeleton template with basic render"

Mục tiêu sau task này:
  → Có video MP4 chạy được (dù chưa đẹp)
  → Biết được render 30s video mất bao lâu
  → Là nền tảng để làm templates đẹp hơn
```

---

#### 📋 TASK B5: Template Đẹp — "Tour Căn Hộ"

**Estimate:** 2 ngày
**Input:** Template skeleton đã có
**Output:** Video đẹp với animations, transitions, branding

```
Checklist — Scene 1: Intro Sale (5s)
  [ ] Avatar/chân dung sale: zoom-in từ nhỏ ra to (0.5s)
  [ ] Tên sale: fade-in text dưới avatar
  [ ] Logo công ty: xuất hiện góc phải
  [ ] Background: gradient màu thương hiệu

Checklist — Scene 2: Tổng quan dự án (10s)
  [ ] Tên dự án: chữ to, font chuyên nghiệp
  [ ] Địa chỉ: slide-in từ dưới lên
  [ ] Key stats: diện tích, phòng ngủ, giá — hiện lần lượt
  [ ] Background: ảnh dự án blur

Checklist — Scene 3: Tour từng phòng (20s)
  [ ] Slideshow 4-6 ảnh: mỗi ảnh 3-4 giây
  [ ] Transition: fade cross giữa các ảnh
  [ ] Ken Burns effect: pan/zoom nhẹ trên ảnh tĩnh
  [ ] Caption phòng hiện ở dưới: "Phòng khách", "Phòng ngủ"...

Checklist — Scene 4: Tiện ích (8s)
  [ ] Grid 2x2 icon tiện ích: animate vào lần lượt
  [ ] Text mô tả ngắn mỗi tiện ích

Checklist — Scene 5: CTA (7s)
  [ ] Giá bán: số to, màu nổi bật
  [ ] Hotline: với icon điện thoại (pulse animation)
  [ ] QR code tên sale (nếu có)
  [ ] Background: gradient mạnh

  [ ] Render thử toàn bộ template với data thật
  [ ] Review video: đánh giá UX, chỉnh font/màu
  [ ] Commit: "feat: tour template with animations"
```

---

#### 📋 TASK B6: Upload MP4 lên R2 + Cleanup

**Estimate:** 3-4 giờ
**Input:** `/tmp/{jobId}/output.mp4`
**Output:** CDN URL public của video, xóa temp files

```
Checklist:
  [ ] src/processors/uploader.ts
  [ ] Upload MP4 với Content-Type: video/mp4
  [ ] Key: videos/{userId}/{jobId}/output.mp4
  [ ] Sau upload: verify bằng HeadObject (file tồn tại, size đúng)
  [ ] Generate thumbnail (FFmpeg frame extract: giây thứ 2)
  [ ] Upload thumbnail: videos/{userId}/{jobId}/thumbnail.jpg
  [ ] Cleanup: rm -rf /tmp/{jobId}/
  [ ] Test: upload 10MB file, verify CDN URL accessible
  [ ] Commit: "feat: r2 uploader with thumbnail generation and cleanup"
```

---

#### 📋 TASK B7: Complete Worker Flow (Kết Nối Pipeline)

**Estimate:** 1 ngày
**Input:** Job từ BullMQ queue với đủ data
**Output:** Chạy toàn bộ pipeline A→B→C→D→E, update DB, notify

```
Checklist — Worker orchestration:
  [ ] src/workers/video.worker.ts — orchestrate all processors
  [ ] Update progress sau mỗi step (Redis pub/sub):
      10% → PARSING
      25% → MEDIA_DOWNLOAD
      45% → AUDIO_GENERATION
      75% → RENDERING
      90% → UPLOAD
      100% → COMPLETE
  [ ] Update VideoJob.status trong DB sau mỗi bước
  [ ] Catch lỗi từng bước → xử lý riêng

Checklist — Error handling:
  [ ] Nếu lỗi: set status=FAILED, lưu errorMessage
  [ ] Publish failed event → realty.video.notify
  [ ] BullMQ: maxRetries=3, backoff exponential 30s
  [ ] Cleanup temp files kể cả khi lỗi (finally block)

Checklist — Integration test (End-to-End):
  [ ] Script: scripts/e2e-test.ts
  [ ] Insert 1 VideoJob vào DB (fixture data)
  [ ] Publish job vào queue
  [ ] Chờ xử lý (max 10 phút)
  [ ] Verify: DB status=COMPLETED, outputUrl không null
  [ ] Verify: CDN URL accessible, video play được
  [ ] Commit: "feat: complete worker pipeline with progress tracking"
```

---

### PHASE C — Templates & Polish

---

#### 📋 TASK C1: Template "Hot Deal" (30-45s)

**Estimate:** 1 ngày
**Input:** Template Tour đã có làm base
**Output:** Template thứ 2 render được

```
Checklist:
  [ ] src/templates/template-deal/
  [ ] Scene 1: Hook mạnh — "GIÁ SỐC CHỈ X TỶ" + hiệu ứng flash (5s)
  [ ] Scene 2: Slideshow ảnh đẹp nhất (3 ảnh) + text overlay (15s)
  [ ] Scene 3: USP 3 điểm — bullet points animate in (10s)
  [ ] Scene 4: CTA khẩn cấp — "Liên hệ ngay!" + countdown (10s)
  [ ] Test + review video
  [ ] Commit: "feat: hot deal template"
```

---

#### 📋 TASK C2: Xử Lý Edge Cases

**Estimate:** 1 ngày

```
Checklist:
  [ ] Ảnh upload bị xoay (EXIF orientation) → auto-rotate
  [ ] Video clip trong assets → extract frames thay vì dùng trực tiếp
  [ ] Narration text quá dài → truncate + cảnh báo
  [ ] Không có ảnh portrait sale → dùng placeholder/blur
  [ ] ElevenLabs API over rate limit → wait + retry với exponential backoff
  [ ] Remotion render OOM (out of memory) → giảm concurrency + retry
  [ ] Disk /tmp đầy → log alert, fail gracefully
  [ ] Commit: "fix: handle edge cases in video pipeline"
```

---

#### 📋 TASK C3: Performance Optimization

**Estimate:** 1 ngày

```
Checklist:
  [ ] Benchmark: đo thời gian từng bước với video 30s, 60s, 90s
  [ ] Parallel TTS: gen audio nhiều scene song song (Promise.all)
  [ ] Remotion concurrency: test concurrentlyRenderedFrames=4 vs 8
  [ ] Chọn optimal codec settings (bitrate vs quality vs file size)
  [ ] Target: video 60s render trong < 5 phút
  [ ] Ghi kết quả benchmark vào nhật ký
  [ ] Commit: "perf: optimize render pipeline"
```

---

#### 📋 TASK C4: Monitoring & Logging

**Estimate:** 4-5 giờ

```
Checklist:
  [ ] Pino logger: structured JSON, include {jobId, step, duration}
  [ ] Log mỗi step: start time, end time, kết quả
  [ ] Sentry error tracking: capture exceptions với job context
  [ ] Prometheus metrics:
      - video_job_processing_duration_seconds (histogram)
      - video_job_completed_total (counter)
      - video_job_failed_total (counter)
      - bullmq_queue_depth (gauge)
  [ ] Health check endpoint: GET /health (Express mini server)
  [ ] Commit: "feat: monitoring and structured logging"
```

---

#### 📋 TASK C5: Integration Test với apps/web (Mock)

**Estimate:** 4-5 giờ

```
Checklist:
  [ ] Tạo seed script: insert test VideoJob vào DB
  [ ] Simulate full flow qua BullMQ (không cần Next.js)
  [ ] Test: job retry khi lỗi giả tạo
  [ ] Test: token refund khi job fail sau 3 lần
  [ ] Test: concurrent 3 jobs cùng lúc
  [ ] Verify: không có race condition trong token deduction
  [ ] Load test: 10 jobs submit cùng lúc
  [ ] Commit: "test: integration tests for video processor"
```

---

## 4. Nhật Ký Phát Triển

> Ghi lại sau mỗi task hoàn thành. Không được bỏ trống.

---

### Template Ghi Nhật Ký

```
### [YYYY-MM-DD] Task [ID]: [Tên task]

**Trạng thái:** ✅ Hoàn thành / ⚠️ Có vấn đề / ❌ Block

**Đã làm:**
- [Mô tả ngắn gọn những gì đã implement]

**Phát hiện / Quyết định:**
- [Những gì không như dự kiến, quyết định thay đổi]

**Số đo / Benchmark (nếu có):**
- [VD: "ElevenLabs gen 10s audio mất 2.3s"]

**Blockers / Vấn đề cần giải quyết:**
- [Liệt kê vấn đề chưa giải quyết được]

**Commit:** [hash]
**Thời gian thực tế:** [X giờ] (estimate: [Y giờ])
```

---

### Log Section

```
┌─────────────────────────────────────────────────────────────────┐
│  NHẬT KÝ PHÁT TRIỂN — Ghi bên dưới section này                 │
└─────────────────────────────────────────────────────────────────┘
```

<!-- NHẬT KÝ BẮT ĐẦU TỪ ĐÂY — thêm entry mới nhất lên ĐẦU -->

---

_(Chưa có entry nào — bắt đầu với Task A1)_

---

## 5. Definition of Done

### Video Processor được coi là "Done" khi:

```
✅ Render thành công video 30s, 60s, 90s với data thật

✅ Thời gian render:
   - Video 30s: < 2 phút
   - Video 60s: < 5 phút
   - Video 90s: < 8 phút

✅ Xử lý đúng các loại media:
   - JPG, PNG ảnh dọc và ngang
   - Video clip MP4 (extract frames)
   - Portrait ảnh chân dung sale

✅ TTS tiếng Việt nghe tự nhiên (kiểm tra chủ quan)

✅ Error handling đầy đủ:
   - Job retry 3 lần với backoff
   - Refund token khi fail
   - Cleanup temp files không bị leak

✅ Concurrent: 3 jobs chạy song song không conflict

✅ Log đủ để debug khi production lỗi:
   - Biết job fail ở bước nào
   - Biết lý do lỗi

✅ 2 templates hoạt động: Tour + Hot Deal

✅ Integration test pass 100%
```

---

## 6. Phụ Lục — Câu Hỏi Cần Trả Lời Trong Quá Trình Phát Triển

```
❓ ElevenLabs giọng tiếng Việt nào tốt nhất?
   → Trả lời sau Task B3

❓ Remotion render 1080x1920 video 60s mất bao nhiêu giây trên Railway?
   → Trả lời sau Task B4

❓ Có cần GPU cho render hay CPU đủ?
   → Trả lời sau Task B4

❓ File MP4 output 60s nặng bao nhiêu MB?
   → Trả lời sau Task B6 (ảnh hưởng bandwidth cost)

❓ BullMQ retry strategy: 30s-60s-120s có đủ không?
   → Trả lời sau Task B7

❓ Concurrent 5 jobs cùng lúc có OOM không?
   → Trả lời sau Task C3
```
