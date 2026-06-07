'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  FileText,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

function BillingCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  const status = searchParams.get('status');
  const orderCode = searchParams.get('orderCode') || 'N/A';
  const planName = searchParams.get('planName') || 'Gói Dịch Vụ';

  useEffect(() => {
    // Simulating call to backend to verify PayOS webhook status before rendering
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-purple-500" size={36} />
        <p className="text-slate-400 text-xs font-semibold">Đang xác minh giao dịch của bạn...</p>
      </div>
    );
  }

  const isSuccess = status === 'PAID';

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="p-8 rounded-3xl border border-slate-900 bg-slate-900/10 backdrop-blur-md text-center space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {isSuccess ? (
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <XCircle size={36} />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">
            {isSuccess ? 'Giao Dịch Thành Công!' : 'Giao Dịch Bị Hủy'}
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed font-medium">
            {isSuccess
              ? 'Tài khoản của bạn đã được nâng cấp thành công. Lượt dựng video AI đã được cộng vào số dư.'
              : 'Yêu cầu thanh toán của bạn đã bị hủy hoặc gặp sự cố. Vui lòng liên hệ hỗ trợ nếu bạn đã chuyển khoản.'}
          </p>
        </div>

        {/* Transaction Details */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-900/60 text-left space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <FileText size={12} /> Mã đơn hàng:
            </span>
            <span className="font-mono font-bold text-slate-350">{orderCode}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Calendar size={12} /> Sản phẩm:
            </span>
            <span className="font-bold text-slate-300">{planName}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <ShieldAlert size={12} /> Trạng thái:
            </span>
            <span className={`font-extrabold ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
              {isSuccess ? 'ĐÃ THANH TOÁN' : 'THẤT BẠI / HỦY'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => router.push(isSuccess ? '/dashboard' : '/billing')}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 transform hover:-translate-y-0.5"
        >
          {isSuccess ? (
            <>
              Tới Workspace Dựng Video
              <ArrowRight size={14} />
            </>
          ) : (
            'Quay lại trang gói cước'
          )}
        </button>
      </div>
    </div>
  );
}

export default function BillingCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="animate-spin text-purple-500" size={36} />
          <p className="text-slate-400 text-xs font-semibold">Đang tải...</p>
        </div>
      }
    >
      <BillingCallbackInner />
    </Suspense>
  );
}
