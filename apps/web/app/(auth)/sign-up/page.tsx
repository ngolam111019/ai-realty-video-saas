'use client';

import { useState } from 'react';
import AuthForm from '@/components/auth-form';
import { authClient } from '@/lib/auth';

export default function SignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (data: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!data.email || !data.password || !data.name) {
        throw new Error('Họ tên, email và mật khẩu không được trống');
      }
      await authClient.register(data.email, data.password, data.name);
      window.location.href = '/dashboard';
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'Có lỗi xảy ra khi tạo tài khoản.');
    } finally {
      setIsLoading(false);
    }
  };

  return <AuthForm mode="signup" onSubmit={handleSignUp} isLoading={isLoading} error={error} />;
}
