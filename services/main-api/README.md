# Backend API Server — `services/main-api`

This service is the primary API Gateway and Orchestrator for the AI Realty Video SaaS platform. It is built using the **NestJS** framework and **TypeScript**, interacting directly with the shared PostgreSQL database and dispatching asynchronous tasks to background workers via Redis queues.

---

## 1. Core Responsibilities

- **API Gateway:** Serves REST API endpoints for the Next.js web client (`apps/web`).
- **Authentication & Guards:** Enforces secure routing and extracts user context (`req.user.id`).
- **Project & Media Management:** Manages metadata for properties, handles standard media uploads (<10MB), generates pre-signed upload URLs for large files (>10MB), and records asset links.
- **Phase 1 Orchestration:** Initiates kịch bản nháp generation by enqueuing jobs to the `realty.script.generate` queue.
- **Phase 2 Orchestration:** Validates user token wallets, debits template costs in atomic database transactions, and enqueues video render jobs to the `realty.video.render` queue.
- **Billing Webhooks:** Processes PayOS and Stripe payment webhooks with HMAC/signature verification, crediting tokens in database transactions.

---

## 2. Directory & Module Structure

The codebase is organized into modular NestJS domains:

```
services/main-api/src/
├── main.ts                    # Application bootstrap, CORS config, global prefix
├── app.module.ts              # Root entry importing submodules and ConfigModule
│
├── auth/                      # Session Guards & authentication logic
│   ├── auth.guard.ts          # Resolves user session or default test user
│   └── auth.module.ts
│
├── prisma/                    # Shared Prisma client integration
│   ├── prisma.service.ts      # Instantiates global @realty-video/database client
│   └── prisma.module.ts
│
├── project/                   # Property CRUD, standard uploads, and presigned URLs
│   ├── project.controller.ts
│   ├── project.service.ts
│   └── project.module.ts
│
├── script-draft/              # Phase 1: Script draft generation & polling
│   ├── script-draft.controller.ts
│   ├── script-draft.service.ts
│   └── script-draft.module.ts
│
├── video-job/                 # Phase 2: Video render orchestration & token wallet debit
│   ├── video-job.controller.ts
│   ├── video-job.service.ts
│   └── video-job.module.ts
│
└── billing/                   # Webhook endpoint receivers for PayOS and Stripe
    ├── billing.controller.ts
    ├── billing.service.ts
    └── billing.module.ts
```

---

## 3. Queue Integrations (BullMQ)

The API enqueues jobs to two main BullMQ queues running on Redis:

| Queue Name                   | Job Name          | Data Payload                                                     | Handler Destination          |
| :--------------------------- | :---------------- | :--------------------------------------------------------------- | :--------------------------- |
| **`realty.script.generate`** | `generate-script` | `{ draftId, userId, projectId, templateId, mediaAssetIds, ... }` | `video-processor` (Worker 1) |
| **`realty.video.render`**    | `render-video`    | `{ jobId, userId, draftId, ttsProvider, ttsVoiceId, ... }`       | `video-processor` (Worker 2) |

---

## 4. REST Endpoint Index

### Projects & Media

- `POST /api/projects` $\rightarrow$ Create property project
- `GET /api/projects` $\rightarrow$ List user projects
- `GET/PUT/DELETE /api/projects/:id` $\rightarrow$ Project details/edit/soft-delete
- `POST /api/projects/:id/media` $\rightarrow$ Upload standard images (<10MB) directly to R2
- `POST /api/media/presigned-url` $\rightarrow$ Generate presigned URL for direct R2 upload (>10MB)
- `POST /api/media/confirm-upload` $\rightarrow$ Save media metadata in DB after direct upload

### Script Drafts (Phase 1)

- `POST /api/script-drafts` $\rightarrow$ Enqueue AI script generation
- `GET /api/script-drafts/:id` $\rightarrow$ Poll generation status, progress, and scenes
- `PUT /api/script-drafts/:id` $\rightarrow$ Edit scene narrations or swap assets

### Video Production (Phase 2)

- `POST /api/video-jobs` $\rightarrow$ Verify wallet, deduct tokens, and enqueue FFmpeg render job
- `GET /api/video-jobs/:id/status` $\rightarrow$ Poll render progress steps and retrieve final output URL

### Billing Webhooks

- `POST /api/billing/payos/webhook` $\rightarrow$ Receives PayOS webhook (verifies HMAC)
- `POST /api/billing/stripe/webhook` $\rightarrow$ Receives Stripe events (verifies signature)

---

## 5. Development Commands

Run these commands inside the `services/main-api` workspace:

```bash
# Watch mode for development
pnpm run dev

# Compile check
pnpm run build

# Run unit tests
pnpm run test

# Run E2E tests
pnpm run test:e2e
```
