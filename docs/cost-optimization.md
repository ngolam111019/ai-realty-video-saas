# 💰 Cost Optimization — Giải Pháp Tiết Kiệm Chi Phí Tối Đa

**Mục tiêu:** < $0.08/video | Chất lượng: Không thỏa hiệp với UX
**Ngày tạo:** 2026-06-05

---

## 1. Phân Tích Chi Phí Hiện Tại vs Tối Ưu

```
                    NAIVE (không tối ưu)    OPTIMIZED (giải pháp này)
                    ────────────────────    ─────────────────────────
Image Analysis      $0.125 (Gemini Pro)  →  $0.008 (Flash + Cache)
Script Generation   $0.014 (Gemini Pro)  →  $0.005 (Flash + Cache)
TTS (Voiceover)     $0.150 (ElevenLabs)  →  $0.010 (FPT.AI + Cache)
Video Render        $0.020 (compute)     →  $0.008 (FFmpeg first)
Lip-sync            $0.150 (D-ID)        →  $0.000 (portrait tĩnh)
Storage R2          $0.000 (egress free) →  $0.000
                    ─────────────────       ──────────────────────
TOTAL               ~$0.46/video         →  ~$0.031/video  (↓ 93%)
```

---

## 2. Tối Ưu TTS — Đây Là Chi Phí Lớn Nhất

### So Sánh TTS Tiếng Việt

| Provider              | Chất lượng | Giá/triệu ký tự   | Giá/video (500 chars) | Tiếng Việt     |
| --------------------- | ---------- | ----------------- | --------------------- | -------------- |
| **ElevenLabs**        | ⭐⭐⭐⭐⭐ | $330              | $0.165                | Khá tốt        |
| **FPT.AI**            | ⭐⭐⭐⭐   | ~$5               | **$0.0025**           | ✅ Tốt nhất VN |
| **Google WaveNet VI** | ⭐⭐⭐⭐   | $16               | $0.008                | Tốt            |
| **Azure Neural VI**   | ⭐⭐⭐⭐   | $15               | $0.0075               | Tốt            |
| **OpenAI TTS**        | ⭐⭐⭐     | $15               | $0.0075               | Trung bình VI  |
| **Zalo AI TTS**       | ⭐⭐⭐     | Free tier (quota) | $0                    | Tốt            |

**→ Lựa chọn tối ưu: FPT.AI (primary) + Google WaveNet VI (fallback)**

```
Tại sao FPT.AI?
  ✅ Chuyên biệt cho tiếng Việt — công ty Việt Nam
  ✅ Rẻ hơn ElevenLabs 66 lần ($5 vs $330/triệu chars)
  ✅ Giọng tự nhiên: có nhiều giọng Nam/Nữ, Bắc/Nam/Trung
  ✅ API đơn giản, ổn định
  ✅ Hỗ trợ SSML (điều chỉnh nhịp, tốc độ, nhấn mạnh)

Khi nào dùng ElevenLabs?
  → Premium plan (user trả thêm) — đây là upsell opportunity
  → "Nâng cấp lên giọng AI cao cấp ElevenLabs (+3 token/video)"
```

### FPT.AI TTS Implementation

