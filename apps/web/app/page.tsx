'use client';

import Link from 'next/link';
import { Play, ArrowRight, Zap, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white font-black text-sm">
            AI
          </div>
          <span className="font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-350">
            Realty Video
          </span>
        </div>

        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Workspace
          </Link>
          <Link
            href="/sign-in"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Đăng nhập
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-xs font-bold text-slate-200 transition-all"
          >
            Đăng ký miễn phí
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 max-w-4xl w-full mx-auto space-y-8 my-12">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-wide backdrop-blur-md animate-pulse">
          ✨ Trải nghiệm AI Video Marketing cho BĐS
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
          Tạo Video BĐS Tự Động <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            Chỉ Trong 1 Click Với AI
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Tải ảnh, video thô lên. AI sẽ tự động phân tích bối cảnh, viết kịch bản thuyết minh tiếng
          Việt lôi cuốn và dựng video dọc TikTok/Reels chuyên nghiệp.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            href="/sign-in"
            className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25 transition duration-200 transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
          >
            Bắt đầu miễn phí
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl font-bold text-slate-350 border border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:text-white transition duration-200 backdrop-blur-md text-sm flex items-center gap-1.5"
          >
            Vào Workspace mẫu
            <Play size={12} className="fill-current" />
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 pt-12 w-full text-left">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl border border-slate-900 bg-slate-900/10 backdrop-blur-md hover:border-purple-500/40 transition duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 text-xl font-bold mb-4 group-hover:scale-115 transition duration-300">
              🎙️
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-2">Thuyết Minh FPT.AI</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Giọng đọc trí tuệ nhân tạo mượt mà, đậm chất vùng miền Việt Nam, đồng bộ hoàn hảo với
              video.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl border border-slate-900 bg-slate-900/10 backdrop-blur-md hover:border-blue-500/40 transition duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-xl font-bold mb-4 group-hover:scale-115 transition duration-300">
              <Zap size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-2">Audio-First Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Cơ chế timeline tự động co giãn hình ảnh và căn chỉnh tốc độ video gốc khớp khít lời
              thuyết minh.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl border border-slate-900 bg-slate-900/10 backdrop-blur-md hover:border-slate-800 transition duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-300 text-xl font-bold mb-4 group-hover:scale-115 transition duration-300">
              <ShieldCheck size={20} className="text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-2">Overlay & Subtitles</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Tự động chèn phụ đề tiếng Việt chạy mượt, chèn logo sale tròn và hòa phối nhạc nền
              thông minh.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
