# 🎬 Giải Pháp Sync Video — Script, Media, Voice & Avatar Lip-Sync

**Tài liệu:** Kiến trúc kỹ thuật cho video sync pipeline
**Ngày tạo:** 2026-06-05

---

## 1. Vấn Đề Cốt Lõi

```
Thách thức: Làm sao 4 thứ này "khớp" nhau hoàn toàn?

  📝 Script (text)
    ↕ sync
  🔊 Voice audio (TTS)
    ↕ sync
  🖼️  Hình ảnh / Video clips
    ↕ sync
  👤 Avatar / Portrait (lips moving)
```

**Sai lầm phổ biến:** Thiết kế timeline cứng trước, rồi nhét audio vào → bị lệch.
**Cách đúng:** **Audio-First** — audio là "nhịp tim" của video, mọi thứ sync theo nó.

---

## 2. Nguyên Tắc Nền Tảng: Audio-First Timeline

```
❌ SAI (Timeline-First):
   Định sẵn: "Scene 1 = 5 giây, Scene 2 = 10 giây"
   Rồi gen TTS audio cho vừa với 5s/10s
   → Giọng đọc bị gấp/ngắt không tự nhiên

✅ ĐÚNG (Audio-First):
   Gen TTS audio từ script text
   Đo duration thực tế của audio (3.7s, 8.2s, ...)
   Build timeline THEO audio duration
   → Giọng đọc tự nhiên 100%, hình ảnh sync theo
```

### Pipeline Audio-First

```
Script text (từng scene)
      │
      ▼
ElevenLabs TTS → audio.mp3 + word_timestamps[]
      │
      ├─ duration = 8.2s → scene duration = 8.2s
      ├─ word_timestamps → caption animation timing
      │
      ▼
Build Remotion timeline:
  <Sequence from={0} durationInFrames={247}>  ← 8.2s × 30fps = 247 frames
    <MediaBackground />
    <AudioTrack />
    <CaptionOverlay timestamps={wordTimestamps} />
    <AvatarOverlay />
  </Sequence>
```

---

## 3. ElevenLabs — Word-Level Timestamps (Chìa Khóa Sync)

ElevenLabs API hỗ trợ trả về **timestamps cho từng từ** — đây là tính năng quan trọng nhất:

```ts
// Request với timestamps
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
  {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    body: JSON.stringify({
      text: 'Chào mừng bạn đến với căn hộ Vinhomes Grand Park',
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  },
);

const data = await response.json();
// data.alignment.characters[]  → từng ký tự với start/end time
// data.alignment.words[]       → từng từ (cần parse từ characters)

// Ví dụ output:
// {
//   audio_base64: "...",
//   alignment: {
//     characters: ["C","h","à","o"," ","m","ừ","n","g",...],
//     character_start_times_seconds: [0.0, 0.05, 0.1, 0.15, 0.22, ...],
//     character_end_times_seconds: [0.05, 0.1, 0.15, 0.22, 0.26, ...]
//   },
//   normalized_alignment: { ... }  // word-level grouping
// }
```

### Sử Dụng Timestamps Cho Caption Animation

```ts
// Chuyển character timestamps → word timestamps
function parseWordTimestamps(alignment: ElevenLabsAlignment): WordTimestamp[] {
  const words = [];
  let currentWord = '';
  let wordStart = 0;

  alignment.characters.forEach((char, i) => {
    if (char === ' ' || i === alignment.characters.length - 1) {
      if (currentWord) {
        words.push({
          word: currentWord,
          start: wordStart,
          end: alignment.character_end_times_seconds[i - 1]
        });
        currentWord = '';
      }
      wordStart = alignment.character_start_times_seconds[i + 1] || 0;
    } else {
      if (!currentWord) wordStart = alignment.character_start_times_seconds[i];
      currentWord += char;
    }
  });

  return words;
}

// Trong Remotion: highlight từ đang được đọc
const CaptionOverlay = ({ wordTimestamps, currentTime }) => {
  const activeWordIndex = wordTimestamps.findIndex(
    w => currentTime >= w.start && currentTime <= w.end
  );

  return (
    <div style={captionContainerStyle}>
      {wordTimestamps.map((w, i) => (
        <span
          key={i}
          style={{
            color: i === activeWordIndex ? '#FFD700' : '#FFFFFF',  // vàng = đang đọc
            fontWeight: i === activeWordIndex ? 'bold' : 'normal',
          }}
        >
          {w.word}{' '}
        </span>
      ))}
    </div>
  );
};
```

---