```ts
// src/processors/tts.service.ts

interface TTSProvider {
  name: string;
  generate(text: string, voiceId: string): Promise<{ audioPath: string; durationSeconds: number }>;
}

class FptAiTTSProvider implements TTSProvider {
  name = 'fpt-ai';

  async generate(text: string, voiceId: string) {
    // FPT.AI TTS API
    const response = await fetch('https://api.fpt.ai/hmi/tts/v5', {
      method: 'POST',
      headers: {
        'api-key': process.env.FPT_AI_API_KEY!,
        speed: '0', // normal speed
        voice: voiceId, // 'leminh', 'lannhi', 'myan', 'giahuy'...
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: text,
    });

    const data = await response.json();
    // FPT.AI trả về URL để download audio
    const audioUrl = data.async;

    // Poll for completion (FPT.AI async processing)
    let audioDownloadUrl: string = '';
    for (let i = 0; i < 20; i++) {
      await sleep(1500);
      const checkRes = await fetch(audioUrl);
      if (checkRes.ok) {
        audioDownloadUrl = audioUrl;
        break;
      }
    }

    const audioPath = `/tmp/${jobId}/tts_${sceneId}.mp3`;
    await downloadFile(audioDownloadUrl, audioPath);
    const duration = await getAudioDuration(audioPath);

    return { audioPath, durationSeconds: duration };
  }
}

class GoogleTTSProvider implements TTSProvider {
  name = 'google-tts';

  async generate(text: string, voiceId: string) {
    const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
    const client = new TextToSpeechClient();

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'vi-VN',
        name: voiceId, // 'vi-VN-Wavenet-A', 'vi-VN-Wavenet-B', 'vi-VN-Wavenet-C', 'vi-VN-Wavenet-D'
        ssmlGender: 'FEMALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.95, // nhẹ hơn chút, nghe tự nhiên hơn
        pitch: 0,
        volumeGainDb: 2,
      },
    });

    const audioPath = `/tmp/${jobId}/tts_${sceneId}.mp3`;
    fs.writeFileSync(audioPath, response.audioContent!, 'binary');
    const duration = await getAudioDuration(audioPath);

    return { audioPath, durationSeconds: duration };
  }
}

// Factory pattern — chọn provider theo plan của user
function getTTSProvider(userPlan: 'free' | 'starter' | 'pro' | 'premium'): TTSProvider {
  switch (userPlan) {
    case 'premium':
      return new ElevenLabsTTSProvider(); // trả thêm token
    case 'pro':
      return new FptAiTTSProvider(); // mặc định
    case 'starter':
      return new FptAiTTSProvider(); // mặc định
    case 'free':
      return new GoogleTTSProvider(); // rẻ nhất
  }
}
```

---

## 3. Tối Ưu AI Vision — Dùng Flash Thay Pro

```
Gemini 1.5 Pro:   $3.50/triệu input tokens
Gemini 1.5 Flash: $0.35/triệu input tokens  ← 10x rẻ hơn!
Gemini 1.5 Flash-8B: $0.0375/triệu          ← 93x rẻ hơn Pro!
```

### Chiến Lược 2-Model

```ts
// Bước 1: Dùng Flash-8B để CLASSIFY (chỉ cần biết là phòng gì)
const classificationModel = 'gemini-1.5-flash-8b'; // rẻ nhất

// Bước 2: Dùng Pro CHỈ KHI cần viết script/caption (cần chất lượng cao)
const scriptModel = 'gemini-1.5-pro';

// Estimate:
// 10 ảnh × Flash-8B classify: ~10,000 tokens × $0.0000375 = $0.000375
// 1 script gen bằng Pro:      ~7,000 tokens × $0.0035     = $0.0245
// TỔNG: ~$0.025 (thay vì $0.139 nếu dùng Pro cho tất cả)
```

---

## 4. Tối Ưu Caching — Tiết Kiệm Lớn Nhất

```
Insight quan trọng: User thường UPLOAD CÙNG ẢNH cho nhiều video.
→ Nếu cache kết quả analysis: lần 2 trở đi = $0 AI cost.
```

### Cache Strategy

```ts
// src/lib/cache-strategies.ts

// Cache key: hash của file content (không phải filename)
// → Cùng nội dung ảnh dù upload nhiều lần = cùng cache key
async function getImageHash(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex').slice(0, 16); // 16 chars đủ dùng
}

// Cache 1: Image analysis (Redis, TTL 30 ngày)
async function getCachedImageAnalysis(imageHash: string): Promise<ImageAnalysis | null> {
  const key = `realty:v1:ai:image_analysis:${imageHash}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function cacheImageAnalysis(imageHash: string, analysis: ImageAnalysis) {
  const key = `realty:v1:ai:image_analysis:${imageHash}`;
  await redis.setex(key, 30 * 24 * 3600, JSON.stringify(analysis)); // 30 ngày
}

