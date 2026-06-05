# Technology Stack — AI Realty Video SaaS

> Stack được lựa chọn tối ưu cho dự án SaaS Việt Nam: team nhỏ, ship nhanh, dễ scale.
> **Mọi lựa chọn đều có lý do rõ ràng.** Không được tự ý đổi stack mà không có ADR.

## 🏛️ Kiến Trúc Tổng Quan

```
 apps/web (Next.js 14)          services/video-processor (Node.js)
 ┌──────────────────────┐       ┌───────────────────────────────┐
 │ Frontend (App Router)│       │ BullMQ Worker                 │
 │ API Routes (/api/*)  │──────▶│ Remotion Renderer             │
 │  - Auth              │ Queue │ ElevenLabs TTS                │
 │  - Billing           │◀──────│ Upload to R2                  │
 │  - Projects/Media    │  DB   └───────────────────────────────┘
 │  - Scripts/Videos    │
 └──────────────────────┘

 apps/admin (React + Vite SPA)  ← Internal admin dashboard
```

> **Quyết định**: Dùng **Next.js Full-Stack** (App Router + Route Handlers) thay vì tách
> backend riêng. Giảm complexity, ít service hơn phải maintain, deploy 1 lần lên Vercel.
> Video-processor **vẫn tách riêng** vì BullMQ worker không chạy được trên serverless.

---

## 🗂️ Quick Reference — Approved Stack

| Layer                  | **Lựa chọn**                   | Lý do ngắn                                                                  |
| ---------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| **Monorepo Tool**      | **Turborepo**                  | Caching build thông minh, do Vercel làm, tích hợp Next.js hoàn hảo          |
| **Package Manager**    | **pnpm**                       | Nhanh hơn npm/yarn, tiết kiệm disk, workspace tốt nhất                      |
| **Language**           | **TypeScript** (strict mode)   | Type-safe toàn bộ monorepo, chia sẻ types giữa services                     |
| **Frontend — Web App** | **Next.js 14** (App Router)    | SEO tốt, SSR/SSG, Auth middleware, Vercel deployment miễn phí               |
| **Frontend — Admin**   | **React + Vite** (SPA)         | Admin không cần SEO, build đơn giản, phát triển nhanh                       |
| **UI Components**      | **shadcn/ui** + Radix UI       | Không lock-in, copy code vào project, style tự do                           |
| **Styling**            | **Tailwind CSS v3**            | Utility-first, không cần đặt tên class, team nhỏ dùng tốt                   |
| **State Management**   | **Zustand**                    | Đơn giản, boilerplate ít, đủ cho SaaS này                                   |
| **Data Fetching**      | **TanStack Query v5**          | Cache server state tự động, retry, loading states                           |
| **Form**               | **React Hook Form** + Zod      | Validation nhất quán, performance tốt                                       |
| **Backend Framework**  | **Next.js 14 Route Handlers**  | Full-stack trong 1 app, ít service hơn, deploy Vercel cùng lúc với frontend |
| **Validation**         | **Zod**                        | Schema validate + type inference, dùng chung với frontend                   |
| **Database**           | **PostgreSQL 16**              | ACID, JSONB, FTS, production-proven                                         |
| **ORM**                | **Prisma**                     | DX tốt nhất cho TypeScript, migration an toàn, Prisma Studio                |
| **Cache**              | **Redis** (ioredis)            | Sub-ms latency, BullMQ cần Redis, rate limiting                             |
| **Queue**              | **BullMQ**                     | Redis-backed, retry/backoff tự động, dashboard có sẵn                       |
| **Auth**               | **Better Auth**                | Thư viện mới nhất 2024, TypeScript-first, thay thế NextAuth v5              |
| **File Storage**       | **Cloudflare R2**              | Không tốn phí egress bandwidth (S3 charge egress), CDN tích hợp             |
| **CDN**                | **Cloudflare**                 | Miễn phí cho R2, DDoS protection, toàn cầu                                  |
| **Email**              | **Resend**                     | Developer-friendly, React Email templates, rẻ                               |
| **AI — Script Gen**    | **Google Gemini 1.5 Pro**      | Rẻ nhất trong cùng chất lượng, hiểu tiếng Việt tốt, context window lớn      |
| **AI — TTS**           | **ElevenLabs**                 | Giọng đọc tự nhiên nhất, hỗ trợ tiếng Việt, API đơn giản                    |
| **Video Rendering**    | **Remotion v4**                | Templates bằng React/TypeScript, animation mượt, output MP4 chất lượng      |
| **Video Encode**       | **FFmpeg** (via child_process) | Stitch scenes + mux audio sau khi Remotion render                           |
| **Payment — VN**       | **PayOS** (primary)            | Momo/VNPay/ZaloPay/banking — 90% user VN dùng                               |
| **Payment — Quốc tế**  | **Stripe** (secondary)         | Card quốc tế, subscription management                                       |
| **Search**             | **PostgreSQL FTS**             | Đủ dùng cho MVP, không cần Elasticsearch                                    |
| **Error Tracking**     | **Sentry**                     | Catch lỗi production tự động, stack trace rõ ràng                           |
| **Monitoring**         | **Grafana + Prometheus**       | Metrics infrastructure, video queue depth                                   |
| **Logging**            | **Pino**                       | Structured JSON logs, nhanh nhất trong Node.js                              |
| **Testing**            | **Vitest** + Testing Library   | Tương thích Vite, nhanh hơn Jest, API giống nhau                            |
| **E2E Testing**        | **Playwright**                 | Cross-browser, reliable hơn Cypress                                         |
| **CI/CD**              | **GitHub Actions**             | Tích hợp tốt, free cho repo private với limits                              |
| **Container**          | **Docker** + Docker Compose    | Local dev: PG + Redis + MinIO                                               |
| **Deploy — Web**       | **Vercel**                     | Next.js tối ưu, preview URLs, Edge Network                                  |
| **Deploy — Services**  | **Railway**                    | Đơn giản nhất, auto-deploy từ GitHub, giá hợp lý                            |
| **API Docs**           | **Scalar** + OpenAPI 3.0       | UI đẹp hơn Swagger UI, tích hợp Hono.js tốt                                 |

