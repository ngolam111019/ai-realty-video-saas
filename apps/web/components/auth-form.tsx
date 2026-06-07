'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, User, Sparkles } from 'lucide-react';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onSubmit: (data: Record<string, string>) => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function AuthForm({
  mode,
  onSubmit,
  isLoading = false,
  error = null,
}: AuthFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (mode === 'signup' && !name.trim()) {
      newErrors.name = 'Họ và tên là bắt buộc';
    }
    if (!email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không đúng định dạng';
    }
    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ name, email, password });
    }
  };

  const title = mode === 'signin' ? 'Chào mừng quay trở lại' : 'Tạo tài khoản mới';
  const subtitle =
    mode === 'signin'
      ? 'Đăng nhập để tiếp tục dựng video BĐS với AI'
      : 'Bắt đầu dựng video chuyên nghiệp hoàn toàn tự động';

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
          {title}
        </h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 block" htmlFor="name">
              Họ và tên
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <User size={16} />
              </span>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-slate-900/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all ${
                  errors.name ? 'border-red-500/50' : 'border-slate-800'
                }`}
                placeholder="Nguyễn Văn A"
              />
            </div>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 block" htmlFor="email">
            Địa chỉ Email
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Mail size={16} />
            </span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-slate-900/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all ${
                errors.email ? 'border-red-500/50' : 'border-slate-800'
              }`}
              placeholder="name@company.com"
            />
          </div>
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-400 block" htmlFor="password">
              Mật khẩu
            </label>
            {mode === 'signin' && (
              <Link href="#forgot" className="text-xs text-purple-400 hover:text-purple-300">
                Quên mật khẩu?
              </Link>
            )}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Lock size={16} />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              className={`w-full pl-10 pr-10 py-2.5 rounded-lg border bg-slate-900/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all ${
                errors.password ? 'border-red-500/50' : 'border-slate-800'
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles size={16} />
              {mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </>
          )}
        </button>
      </form>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-800"></div>
        <span className="flex-shrink mx-4 text-slate-500 text-xs font-medium uppercase">Hoặc</span>
        <div className="flex-grow border-t border-slate-800"></div>
      </div>

      <button
        type="button"
        className="w-full py-2.5 px-4 rounded-lg border border-slate-800 bg-slate-900/20 hover:bg-slate-900/50 text-slate-300 hover:text-white font-semibold flex items-center justify-center gap-3 transition-all duration-200"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Tiếp tục với Google
      </button>

      <p className="text-center text-sm text-slate-500">
        {mode === 'signin' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
        <Link
          href={mode === 'signin' ? '/sign-up' : '/sign-in'}
          className="text-purple-400 hover:text-purple-300 font-bold ml-1 transition-colors"
        >
          {mode === 'signin' ? 'Đăng ký ngay' : 'Đăng nhập'}
        </Link>
      </p>
    </div>
  );
}
