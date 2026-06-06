# Background Worker Service — `services/video-processor`

This service is a high-performance, asynchronous background worker built with Node.js, TypeScript, BullMQ, and Redis. It is responsible for executing heavy computational, networking, and media rendering pipelines off the main API thread.

---

## 1. Responsibilities & Core Features

- **Autonomous Operation:** Listens to Redis queues, downloads assets, processes AI logic, and uploads final media without keeping synchronous API requests open.
- **AI Vision & Script Writing (Worker 1):** Analyzes property photos and videos using **Gemini Vision API** and generates tailored real-estate scripts.
- **Audio-First Video Render (Worker 2):** Generates Vietnamese voiceover narration using **FPT.AI / ElevenLabs TTS**, extracts video highlights, builds a dynamic timeline based on audio duration, and renders final vertical MP4 videos using **FFmpeg**.
- **Media Hosting:** Uploads completed outputs and thumbnails to **Cloudflare R2 / AWS S3**.
- **Fail-Safe Token Refund:** Automatically updates job states to `FAILED` and refunds deducted user tokens upon execution errors.

---

## 2. Directory Structure

The codebase is structured into workers (queue consumers), processors (modular pipeline steps), and utility libraries:

```
services/video-processor/
├── src/
│   ├── index.ts               # Service entrypoint, bootstraps worker listeners
│   ├── workers/               # BullMQ Worker handlers
│   │   ├── script-gen.worker.ts      # Worker 1: AI analysis and script drafting
│   │   └── video-render.worker.ts    # Worker 2: TTS, FFmpeg rendering, and upload
│   │
│   ├── processors/            # Isolated business-logic pipeline steps
│   │   ├── media-downloader.ts       # Downloads media assets to local /tmp with write-clash deduplication
│   │   ├── vision-cache.ts           # Interacts with Gemini Vision and caches descriptions
│   │   ├── script-generator.ts       # Assembles AI prompts and validates JSON script outputs
│   │   ├── draft-saver.ts            # Updates ScriptDraft state in PostgreSQL database
│   │   ├── tts-cache.ts              # Calls FPT/ElevenLabs TTS and caches MP3 streams
│   │   ├── clip-extractor.ts         # Uses FFmpeg to crop and deshake raw video files
│   │   ├── timeline-builder.ts       # Parses scenes to calculate timings and assemble FFmpeg arguments
│   │   ├── ffmpeg-renderer.ts        # Executes FFmpeg commands to render segments and merge them
│   │   └── uploader.ts               # Uploads video output and generates thumbnail
│   │
│   ├── lib/                   # Singletons and global configuration
│   │   ├── db.ts                     # Prisma Database Client instance
│   │   ├── redis.ts                  # Redis Client instance
│   │   ├── s3.ts                     # Cloudflare R2 / S3 client
│   │   └── logger.ts                 # Pino Logger instance
│   │
│   └── types/                 # TypeScript typings and interfaces
│
├── scripts/                   # Interactive scripts, tests, and CLI validation tools
└── test-assets/               # Local mock assets used during E2E testing
```

---

## 3. Queue Interfaces & Workflows

### 3.1. Worker 1: Script Generation Queue (`realty.script.generate`)

Triggered when a user initiates a script draft.

```
[Redis Job Payload]
  └─ { draftId: string }
        │
        ▼
1. Fetch ScriptDraft & Project Metadata (Postgres)
        │
        ▼
2. Download Media Assets (Deduplicated, saved to /tmp)
        │
        ▼
3. Gemini Vision Analysis (Analyzes room category & quality; checks Vision Cache)
        │
        ▼
4. Gemini Script Generation (Generates scenes narration, captions, and tags JSON)
        │
        ▼
5. Save Draft to Database (Status: READY, Scenes: JSON)
        │
        ▼
6. Clean up /tmp files & Publish Redis progress event
```

### 3.2. Worker 2: Video Render Queue (`realty.video.render`)

Triggered when a user approves a script draft and pays with tokens.

```
[Redis Job Payload]
  └─ { jobId: string }
        │
        ▼
1. Fetch VideoJob, user profiles, and approved ScriptDraft (Postgres)
        │
        ▼
2. Download media assets & user avatar (saved to /tmp)
        │
        ▼
3. TTS Generation (Calls FPT.AI / ElevenLabs to generate scene MP3s; checks TTS Cache)
        │
        ▼
4. Clip Extraction (Cuts video segment coordinates using FFmpeg)
        │
        ▼
5. Timeline & Scene Segment Rendering (FFmpeg processes scenes with Text & Avatar Overlays)
        │
        ▼
6. Merge & Concatenate Segments (Outputs single merged.mp4)
        │
        ▼
7. Upload to Cloudflare R2 & Extract Thumbnail at 2s
        │
        ▼
8. Update Job success (COMPLETED) OR Refund Tokens (FAILED) + Publish Redis Event
```

---

## 4. Local Storage & Caching Layer

To optimize performance and minimize third-party API costs (Gemini & TTS):

1.  **Vision Cache (Redis - 30 days):**
    - Key format: `realty:v1:cache:vision:asset:{assetId}`
    - Prevents re-analyzing the same image/video when a user generates multiple script drafts using the same media assets.
2.  **TTS Cache (Redis - 7 days):**
    - Key format: `realty:v1:cache:tts:text:{md5(text)}:voice:{voiceId}`
    - Maps identical script line narration to already generated audio URLs hosted on R2.
3.  **Local Disk Usage (`/tmp`):**
    - Job assets are downloaded and processed under `/tmp/video-processor/{jobId}/`.
    - Automatically recursive-deleted (`fs.rm`) on completion or failure.

---

## 5. Development & Testing Scripts

Run these scripts locally from the root workspace or within `services/video-processor` using `pnpm`:

- `pnpm dev`: Runs nodemon watch mode compiling typescript on-the-fly.
- `pnpm test:e2e`: Runs E2E tests executing a complete run from Worker 1 to Worker 2 using local mock media assets.
- `pnpm test:pipeline-clean`: Resets the database state by cleaning up E2E test users, project configurations, and mock media records.
- `pnpm test:vision`: Runs a standalone test analyzing image inputs via Gemini.
- `pnpm test:tts-fpt`: Runs a standalone test call to the FPT.AI TTS API.
- `pnpm test:clip-extractor`: Runs a test verifying FFmpeg clip extraction.
