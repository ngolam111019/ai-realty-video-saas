# Backend API Specification (NestJS — `services/main-api`)

**Version:** 3.1.0 (NestJS Native)  
**Status:** Approved Specification  
**Base Path:** `/api`  
**Default Port:** `3001`

This document serves as the definitive specification for the NestJS API server (`services/main-api`). It maps out all API endpoints, database interactions, BullMQ queue integrations, token debit logic, and billing integrations.

---

## Objectives, Scope, and Boundaries

### 🎯 Objectives

- **Replace the old basic Express skeleton** with a scalable NestJS-based API Gateway.
- **Ensure transactional safety** for token deductions and refunds using database ACID transactions.
- **Orchestrate media workflows** without blocking synchronous HTTP threads, offloading CPU-heavy tasks to the background worker (`services/video-processor`).
- **Provide clean and robust API contracts** for the Next.js web client (`apps/web`).

### 📦 Scope

- **User Authentication:** Enforce session validation via guards.
- **Project & Media CRUD:** Manage property details and handle standard file uploads (<10MB) as well as Cloudflare R2 presigned URLs (>10MB).
- **Phase 1 Orchestration:** Enqueue and monitor script-draft generation.
- **Phase 2 Orchestration:** Perform token balance validation, debiting, and enqueuing video render jobs.
- **Billing Integration:** Process and verify HMAC signatures for PayOS and Stripe payment webhooks.

### 🚫 Boundaries (Out of Scope)

- **Direct Video Rendering:** The API will NOT execute FFmpeg or Remotion processes directly.
- **Direct Voice Narration (TTS) generation:** The API will NOT query FPT.AI or ElevenLabs APIs directly for audio streams.
- **AI Media Analysis:** The API will NOT call Gemini Vision models directly.
  All of the above heavy operations are delegated to `services/video-processor` via BullMQ.

---

## 1. System Topology & Data Flow

The NestJS API handles all client requests, authentication, transactional token ledger operations, media meta-data tracking, and payment webhooks. It acts as an orchestrator, dispatching async tasks to the background worker (`services/video-processor`) via Redis queues.

```
                  ┌──────────────┐
                  │ apps/web     │
                  │ (Next.js)    │
                  └──────┬───────┘
                         │ REST API, Auth, SSE / Polling
                         ▼
             ┌───────────────────────┐
             │   services/main-api   │
             │   (NestJS API Gate)   │
             └────┬──────────────┬───┘
                  │              │
        Read/Write│              │Publish Jobs
                  ▼              ▼
           ┌──────────┐     ┌─────────┐
           │ Postgres │     │  Redis  │ ◄── Progress Events (Pub/Sub)
           │ (Prisma) │     │ (BullMQ)│
           └──────────┘     └────┬────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │services/video-processor│
                     │  (FFmpeg/Gemini Workers)│
                     └───────────────────────┘
```

---

## 2. Shared Database Mapping (Prisma)

The API will interact directly with the database using the global `@realty-video/database` Prisma client. Below are the core models and their fields utilized by the API modules:

- **`User`**: Account info, default voice preference, avatar URL, link to `TokenWallet`.
- **`TokenWallet`**: Stores token balance, tracks lifetime earned and spent tokens.
- **`Project`**: Property details (address, price, specs, USPs) and relations to `MediaAsset` and `ScriptDraft`.
- **`MediaAsset`**: Stores file metadata (storageKey, storageUrl, type: `IMAGE | VIDEO_CLIP | PORTRAIT`).
- **`VideoTemplate`**: Preset styles managed by Admin (contains `scenes` structure and `tokenCost`).
- **`ScriptDraft`**: Temporary script generation state (`PROCESSING | READY | FAILED`). Stores AI-generated scenes JSON.
- **`VideoJob`**: Renders queue state (`QUEUED | PROCESSING | COMPLETED | FAILED`). Stores output URLs and duration.
- **`Transaction`**: Tracks balance changes (`TOKEN_PURCHASE | TOKEN_DEDUCT | TOKEN_REFUND`).

---

## 3. Endpoints & REST Contracts

### 3.1. Authentication (Guarded Routes)

All endpoints except `/api/health`, and payment webhooks require a valid session cookie or Authorization header.

- **Middleware:** `AuthGuard` extracts session user ID and attaches it to the request context (`req.user.id`).

---

### 3.2. Project & Media Management

#### `POST /api/projects`

Creates a real estate property.