---

## 💡 Lý Do Các Lựa Chọn Quan Trọng

### Hono.js thay vì Express.js

```
Express.js: ~60k req/s, không TypeScript native, middleware cũ
Hono.js:   ~200k req/s, TypeScript-first, nhẹ hơn, Web Standard APIs
```

- API giống Express → team quen nhanh
- Chạy được trên Edge (Cloudflare Workers) nếu cần sau này
- Zod validator middleware có sẵn

### Turborepo thay vì không dùng gì

```bash
# Build chỉ những gì thay đổi, cache local + remote
turbo run build --filter=@realty/main-api
```

- Khi sửa `services/main-api`, không rebuild `apps/web`
- Remote caching trên Vercel → CI 5x nhanh hơn

### PayOS là primary (không phải Stripe)

- 80-90% user Việt Nam dùng Momo/VNPay hơn thẻ quốc tế
- Fee PayOS thấp hơn Stripe (1.5% vs 2.9% + $0.3)
- QR code checkout → UX tốt hơn cho thị trường VN

### Better Auth thay vì NextAuth v5

- NextAuth v5 vẫn đang beta, breaking changes liên tục
- Better Auth: stable, TypeScript-native, hỗ trợ nhiều adapter hơn
- Session management linh hoạt cho cả Next.js và Hono.js API

### Cloudflare R2 thay vì AWS S3

```
AWS S3:        $0.09/GB egress bandwidth
Cloudflare R2: $0 egress bandwidth (video downloads sẽ rất lớn)
```

- Với video SaaS, egress bandwidth sẽ RẤT lớn → R2 tiết kiệm đáng kể

---

## 🖥️ Frontend — `apps/web` (Next.js 14)

```bash
pnpm create next-app@latest apps/web \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Thêm shadcn/ui
pnpx shadcn-ui@latest init
```

**Dependencies chính:**

```json
{
  "next": "^14.2",
  "better-auth": "^1.0",
  "@tanstack/react-query": "^5",
  "zustand": "^4",
  "react-hook-form": "^7",
  "zod": "^3",
  "react-dropzone": "^14",
  "@radix-ui/react-*": "latest"
}
```

---

## 🔧 Backend — `apps/web` (Next.js 14 Route Handlers)

> Backend API được đặt trong cùng Next.js app, dưới thư mục `src/app/api/`.
> **Không** tách thành service riêng — giảm complexity cho team nhỏ.

**Cấu trúc API Routes:**

```
src/app/api/
├── auth/
│   └── [...all]/route.ts          # Better Auth handler (catch-all)
├── users/
│   └── me/route.ts                # GET, PATCH profile
├── billing/
│   ├── packages/route.ts          # GET danh sách gói
│   ├── wallet/route.ts            # GET số dư token
│   ├── payos/
│   │   ├── create-order/route.ts
│   │   └── webhook/route.ts
│   └── stripe/
│       ├── create-intent/route.ts
│       └── webhook/route.ts
├── projects/
│   ├── route.ts                   # GET list, POST create
│   └── [id]/
│       ├── route.ts               # GET, PATCH, DELETE
│       └── media/route.ts         # GET, POST media
├── scripts/
│   ├── route.ts
│   └── generate/route.ts          # POST: AI gen script
├── video-jobs/
│   ├── route.ts                   # GET list, POST create
│   └── [id]/
│       ├── route.ts
│       └── status/route.ts        # GET progress (polling)
├── templates/route.ts
├── notifications/route.ts
└── admin/                         # Require ADMIN role middleware
    ├── users/route.ts
    ├── metrics/route.ts
    └── video-jobs/route.ts
```