## 4. Sync Hình Ảnh / Video Clips Với Audio

### Chiến Lược: Chia Đều Thời Gian Trong Scene

```
Scene có audio duration = 12s, có 4 ảnh:
→ Mỗi ảnh hiển thị 3s

Scene có audio duration = 8s, có 3 ảnh:
→ Mỗi ảnh hiển thị 2.67s
```

```ts
// Tính thời gian hiển thị mỗi ảnh
function distributeImageTimings(
  audioDurationMs: number,
  imageCount: number
): ImageTiming[] {
  const durationPerImage = audioDurationMs / imageCount;

  return Array.from({ length: imageCount }, (_, i) => ({
    assetIndex: i,
    startMs: i * durationPerImage,
    endMs: (i + 1) * durationPerImage,
    durationMs: durationPerImage,
  }));
}

// Trong Remotion
const SceneTour: React.FC<SceneProps> = ({ images, audioDuration }) => {
  const timings = distributeImageTimings(audioDuration * 1000, images.length);
  const frame = useCurrentFrame();
  const currentMs = (frame / 30) * 1000;

  // Tìm ảnh đang active
  const activeIndex = timings.findIndex(
    t => currentMs >= t.startMs && currentMs < t.endMs
  );

  return (
    <>
      {images.map((img, i) => (
        <AbsoluteFill key={i}>
          <Img
            src={img.localPath}
            style={{
              opacity: interpolate(
                frame,
                [
                  timings[i].startMs / (1000/30),
                  timings[i].startMs / (1000/30) + 8,  // 8 frames fade in
                ],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              ),
              objectFit: 'cover',
              width: '100%', height: '100%',
            }}
          />
          {/* Ken Burns effect — pan/zoom nhẹ */}
          <KenBurnsEffect
            startScale={1.0}
            endScale={1.08}
            durationMs={timings[i].durationMs}
          />
        </AbsoluteFill>
      ))}
    </>
  );
};
```

---

## 5. Avatar Lip-Sync — Giải Pháp Theo Cấp Độ

> **Đây là phần khó và tốn kém nhất.** Chọn cấp độ phù hợp với budget.

---

### Cấp 1 — MVP: Portrait Tĩnh (Không Lip-Sync)

**Chi phí:** $0 | **Độ phức tạp:** Thấp | **Thời gian dev:** 0

```
Nhiều video BĐS Việt Nam dùng cách này:
  → Ảnh chân dung sale hiện ở góc dưới trái/phải
  → Có khung bo tròn + tên + chức danh
  → Audio phát bình thường
  → Hiệu ứng: fade in khi scene bắt đầu

Khi nào phù hợp: MVP, early users, test market fit
```

```ts
// Trong Remotion — Portrait overlay đơn giản
const PortraitOverlay = ({ portraitPath, salesName, opacity }) => (
  <AbsoluteFill>
    <div style={{
      position: 'absolute',
      bottom: 80, left: 20,
      display: 'flex', alignItems: 'center', gap: 12,
      opacity,
    }}>
      <img
        src={portraitPath}
        style={{
          width: 80, height: 80,
          borderRadius: '50%',
          border: '3px solid #FFD700',
          objectFit: 'cover',
        }}
      />
      <div>
        <div style={{ color: '#fff', fontWeight: 'bold' }}>{salesName}</div>
        <div style={{ color: '#FFD700', fontSize: 12 }}>Chuyên viên BĐS</div>
      </div>
    </div>
  </AbsoluteFill>
);
```

---

### Cấp 2 — Standard: D-ID API (Recommended for MVP+)

**Chi phí:** ~$0.10-0.30/video | **Độ phức tạp:** Trung bình | **Chất lượng:** ⭐⭐⭐⭐

```
D-ID là service chuyên talking head video:
  Input: 1 ảnh portrait + 1 file audio
  Output: video MP4 với miệng nhép theo audio (5-10s xử lý)
  Quality: rất tốt, natural movement

Flow:
  1. Upload portrait → D-ID → get image_id
  2. POST /talks: {source_url: image_id, script: {type: audio, audio_url}}
  3. Poll GET /talks/{id} → đợi status = done
  4. Download result_url → avatar_lip_sync.mp4
  5. Composite vào video chính (FFmpeg overlay)
```

