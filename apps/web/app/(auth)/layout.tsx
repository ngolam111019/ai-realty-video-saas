'use client';

import { useState, useEffect } from 'react';
import { Video, Film, Sparkles, Wand2 } from 'lucide-react';

const SLIDES = [
  {
    icon: <Wand2 className="w-12 h-12 text-purple-400" />,
    title: 'Tự Động Viết Kịch Bản',
    description:
      'AI phân tích hình ảnh/video thô để tự động viết kịch bản thuyết minh tiếng Việt chuẩn chỉnh, hấp dẫn người xem.',
  },
  {
    icon: <Film className="w-12 h-12 text-blue-400" />,
    title: 'Đồng Bộ Hóa Audio-First',
    description:
      'Dựng timeline video tự động co giãn theo tốc độ đọc của giọng nói, đảm bảo khớp khít hoàn hảo.',
  },
  {
    icon: <Sparkles className="w-12 h-12 text-purple-400" />,
    title: 'Phụ Đề & Phối Nhạc',
    description:
      'Tự động chèn phụ đề chạy mượt, chèn logo sale tròn cá nhân và phối nhạc nền thông minh.',
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Left Panel - Brand Showcase */}
      <div className="hidden md:flex md:w-[45%] bg-slate-950/40 border-r border-slate-900 flex-col justify-between p-12 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 text-white font-extrabold text-2xl tracking-wider">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Video size={20} className="text-white" />
          </div>
          <span>AI REALTY</span>
        </div>

        {/* Feature Slider */}
        <div className="space-y-8 my-auto max-w-md">
          <div className="space-y-4">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Giải pháp AI Marketing BĐS
            </span>
            <h1 className="text-4xl font-extrabold leading-tight text-white">
              Tạo Video Triệu View <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                Dễ Dàng Với AI
              </span>
            </h1>
          </div>

          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md transition-all duration-500 min-h-[200px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
                {SLIDES[activeSlide].icon}
              </div>
              <h3 className="text-lg font-bold text-slate-200">{SLIDES[activeSlide].title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {SLIDES[activeSlide].description}
              </p>
            </div>

            {/* Slider Dots */}
            <div className="flex gap-2 pt-6">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeSlide === index ? 'w-6 bg-purple-500' : 'w-1.5 bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer Slogan */}
        <div className="text-xs text-slate-600 font-medium">
          © 2026 AI Realty Video SaaS. Mọi quyền được bảo lưu.
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md bg-slate-900/20 backdrop-blur-md p-8 rounded-3xl border border-slate-900/60 shadow-2xl">
          {children}
        </div>
      </div>
    </main>
  );
}
