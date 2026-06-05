# Project Structure — AI Realty Video SaaS Monorepo

> **Kiến trúc:** Next.js Full-Stack (frontend + API) + video-processor tự chủ hoàn toàn.
> `apps/web` chỉ publish job thô. `services/video-processor` tự xử lý AI + script + render.

---

## 📁 Monorepo Folder Layout

```
ai-realty-video-saas/
├── .claude/
│   ├── agents/
│   ├── commands/
│   ├── rules/
│   ├── references/
│   ├── settings.json
│   └── CLAUDE.md
│
├── apps/
│   ├── web/                          # 🌐 Next.js 14 — FULL-STACK
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Source of truth DB schema
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (marketing)/      # Landing, pricing (SSG)
│   │   │   │   ├── (auth)/           # Login, register, reset password
│   │   │   │   ├── (dashboard)/      # Protected user area
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── projects/     # Quản lý dự án BĐS
│   │   │   │   │   ├── media/        # Upload ảnh/video
│   │   │   │   │   ├── videos/       # Danh sách video đã tạo
│   │   │   │   │   ├── billing/      # Mua token, lịch sử
│   │   │   │   │   └── profile/      # Cài đặt tài khoản
│   │   │   │   │
│   │   │   │   └── api/              # 🔧 Backend API Routes
│   │   │   │       ├── auth/[...all]/route.ts      # Better Auth
│   │   │   │       ├── users/me/route.ts
│   │   │   │       ├── billing/
│   │   │   │       │   ├── packages/route.ts
│   │   │   │       │   ├── wallet/route.ts
│   │   │   │       │   ├── payos/create-order/route.ts
│   │   │   │       │   ├── payos/webhook/route.ts
│   │   │   │       │   ├── stripe/create-intent/route.ts
│   │   │   │       │   └── stripe/webhook/route.ts
│   │   │   │       ├── projects/
│   │   │   │       │   ├── route.ts                # GET list, POST create
│   │   │   │       │   └── [id]/
│   │   │   │       │       ├── route.ts
│   │   │   │       │       └── media/route.ts      # Upload media vào project
│   │   │   │       ├── media/
│   │   │   │       │   ├── presigned-url/route.ts  # Upload lớn trực tiếp R2
│   │   │   │       │   └── confirm-upload/route.ts
│   │   │   │       ├── video-jobs/
│   │   │   │       │   ├── route.ts                # POST: tạo job với input thô
│   │   │   │       │   └── [id]/
│   │   │   │       │       ├── route.ts
│   │   │   │       │       └── status/route.ts     # GET progress (polling)
│   │   │   │       ├── scripts/
│   │   │   │       │   └── [id]/route.ts           # GET: xem script AI đã gen
│   │   │   │       ├── templates/route.ts           # GET: danh sách template
│   │   │   │       ├── notifications/route.ts
│   │   │   │       └── admin/
│   │   │   │           ├── users/route.ts
│   │   │   │           ├── video-jobs/route.ts
│   │   │   │           ├── transactions/route.ts
│   │   │   │           └── metrics/route.ts
│   │   │   │
│   │   │   ├── services/             # Business logic (gọi từ API routes)
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── token.service.ts  # Deduct/refund tokens (ACID)
│   │   │   │   ├── media.service.ts  # Upload/delete R2
│   │   │   │   ├── video-job.service.ts  # Create job, publish BullMQ
│   │   │   │   └── billing.service.ts
│   │   │   │   # NOTE: KHÔNG có ai.service hoặc script.service ở đây
│   │   │   │   # AI + script gen nằm trong video-processor
│   │   │   │
│   │   │   ├── repositories/
│   │   │   │   ├── user.repository.ts
│   │   │   │   ├── project.repository.ts
│   │   │   │   ├── media.repository.ts
│   │   │   │   ├── video-job.repository.ts
│   │   │   │   ├── script.repository.ts      # Chỉ READ (script do processor tạo)
│   │   │   │   └── transaction.repository.ts
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── db.ts             # Prisma singleton
│   │   │   │   ├── redis.ts          # Redis (subscribe job progress)
│   │   │   │   ├── s3.ts             # R2 client (presigned URL upload)
│   │   │   │   ├── queue.ts          # BullMQ publisher (publish job)
│   │   │   │   ├── auth.ts           # Better Auth config
│   │   │   │   ├── logger.ts
│   │   │   │   └── validations.ts    # Zod schemas
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   └── middleware.ts     # Auth guard + rate limiting
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui
│   │   │   │   ├── layout/
│   │   │   │   ├── media/            # Upload zone, media grid
│   │   │   │   ├── video/            # Player, job progress, status
│   │   │   │   └── billing/
│   │   │   │
│   │   │   ├── hooks/
│   │   │   ├── stores/               # Zustand
│   │   │   └── types/
│   │   │
│   │   ├── public/
│   │   ├── .env.example
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── admin/                        # 🛠️ React + Vite SPA
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Users/
│       │   │   ├── Templates/
│       │   │   ├── VideoJobs/
│       │   │   └── Transactions/
│       │   ├── components/
│       │   └── lib/                  # API client → /api/admin/*
│       └── package.json
│
├── services/
│   └── video-processor/              # 🎬 AUTONOMOUS VIDEO GENERATION
│       ├── src/
│       │   ├── index.ts              # Entry: start BullMQ workers
│       │   │
│       │   ├── workers/
│       │   │   └── video.worker.ts   # Orchestrator: điều phối 8 bước pipeline
│       │   │
│       │   ├── processors/           # Từng bước của pipeline
│       │   │   ├── media-downloader.ts     # Bước 1: Download R2 → /tmp
│       │   │   ├── ai-vision.ts            # Bước 2: Gemini phân tích ảnh/video
│       │   │   ├── script-generator.ts     # Bước 3: Gemini viết script + gán ảnh
│       │   │   ├── tts.service.ts          # Bước 4: FPT.AI/ElevenLabs → MP3
│       │   │   ├── clip-extractor.ts       # Bước 5: FFmpeg cắt clip từ video
│       │   │   ├── timeline-builder.ts     # Build audio-first timeline
│       │   │   ├── ffmpeg-renderer.ts      # Bước 6a: FFmpeg render
│       │   │   ├── remotion-renderer.ts    # Bước 6b: Remotion render (premium)
│       │   │   └── uploader.ts             # Bước 7: Upload MP4 + thumbnail → R2
│       │   │
│       │   ├── templates/            # Remotion React components
│       │   │   ├── remotion-root.tsx
│       │   │   ├── template-tour/
│       │   │   │   ├── index.tsx
│       │   │   │   ├── SceneIntro.tsx    # Avatar + tên sale
│       │   │   │   ├── SceneTour.tsx     # Slideshow phòng
│       │   │   │   └── SceneCta.tsx      # Giá + hotline CTA
│       │   │   └── template-deal/
│       │   │       └── index.tsx
│       │   │
│       │   └── lib/
│       │       ├── db.ts             # Prisma (UPDATE + INSERT script kết quả)
│       │       ├── redis.ts          # BullMQ consumer + pub/sub progress
│       │       ├── s3.ts             # R2 download + upload
│       │       ├── gemini.ts         # Gemini Flash-8B (vision) + Flash (script)
│       │       ├── cache.ts          # TTS cache (7d) + vision cache (30d)
│       │       ├── ffmpeg.ts         # ffprobe helpers, frame extract
│       │       └── logger.ts         # Pino
│       │
│       ├── .env.example
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/
│   └── shared-types/                 # Shared TS interfaces
│       └── src/
│           ├── entities.ts           # GeneratedScene, TextOverlay, ...
│           └── enums.ts              # VideoJobStatus, JobStep, MediaTag
│
├── docs/
│   ├── architecture.md
│   ├── business-requirements.md
│   ├── database-design.md
│   ├── api-contracts.md
│   ├── video-sync-architecture.md
│   ├── ai-script-generation.md
│   ├── cost-optimization.md
│   └── dev-strategy-video-processor.md
│
├── turbo.json
├── pnpm-workspace.yaml
├── docker-compose.yml                # PG + Redis + MinIO (local R2)
├── package.json
└── README.md
```