```ts
// src/processors/avatar-lipsync.service.ts

interface DIDTalkResponse {
  id: string;
  status: 'created' | 'started' | 'done' | 'error';
  result_url?: string;
}

export async function generateLipSyncVideo(portraitUrl: string, audioUrl: string): Promise<string> {
  // returns local path to lip-sync MP4

  // 1. Create talk
  const createRes = await fetch('https://api.d-id.com/talks', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${process.env.DID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_url: portraitUrl,
      script: {
        type: 'audio',
        audio_url: audioUrl,
      },
      config: {
        fluent: true,
        pad_audio: 0.0,
        stitch: true,
      },
    }),
  });

  const talk: DIDTalkResponse = await createRes.json();

  // 2. Poll for completion (max 5 phút)
  let result: DIDTalkResponse;
  for (let attempt = 0; attempt < 60; attempt++) {
    await sleep(5000); // check mỗi 5 giây
    const pollRes = await fetch(`https://api.d-id.com/talks/${talk.id}`, {
      headers: { Authorization: `Basic ${process.env.DID_API_KEY}` },
    });
    result = await pollRes.json();
    if (result.status === 'done') break;
    if (result.status === 'error') throw new Error('D-ID processing failed');
  }

  // 3. Download result
  const outputPath = `/tmp/${jobId}/avatar-lipsync.mp4`;
  await downloadFile(result.result_url!, outputPath);
  return outputPath;
}
```

---

### Cấp 3 — Premium: SadTalker Self-Hosted (Open Source)

**Chi phí:** ~$0.5-1/giờ GPU (RunPod) | **Độ phức tạp:** Cao | **Chất lượng:** ⭐⭐⭐⭐⭐

```
SadTalker: open-source talking head model
  → Nhét ảnh portrait + audio → video avatar nhép miệng + blink + head pose
  → Cần GPU (NVIDIA, ít nhất 6GB VRAM)
  → Xử lý: ~30-60s cho video 30s (với GPU)

Deployment options:
  A. RunPod: rent GPU server on-demand ($0.5-1/hr)
     → Chỉ bật khi có job, tắt khi xong → cost thấp
  B. Modal.com: serverless GPU
     → Pay per second, cold start ~10s
  C. Replicate.com: API wrapper cho SadTalker
     → $0.015/prediction, đơn giản nhất

Recommend: Bắt đầu với Replicate.com (đơn giản), sau đó tự host nếu volume lớn
```

```ts
// Replicate API wrapper
import Replicate from 'replicate';

export async function generateLipSyncSadTalker(
  portraitPath: string,
  audioPath: string,
): Promise<string> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY });

  const output = await replicate.run(
    'cjwbw/sadtalker:3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376',
    {
      input: {
        source_image: fs.createReadStream(portraitPath),
        driven_audio: fs.createReadStream(audioPath),
        still: false, // head movement tự nhiên
        preprocess: 'crop', // crop face
        enhancer: 'gfpgan', // enhance face quality
      },
    },
  );

  // Download output video
  const outputPath = `/tmp/${jobId}/sadtalker-output.mp4`;
  await downloadFile(output as string, outputPath);
  return outputPath;
}
```

---

### So Sánh 3 Cấp Độ

| Tiêu chí            | Cấp 1: Tĩnh | Cấp 2: D-ID | Cấp 3: SadTalker   |
| ------------------- | ----------- | ----------- | ------------------ |
| Chi phí/video       | $0          | ~$0.15      | ~$0.10 (Replicate) |
| Chất lượng          | ⭐⭐        | ⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐         |
| Dev time            | 1 ngày      | 2-3 ngày    | 5-7 ngày           |
| Latency thêm        | 0s          | 10-30s      | 30-90s             |
| Phụ thuộc 3rd party | Không       | D-ID API    | Replicate/GPU      |
| Phù hợp giai đoạn   | MVP         | MVP+        | Scale              |

**→ Khuyến nghị: Cấp 1 cho MVP, Cấp 2 sau khi có paying users**

---

## 6. Composite Pipeline — Ghép Tất Cả Lại

```
Sau khi có đủ:
  ✅ media_paths[] (ảnh/video local)
  ✅ audio.mp3 + word_timestamps[]
  ✅ avatar_clip.mp4 (hoặc portrait.jpg cho Cấp 1)

Remotion render:
  ┌─────────────────────────────────────────────┐
  │  LAYER 4 (top): Caption overlay             │
  │  → Chữ highlight theo word_timestamps       │
  ├─────────────────────────────────────────────┤
  │  LAYER 3: Avatar overlay                    │
  │  → Cấp 1: portrait circle, bottom-left      │
  │  → Cấp 2/3: lip-sync video clip, bottom-left│
  ├─────────────────────────────────────────────┤
  │  LAYER 2: Text overlays (tên, giá, icon)    │
  ├─────────────────────────────────────────────┤
  │  LAYER 1 (background): Slideshow ảnh/video  │
  └─────────────────────────────────────────────┘
  🔊 Audio track: audio.mp3 (synced với timeline)
