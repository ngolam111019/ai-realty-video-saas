export const authClient = {
  async getSession() {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    try {
      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error();
      return await response.json();
    } catch {
      return null;
    }
  },

  async login(email: string, passwordString: string) {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: passwordString }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Đăng nhập không thành công');
    }
    const data = await response.json();
    this.setSession(data.token);
    return data;
  },

  async register(email: string, passwordString: string, name: string) {
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: passwordString, name }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Đăng ký không thành công');
    }
    const data = await response.json();
    this.setSession(data.token);
    return data;
  },

  setSession(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
    document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Lax`;
  },

  clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  },
};
