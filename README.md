# 🏡 AI Realty Video SaaS

Nền tảng SaaS hỗ trợ nhân viên sale bất động sản **tự động sản xuất video ngắn chuyên nghiệp** để đăng lên TikTok, Facebook Reels, YouTube Shorts.

---

## 📖 Documentation

| Document                                               | Description                            |
| ------------------------------------------------------ | -------------------------------------- |
| [Business Requirements](docs/business-requirements.md) | User flows, feature checklist, roadmap |
| [Database Design](docs/database-design.md)             | PostgreSQL schema (Prisma) + ERD       |
| [Architecture](docs/architecture.md)                   | System design, video pipeline, infra   |
| [API Contracts](docs/api-contracts.md)                 | Inter-service communication specs      |
| [.claude/CLAUDE.md](.claude/CLAUDE.md)                 | AI agent configuration & guidelines    |

---

## 🗂️ Project Structure

```
ai-realty-video-saas/
├── services/
│   ├── main-api/          # Core business API (Express + TypeScript)
│   └── video-processor/   # Video generation worker (Remotion + BullMQ)
├── apps/
│   ├── web/               # User facing app (Next.js 14)
│   └── admin/             # Admin dashboard (React + Vite)
├── packages/
│   └── shared-types/      # Shared TypeScript types
└── docs/                  # Project documentation
```

---

## ⚡ Tech Stack

| Layer           | Technology                        |
| --------------- | --------------------------------- |
| Frontend        | Next.js 14 + Tailwind + shadcn/ui |
| Admin           | React + Vite                      |
| Backend         | Express.js + TypeScript + Prisma  |
| Database        | PostgreSQL                        |
| Cache & Queue   | Redis + BullMQ                    |
| Video Rendering | Remotion                          |
| TTS             | ElevenLabs                        |
| AI Script Gen   | Google Gemini 1.5 Pro             |
| Storage         | Cloudflare R2                     |
| Payment         | Stripe + PayOS (Vietnam)          |
| Email           | Resend                            |

---

## 🚀 Quick Start (Development)

### Prerequisites

- Node.js 20+
- Docker + Docker Compose (for PostgreSQL + Redis)
- pnpm 9+

### 1. Clone & Install

```bash
git clone https://github.com/your-org/ai-realty-video-saas.git
cd ai-realty-video-saas
pnpm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d
# Starts: PostgreSQL (5432), Redis (6379), MinIO/R2-local (9000)
```

### 3. Setup main-api

```bash
cd services/main-api
cp .env.example .env
# Fill in .env values
npx prisma migrate dev
npx prisma db seed
npm run dev   # Port 3001
```

### 4. Setup video-processor

```bash
cd services/video-processor
cp .env.example .env
# Fill in .env values
npm run dev   # Starts BullMQ workers
```

### 5. Setup web app

```bash
cd apps/web
cp .env.example .env.local
npm run dev   # Port 3000
```

---

## 🔑 Environment Variables

See `.env.example` in each service directory. Key variables:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_MEDIA=...
R2_BUCKET_VIDEOS=...
CDN_BASE_URL=...
RESEND_API_KEY=...
```

---

## 🏗️ Development Workflow

Follow the AI-assisted workflow defined in [.claude/CLAUDE.md](.claude/CLAUDE.md):

```
/spec → /plan → /build → /test → /review → Ship
```

---

## 📊 Feature Status

See [Business Requirements → Feature Checklist](docs/business-requirements.md#3-feature-checklist--end-to-end) for detailed progress tracking.

### Phase 1 — MVP (In Progress)

- [ ] Auth (email/password + Google OAuth)
- [ ] Token billing (Stripe + PayOS)
- [ ] Media management
- [ ] AI script generation
- [ ] Video generation (2 templates)
- [ ] Admin dashboard

---

## 📄 License

Private — All rights reserved.