```

```ts
// Remotion root composition — audio-first
const VideoTemplate: React.FC<TemplateProps> = ({ scenes }) => {
  // Tính tổng duration từ audio
  const totalDurationFrames = scenes.reduce(
    (sum, scene) => sum + Math.ceil(scene.audioDurationSeconds * 30),
    0
  );

  return (
    <AbsoluteFill>
      {scenes.map((scene, i) => {
        const startFrame = scenes
          .slice(0, i)
          .reduce((sum, s) => sum + Math.ceil(s.audioDurationSeconds * 30), 0);

        return (
          <Sequence
            key={scene.id}
            from={startFrame}
            durationInFrames={Math.ceil(scene.audioDurationSeconds * 30)}
          >
            {/* Layer 1: Background media */}
            <MediaSlideshow
              images={scene.mediaLocalPaths}
              audioDuration={scene.audioDurationSeconds}
            />

            {/* Layer 2: Audio (tự động sync theo Sequence timing) */}
            <Audio src={scene.audioLocalPath} />

            {/* Layer 3: Avatar */}
            {scene.avatarClipPath
              ? <AvatarVideo clipPath={scene.avatarClipPath} />
              : <AvatarPortrait portraitPath={scene.portraitPath} />
            }

            {/* Layer 4: Captions */}
            <CaptionOverlay
              wordTimestamps={scene.wordTimestamps}
              text={scene.caption}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

---

## 7. Data Flow Hoàn Chỉnh

```
[INPUT] Job data từ BullMQ:
  {jobId, userId, scriptId, mediaAssetIds, portraitAssetId, voiceId}

Step 1: PARSE
  Load script JSON → ParsedScene[] {text, caption, mediaAssetIds}

Step 2: MEDIA DOWNLOAD (parallel)
  Download ảnh/video từ R2 → {assetId: localPath}
  Download portrait → portraitPath

Step 3: TTS GENERATION (per scene, parallel nếu nhiều scene)
  ElevenLabs POST /text-to-speech/with-timestamps
  → audio.mp3 + wordTimestamps[]
  → audioDurationSeconds (đo bằng ffprobe)

Step 4: AVATAR LIP-SYNC (optional, Cấp 2/3)
  D-ID or SadTalker: portrait + audio → avatar_clip.mp4
  → avatarClipPath

Step 5: BUILD SCENE TIMELINE
  scenes[].audioDurationSeconds → Remotion timeline frames
  scenes[].wordTimestamps → caption animation data

Step 6: REMOTION RENDER
  renderMedia(composition, inputProps) → output.mp4
  inputProps = {scenes: [{
    audioDurationSeconds,
    wordTimestamps,
    mediaLocalPaths,
    audioLocalPath,
    avatarClipPath | portraitPath,
    caption,
  }]}

Step 7: UPLOAD
  output.mp4 → R2 → CDN URL

[OUTPUT] Video URL + duration + suggestedCaption
```

---

## 8. Quyết Định Cho Dự Án Này

### Phase 1 (MVP):

```
✅ Audio-First timeline (bắt buộc)
✅ ElevenLabs with-timestamps (word highlight captions)
✅ Avatar: Cấp 1 — Portrait tĩnh bo tròn
✅ Image sync: chia đều thời gian + Ken Burns effect
✅ Render bằng Remotion
```

### Phase 2 (Sau khi có revenue):

```
✅ Nâng lên D-ID API cho lip-sync
✅ A/B test: user thích video có lip-sync hơn không?
✅ Nếu lip-sync tăng conversion → đầu tư thêm
```

### Phase 3 (Scale):

```
✅ Tự host SadTalker trên GPU server
✅ Xây custom lip-sync model fine-tuned cho tiếng Việt
```

---

## 9. Phụ Lục — Công Cụ & API Cần Setup

| Tool       | Mục đích            | Setup cần thiết                     |
| ---------- | ------------------- | ----------------------------------- |
| ElevenLabs | TTS + timestamps    | API key, chọn Vietnamese voice      |
| D-ID       | Lip-sync Cấp 2      | API key, upload portrait → image_id |
| Replicate  | SadTalker Cấp 3     | API key, no server needed           |
| ffprobe    | Đo audio duration   | `brew install ffmpeg`               |
| FFmpeg     | Video encoding cuối | `brew install ffmpeg`               |
| Remotion   | React video render  | `npm install remotion`              |