**Dependencies bổ sung vào `apps/web`:**

```json
{
  "next": "^14.2",
  "better-auth": "^1.0",
  "@prisma/client": "^5",
  "prisma": "^5",
  "ioredis": "^5",
  "bullmq": "^5",
  "zod": "^3",
  "pino": "^9",
  "@aws-sdk/client-s3": "^3",
  "@google/generative-ai": "^0.15",
  "@payos/node": "^1",
  "stripe": "^16",
  "resend": "^4",
  "@tanstack/react-query": "^5",
  "zustand": "^4",
  "react-hook-form": "^7",
  "react-dropzone": "^14"
}
```

**Route Handler pattern (Next.js App Router):**

```ts
// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { projectService } from '@/services/project.service';
import { createProjectSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await projectService.findByUserId(session.user.id);
  return NextResponse.json({ success: true, data: projects });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await projectService.create(session.user.id, parsed.data);
  return NextResponse.json({ success: true, data: project }, { status: 201 });
}
```

**Lưu ý quan trọng:**

- Prisma client khởi tạo 1 lần duy nhất trong `src/lib/db.ts` (singleton pattern)
- BullMQ **chỉ publish** từ Next.js API → video-processor **consume**
- Webhook routes (Stripe, PayOS) dùng `export const runtime = 'nodejs'` (không edge)
- File upload dùng presigned URL trực tiếp lên R2 (không buffer trong Next.js)

---

## 🎬 Video Processor — `services/video-processor` (Node.js)

```json
{
  "bullmq": "^5",
  "ioredis": "^5",
  "@remotion/bundler": "^4",
  "@remotion/renderer": "^4",
  "remotion": "^4",
  "@aws-sdk/client-s3": "^3",
  "@google/generative-ai": "^0.15",
  "pino": "^9"
}
```

---

## 🗄️ Database — PostgreSQL + Prisma

**Prisma Schema conventions:**

- Primary keys: `@id @default(cuid())` — distributed-safe
- Table names: `@@map("snake_case_plural")`
- Timestamps: `createdAt`, `updatedAt` trên mọi model
- Soft delete: `deletedAt DateTime?`
- JSON data: `Json` type cho flexible config (scene data, template config)

```bash
# Workflow
pnpm --filter @realty/main-api exec prisma migrate dev --name <tên_migration>
pnpm --filter @realty/main-api exec prisma migrate deploy   # production
pnpm --filter @realty/main-api exec prisma studio           # GUI
```

---

## ⚡ Cache — Redis Key Naming Convention

```
realty:v1:user:{userId}:profile          TTL: 1h
realty:v1:user:{userId}:token_balance    TTL: 5m   ← ngắn vì billing critical
realty:v1:template:{id}                  TTL: 24h
realty:v1:rate_limit:login:{ip}          TTL: 15m
realty:v1:job:{jobId}:progress           TTL: 2h
realty:v1:session:{sessionId}            TTL: 30d
```

---

## 📨 Queue — BullMQ Naming Convention

```
realty.video.create          ← main job (video generation)
realty.video.notify          ← notify user khi xong
realty.email.send            ← email transactional
realty.ai.script.generate    ← async AI generation
```

---

## 🏗️ Monorepo Setup (Turborepo + pnpm)

```
# root/package.json
{
  "name": "ai-realty-video-saas",
  "private": true,
  "packageManager": "pnpm@9.x",
  "scripts": {
    "dev":   "turbo run dev",
    "build": "turbo run build",
    "test":  "turbo run test",
    "lint":  "turbo run lint"
  }
}

# turbo.json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "test":  { "dependsOn": ["build"] }
  }
}
```

---

## ✅ Technology Decision Process

| Tiêu chí        | Câu hỏi                                     |
| --------------- | ------------------------------------------- |
| **Necessity**   | Approved alternative đã giải quyết chưa?    |
| **Maintenance** | Stars > 1k? Commit gần nhất < 6 tháng?      |
| **TypeScript**  | Native TS types?                            |
| **License**     | MIT/Apache? (Không dùng GPL cho commercial) |
| **Security**    | `pnpm audit` — zero high/critical           |
| **Vietnam fit** | Có phù hợp thị trường và chi phí VN không?  |

### ADR Template (khi đề xuất thêm library)

```markdown
## Technology Decision: [Tên Library]

**Vấn đề**: Giải quyết vấn đề gì?
**Đã xem xét**: Trong approved stack có gì tương tự?
**Lý do chọn**: Tại sao cái này tốt hơn cho use case này?
**Rủi ro**: Downside và migration cost nếu cần đổi
**Quyết định**: ✅ Adopt / ❌ Reject
```
