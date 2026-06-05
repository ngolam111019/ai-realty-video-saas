# System Architecture — AI Realty Video SaaS

**Version:** 3.0.0 — 2-Phase Pipeline: Script Draft Review + Video Render
**Cập nhật:** 2026-06-05

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                  │
│                                                                     │
│   ┌──────────────────────────────┐    ┌───────────────────────────┐ │
│   │  apps/web (Next.js 14)       │    │ apps/admin (React+Vite)   │ │
│   │  ──────────────────────────  │    │ ─────────────────────────  │ │
│   │  🖥️  Frontend (App Router)   │    │ 👤 User/Revenue/Template  │ │
│   │  🔧  Backend API Routes      │    │    gọi /api/admin/*       │ │
│   │     /api/auth/*              │    └───────────────────────────┘ │
│   │     /api/billing/*           │                                  │
│   │     /api/projects/*          │                                  │
│   │     /api/script-drafts/*     │ ← Phase 1: AI gen + user review │
│   │     /api/video-jobs/*        │ ← Phase 2: render sau approve   │
│   │     /api/admin/*             │                                  │
│   └──────────────┬───────────────┘                                  │
└──────────────────┼──────────────────────────────────────────────────┘
                   │
   ┌───────────────▼─────────────────────────────────────────────┐
   │  Next.js API Layer (Route Handlers)                         │
   │  ┌──────────────────────────────────────────────────────┐   │
   │  │  Services: auth│token│media│script-draft│video-job   │   │
   │  └──────────────────────────────────────────────────────┘   │
   │  ┌─────────────────────┐   ┌────────────────────────────┐   │
   │  │  Repositories       │   │  Queue Publisher (2 queues) │   │
   │  │  (Prisma ORM)       │   │  realty.script.generate    │   │
   │  └──────────┬──────────┘   │  realty.video.render       │   │
   │             │              └──────────────┬─────────────┘   │
   └─────────────┼────────────────────────────┼─────────────────┘
                 │                            │
     ┌───────────▼────────┐    ┌──────────────▼──────────────────┐
     │   PostgreSQL        │    │   Redis (Upstash)               │
     │   (Neon)            │    │   - Queue 1: script.generate    │
     │   Shared DB         │    │   - Queue 2: video.render       │
     └────────────────────┘    │   - Cache (TTS 7d, vision 30d)  │
                               │   - Draft/Job progress pub/sub  │
                               └─────────────┬───────────────────┘
                                             │
                                             ▼
┌───────────────────────────────────────────────────────────────────┐
│       services/video-processor  (Railway — 2 BullMQ Workers)      │
│                                                                   │
│  ┌──── WORKER 1: Script Generation (nhanh, ~30-60s, free) ──────┐ │
│  │  Queue: realty.script.generate                                │ │
│  │  1. 📥 Download media → /tmp                                  │ │
│  │  2. 🔍 AI Vision: Gemini Flash-8B phân tích ảnh/video         │ │
│  │  3. ✍️  AI Script: Gemini Flash viết kịch bản + gán ảnh        │ │
│  │  4. 💾 Save ScriptDraft (status=READY) → notify user          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│         ⬇ USER REVIEW (apps/web)                                  │
│         Xem kịch bản + ảnh AI chọn → Sửa nếu muốn               │
│         → Click "Tạo video" → Trừ token → Queue 2                │
│                                                                   │
│  ┌──── WORKER 2: Video Render (chậm, 3-8 phút, tốn token) ─────┐ │
│  │  Queue: realty.video.render                                   │ │
│  │  1. 🔊 TTS: FPT.AI → MP3/scene + word timestamps             │ │
│  │  2. ✂️  Clip Extraction: FFmpeg cắt đoạn đẹp từ video         │ │
│  │  3. 🎬 Render: FFmpeg/Remotion → MP4 (audio-first)           │ │
│  │  4. ⬆️  Upload: MP4 + thumbnail → Cloudflare R2              │ │
│  │  5. ✅ Update VideoJob: COMPLETED → notify user               │ │
│  └───────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                         │
             ┌───────────▼────────────┐
             │   Cloudflare R2        │
             │   /media/*  (uploads)  │
             │   /videos/* (outputs)  │
             │   /cache/tts/*         │
              └────────────────────────┘
```

---

## 2. Tại Sao video-processor Hoàn Toàn Autonomous?

```
video-processor nhận input thô:
  mediaAssetIds[] + projectInfo + templateId

Tự làm tất cả mà không cần apps/web can thiệp:
  ✅ Xem ảnh/video bằng AI (Gemini Vision)
  ✅ Viết script, chia scene, gán ảnh vào scene
  ✅ Tạo audio TTS từng scene
  ✅ Build timeline theo audio duration (audio-first)
  ✅ Render video hoàn chỉnh
  ✅ Upload lên R2 + lưu kết quả vào DB

apps/web KHÔNG:
  ❌ Không gọi Gemini để gen script
  ❌ Không cần scriptId trong job payload
  ❌ Không xử lý logic video nào

apps/web CHỈ:
  ✅ Nhận input từ user → validate → deduct token → publish job
  ✅ Poll status và hiển thị progress cho user
  ✅ Hiển thị video kết quả + script đã gen (xem thôi)
```

---

## 3. Tại Sao video-processor PHẢI Tách Riêng?

```
❌ Không thể chạy trong Next.js (Vercel serverless):
   Timeout: 30s (Pro: 60s) — render video mất 3-8 PHÚT
   Serverless: spin-up/down — BullMQ cần persistent process
   RAM: giới hạn 1GB — Remotion + Gemini cần 2GB+

✅ Railway (long-running container):
   Chạy 24/7, không timeout
   RAM thoải mái, scale lên bao nhiêu cũng được
   Thêm worker instances khi queue nhiều
```

---

## 4. Video Generation Pipeline — Chi Tiết 8 Bước

```
[USER] Chọn ảnh + điền thông tin + chọn template → Click "Tạo video"
    │
    ▼
[apps/web] POST /api/video-jobs
    ├─ Validate input
    ├─ Check token balance
    ├─ Deduct token (DB transaction ACID)
    ├─ Create VideoJob { status: QUEUED }
    └─ Publish → BullMQ: realty.video.create
          { jobId, mediaAssetIds, projectInfo, templateId, ... }

[USER] Polling GET /api/video-jobs/{id}/status mỗi 3s
    (hoặc nhận WebSocket event nếu Phase 2)

━━━━━━━━━━━━━━━━━ video-processor worker ━━━━━━━━━━━━━━━━━

[Step 1 — 10%] MEDIA_DOWNLOAD
    Download tất cả ảnh/video từ R2 → /tmp/{jobId}/media/
    Parallel (max 5 concurrent), retry 3 lần

[Step 2 — 25%] AI_VISION
    Gemini Flash-8B xem từng ảnh:
      → "LIVING_ROOM: phòng khách rộng, ánh sáng tốt, quality=excellent"
    Gemini Flash-8B phân tích video clip:
      → Scene timeline: 0:15-0:45 BEDROOM, 0:45-1:20 BATHROOM...
      → Gắn cờ đoạn không dùng được (rung, tối)
    Cache analysis 30 ngày (cùng ảnh → không re-analyze)

[Step 3 — 40%] SCRIPT_GENERATION
    Gemini Flash gửi prompt chứa:
      ① Kết quả vision analysis
      ② projectInfo (tên, giá, tiện ích...)
      ③ Template structure (số scene, mục đích từng scene)
      ④ Target platform (TikTok hook, Reels format...)
    AI trả về JSON:
      scenes: [{ narration, caption, assignedAssetIds, textOverlays }]
      suggestedCaption, suggestedHashtags
    Save script to DB (Script table)

[Step 4 — 55%] AUDIO_GENERATION
    Với mỗi scene.narration:
      → Check TTS cache (Redis): cùng text+voice → reuse audio từ R2
      → Nếu chưa có: FPT.AI TTS → MP3 + word timestamps
      → Cache TTS result 7 ngày
    Audio duration = timeline duration của scene (audio-first)

[Step 5 — 65%] CLIP_EXTRACTION (chỉ nếu có video input)
    FFmpeg cắt đoạn AI đã chỉ định từ video gốc
    Remove original audio (thay bằng TTS)
    Deshake nếu camera rung

[Step 6 — 80%] RENDERING
    Build timeline dựa trên audio duration (không phải ngược lại)
    FFmpeg render (default):
      Layer 1: ảnh/video clips (theo thứ tự AI gán)
      Layer 2: TTS audio
      Layer 3: Text overlays (giá, số phòng, tên dự án)
      Layer 4: Caption (word highlight theo timestamps)
      Layer 5: Portrait avatar (góc dưới)
    Remotion render (premium templates với animation phức tạp)

[Step 7 — 92%] UPLOAD
    Upload MP4 → R2: videos/{userId}/{jobId}/output.mp4
    Extract thumbnail (frame giây thứ 2) → R2
    Verify CDN URL accessible

[Step 8 — 100%] COMPLETE
    Update VideoJob: status=COMPLETED, outputUrl, thumbnailUrl, duration
    Update Script: liên kết với VideoJob
    Redis pub/sub → apps/web → Notification + Email

━━━━━━━━━━━━━━━━━ User nhận kết quả ━━━━━━━━━━━━━━━━━

[USER] Dashboard hiển thị:
    ✅ Video preview + download
    ✅ Script đã gen (narration từng scene)
    ✅ Caption + hashtag để copy post lên mạng xã hội
```

---

## 5. Error Handling & Token Refund

```
Nếu video-processor lỗi sau 3 lần retry (BullMQ):

  video-processor:
    → Update VideoJob: status=FAILED, errorMessage, failedStep
    → Redis pub/sub: { jobId, status: FAILED, userMessage, refundTokens }

  apps/web nhận event:
    → tokenService.refundTokens(userId, tokenCost)    ← DB transaction
    → Create Transaction (TOKEN_REFUND)
    → Create Notification: "Video lỗi — token đã hoàn lại"
    → Resend email notification

  User: nhận 100% token hoàn lại tự động
```

---

## 6. Authentication Flow

```
POST /api/auth/sign-in → Better Auth handler
    → Validate + bcrypt.compare → create session (DB)
    → Set-Cookie: session token (httpOnly, secure)

Next.js middleware.ts:
    → Verify session mọi route /dashboard/* và /api/* (trừ /api/auth/*)
    → Attach session to request

Route Handler:
    → const session = await auth.api.getSession({ headers: req.headers })
```

---

## 7. Payment & Token Flow

```
PayOS (Primary — Vietnam):
  POST /api/billing/payos/create-order → QR URL
  User quét → webhook → verify HMAC → DB transaction → credit tokens

Stripe (Secondary — International):
  POST /api/billing/stripe/create-intent → client_secret
  Stripe Elements → payment → webhook → verify sig → credit tokens
```

---

## 8. Media Upload Flow

```
Ảnh < 10MB:
  multipart/form-data → POST /api/projects/{id}/media
  → Validate MIME → Upload stream → R2 → Create MediaAsset

Video/File lớn > 10MB:
  GET /api/media/presigned-url → R2 presigned URL
  Frontend PUT trực tiếp lên R2 (bypass Next.js)
  POST /api/media/confirm-upload → Create MediaAsset
```

---

## 9. Deployment Map

```
┌────────────────────────────────────────────────────────────────┐
│                      PRODUCTION                                │
│                                                                │
│  Cloudflare (DNS + CDN + DDoS + R2 Storage)                    │
│       │                                                        │
│  ┌────▼────────────────────────────────┐                       │
│  │  Vercel                             │                       │
│  │  - apps/web (Next.js full-stack)    │                       │
│  │  - apps/admin (Static SPA)          │                       │
│  └─────────────────────────────────────┘                       │
│                                                                │
│  ┌─────────────────────────────────────┐                       │
│  │  Railway                            │                       │
│  │  - video-processor (2-5 instances)  │                       │
│  └─────────────────────────────────────┘                       │
│                                                                │
│  Managed Services:                                             │
│  ├─ Neon          — PostgreSQL (serverless)                    │
│  ├─ Upstash       — Redis (BullMQ + Cache)                     │
│  ├─ Cloudflare R2 — Media + Video storage                      │
│  ├─ FPT.AI        — Vietnamese TTS (primary)                   │
│  ├─ ElevenLabs    — TTS premium (upsell)                       │
│  ├─ Google Gemini — AI Vision + Script gen                     │
│  ├─ PayOS         — Vietnamese payment                         │
│  ├─ Stripe        — International card                         │
│  ├─ Resend        — Transactional email                        │
│  └─ Sentry        — Error tracking                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 10. Security

```
Cloudflare Edge: DDoS, Bot, WAF
Next.js Middleware: Session verify + Rate limit
Route Handler: Auth check + Ownership check + Zod validation
Data: bcrypt passwords, httpOnly cookies, no card data stored
Webhook: signature verify trước khi process
Infrastructure: DB private, secrets in env vars
```

---

## 11. Scalability

| Stage      | Users  | Action                                 |
| ---------- | ------ | -------------------------------------- |
| MVP        | 0-500  | Vercel Hobby + Railway Starter ($5/mo) |
| Growth     | 500-5K | Vercel Pro + 3x video workers          |
| Scale      | 5K-50K | 10x workers + DB read replicas         |
| Enterprise | 50K+   | Multi-region                           |
