# Database Design — AI Realty Video SaaS

**Database:** PostgreSQL 16
**ORM:** Prisma 5
**Version:** 1.0.0

---

## Entity Relationship Diagram (ERD)

```
┌──────────┐     ┌───────────────┐     ┌──────────────────┐
│  users   │────▶│ token_wallets │     │  token_packages  │
└──────────┘     └───────────────┘     └──────────────────┘
     │                                          │
     │           ┌───────────────┐              │
     ├──────────▶│  transactions │◀─────────────┘
     │           └───────────────┘
     │
     │           ┌───────────────┐
     ├──────────▶│   projects    │
     │           └───────────────┘
     │                  │
     │           ┌───────────────┐
     │           │  media_assets │
     │           └───────────────┘
     │                  │
     │           ┌───────────────┐     ┌──────────────────┐
     ├──────────▶│  video_jobs   │────▶│ video_templates  │
     │           └───────────────┘     └──────────────────┘
     │                  │
     │           ┌───────────────┐
     ├──────────▶│    scripts    │
     │           └───────────────┘
     │
     │           ┌───────────────┐
     ├──────────▶│ monthly_plans │
     │           └───────────────┘
     │
     │           ┌───────────────┐
     └──────────▶│ notifications │
                 └───────────────┘
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ────────────────────────────────────────────
// ENUMS
// ────────────────────────────────────────────

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

enum UserStatus {
  PENDING_VERIFICATION
  ACTIVE
  SUSPENDED
}

enum PropertyType {
  APARTMENT        // Căn hộ chung cư
  VILLA            // Biệt thự
  TOWNHOUSE        // Nhà phố
  SHOPHOUSE        // Shophouse
  LAND             // Đất nền
  OFFICE           // Văn phòng
  OTHER
}

enum MediaType {
  IMAGE
  VIDEO_CLIP
  PORTRAIT         // Ảnh chân dung sale
}

enum MediaTag {
  EXTERIOR          // Mặt tiền
  LOBBY             // Sảnh/lobby
  LIVING_ROOM       // Phòng khách
  KITCHEN           // Bếp
  DINING_ROOM       // Phòng ăn
  MASTER_BEDROOM    // Phòng ngủ master
  BEDROOM           // Phòng ngủ phụ
  BATHROOM          // Phòng tắm/WC
  BALCONY           // Ban công
  VIEW              // Tầm nhìn/view
  AMENITY           // Tiện ích (hồ bơi, gym)
  COMMON_AREA       // Khu chung (hành lang, thang máy)
  PORTRAIT          // Chân dung
  OTHER
}

enum TransactionType {
  TOKEN_PURCHASE    // Mua token
  TOKEN_DEDUCT      // Dùng token tạo video
  TOKEN_REFUND      // Hoàn token (lỗi)
  TOKEN_BONUS       // Tặng token (admin)
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentGateway {
  STRIPE
  PAYOS             // VNPay/Momo/ZaloPay
}

enum VideoJobStatus {
  QUEUED            // Đã vào hàng đợi
  PROCESSING        // Đang xử lý
  COMPLETED         // Hoàn thành
  FAILED            // Lỗi
  CANCELLED         // Hủy bởi user
}

enum VideoResolution {
  R_1080x1920       // 9:16 vertical (TikTok/Reels)
  R_1080x1080       // 1:1 square (Facebook)
  R_1920x1080       // 16:9 horizontal (YouTube)
}

enum NotificationType {
  VIDEO_COMPLETED
  VIDEO_FAILED
  TOKEN_LOW
  PAYMENT_SUCCESS
  PAYMENT_FAILED
  SYSTEM
}

// ────────────────────────────────────────────
// USERS
// ────────────────────────────────────────────

model User {
  id              String      @id @default(cuid())
  email           String      @unique
  emailVerified   DateTime?
  passwordHash    String?     // null nếu dùng OAuth
  name            String
  phone           String?
  company         String?     // Tên công ty/đơn vị
  role            UserRole    @default(USER)
  status          UserStatus  @default(PENDING_VERIFICATION)

  // OAuth
  googleId        String?     @unique

  // Preferences
  preferredVoiceId   String?   // ElevenLabs voice ID mặc định
  preferredLanguage  String    @default("vi")

  // Portrait / Avatar
  avatarUrl       String?     // S3/R2 URL
  portraitAssetId String?     // Media asset ID của ảnh chân dung chính

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?   // Soft delete

  // Relations
  wallet          TokenWallet?
  transactions    Transaction[]
  projects        Project[]
  videoJobs       VideoJob[]
  scripts         Script[]
  monthlyPlans    MonthlyPlan[]
  notifications   Notification[]
  mediaAssets     MediaAsset[]

  @@map("users")
  @@index([email])
  @@index([googleId])
  @@index([status])
}

// ────────────────────────────────────────────
// TOKEN WALLET
// ────────────────────────────────────────────

model TokenWallet {
  id            String    @id @default(cuid())
  userId        String    @unique
  balance       Int       @default(0)    // Số token hiện tại
  lifetimeEarned Int      @default(0)    // Tổng token đã mua
  lifetimeSpent  Int      @default(0)    // Tổng token đã dùng
  updatedAt     DateTime  @updatedAt

  user          User      @relation(fields: [userId], references: [id])

  @@map("token_wallets")
}

// ────────────────────────────────────────────
// TOKEN PACKAGES (Admin configured)
// ────────────────────────────────────────────

model TokenPackage {
  id            String    @id @default(cuid())
  name          String    // "Starter", "Pro", "Business"
  description   String?
  tokenAmount   Int       // Số token trong gói
  priceVnd      Int       // Giá tiền VND
  priceUsd      Decimal   @db.Decimal(10, 2)  // Giá USD (Stripe)
  isActive      Boolean   @default(true)
  isPopular     Boolean   @default(false)      // Highlight "Phổ biến"
  sortOrder     Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  transactions  Transaction[]

  @@map("token_packages")
}

// ────────────────────────────────────────────
// TRANSACTIONS
// ────────────────────────────────────────────

model Transaction {
  id              String              @id @default(cuid())
  userId          String
  type            TransactionType
  status          TransactionStatus   @default(PENDING)

  // Token change
  tokenAmount     Int                 // Dương = cộng, Âm = trừ
  balanceBefore   Int
  balanceAfter    Int

  // Payment (for TOKEN_PURCHASE)
  packageId       String?
  amountVnd       Int?
  amountUsd       Decimal?            @db.Decimal(10, 2)
  gateway         PaymentGateway?
  gatewayOrderId  String?             // Stripe payment intent ID / PayOS order ID
  gatewayRef      String?             // Gateway reference / transaction ID
  idempotencyKey  String?             @unique  // Prevent double-charge

  // Link to video job (for TOKEN_DEDUCT/REFUND)
  videoJobId      String?

  description     String?
  metadata        Json?               // Extra data (webhook payload, etc.)
  paidAt          DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  user            User                @relation(fields: [userId], references: [id])
  package         TokenPackage?       @relation(fields: [packageId], references: [id])
  videoJob        VideoJob?           @relation(fields: [videoJobId], references: [id])

  @@map("transactions")
  @@index([userId, createdAt(sort: Desc)])
  @@index([gatewayOrderId])
  @@index([idempotencyKey])
}

// ────────────────────────────────────────────
// PROJECTS (Real Estate Properties)
// ────────────────────────────────────────────

model Project {
  id              String        @id @default(cuid())
  userId          String
  name            String        // Tên dự án / căn hộ
  propertyType    PropertyType
  address         String?
  district        String?
  city            String        @default("Hồ Chí Minh")

  // Property details
  area            Decimal?      @db.Decimal(10, 2)  // m²
  bedrooms        Int?
  bathrooms       Int?
  floor           Int?          // Tầng (cho chung cư)
  totalFloors     Int?          // Tổng số tầng (cho nhà phố/villa)
  facing          String?       // Hướng: "Đông Nam", "Tây Bắc"...

  // Pricing
  salePrice       BigInt?       // Giá bán (VND)
  rentPrice       Int?          // Giá thuê (VND/tháng)
  pricePerSqm     BigInt?       // Giá/m²
  priceNote       String?       // Ghi chú về giá

  // Features & USPs
  amenities       String[]      // ["hồ bơi", "gym", "view sông", ...]
  highlights      String[]      // USP nổi bật
  description     String?       // Mô tả chi tiết

  // Handover
  handoverDate    String?       // "Q3/2026", "Tháng 12/2026"
  legalStatus     String?       // "Sổ hồng", "Sổ đỏ", "Hợp đồng mua bán"

  // Contact (sale info for video)
  contactName     String?       // Tên hiện trong video
  contactPhone    String?
  contactNote     String?       // "Gọi ngay để được tư vấn"

  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  user            User          @relation(fields: [userId], references: [id])
  mediaAssets     MediaAsset[]
  scripts         Script[]
  videoJobs       VideoJob[]
  monthlyPlans    MonthlyPlan[]

  @@map("projects")
  @@index([userId, createdAt(sort: Desc)])
  @@index([propertyType])
}

// ────────────────────────────────────────────
// MEDIA ASSETS
// ────────────────────────────────────────────

model MediaAsset {
  id            String      @id @default(cuid())
  userId        String
  projectId     String?     // null nếu là portrait standalone
  type          MediaType
  tag           MediaTag    @default(OTHER)

  // Storage
  fileName      String      // Original file name
  fileSize      Int         // bytes
  mimeType      String
  storageKey    String      // R2/S3 object key
  storageUrl    String      // CDN URL
  thumbnailUrl  String?     // Thumbnail CDN URL (for videos)

  // Image metadata
  width         Int?
  height        Int?
  duration      Decimal?    @db.Decimal(6, 2)  // seconds (for videos)

  // AI tagging
  aiTagConfidence Decimal?  @db.Decimal(3, 2)  // 0.00-1.00
  aiTagLabels   String[]    // Raw AI labels

  sortOrder     Int         @default(0)
  isPortrait    Boolean     @default(false)    // Ảnh chân dung sale

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  deletedAt     DateTime?

  user          User        @relation(fields: [userId], references: [id])
  project       Project?    @relation(fields: [projectId], references: [id])

  @@map("media_assets")
  @@index([userId])
  @@index([projectId])
  @@index([type, tag])
}

// ────────────────────────────────────────────
// VIDEO TEMPLATES (Admin managed)
// ────────────────────────────────────────────

model VideoTemplate {
  id              String    @id @default(cuid())
  name            String    // "Tour Căn Hộ"
  slug            String    @unique  // "tour-can-ho"
  description     String?
  thumbnailUrl    String?
  previewVideoUrl String?   // Short demo video

  // Template config
  duration        Int       // Giây
  tokenCost       Int       // Token cần dùng
  resolution      VideoResolution @default(R_1080x1920)
  scenes          Json      // Mô tả từng scene: [{id, name, duration, mediaSlots, textSlots}]

  // Metadata
  category        String?   // "tour", "deal", "introduce", "strategy"
  platforms       String[]  // ["tiktok", "instagram", "facebook"]
  isActive        Boolean   @default(true)
  sortOrder       Int       @default(0)
  usageCount      Int       @default(0)  // Popularity tracking

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  videoJobs       VideoJob[]
  scripts         Script[]

  @@map("video_templates")
  @@index([slug])
  @@index([isActive, sortOrder])
}

model VideoJob {
  id              String          @id @default(cuid())
  userId          String
  projectId       String
  templateId      String

  // Link đến ScriptDraft đã được user approve
  scriptDraftId   String          @unique  // 1 draft → 1 video job

  status          VideoJobStatus  @default(QUEUED)
  resolution      VideoResolution @default(R_1080x1920)

  // Render config (user chọn khi approve draft)
  ttsProvider     String          @default("fptai")   // fptai | elevenlabs
  ttsVoiceId      String          @default("lannhi")
  renderEngine    String          @default("ffmpeg")  // ffmpeg | remotion
  targetPlatform  String          @default("tiktok")

  // Queue tracking
  queuedAt        DateTime        @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  progress        Int             @default(0)      // 0-100
  currentStep     String?         // 'AUDIO_GENERATION' | 'RENDERING' | ...

  // Result
  outputUrl       String?         // CDN URL của video hoàn thành
  thumbnailUrl    String?
  outputKey       String?         // R2 object key
  outputSizeBytes Int?
  duration        Decimal?        @db.Decimal(6, 2)  // Giây

  // Error handling
  errorMessage    String?
  failedStep      String?         // Bước nào lỗi
  retryCount      Int             @default(0)
  lastRetryAt     DateTime?

  // Token tracking
  tokenCost       Int             // Token đã trừ khi tạo job
  tokenRefunded   Boolean         @default(false)

  metadata        Json?           // Extra render config / debug info
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  user            User            @relation(fields: [userId], references: [id])
  project         Project         @relation(fields: [projectId], references: [id])
  template        VideoTemplate   @relation(fields: [templateId], references: [id])
  scriptDraft     ScriptDraft     @relation(fields: [scriptDraftId], references: [id])
  transactions    Transaction[]

  @@map("video_jobs")
  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
  @@index([projectId])
}


// ────────────────────────────────────────────
// MONTHLY CONTENT PLANS
// ────────────────────────────────────────────

model MonthlyPlan {
  id            String    @id @default(cuid())
  userId        String
  projectId     String
  month         Int       // 1-12
  year          Int       // 2026

  // AI-generated plan
  planItems     Json
  // [{
  //   week: 1,
  //   title: "Giới thiệu dự án",
  //   templateSlug: "tour-can-ho",
  //   dueDate: "2026-07-07",
  //   status: "pending" | "video_created",
  //   videoJobId: string | null
  // }]

  totalPlanned  Int       @default(0)
  totalCreated  Int       @default(0)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user          User      @relation(fields: [userId], references: [id])
  project       Project   @relation(fields: [projectId], references: [id])

  @@unique([userId, projectId, month, year])
  @@map("monthly_plans")
  @@index([userId, year, month])
}

// ────────────────────────────────────────────
// NOTIFICATIONS
// ────────────────────────────────────────────

model Notification {
  id          String            @id @default(cuid())
  userId      String
  type        NotificationType
  title       String
  body        String
  isRead      Boolean           @default(false)
  data        Json?             // {videoJobId, transactionId, ...}
  createdAt   DateTime          @default(now())
  readAt      DateTime?

  user        User              @relation(fields: [userId], references: [id])

  @@map("notifications")
  @@index([userId, isRead, createdAt(sort: Desc)])
}
```