// Cache 2: TTS audio (Redis pointer → R2 file, TTL 7 ngày)
async function getCachedTTS(textHash: string, voiceId: string): Promise<string | null> {
  const key = `realty:v1:tts:${voiceId}:${textHash}`;
  return redis.get(key); // Returns R2 URL nếu đã cache
}

async function cacheTTS(textHash: string, voiceId: string, r2Url: string) {
  const key = `realty:v1:tts:${voiceId}:${textHash}`;
  await redis.setex(key, 7 * 24 * 3600, r2Url); // 7 ngày
  // Lưu audio lên R2 trong folder cache/ (riêng với videos/)
  // Sẽ được reuse cho các video khác cùng text
}

// Cache 3: Script template (nếu cùng project info + template, reuse script draft)
// → Cho phép "refresh script" chỉ thay đổi câu chữ, không re-analyze ảnh
```

### Saving Estimate Với Cache

```
Scenario: User tạo 10 video/tháng cho cùng 1 dự án

Không có cache:   10 × $0.031 = $0.31/tháng
Có cache:
  - Video 1:    $0.031 (full cost)
  - Video 2-10: $0.008 × 9 = $0.072 (chỉ tốn render + TTS mới)
  TỔNG:         $0.103/tháng  (↓ 67% so với không cache)
```

---

## 5. Tối Ưu Video Rendering — FFmpeg First

```
Remotion render: chậm hơn, cần Node.js process nặng
FFmpeg direct:   nhanh gấp 3-5x, ít RAM hơn, đủ cho templates đơn giản

Chiến lược:
  Template đơn giản (slideshow + text + audio): FFmpeg thuần
  Template phức tạp (animations, React components): Remotion
```

### FFmpeg-Only Template (Cho Slideshow Đơn Giản)

```ts
// src/processors/ffmpeg-renderer.ts
// Dùng cho template "Hot Deal" và "Tour" phiên bản đơn giản

export async function renderWithFFmpegOnly(
  scenes: ParsedScene[],
  outputPath: string,
): Promise<void> {
  // 1. Tạo input file list cho FFmpeg concat
  const inputListPath = `/tmp/${jobId}/inputs.txt`;
  const concatContent = scenes
    .flatMap((scene) =>
      scene.mediaLocalPaths.map((imgPath) => {
        const durationPerImg = scene.audioDurationSeconds / scene.mediaLocalPaths.length;
        return [`file '${imgPath}'`, `duration ${durationPerImg}`].join('\n');
      }),
    )
    .join('\n');

  fs.writeFileSync(inputListPath, concatContent);

  // 2. Tạo audio concat
  const audioListPath = `/tmp/${jobId}/audios.txt`;
  const audioContent = scenes.map((s) => `file '${s.audioLocalPath}'`).join('\n');
  fs.writeFileSync(audioListPath, audioContent);

  // 3. Concatenate audio tracks
  const mergedAudioPath = `/tmp/${jobId}/merged_audio.mp3`;
  execSync(`ffmpeg -f concat -safe 0 -i "${audioListPath}" -c copy "${mergedAudioPath}" -y`);

  // 4. Render video từ images với Ken Burns effect + text overlay
  const filterComplex = buildFFmpegFilterComplex(scenes);

  execSync(
    [
      `ffmpeg`,
      `-f concat -safe 0 -i "${inputListPath}"`, // images
      `-i "${mergedAudioPath}"`, // audio
      `-filter_complex "${filterComplex}"`,
      `-map "[out_v]" -map "[out_a]"`,
      `-c:v libx264 -crf 23 -preset fast`,
      `-c:a aac -b:a 192k`,
      `-r 30`,
      `-shortest`,
      `"${outputPath}" -y`,
    ].join(' '),
    { timeout: 300000 },
  );
}

