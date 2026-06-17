'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Save,
  Film,
  Play,
  Image,
  Video,
  CheckCircle2,
  MessageSquare,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Asset {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
}

interface Scene {
  id: string;
  order: number;
  narration: string;
  caption: string;
  assignedAssetId?: string;
}

interface ScriptEditorProps {
  projectId: string;
  draftId?: string;
  uploadedAssets: Asset[];
  onNext: (jobId: string) => void;
}

type DraftStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'idle';

export default function ScriptEditor({
  projectId,
  draftId,
  uploadedAssets = [],
  onNext,
}: ScriptEditorProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [pollingError, setPollingError] = useState<string | null>(null);

  // Ref để dừng polling khi component unmount
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  // Hàm parse scenes từ response data của API
  const parseScenesFromDraft = (data: Record<string, unknown>): Scene[] | null => {
    if (!data.scenes) return null;
    const rawScenes = data.scenes as Array<Record<string, unknown>>;
    if (!Array.isArray(rawScenes) || rawScenes.length === 0) return null;

    return rawScenes.map((s, idx) => ({
      id: String(s.id || `scene-${idx + 1}`),
      order: Number(s.order || idx + 1),
      narration: String(s.narration || ''),
      caption: String(s.caption || ''),
      assignedAssetId:
        s.assignedAssetId
          ? String(s.assignedAssetId)
          : uploadedAssets[idx]?.id || uploadedAssets[0]?.id || undefined,
    }));
  };

  // Hàm load draft và khởi động poll nếu cần
  useEffect(() => {
    async function loadDraft() {
      // Nếu là mock draftId, dùng data mẫu ngay
      if (!draftId || draftId === 'mock') {
        setDraftStatus('READY');
        setScenes(buildMockScenes());
        return;
      }

      // Fetch draft lần đầu
      try {
        const res = await api.get(`/script-drafts/${draftId}`);
        if (!isMountedRef.current) return;

        const data = res.data?.data || res.data;
        const status: DraftStatus = (data.status as DraftStatus) || 'PROCESSING';
        setDraftStatus(status);
        if (data.title) setDraftTitle(data.title);

        if (status === 'READY') {
          const parsed = parseScenesFromDraft(data);
          setScenes(parsed && parsed.length > 0 ? parsed : buildMockScenes());
        } else if (status === 'FAILED') {
          setPollingError(data.errorMessage || 'AI không thể tạo kịch bản. Vui lòng thử lại.');
          setScenes(buildMockScenes());
        } else {
          // PROCESSING → bắt đầu poll
          startPolling(draftId);
        }
      } catch (err) {
        console.error('Lỗi khi tải kịch bản nháp từ API:', err);
        if (isMountedRef.current) {
          setDraftStatus('READY');
          setScenes(buildMockScenes());
        }
      }
    }

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const startPolling = (id: string) => {
    const poll = async () => {
      if (!isMountedRef.current) return;
      try {
        const res = await api.get(`/script-drafts/${id}`);
        if (!isMountedRef.current) return;

        const data = res.data?.data || res.data;
        const status: DraftStatus = (data.status as DraftStatus) || 'PROCESSING';
        setDraftStatus(status);
        if (data.title) setDraftTitle(data.title);

        if (status === 'READY') {
          const parsed = parseScenesFromDraft(data);
          setScenes(parsed && parsed.length > 0 ? parsed : buildMockScenes());
        } else if (status === 'FAILED') {
          setPollingError(data.errorMessage || 'AI không thể tạo kịch bản. Vui lòng thử lại.');
          setScenes(buildMockScenes());
        } else {
          // Tiếp tục poll sau 3 giây
          pollingRef.current = setTimeout(poll, 3000);
        }
      } catch {
        if (isMountedRef.current) {
          // Retry sau 5 giây nếu network error
          pollingRef.current = setTimeout(poll, 5000);
        }
      }
    };

    pollingRef.current = setTimeout(poll, 3000);
  };

  const buildMockScenes = (): Scene[] => [
    {
      id: 'scene-1',
      order: 1,
      narration:
        'Chào mừng các bạn đến với căn hộ cao cấp Vinhomes Golden River. Nơi mang lại trải nghiệm sống đẳng cấp bậc nhất Sài Gòn.',
      caption: 'Chào mừng đến với Vinhomes Golden River 🌟',
      assignedAssetId: uploadedAssets[0]?.id || undefined,
    },
    {
      id: 'scene-2',
      order: 2,
      narration:
        'Không gian phòng khách được thiết kế mở, đón trọn ánh sáng tự nhiên cùng tầm nhìn triệu đô hướng ra sông Sài Gòn.',
      caption: 'Phòng khách mở đón nắng tự nhiên & view sông 🏙️',
      assignedAssetId: uploadedAssets[1]?.id || uploadedAssets[0]?.id || undefined,
    },
    {
      id: 'scene-3',
      order: 3,
      narration:
        'Phòng ngủ master sang trọng, mang phong cách hiện đại với nội thất nhập khẩu cao cấp từ Châu Âu.',
      caption: 'Phòng ngủ Master phong cách Châu Âu 🛌',
      assignedAssetId: uploadedAssets[2]?.id || uploadedAssets[0]?.id || undefined,
    },
  ];

  const handleUpdateScene = (id: string, fields: Partial<Scene>) => {
    setScenes((prev) => prev.map((scene) => (scene.id === id ? { ...scene, ...fields } : scene)));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      if (draftId && draftId !== 'mock') {
        await api.put(`/script-drafts/${draftId}`, { scenes });
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Lỗi khi lưu kịch bản:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartRender = async () => {
    setIsGenerating(true);
    try {
      let jobId = 'mock-job-' + Math.random().toString(36).substring(2, 9);
      try {
        const response = await api.post('/video-jobs', {
          projectId,
          draftId: draftId !== 'mock' ? draftId : undefined,
          scenes: scenes.map((s) => ({
            id: s.id,
            order: s.order,
            narration: s.narration,
            caption: s.caption,
            assetId: s.assignedAssetId,
          })),
        });
        if (response.data && response.data.data) {
          jobId = response.data.data.jobId || response.data.data.id;
        }
      } catch (e) {
        console.warn('Kết nối API Render lỗi, chạy Mock Flow.', e);
      }

      onNext(jobId);
    } catch (err) {
      console.error('Lỗi khi trigger render:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Trạng thái: AI đang xử lý ──
  if (draftStatus === 'PROCESSING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 py-12">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center">
            <Sparkles size={36} className="text-purple-400 animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
            <Loader2 size={14} className="text-white animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <h3 className="text-lg font-bold text-slate-100">
            AI đang phân tích & viết kịch bản...
          </h3>
          <p className="text-xs text-slate-400">
            AI đang đọc thông tin bất động sản của bạn và tạo lời thuyết minh phù hợp.
            Thường mất 15–60 giây.
          </p>
        </div>
        {/* Animated progress bar */}
        <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] w-3/4" />
        </div>
        <p className="text-[10px] text-slate-600 font-medium">Tự động cập nhật khi xong...</p>
      </div>
    );
  }

  // ── Trạng thái: AI thất bại ──
  if (draftStatus === 'FAILED' && pollingError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-slate-100">AI không thể tạo kịch bản</h3>
          <p className="text-xs text-slate-400">{pollingError}</p>
        </div>
        <button
          onClick={() => {
            setDraftStatus('READY');
            setPollingError(null);
            setScenes(buildMockScenes());
          }}
          className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 text-xs font-semibold hover:bg-slate-900 transition-all"
        >
          Dùng kịch bản mẫu để tiếp tục
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Film size={18} className="text-purple-400" />
            Biên Tập Phân Cảnh & Lời Thoại AI
          </h2>
          <p className="text-slate-400 text-xs font-medium">
            {draftTitle && (
              <span className="text-purple-400 font-semibold mr-2">"{draftTitle}"</span>
            )}
            AI đã tạo sẵn kịch bản thô. Bạn có thể tinh chỉnh lời thoại, phụ đề và chỉ định hình ảnh
            phù hợp.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || isGenerating}
            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border border-slate-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saveStatus === 'success' ? 'Đã lưu!' : saveStatus === 'error' ? 'Lỗi lưu!' : 'Lưu nháp'}
          </button>

          <button
            onClick={handleStartRender}
            disabled={isSaving || isGenerating}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Lưu & Dựng Video
                <Play size={12} className="fill-current" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-6">
        {scenes.map((scene, idx) => {
          const isVideo = (assetId?: string) => {
            const asset = uploadedAssets.find((a) => a.id === assetId);
            return asset?.mimeType.startsWith('video/') ?? false;
          };

          return (
            <div
              key={scene.id}
              className="p-6 rounded-3xl border border-slate-900 bg-slate-900/10 backdrop-blur-md relative group flex flex-col md:flex-row gap-6 transition-all hover:border-slate-800/80"
            >
              {/* Index indicator */}
              <div className="absolute -left-3 top-6 w-7 h-7 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:border-purple-500/50 group-hover:text-purple-300 transition-all">
                {idx + 1}
              </div>

              {/* Text Fields */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-purple-400" />
                    Lời thuyết minh AI (Giọng đọc)
                  </label>
                  <textarea
                    rows={2}
                    value={scene.narration}
                    onChange={(e) => handleUpdateScene(scene.id, { narration: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all text-xs"
                    placeholder="Mô tả nội dung AI sẽ thuyết minh cho phân cảnh này..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-blue-400" />
                    Phụ đề hiển thị trên video
                  </label>
                  <input
                    type="text"
                    value={scene.caption}
                    onChange={(e) => handleUpdateScene(scene.id, { caption: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/40 transition-all text-xs"
                    placeholder="Phụ đề ngắn xuất hiện trên màn hình..."
                  />
                </div>
              </div>

              {/* Asset Assignment Area */}
              <div className="w-full md:w-64 space-y-2 shrink-0">
                <label className="text-xs font-bold text-slate-400 block">
                  Hình ảnh / Video gán vào phân cảnh
                </label>

                {/* Selected Asset Preview */}
                <div className="aspect-video rounded-2xl bg-slate-950 border border-slate-900 flex flex-col items-center justify-center text-center p-3 relative overflow-hidden group/preview">
                  {scene.assignedAssetId ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/20">
                      {isVideo(scene.assignedAssetId) ? (
                        <Video size={24} className="text-blue-400 mb-1" />
                      ) : (
                        <Image size={24} className="text-purple-400 mb-1" />
                      )}
                      <span className="text-[10px] font-bold text-slate-200 truncate w-full text-center">
                        {uploadedAssets.find((a) => a.id === scene.assignedAssetId)?.name || 'Asset'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-600 flex flex-col items-center">
                      <Image size={20} className="mb-1 text-slate-700" />
                      <span className="text-[10px] font-medium text-slate-500">
                        Chưa gán tài nguyên
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Asset Selector from uploadedAssets */}
                {uploadedAssets.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      Chọn từ thư viện tải lên:
                    </span>
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
                      {uploadedAssets.map((asset) => {
                        const isSelected = scene.assignedAssetId === asset.id;
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() =>
                              handleUpdateScene(scene.id, { assignedAssetId: asset.id })
                            }
                            title={asset.name}
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs shrink-0 relative transition-all ${
                              isSelected
                                ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                                : 'border-slate-850 hover:border-slate-800 bg-slate-900/40 text-slate-500'
                            }`}
                          >
                            {asset.mimeType.startsWith('video/') ? (
                              <Video size={12} />
                            ) : (
                              <Image size={12} />
                            )}
                            {isSelected && (
                              <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-purple-600 rounded-full flex items-center justify-center text-[8px] text-white">
                                <CheckCircle2 size={9} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic">
                    Hãy quay lại bước 1 để tải ảnh/video lên.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
