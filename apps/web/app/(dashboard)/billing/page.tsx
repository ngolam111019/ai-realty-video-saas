'use client';

import { useState } from 'react';
import { CreditCard, Sparkles, Check, Flame, Zap, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

interface Plan {
  name: string;
  price: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  tokens: number;
}

export default function BillingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const tokensCount = 15; // Mock current tokens balance

  const plans: Plan[] = [
    {
      name: 'Starter',
      price: '200.000',
      description: 'Lựa chọn cơ bản cho môi giới BĐS cá nhân bắt đầu làm video.',
      tokens: 10,
      features: [
        'Dựng 10 Video/tháng',
        'Xuất video chất lượng 720p',
        'Giọng đọc AI Tiếng Việt chuẩn',
        'Lưu trữ file tối đa 50MB/file',
        'Hỗ trợ qua Email',
      ],
      icon: <Zap className="text-blue-400" size={20} />,
    },
    {
      name: 'Professional',
      price: '500.000',
      description: 'Gói tối ưu nhất dành cho môi giới chuyên nghiệp hoặc sàn giao dịch nhỏ.',
      tokens: 35,
      popular: true,
      features: [
        'Dựng 35 Video/tháng',
        'Xuất video chất lượng 1080p HD',
        'Truy cập toàn bộ giọng đọc AI Premium',
        'Lưu trữ file lớn đến 2GB/file',
        'Xóa logo watermark của hệ thống',
        'Hỗ trợ ưu tiên 24/7',
      ],
      icon: <Flame className="text-purple-400 animate-pulse" size={20} />,
    },
    {
      name: 'Enterprise',
      price: '1.500.000',
      description: 'Dành cho các sàn giao dịch lớn và các doanh nghiệp BĐS chuyên nghiệp.',
      tokens: 120,
      features: [
        'Dựng 120 Video/tháng',
        'Xuất video chất lượng 4K Ultra HD',
        'Giọng đọc AI thiết kế riêng độc quyền',
        'Không giới hạn dung lượng tải lên',
        'Custom template/bố cục video riêng biệt',
        'Hợp đồng SLA & Quản lý tài khoản riêng',
      ],
      icon: <ShieldCheck className="text-emerald-400" size={20} />,
    },
  ];

  const handleSubscribe = async (planName: string, amount: number) => {
    setLoadingPlan(planName);
    try {
      let checkoutUrl = '';
      try {
        const response = await api.post('/billing/payos/create-order', {
          planName,
          amount,
        });
        if (response.data && response.data.checkoutUrl) {
          checkoutUrl = response.data.checkoutUrl;
        }
      } catch (e) {
        console.warn('API /billing/payos/create-order lỗi, sử dụng demo flow.', e);
      }

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        // Fallback checkout URL (PayOS sandbox simulation)
        const mockRedirectUrl = `/billing/callback?status=PAID&orderCode=${Math.floor(
          Math.random() * 1000000,
        )}&planName=${encodeURIComponent(planName)}`;
        alert(
          'Hệ thống đang chạy chế độ thử nghiệm thanh toán PayOS. Chuyển hướng đến màn hình thanh toán giả lập.',
        );
        window.location.href = mockRedirectUrl;
      }
    } catch (err) {
      console.error('Lỗi khi đăng ký gói cước:', err);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-12">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Nâng Gói Cước & Mua Token
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-medium">
            Chọn gói cước phù hợp hoặc mua lẻ lượt render video thông qua cổng thanh toán QR PayOS.
          </p>
        </div>

        {/* Current Balance Token */}
        <div className="p-4 rounded-2xl border border-purple-500/25 bg-purple-500/5 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Số dư tài khoản
            </span>
            <span className="text-base font-extrabold text-slate-200">
              {tokensCount} lượt dựng Video AI
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`p-6 rounded-3xl border flex flex-col justify-between relative transition-all ${
              plan.popular
                ? 'border-purple-500/40 bg-gradient-to-b from-purple-500/5 to-transparent shadow-xl shadow-purple-500/5'
                : 'border-slate-900 bg-slate-900/10'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-purple-600 text-[9px] font-bold text-white uppercase tracking-wider">
                Khuyên Dùng
              </span>
            )}

            <div className="space-y-5">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-slate-200">{plan.price}đ</span>
                    <span className="text-slate-500 text-xs font-semibold">/ tháng</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-center">
                  {plan.icon}
                </div>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                {plan.description}
              </p>

              {/* Feature List */}
              <ul className="space-y-2.5 pt-2 border-t border-slate-900">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-xs text-slate-350 font-medium"
                  >
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleSubscribe(plan.name, parseInt(plan.price.replace(/\./g, '')))}
              disabled={loadingPlan !== null}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs mt-6 transition-all duration-200 ${
                plan.popular
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
                  : 'bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300'
              } disabled:opacity-50`}
            >
              {loadingPlan === plan.name ? (
                <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                `Đăng ký gói ${plan.name}`
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Mua lẻ token */}
      <div className="p-8 rounded-3xl border border-slate-900 bg-slate-900/10 space-y-6">
        <div className="space-y-1">
          <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
            <CreditCard size={18} className="text-blue-400" />
            Mua lẻ lượt dựng video (AI Tokens)
          </h3>
          <p className="text-slate-400 text-xs font-medium">
            Không cần nâng cấp gói cước tháng? Bạn có thể mua lẻ token bất kỳ lúc nào để dựng video
            ngay lập tức.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { tokens: 5, price: '30.000', label: 'Cơ bản' },
            { tokens: 20, price: '100.000', label: 'Phổ biến' },
            { tokens: 50, price: '220.000', label: 'Tiết kiệm' },
          ].map((item) => (
            <button
              key={item.tokens}
              disabled={loadingPlan !== null}
              onClick={() =>
                handleSubscribe(
                  `${item.tokens} Tokens Pack`,
                  parseInt(item.price.replace(/\./g, '')),
                )
              }
              className="p-5 rounded-2xl border border-slate-900/60 bg-slate-950/20 hover:border-slate-800 text-left space-y-3 transition-all hover:bg-slate-900/20 group"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                  {item.label}
                </span>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-400 transition-all">
                  Mua ngay →
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-lg font-extrabold text-slate-200">
                  +{item.tokens} Lượt dựng
                </div>
                <div className="text-xs text-slate-500 font-bold">{item.price}đ VNĐ</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
