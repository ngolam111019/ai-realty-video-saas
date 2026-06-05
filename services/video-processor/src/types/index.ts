// services/video-processor/src/types/index.ts

export interface ProjectInfo {
  name: string;
  propertyType: string;
  address: string;
  district: string;
  city: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  salePrice?: number;
  amenities: string[];
  highlights: string[];
  legalStatus?: string;
  handoverDate?: string;
  priceNote?: string;
  contactName: string;
  contactPhone: string;
}

export type MediaType = 'IMAGE' | 'VIDEO_CLIP' | 'PORTRAIT';

export type MediaTag =
  | 'EXTERIOR'
  | 'LOBBY'
  | 'LIVING_ROOM'
  | 'BEDROOM'
  | 'BATHROOM'
  | 'KITCHEN'
  | 'BALCONY'
  | 'AMENITY'
  | 'PORTRAIT'
  | 'OTHER';

export type Quality = 'excellent' | 'good' | 'poor' | 'unusable';

export interface MediaAssetRecord {
  id: string;
  type: MediaType;
  storageKey: string;
  storageUrl: string;
  mimeType: string;
}

export interface AssignedAsset {
  assetId: string;
  type: 'IMAGE' | 'VIDEO_CLIP';
  detectedRoom: MediaTag;
  quality: Quality;
  assignmentReason: string;
  thumbnailUrl?: string;
  clipStartSeconds?: number; // chỉ VIDEO_CLIP
  clipEndSeconds?: number; // chỉ VIDEO_CLIP
}

export interface GeneratedScene {
  id: string;
  order: number;
  name: string;
  narration: string;
  caption: string;
  suggestedDurationSeconds: number;
  assignedAssets: AssignedAsset[];
  textOverlays: TextOverlay[];
}

export interface TextOverlay {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  style: 'badge' | 'highlight' | 'subtitle' | 'watermark';
}

export interface GeneratedScript {
  title: string;
  scenes: GeneratedScene[];
  suggestedCaption: string;
  suggestedHashtags: string[];
}

// Sau khi TTS xong, mỗi scene có thêm:
export interface RenderedScene extends GeneratedScene {
  mediaLocalPaths: string[]; // paths local sau download
  audioLocalPath: string; // /tmp/{jobId}/audio/scene_N.mp3
  audioDurationSeconds: number; // từ ffprobe (audio-first!)
  wordTimestamps: WordTimestamp[];
}

export interface WordTimestamp {
  word: string;
  startSeconds: number;
  endSeconds: number;
}