- **Request Body:**
  ```json
  {
    "name": "Biệt Thự Chateau Quận 7",
    "propertyType": "VILLA",
    "address": "Khu biệt thự Chateau, Phú Mỹ Hưng",
    "district": "Quận 7",
    "city": "Hồ Chí Minh",
    "area": 500,
    "bedrooms": 4,
    "bathrooms": 5,
    "salePrice": "120000000000",
    "amenities": ["Hồ bơi riêng", "Sân vườn"],
    "highlights": ["Sổ hồng", "Góc 2 mặt tiền"],
    "contactName": "Đức Lâm BĐS",
    "contactPhone": "0909123456"
  }
  ```
- **Response (201 Created):** Returns the full `Project` JSON object.

#### `POST /api/projects/:id/media`

Standard file upload for images/portraits (<10MB).

- **Request:** `multipart/form-data` with field name `file` and optional `isPortrait` flag.
- **Handler:** Uploads the stream to Cloudflare R2, creates a `MediaAsset` record, and returns the asset object.

#### `POST /api/media/presigned-url`

Generates a pre-signed URL for direct browser-to-R2 upload (required for large video files >10MB).

- **Request Body:**
  ```json
  {
    "projectId": "project-id-123",
    "fileName": "tour-phong-khach.mp4",
    "fileSize": 25480000,
    "mimeType": "video/mp4"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "uploadUrl": "https://r2-presigned-url-here...",
    "storageKey": "uploads/user-id/project-id-123/tour-phong-khach.mp4"
  }
  ```

#### `POST /api/media/confirm-upload`

Confirms direct upload completion to create the database metadata asset.

- **Request Body:**
  ```json
  {
    "projectId": "project-id-123",
    "storageKey": "uploads/user-id/project-id-123/tour-phong-khach.mp4",
    "fileName": "tour-phong-khach.mp4",
    "fileSize": 25480000,
    "mimeType": "video/mp4",
    "type": "VIDEO_CLIP"
  }
  ```
- **Response (201 Created):** Returns the created `MediaAsset` record.

---

### 3.3. Phase 1: Script Draft Generation

#### `POST /api/script-drafts`

Starts the async AI script generation process.

- **Request Body:**
  ```json
  {
    "projectId": "proj-123",
    "templateId": "tmpl-abc",
    "mediaAssetIds": ["asset-1", "asset-2", "asset-3"],
    "portraitAssetId": "asset-portrait",
    "targetPlatform": "tiktok"
  }
  ```
- **Handler:**
  1. Creates `ScriptDraft` in database: `status: PROCESSING`, `progress: 0`, `currentStep: QUEUED`.
  2. Publishes a job to the **`realty.script.generate`** queue with payload: `{ draftId: draft.id }`.
- **Response (202 Accepted):**
  ```json
  {
    "success": true,
    "data": {
      "draftId": "draft-id-abc",
      "status": "PROCESSING",
      "message": "AI đang phân tích ảnh và viết kịch bản..."
    }
  }
  ```

#### `GET /api/script-drafts/:id`

Polls current status of kịch bản nháp.

- **Response (If processing):**
  ```json
  {
    "success": true,
    "data": {
      "draftId": "draft-id-abc",
      "status": "PROCESSING",
      "progress": 50,
      "currentStep": "VISION_ANALYSIS"
    }
  }
  ```
- **Response (If ready):**
  ```json
  {
    "success": true,
    "data": {
      "draftId": "draft-id-abc",
      "status": "READY",
      "script": {
        "title": "Tour Biệt Thự Chateau Quận 7",
        "scenes": [
          {
            "id": "scene-1",
            "order": 1,
            "name": "Mặt tiền biệt thự",
            "narration": "Chào mừng quý khách đến với Chateau...",
            "caption": "Chateau Quận 7: Tinh hoa hội tụ",
            "assignedAssets": [{ "assetId": "asset-1", "type": "IMAGE" }],
            "textOverlays": [{ "text": "Chateau Quận 7", "position": "top-left", "style": "badge" }]
          }
        ]
      }
    }
  }
  ```

#### `PUT /api/script-drafts/:id`

User edits the generated kịch bản nháp before rendering.

- **Request Body:**
  ```json
  {
    "scenes": [
      {
        "id": "scene-1",
        "narration": "Lời thoại mới đã được thay đổi...",
        "caption": "Mặt tiền chateau sang xịn mịn",
        "assignedAssetIds": ["asset-2"]
      }
    ]
  }
  ```