---

## 📐 Phân Chia Trách Nhiệm Rõ Ràng

```
apps/web (Next.js) làm gì?
  ✅ User authentication & session
  ✅ Project & media management (CRUD)
  ✅ Token billing & payment
  ✅ Publish video job (input thô) → BullMQ
  ✅ Poll & display job status/progress
  ✅ Display completed video + generated script (READ ONLY)
  ❌ KHÔNG gọi Gemini
  ❌ KHÔNG generate script
  ❌ KHÔNG xử lý TTS
  ❌ KHÔNG biết gì về render logic

services/video-processor làm gì?
  ✅ Download media từ R2
  ✅ AI Vision: phân tích ảnh/video (Gemini Flash-8B)
  ✅ AI Script: viết kịch bản + gán media vào scene (Gemini Flash)
  ✅ TTS: tạo audio (FPT.AI / ElevenLabs)
  ✅ Clip extraction: cắt video clip với FFmpeg
  ✅ Render: FFmpeg hoặc Remotion
  ✅ Upload MP4 + thumbnail lên R2
  ✅ Lưu Script vào DB
  ✅ Notify qua Redis pub/sub
  ❌ KHÔNG handle HTTP requests
  ❌ KHÔNG handle auth
  ❌ KHÔNG handle payment
```

---

## 🔄 Inter-Service Communication

```
apps/web ──[BullMQ publish]──▶ video-processor (job thô)
video-processor ──[DB write]──▶ PostgreSQL (Script, VideoJob update)
video-processor ──[Redis pub]──▶ apps/web (progress events)
Shared: PostgreSQL, Redis, Cloudflare R2
```

---

## 📦 Environment Variables

### apps/web (.env.local)

```bash
DATABASE_URL=
REDIS_URL=
R2_ACCOUNT_ID=, R2_ACCESS_KEY_ID=, R2_SECRET_ACCESS_KEY=
R2_BUCKET_MEDIA=, CDN_BASE_URL=
BETTER_AUTH_SECRET=, GOOGLE_CLIENT_ID=, GOOGLE_CLIENT_SECRET=
PAYOS_CLIENT_ID=, PAYOS_API_KEY=, PAYOS_CHECKSUM_KEY=
STRIPE_SECRET_KEY=, STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

### services/video-processor (.env)

```bash
DATABASE_URL=
REDIS_URL=
R2_ACCOUNT_ID=, R2_ACCESS_KEY_ID=, R2_SECRET_ACCESS_KEY=
R2_BUCKET_MEDIA=, R2_BUCKET_VIDEOS=, CDN_BASE_URL=
GEMINI_API_KEY=
FPT_AI_API_KEY=
ELEVENLABS_API_KEY=          # Optional (premium users)
SENTRY_DSN=
MAX_CONCURRENT_RENDERS=2
TEMP_DIR=/tmp/video-processor
LOG_LEVEL=info
```