// Build FFmpeg filter for Ken Burns + text overlay
function buildFFmpegFilterComplex(scenes: ParsedScene[]): string {
  // Ken Burns: zoompan filter
  // Text overlay: drawtext filter
  // Example: "zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',drawtext=..."
  const filters = [];

  scenes.forEach((scene, sceneIdx) => {
    scene.mediaLocalPaths.forEach((_, imgIdx) => {
      const idx = sceneIdx * scene.mediaLocalPaths.length + imgIdx;
      const duration = scene.audioDurationSeconds / scene.mediaLocalPaths.length;
      const frames = Math.round(duration * 30);

      // Ken Burns zoom in
      filters.push(
        `[${idx}:v]scale=1080:1920:force_original_aspect_ratio=increase,` +
          `crop=1080:1920,` +
          `zoompan=z='min(zoom+0.0015,1.5)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',` +
          `setsar=1[v${idx}]`,
      );
    });

    // Caption text overlay
    if (scene.caption) {
      filters.push(
        `[v${sceneIdx}]drawtext=text='${escapeFFmpegText(scene.caption)}':` +
          `fontfile=/fonts/BeVietnamPro-Bold.ttf:` +
          `fontsize=48:fontcolor=white:` +
          `shadowcolor=black@0.7:shadowx=2:shadowy=2:` +
          `x=(w-tw)/2:y=h-th-80[v${sceneIdx}_cap]`,
      );
    }
  });

  return filters.join(';');
}
```

### Khi Nào Dùng Remotion vs FFmpeg?

```
FFmpeg thuần (nhanh, rẻ):
  ✅ Slideshow ảnh + audio
  ✅ Ken Burns effect (zoom/pan)
  ✅ Text overlay đơn giản
  ✅ Crossfade transition
  ✅ Portrait overlay (static)
  → Phù hợp: 80% templates của SaaS này

Remotion (chậm hơn, linh hoạt hơn):
  ✅ Animation phức tạp (bounce, spring, graph)
  ✅ React-based custom component
  ✅ Dynamic data visualization
  ✅ Complex motion graphics
  → Phù hợp: Premium templates (20%)
```

---

## 6. Giải Pháp Tổng Hợp — Stack Tiết Kiệm Nhất

```
THAY ĐỔI STACK CHO COST OPTIMIZATION:

Layer           | Naive              | Optimized
─────────────── | ───────────────── | ─────────────────────────────
Image Analysis  | Gemini 1.5 Pro    | Gemini Flash-8B + Cache 30d
Script Gen      | Gemini 1.5 Pro    | Gemini 1.5 Flash + Cache
TTS             | ElevenLabs        | FPT.AI (VN) / Google WaveNet
TTS Cache       | Không có          | Redis → R2, reuse 7 ngày
Video Render    | Remotion only     | FFmpeg first, Remotion khi cần
Lip-sync        | D-ID API          | Portrait tĩnh (MVP), upsell premium
```

---

## 7. Upsell Strategy — Biến Chi Phí Thành Doanh Thu

```
Thay vì: "Chúng ta phải dùng tính năng rẻ để tiết kiệm"
→    "Chúng ta tạo ra 2-3 tier chất lượng khác nhau"

TIER STANDARD (giá cơ bản, ví dụ 5 token/video 60s):
  ✅ FPT.AI TTS — giọng tự nhiên
  ✅ FFmpeg render — nhanh, chất lượng tốt
  ✅ Portrait tĩnh — không lip-sync
  → Chi phí thực: ~$0.03/video

TIER PREMIUM (+3 token, ví dụ 8 token/video):
  ✅ ElevenLabs TTS — giọng cao cấp nhất
  ✅ Remotion render — animation đẹp hơn
  ✅ D-ID lip-sync — avatar nhép miệng
  → Chi phí thực: ~$0.35/video
  → User trả: 3 token extra = ~15,000 VND
  → Margin vẫn tốt

