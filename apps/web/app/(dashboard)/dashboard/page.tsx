'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Image, Video, Link2, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, setActiveProject } = useAppStore();
  const userName = currentUser?.name || 'Nhà đầu tư';
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length < 10) return;
    setIsLoading(true);
    try {
      // Gọi API khởi tạo Project với Prompt AI
      const response = await api.post('/projects', {
        name: 'Dự án tạo từ Prompt',
        prompt: prompt,
      });

      const newProject = response.data;
      setActiveProject(newProject);

      // Chuyển hướng đến màn hình wizard để bắt đầu tải lên media hoặc duyệt script
      router.push(`/dashboard/projects/${newProject.id}/wizard`);
    } catch (error) {
      console.error('Lỗi khi tạo dự án bằng prompt:', error);
      // Fallback demo nếu backend api chưa kết nối
      const mockProjectId = 'mock-' + Math.random().toString(36).substring(2, 9);
      router.push(
        `/dashboard/projects/${mockProjectId}/wizard?prompt=${encodeURIComponent(prompt)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolClick = (toolType: string) => {
    const mockProjectId = 'mock-' + Math.random().toString(36).substring(2, 9);
    router.push(`/dashboard/projects/${mockProjectId}/wizard?tool=${toolType}`);
  };

  const toolCards = [
    {
      type: 'images',
      title: 'Tạo từ hình ảnh',
      description: 'Tải bộ ảnh căn hộ lên để AI tự động dựng thành video clip toàn cảnh.',
      icon: <Image className="text-purple-400 w-6 h-6" />,
      colorClass: 'hover:border-purple-500/40 bg-purple-500/5',
      badge: 'Phổ biến',
    },
    {
      type: 'videos',
      title: 'Dựng từ video thô',
      description: 'Tải các đoạn clip quay thô lên. AI sẽ lọc cảnh đẹp, đồng bộ thuyết minh.',
      icon: <Video className="text-blue-400 w-6 h-6" />,
      colorClass: 'hover:border-blue-500/40 bg-blue-500/5',
    },
    {
      type: 'url',
      title: 'Dán Link tin đăng',
      description: 'Nhập link bài báo hoặc link tin đăng BĐS (Batdongsan.com, Chotot...).',
      icon: <Link2 className="text-emerald-400 w-6 h-6" />,
      colorClass: 'hover:border-emerald-500/40 bg-emerald-500/5',
      badge: 'Mới',
    },
    {
      type: 'doc',
      title: 'Tài liệu dự án BĐS',
      description: 'Tải file PDF thông tin dự án, chính sách bán hàng để AI trích xuất kịch bản.',
      icon: <FileText className="text-amber-400 w-6 h-6" />,
      colorClass: 'hover:border-amber-500/40 bg-amber-500/5',
    },
  ];

  return (
    <div className="space-y-12 max-w-5xl">
      {/* Welcome Banner */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
          Chào {userName}, bạn muốn dựng video BĐS nào hôm nay?
        </h1>
        <p className="text-slate-400 text-sm md:text-base font-medium">
          Nhập ý tưởng nhanh của bạn hoặc lựa chọn các công cụ chuyên dụng bên dưới.
        </p>
      </div>

      {/* Prompt Creation Box */}
      <div className="p-6 rounded-3xl border border-slate-900 bg-slate-900/20 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 tracking-wider uppercase">
          <Sparkles size={14} className="animate-pulse" />
          Bắt đầu với một ý tưởng
        </div>

        <form onSubmit={handleCreateFromPrompt} className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Mô tả căn hộ/dự án của bạn (Ví dụ: Tạo video Tiktok giới thiệu căn hộ 2 phòng ngủ Vinhomes Ocean Park full nội thất gỗ cao cấp, ban công hướng Đông Nam mát mẻ, giá bán 3.2 tỷ bao phí...)"
            rows={3}
            className="w-full bg-slate-950/60 border border-slate-900 focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all resize-none"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              {prompt.trim().length >= 10 ? (
                <span className="text-emerald-500/80">✓ Sẵn sàng tạo kịch bản</span>
              ) : (
                <span>Nhập tối thiểu 10 ký tự để AI phân tích</span>
              )}
            </span>
            <button
              type="submit"
              disabled={prompt.trim().length < 10 || isLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Tạo kịch bản nháp
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tools Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2.5">
          Hoặc chọn một công cụ nhập dữ liệu
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {toolCards.map((card) => (
            <button
              key={card.type}
              onClick={() => handleToolClick(card.type)}
              className={`p-5 rounded-2xl border border-slate-900 bg-slate-950/20 text-left transition-all duration-300 relative group flex flex-col justify-between min-h-[160px] ${card.colorClass}`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:scale-110 transition duration-300">
                    {card.icon}
                  </div>
                  {card.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300">
                      {card.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-200 group-hover:text-white transition-colors mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">{card.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
