// apps/web/app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full text-center z-10 space-y-8">
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
        <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
          Tải ảnh, video thô lên. AI sẽ tự động phân tích bối cảnh, viết kịch bản thuyết minh tiếng
          Việt lôi cuốn và dựng video dọc TikTok/Reels chuyên nghiệp.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <a
            href="#try"
            className="px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25 transition duration-200 transform hover:-translate-y-0.5"
          >
            Bắt đầu miễn phí
          </a>
          <a
            href="#demo"
            className="px-6 py-3 rounded-lg font-bold text-slate-300 border border-slate-700 bg-slate-900/50 hover:bg-slate-900 hover:text-white transition duration-200 backdrop-blur-md"
          >
            Xem video mẫu
          </a>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 pt-12">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md text-left hover:border-purple-500/40 transition duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 text-xl font-bold mb-4 group-hover:scale-110 transition duration-300">
              🎙️
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Thuyết Minh FPT.AI</h3>
            <p className="text-sm text-slate-400">
              Giọng đọc trí tuệ nhân tạo mượt mà, đậm chất vùng miền Việt Nam, đồng bộ hoàn hảo với
              video.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md text-left hover:border-blue-500/40 transition duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-xl font-bold mb-4 group-hover:scale-110 transition duration-300">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Audio-First Sync</h3>
            <p className="text-sm text-slate-400">
              Cơ chế timeline tự động co giãn hình ảnh và căn chỉnh tốc độ video gốc khớp khít lời
              thuyết minh.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md text-left hover:border-slate-700 transition duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 text-xl font-bold mb-4 group-hover:scale-110 transition duration-300">
              🎨
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Overlay & Subtitles</h3>
            <p className="text-sm text-slate-400">
              Tự động chèn phụ đề tiếng Việt chạy mượt, chèn logo sale tròn và hòa phối nhạc nền
              thông minh.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
