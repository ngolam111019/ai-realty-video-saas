-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'VILLA', 'TOWNHOUSE', 'SHOPHOUSE', 'LAND', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO_CLIP', 'PORTRAIT');

-- CreateEnum
CREATE TYPE "MediaTag" AS ENUM ('EXTERIOR', 'LOBBY', 'LIVING_ROOM', 'KITCHEN', 'DINING_ROOM', 'MASTER_BEDROOM', 'BEDROOM', 'BATHROOM', 'BALCONY', 'VIEW', 'AMENITY', 'COMMON_AREA', 'PORTRAIT', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TOKEN_PURCHASE', 'TOKEN_DEDUCT', 'TOKEN_REFUND', 'TOKEN_BONUS');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('STRIPE', 'PAYOS');

-- CreateEnum
CREATE TYPE "VideoJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VideoResolution" AS ENUM ('R_1080x1920', 'R_1080x1080', 'R_1920x1080');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('VIDEO_COMPLETED', 'VIDEO_FAILED', 'TOKEN_LOW', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ScriptDraftStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "googleId" TEXT,
    "preferredVoiceId" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'vi',
    "avatarUrl" TEXT,
    "portraitAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tokenAmount" INTEGER NOT NULL,
    "priceVnd" INTEGER NOT NULL,
    "priceUsd" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "tokenAmount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "packageId" TEXT,
    "amountVnd" INTEGER,
    "amountUsd" DECIMAL(10,2),
    "gateway" "PaymentGateway",
    "gatewayOrderId" TEXT,
    "gatewayRef" TEXT,
    "idempotencyKey" TEXT,
    "videoJobId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "address" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Hồ Chí Minh',
    "area" DECIMAL(10,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floor" INTEGER,
    "totalFloors" INTEGER,
    "facing" TEXT,
    "salePrice" BIGINT,
    "rentPrice" INTEGER,
    "pricePerSqm" BIGINT,
    "priceNote" TEXT,
    "amenities" TEXT[],
    "highlights" TEXT[],
    "description" TEXT,
    "handoverDate" TEXT,
    "legalStatus" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "MediaType" NOT NULL,
    "tag" "MediaTag" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DECIMAL(6,2),
    "aiTagConfidence" DECIMAL(3,2),
    "aiTagLabels" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPortrait" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "previewVideoUrl" TEXT,
    "duration" INTEGER NOT NULL,
    "tokenCost" INTEGER NOT NULL,
    "resolution" "VideoResolution" NOT NULL DEFAULT 'R_1080x1920',
    "scenes" JSONB NOT NULL,
    "category" TEXT,
    "platforms" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "ScriptDraftStatus" NOT NULL DEFAULT 'PROCESSING',
    "title" TEXT,
    "scenes" JSONB,
    "suggestedCaption" TEXT,
    "suggestedHashtags" TEXT[],
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "errorMessage" TEXT,
    "failedStep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scenes" JSONB NOT NULL,
    "suggestedCaption" TEXT,
    "suggestedHashtags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "scriptDraftId" TEXT NOT NULL,
    "status" "VideoJobStatus" NOT NULL DEFAULT 'QUEUED',
    "resolution" "VideoResolution" NOT NULL DEFAULT 'R_1080x1920',
    "ttsProvider" TEXT NOT NULL DEFAULT 'fptai',
    "ttsVoiceId" TEXT NOT NULL DEFAULT 'lannhi',
    "renderEngine" TEXT NOT NULL DEFAULT 'ffmpeg',
    "targetPlatform" TEXT NOT NULL DEFAULT 'tiktok',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "outputUrl" TEXT,
    "thumbnailUrl" TEXT,
    "outputKey" TEXT,
    "outputSizeBytes" INTEGER,
    "duration" DECIMAL(6,2),
    "errorMessage" TEXT,
    "failedStep" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "tokenCost" INTEGER NOT NULL,
    "tokenRefunded" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "planItems" JSONB NOT NULL,
    "totalPlanned" INTEGER NOT NULL DEFAULT 0,
    "totalCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "token_wallets_userId_key" ON "token_wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotencyKey_key" ON "transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "transactions_userId_createdAt_idx" ON "transactions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "transactions_gatewayOrderId_idx" ON "transactions"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "transactions_idempotencyKey_idx" ON "transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "projects_userId_createdAt_idx" ON "projects"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "projects_propertyType_idx" ON "projects"("propertyType");

-- CreateIndex
CREATE INDEX "media_assets_userId_idx" ON "media_assets"("userId");

-- CreateIndex
CREATE INDEX "media_assets_projectId_idx" ON "media_assets"("projectId");

-- CreateIndex
CREATE INDEX "media_assets_type_tag_idx" ON "media_assets"("type", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "video_templates_slug_key" ON "video_templates"("slug");

-- CreateIndex
CREATE INDEX "video_templates_slug_idx" ON "video_templates"("slug");

-- CreateIndex
CREATE INDEX "video_templates_isActive_sortOrder_idx" ON "video_templates"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "script_drafts_userId_idx" ON "script_drafts"("userId");

-- CreateIndex
CREATE INDEX "script_drafts_projectId_idx" ON "script_drafts"("projectId");

-- CreateIndex
CREATE INDEX "scripts_userId_idx" ON "scripts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "video_jobs_scriptDraftId_key" ON "video_jobs"("scriptDraftId");

-- CreateIndex
CREATE INDEX "video_jobs_userId_createdAt_idx" ON "video_jobs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "video_jobs_status_idx" ON "video_jobs"("status");

-- CreateIndex
CREATE INDEX "video_jobs_projectId_idx" ON "video_jobs"("projectId");

-- CreateIndex
CREATE INDEX "monthly_plans_userId_year_month_idx" ON "monthly_plans"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_plans_userId_projectId_month_year_key" ON "monthly_plans"("userId", "projectId", "month", "year");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "token_wallets" ADD CONSTRAINT "token_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "token_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_videoJobId_fkey" FOREIGN KEY ("videoJobId") REFERENCES "video_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_drafts" ADD CONSTRAINT "script_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_drafts" ADD CONSTRAINT "script_drafts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_drafts" ADD CONSTRAINT "script_drafts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "video_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "video_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "video_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_scriptDraftId_fkey" FOREIGN KEY ("scriptDraftId") REFERENCES "script_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
