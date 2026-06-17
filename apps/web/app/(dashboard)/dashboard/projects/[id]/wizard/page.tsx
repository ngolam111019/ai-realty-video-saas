'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Home, DollarSign, MapPin, Sparkles, FileVideo, ChevronRight, Eye } from 'lucide-react';
import FileUpload from '@/components/file-upload';
import ScriptEditor from '@/components/script-editor';
import VideoRenderPlayer from '@/components/video-render-player';
import { api } from '@/lib/api';

const projectFormSchema = z.object({
  name: z.string().min(3, 'Tên dự án phải có ít nhất 3 ký tự'),
  propertyType: z.string().min(1, 'Vui lòng chọn loại hình bất động sản'),
  address: z.string().min(5, 'Địa chỉ chi tiết phải có ít nhất 5 ký tự'),
  price: z.string().regex(/^\d+$/, 'Giá trị phải là chữ số và không chứa ký tự khác'),
  description: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface Asset {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
}

// Key để lưu assets vào sessionStorage khi chuyển bước
const getAssetsSessionKey = (projectId: string) => `wizard_assets_${projectId}`;

export default function ProjectWizardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const projectId = params.id as string;
  const currentStep = searchParams.get('step') || '1';
  const draftId = searchParams.get('draftId') || 'mock';
  const jobId = searchParams.get('jobId') || '';
  const initialPrompt = searchParams.get('prompt') || '';

  const [uploadedAssets, setUploadedAssets] = useState<Asset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  // Lưu projectId thật sau khi tạo (nếu ban đầu là mock-)
  const [realProjectId, setRealProjectId] = useState<string>(projectId);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: initialPrompt ? 'Dự án BĐS từ Prompt' : '',
      propertyType: 'apartment',
      address: '',
      price: '',
      description: initialPrompt,
    },
  });

  // Load project information and existing media assets
  useEffect(() => {
    async function fetchProject() {
      // Nếu là mock-ID → không fetch, nhưng vẫn check sessionStorage
      if (projectId.startsWith('mock-')) {
        setRealProjectId(projectId); // tạm thời, sẽ được gán lại khi submit
        setIsLoadingProject(false);
        return;
      }

      // Nếu đang ở Step 2+, khôi phục assets từ sessionStorage
      if (currentStep !== '1') {
        const stored = sessionStorage.getItem(getAssetsSessionKey(projectId));
        if (stored) {
          try {
            setUploadedAssets(JSON.parse(stored));
          } catch {
            // ignore parse error
          }
        }
      }

      try {
        const res = await api.get(`/projects/${projectId}`);
        if (res.data) {
          const project = res.data;
          if (project.name) setValue('name', project.name);
          if (project.propertyType) setValue('propertyType', project.propertyType.toLowerCase());
          if (project.address) setValue('address', project.address);
          if (project.salePrice) setValue('price', String(project.salePrice));
          if (project.description) setValue('description', project.description);
          if (project.mediaAssets && project.mediaAssets.length > 0) {
            setUploadedAssets(
              project.mediaAssets.map((a: Record<string, unknown>) => ({
                id: String(a.id || ''),
                name: String(a.fileName || 'file'),
                mimeType: String(a.mimeType || 'image/png'),
                size: Number(a.fileSize || 0),
              })),
            );
          }
        }
        setRealProjectId(projectId);
      } catch (err) {
        console.warn('Lấy thông tin dự án lỗi hoặc chưa có backend, sử dụng dữ liệu trống.', err);
      } finally {
        setIsLoadingProject(false);
      }
    }

    fetchProject();
  }, [projectId, setValue, currentStep]);

  const handleUploadComplete = (newAssets: Array<Record<string, unknown>>) => {
    const formatted = newAssets.map((a) => ({
      id: String(a.id || ''),
      name: String(a.name || a.fileName || 'file-name'),
      mimeType: String(a.mimeType || 'image/png'),
      size: Number(a.size || a.fileSize || 0),
    }));
    setUploadedAssets((prev) => [...prev, ...formatted]);
  };

  const onSubmit = async (values: ProjectFormValues) => {
    if (uploadedAssets.length === 0) {
      alert('Vui lòng tải lên ít nhất 1 hình ảnh hoặc video của bất động sản!');
      return;
    }
    setIsSubmitting(true);

    try {
      let activeProjectId = realProjectId;

      // ── Bước A: Nếu là mock projectId, tạo project thật trước ──
      if (projectId.startsWith('mock-')) {
        try {
          const createRes = await api.post('/projects', {
            name: values.name,
            propertyType: values.propertyType.toUpperCase(),
            address: values.address,
            salePrice: parseFloat(values.price),
            description: values.description,
          });
          activeProjectId = createRes.data.id;
          setRealProjectId(activeProjectId);
        } catch (createErr) {
          console.warn('Không thể tạo project mới, tiếp tục với mock flow.', createErr);
          // Vẫn tiếp tục với mock nếu backend lỗi
        }
      } else {
        // ── Bước A (khi đã có projectId thật): Cập nhật thông tin project ──
        await api.put(`/projects/${activeProjectId}`, {
          name: values.name,
          propertyType: values.propertyType,
          address: values.address,
          price: parseFloat(values.price),
          description: values.description,
          assets: uploadedAssets
            .map((a) => a.id)
            .filter((id) => !id.startsWith('mock-asset-')),
        });
      }

      // ── Bước B: Lưu uploadedAssets vào sessionStorage để dùng ở Step 2 ──
      sessionStorage.setItem(
        getAssetsSessionKey(activeProjectId),
        JSON.stringify(uploadedAssets),
      );

      // ── Bước C: Tạo ScriptDraft và kick-off AI job ──
      let activeDraftId = 'mock';
      try {
        // Chỉ truyền asset ID thật (không phải mock) cho AI phân tích
        const realAssetIds = uploadedAssets
          .map((a) => a.id)
          .filter((id) => !id.startsWith('mock-asset-'));

        const draftResponse = await api.post('/script-drafts', {
          projectId: activeProjectId,
          mediaAssetIds: realAssetIds,
          targetPlatform: 'TIKTOK',
        });

        if (draftResponse.data && draftResponse.data.data && draftResponse.data.data.id) {
          activeDraftId = draftResponse.data.data.id;
        }
      } catch (e) {
        console.warn('Tạo kịch bản nháp API lỗi, chạy Mock Flow.', e);
        // Lưu cả assets cho mock projectId
        sessionStorage.setItem(
          getAssetsSessionKey(projectId),
          JSON.stringify(uploadedAssets),
        );
      }

      // ── Bước D: Chuyển sang Step 2 với projectId và draftId thật ──
      router.push(
        `/dashboard/projects/${activeProjectId}/wizard?step=2&draftId=${activeDraftId}`,
      );
    } catch (error) {
      console.error('Lỗi khi lưu dự án:', error);
      // Fallback: lưu assets cho mock và chuyển bước
      sessionStorage.setItem(getAssetsSessionKey(projectId), JSON.stringify(uploadedAssets));
      router.push(`/dashboard/projects/${projectId}/wizard?step=2&draftId=mock`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-semibold">Đang tải thông tin dự án...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Step Indicators */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-5 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Dựng Video AI
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-medium">
            {currentStep === '1' && 'Điền thông tin và đăng tải tài nguyên để bắt đầu.'}
            {currentStep === '2' && 'Chỉnh sửa kịch bản thuyết minh và gán tài nguyên.'}
            {currentStep === '3' && 'Theo dõi tiến trình AI tạo video và xem thành phẩm.'}
          </p>
        </div>

        {/* Step badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            onClick={() =>
              uploadedAssets.length > 0 &&
              router.push(`/dashboard/projects/${realProjectId}/wizard?step=1`)
            }
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              currentStep === '1'
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                : 'bg-slate-900/40 text-slate-400 border-slate-850 hover:text-slate-350'
            }`}
          >
            1. Thông tin & File
          </span>
          <ChevronRight size={12} className="text-slate-700" />
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              currentStep === '2'
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                : 'bg-slate-900/40 text-slate-400 border-slate-850'
            }`}
          >
            2. Duyệt kịch bản
          </span>
          <ChevronRight size={12} className="text-slate-700" />
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              currentStep === '3'
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                : 'bg-slate-900/40 text-slate-400 border-slate-850'
            }`}
          >
            3. Dựng Video
          </span>
        </div>
      </div>

      {/* Conditional steps rendering */}
      {currentStep === '1' && (
        <div className="grid md:grid-cols-5 gap-8">
          {/* Left Column: Property Detail Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-3 space-y-6">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2.5">
              <Home size={18} className="text-purple-400" />
              1. Thông tin Bất động sản
            </h2>

            <div className="space-y-4 p-6 rounded-3xl border border-slate-900 bg-slate-900/10 backdrop-blur-md">
              {/* Project Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 block" htmlFor="name">
                  Tên Dự Án / Tiêu Đề Video
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className={`w-full px-4 py-2 rounded-xl border bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/25 focus:border-purple-500/40 transition-all ${
                    errors.name ? 'border-red-500/50' : 'border-slate-800'
                  }`}
                  placeholder="Ví dụ: Căn hộ cao cấp Vinhomes Golden River"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Property Type */}
                <div className="space-y-1">
                  <label
                    className="text-xs font-semibold text-slate-400 block"
                    htmlFor="propertyType"
                  >
                    Loại Hình
                  </label>
                  <select
                    id="propertyType"
                    {...register('propertyType')}
                    className="w-full px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-100 focus:outline-none focus:border-purple-500/40 transition-all"
                  >
                    <option value="apartment">Căn hộ</option>
                    <option value="villa">Biệt thự</option>
                    <option value="shophouse">Nhà phố thương mại</option>
                    <option value="land">Đất nền</option>
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 block" htmlFor="price">
                    Giá bán (VNĐ)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <DollarSign size={14} />
                    </span>
                    <input
                      id="price"
                      type="text"
                      {...register('price')}
                      className={`w-full pl-8 pr-4 py-2 rounded-xl border bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/25 focus:border-purple-500/40 transition-all ${
                        errors.price ? 'border-red-500/50' : 'border-slate-800'
                      }`}
                      placeholder="Ví dụ: 3500000000"
                    />
                  </div>
                  {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 block" htmlFor="address">
                  Địa Chỉ Chi Tiết
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <MapPin size={14} />
                  </span>
                  <input
                    id="address"
                    type="text"
                    {...register('address')}
                    className={`w-full pl-8 pr-4 py-2 rounded-xl border bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/25 focus:border-purple-500/40 transition-all ${
                      errors.address ? 'border-red-500/50' : 'border-slate-800'
                    }`}
                    placeholder="2 Tôn Đức Thắng, Bến Nghé, Quận 1"
                  />
                </div>
                {errors.address && (
                  <p className="text-xs text-red-500">{errors.address.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label
                  className="text-xs font-semibold text-slate-400 block"
                  htmlFor="description"
                >
                  Ý Tưởng/Mô Tả Thêm Của Bạn
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/40 transition-all resize-none text-xs"
                  placeholder="AI sẽ kết hợp thông tin trên cùng ý tưởng này để viết lời thuyết minh."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang gửi thông tin & khởi động AI...</span>
                </>
              ) : (
                <>
                  Tiếp Tục Tạo Kịch Bản
                  <Sparkles size={16} />
                </>
              )}
            </button>
          </form>

          {/* Right Column: Drag-Drop Media Uploader */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2.5">
              <FileVideo size={18} className="text-purple-400" />
              2. Tài nguyên căn hộ
            </h2>

            <FileUpload projectId={projectId} onUploadComplete={handleUploadComplete} />

            {/* Uploaded assets quick preview */}
            {uploadedAssets.length > 0 && (
              <div className="p-4 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Đã tải lên thành công</span>
                  <span className="text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                    {uploadedAssets.length} file
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {uploadedAssets.map((asset, i) => (
                    <div
                      key={i}
                      title={asset.name}
                      className="aspect-square rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 relative overflow-hidden"
                    >
                      <Eye size={16} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep === '2' && (
        <ScriptEditor
          projectId={realProjectId}
          draftId={draftId}
          uploadedAssets={uploadedAssets}
          onNext={(renderedJobId) => {
            router.push(
              `/dashboard/projects/${realProjectId}/wizard?step=3&jobId=${renderedJobId}`,
            );
          }}
        />
      )}

      {currentStep === '3' && (
        <VideoRenderPlayer
          jobId={jobId}
          projectId={realProjectId}
          onBackToEdit={() => {
            router.push(`/dashboard/projects/${realProjectId}/wizard?step=2&draftId=${draftId}`);
          }}
        />
      )}
    </div>
  );
}
