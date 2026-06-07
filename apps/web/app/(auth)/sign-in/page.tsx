'use client';

import { useState } from 'react';
import AuthForm from '@/components/auth-form';
import { authClient } from '@/lib/auth';

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (data: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!data.email || !data.password) {
        throw new Error('Email và mật khẩu không được trống');
      }
      await authClient.login(data.email, data.password);
      window.location.href = '/dashboard';
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  return <AuthForm mode="signin" onSubmit={handleSignIn} isLoading={isLoading} error={error} />;
}