Với 70% user dùng Standard, 30% dùng Premium:
  Blended cost: 0.7×$0.03 + 0.3×$0.35 = ~$0.126/video
  Blended revenue: 5.9 token × 5,000 VND/token = ~$1.18/video
  Margin: ~89%
```

---

## 8. FPT.AI Voice Options (Tiếng Việt Tốt Nhất)

```
FPT.AI có sẵn các giọng tiếng Việt:

GIỌNG NỮ:
  lannhi    — Nữ, Miền Nam, trẻ trung, phù hợp video BĐS cao cấp
  myan      — Nữ, Miền Bắc, chuyên nghiệp
  leminh    — Nữ, Miền Nam, ấm áp

GIỌNG NAM:
  giahuy    — Nam, Miền Nam, tự tin, phù hợp giọng sale
  ngoclam   — Nam, Miền Bắc, trầm ấm

Gợi ý mapping theo template:
  Tour Căn Hộ → lannhi hoặc giahuy (tự chọn)
  Hot Deal    → giahuy (giọng nam tạo cảm giác khẩn cấp hơn)
  Giới Thiệu Sale → giọng của chính người dùng (tương lai)
```

---

## 9. Chi Phí Hạ Tầng Tối Ưu

```
Development & MVP stage:

  Vercel (apps/web):        FREE plan (100GB bandwidth)
  Railway (video-processor): $5/month starter
  Neon PostgreSQL:           FREE tier (0.5GB, đủ cho MVP)
  Upstash Redis:             FREE tier (10,000 req/day)
  Cloudflare R2:             FREE tier (10GB/month, 1M Class A ops)
  FPT.AI TTS:                Pay per use (không cần plan)
  Gemini API:                $300 free credit mới
  GitHub Actions:            FREE (2000 min/month)

TOTAL fixed cost MVP:  ~$5/tháng  (chỉ Railway)
Variable cost:         ~$0.031/video

Break-even với 1 paying user ($99k/tháng = ~$4):
  4$/0.031 = ~130 video có thể tạo với 1 user trả tiền
  → Infra được cover hoàn toàn
```

---

## 10. Decision Tree — Chọn Provider Theo Tình Huống

```
Khi user request tạo video:
    │
    ├─ Đã có cache TTS cho text này? → YES → Dùng cached audio ($0)
    │                                 → NO  → Continue
    │
    ├─ User plan = Premium? → YES → ElevenLabs TTS ($0.165/video)
    │                        → NO  → FPT.AI TTS ($0.0025/video)
    │
    ├─ Ảnh đã analyze trước? → YES → Dùng cached analysis ($0)
    │                          → NO  → Gemini Flash-8B ($0.000375)
    │
    ├─ Template type?
    │   → Simple slideshow   → FFmpeg render (nhanh, rẻ)
    │   → Complex animation  → Remotion render
    │
    └─ Lip-sync requested?
        → NO (default)       → Static portrait ($0)
        → YES (Premium)      → D-ID API ($0.15/video)
```

---

## 11. Implementation Priority

```
Làm trước (tiết kiệm nhiều nhất):
  1. ✅ FPT.AI TTS thay ElevenLabs     → tiết kiệm $0.15/video (lớn nhất)
  2. ✅ TTS caching (Redis → R2)        → tiết kiệm 60-80% TTS cost
  3. ✅ Gemini Flash-8B cho vision     → tiết kiệm $0.12/video
  4. ✅ Image analysis caching          → tiết kiệm $0/lần repeat

Làm sau:
  5. ⬜ FFmpeg-first renderer          → tiết kiệm compute time
  6. ⬜ Tiered quality (upsell Premium) → tăng revenue
  7. ⬜ Batch processing (queue 5 jobs → 1 AI call) → tiết kiệm API calls
```