---

## Index Strategy

```sql
-- Các index quan trọng cho performance:

-- users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- transactions
CREATE INDEX idx_transactions_user_date ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_gateway ON transactions(gateway_order_id) WHERE gateway_order_id IS NOT NULL;

-- video_jobs
CREATE INDEX idx_video_jobs_user_date ON video_jobs(user_id, created_at DESC);
CREATE INDEX idx_video_jobs_status ON video_jobs(status) WHERE status IN ('QUEUED', 'PROCESSING');

-- media_assets
CREATE INDEX idx_media_assets_project ON media_assets(project_id) WHERE deleted_at IS NULL;

-- notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
```

---

## Seed Data — Token Packages

```ts
const packages = [
  {
    name: 'Starter',
    description: 'Phù hợp cho sale mới bắt đầu',
    tokenAmount: 100,
    priceVnd: 99000,
    priceUsd: 3.99,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Pro',
    description: 'Dành cho sale chuyên nghiệp',
    tokenAmount: 500,
    priceVnd: 399000,
    priceUsd: 15.99,
    isActive: true,
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: 'Business',
    description: 'Cho team và agency bất động sản',
    tokenAmount: 2000,
    priceVnd: 1299000,
    priceUsd: 51.99,
    isActive: true,
    sortOrder: 3,
  },
];
```

---

## Migration Strategy

```bash
# Development
npx prisma migrate dev --name init_schema

# Thêm migration mới
npx prisma migrate dev --name add_monthly_plans

# Production deploy
npx prisma migrate deploy

# Xem database
npx prisma studio
```

---

## Multi-tenancy Notes

- Mọi query PHẢI filter theo `userId` (row-level isolation)
- Middleware `requireOwnership()` kiểm tra resource thuộc về user đang request
- Admin có thể query mọi userId
- Token wallet luôn dùng database transaction (ACID) để tránh race condition trong billing