- **Response (200 OK):** `{ "success": true, "updatedAt": "2026-06-06T..." }`

---

### 3.4. Phase 2: Video Production

#### `POST /api/video-jobs`

Triggers the rendering process.

- **Request Body:**
  ```json
  {
    "scriptDraftId": "draft-id-abc",
    "ttsProvider": "fptai",
    "ttsVoiceId": "lannhi",
    "renderEngine": "ffmpeg"
  }
  ```
- **ACID Transaction Handler:**
  1. Finds the `ScriptDraft` and its associated `VideoTemplate`. Retrieve the `tokenCost` of the template (e.g., 2 tokens).
  2. In a database transaction:
     - Check if the user's `TokenWallet` balance $\ge$ template `tokenCost`. If not, abort with `402 Payment Required`.
     - Deduct `tokenCost` from `TokenWallet.balance`.
     - Create a `Transaction` of type `TOKEN_DEDUCT` mapping the token flow.
     - Create a `VideoJob` record with status `QUEUED`, progress `0`, linking to `scriptDraftId`.
  3. Publishes a job to the **`realty.video.render`** queue with payload: `{ jobId: job.id }`.
- **Response (202 Accepted):**
  ```json
  {
    "success": true,
    "data": {
      "jobId": "job-xyz",
      "status": "QUEUED",
      "tokenDeducted": 2,
      "message": "Hệ thống đang tiến hành dựng video..."
    }
  }
  ```

#### `GET /api/video-jobs/:id/status`

Polls rendering progress.

- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "jobId": "job-xyz",
      "status": "PROCESSING",
      "progress": 70,
      "currentStep": "RENDERING",
      "outputUrl": null
    }
  }
  ```

---

## 4. Payment Webhooks (Billing Integration)

The payment webhooks must verify payload integrity (HMAC signatures) to prevent fraud.

### 4.1. PayOS Webhook (`POST /api/billing/payos/webhook`)

- **Headers:** Check HMAC signature against webhook secret.
- **Handler:**
  1. Parses the order ID and transaction details.
  2. Inside a database transaction:
     - Check if the `Transaction` is already processed (Idempotency check).
     - Update the `Transaction` status to `COMPLETED`.
     - Update the user's `TokenWallet` balance, incrementing by package tokens.
     - Create notification for the user.
- **Response (200 OK):** `{ "success": true }`

### 4.2. Stripe Webhook (`POST /api/billing/stripe/webhook`)

- **Headers:** Verify signature using `stripe.webhooks.constructEvent`.
- **Handler:** Similar transactional flow as PayOS upon receiving `payment_intent.succeeded` event.

---

## 5. Directory & Module Architecture

The NestJS backend application (`services/main-api`) must implement the following module separation to ensure clean code ownership:

```
services/main-api/src/
│
├── main.ts                    # Server bootstrap, global configuration (CORS, prefix)
├── app.module.ts              # Root entry importing submodules & ConfigModule
│
├── prisma/                    # Shared Prisma Client integration
│   ├── prisma.module.ts       # Declares PrismaService as a global module
│   └── prisma.service.ts      # Connects directly to @realty-video/database client
│
├── script-draft/              # Phase 1: Script draft logic
│   ├── script-draft.module.ts
│   ├── script-draft.controller.ts
│   └── script-draft.service.ts
│
├── video-job/                 # Phase 2: Video rendering logic & token deductions
│   ├── video-job.module.ts
│   ├── video-job.controller.ts
│   └── video-job.service.ts
│
├── project/                   # Project CRUD & R2 Media Assets
│   ├── project.module.ts
│   ├── project.controller.ts
│   └── project.service.ts
│
└── billing/                   # PayOS & Stripe webhooks
    ├── billing.module.ts
    ├── billing.controller.ts
    └── billing.service.ts
```

---

## 6. Verification & E2E Validation Blueprint

To verify `services/main-api` meets the spec:

1. **Linting & Formatting:** Ensure `pnpm lint` and `pnpm format` pass workspace-wide.
2. **Build Success:** Ensure the workspace successfully compiles via `pnpm build`.
3. **API Integrity Tests:** Mock API payloads matching this contract must run successfully and correctly enqueue jobs onto BullMQ queues.
4. **Token Security Tests:** Requesting rendering with insufficient tokens must return `402 Payment Required` and abort transaction.
