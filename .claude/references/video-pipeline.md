# Video Pipeline Reference Guide

# AI Realty Video SaaS

> Reference cho agent khi làm việc với video-processor service

---

## Pipeline Overview

```
VideoJob (DB) → BullMQ Queue → VideoWorker → Pipeline Steps → MP4 → R2
```

## Pipeline Steps

### Step 1: Script Parsing

- Load Script từ DB theo `scriptId`
- Parse `scenes[]` array từ JSON
- Validate: mỗi scene có `narration`, `mediaAssetIds`, `duration`
- Output: `ParsedScene[]`

### Step 2: Media Download

- Resolve R2 CDN URLs từ MediaAsset records
- Download images → `/tmp/{jobId}/media/`
- Download video clips → `/tmp/{jobId}/clips/`
- Validate integrity (file size, MIME)
- Output: local file paths map `{assetId → localPath}`

### Step 3: TTS Audio Generation

- For each scene with `narration`:
  - POST to ElevenLabs API `/v1/text-to-speech/{voiceId}`
  - Download MP3 → `/tmp/{jobId}/audio/scene_{i}.mp3`
  - Get duration to validate against scene duration
- Output: `{sceneId → audioPath}` map

### Step 4: Video Rendering (Remotion)

```ts
// Template renders one scene at a time, then compose
await renderMedia({
  composition: templateName, // e.g. "TourTemplate"
  outputLocation: `/tmp/${jobId}/output.mp4`,
  inputProps: {
    scenes: parsedScenes,
    mediaPaths: localPathsMap,
    audioPaths: audioPathsMap,
  },
  codec: 'h264',
  fps: 30,
  imageFormat: 'jpeg',
  concurrency: 2,
});
```

### Step 5: Upload to R2

```ts
const key = `videos/${userId}/${jobId}/output.mp4`;
await s3Client.putObject({
  Bucket: process.env.R2_BUCKET_VIDEOS,
  Key: key,
  Body: fs.createReadStream(outputPath),
  ContentType: 'video/mp4',
});
const cdnUrl = `${process.env.CDN_BASE_URL}/${key}`;
```

### Step 6: Finalize

- Update VideoJob: `status=COMPLETED, outputUrl, duration, completedAt`
- Add `suggestedCaption` (AI gen via Gemini)
- Add `suggestedHashtags`
- Push notification via Redis pub/sub → main-api
- Delete temp files

---

## Error Handling

```ts
// Worker error handling
worker.on('failed', async (job, error) => {
  const retryCount = job.attemptsMade;

  if (retryCount >= 3) {
    // Final failure
    await db.videoJob.update({
      where: { id: job.data.jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
      },
    });

    // Refund tokens
    await tokenService.refundTokens(job.data.userId, job.data.tokenCost, job.data.jobId);

    // Notify user
    await notifyVideoFailed(job.data.jobId);
  }
  // Else: BullMQ will auto-retry with exponential backoff
});
```

## BullMQ Queue Config

```ts
export const videoQueue = new Queue('realty.video.create', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 }, // 30s, 60s, 120s
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    timeout: 600000, // 10 minute max per job
  },
});
```

## Remotion Templates

Each template is a React component in `services/video-processor/src/templates/`:

```
templates/
├── template-tour/
│   ├── index.tsx         # Root composition
│   ├── SceneIntro.tsx    # Sale intro với avatar overlay
│   ├── SceneImages.tsx   # Slideshow với zoom/pan effect
│   ├── SceneCta.tsx      # Call-to-action cuối
│   └── constants.ts      # Duration, animation configs
├── template-deal/
└── template-introduce/
```

**Template interface:**

```ts
interface TemplateProps {
  scenes: ParsedScene[];
  mediaPaths: Record<string, string>; // assetId → local path
  audioPaths: Record<string, string>; // sceneId → local mp3 path
}
```

## Progress Reporting

```ts
// Report progress via Redis pub/sub
await redis.publish(
  `job:${jobId}:progress`,
  JSON.stringify({
    progress: 40,
    step: 'AUDIO_GENERATION',
    message: 'Đang tạo giọng đọc...',
  }),
);
```

main-api subscribes and updates DB + sends to client via WebSocket/SSE.

## Environment Variables (video-processor)

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_MEDIA=realtyvideo-media
R2_BUCKET_VIDEOS=realtyvideo-videos
CDN_BASE_URL=https://cdn.realtyvideo.ai
ELEVENLABS_API_KEY=
GEMINI_API_KEY=
TEMP_DIR=/tmp/video-processor
MAX_CONCURRENT_RENDERS=2
```
