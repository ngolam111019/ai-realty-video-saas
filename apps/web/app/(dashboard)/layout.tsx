'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Video,
  LayoutDashboard,
  Folder,
  Sliders,
  CreditCard,
  LogOut,
  Menu,
  X,
  Coins,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { authClient } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { currentUser, tokens, setCurrentUser, setTokens } = useAppStore();
  const userName = currentUser?.name || 'Nhà đầu tư';
  const userEmail = currentUser?.email || 'sales@realty.vn';
  const currentTokens = currentUser ? (tokens ?? 0) : 25;

  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        const session = await authClient.getSession();
        if (!active) return;
        if (session) {
          setCurrentUser(session);
          if (session.wallet) {
            setTokens(session.wallet.balance);
          }
        } else {
          authClient.clearSession();
          window.location.href = '/sign-in';
        }
      } catch (err) {
        if (!active) return;
        authClient.clearSession();
        window.location.href = '/sign-in';
      }
    }
    loadSession();
    return () => {
      active = false;
    };
  }, [setCurrentUser, setTokens]);

  const menuItems = [
    { name: 'Trang chủ', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Dự án của tôi', href: '/dashboard/projects', icon: <Folder size={18} /> },
    {
      name: 'Thư viện mẫu',
      href: '#',
      icon: <Sliders size={18} />,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        alert('Tính năng Thư viện mẫu đang được phát triển, vui lòng quay lại sau!');
      },
    },
    { name: 'Gói cước & Ví', href: '/billing', icon: <CreditCard size={18} /> },
  ];

  const handleLogout = () => {
    authClient.clearSession();
    window.location.href = '/sign-in';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative">
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Mobile Header Bar */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-900/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center">
            <Video size={16} className="text-white" />
          </div>
          <span className="font-extrabold tracking-wider text-sm">AI REALTY</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 rounded-lg border border-slate-850 bg-slate-900/40 text-slate-400 hover:text-slate-200"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-950/40 border-r border-slate-900 flex-col justify-between p-6 shrink-0 relative z-30">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/15">
              <Video size={18} className="text-white" />
            </div>
            <span className="font-extrabold tracking-wider text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
              AI REALTY
            </span>
          </div>

          {/* User Profile Summary */}
          <div className="p-4 rounded-2xl border border-slate-900/80 bg-slate-900/20 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-sm text-slate-200 truncate">{userName}</h4>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
              </div>
            </div>

            <div className="h-[1px] bg-slate-900" />

            {/* Tokens Balance Info */}
            <div className="flex items-center justify-between text-xs bg-slate-900/40 p-2 rounded-lg border border-slate-900/30">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Coins size={14} className="text-amber-500" />
                Số dư Tokens
              </span>
              <span className="font-extrabold text-amber-400">{currentTokens} lượt</span>
            </div>
          </div>

          {/* Menu Navigation */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={item.onClick}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'
                      }
                    >
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600"
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all border border-transparent"
        >
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </aside>

      {/* Mobile Drawer Navigation */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Menu Drawer Content */}
          <div className="relative w-72 bg-slate-950 border-r border-slate-900 h-full p-6 flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center">
                    <Video size={16} className="text-white" />
                  </div>
                  <span className="font-extrabold tracking-wider text-sm">AI REALTY</span>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-lg border border-slate-900 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User Profile Summary - Mobile */}
              <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-sm text-slate-200 truncate">{userName}</h4>
                    <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                  </div>
                </div>
                <div className="h-[1px] bg-slate-900" />
                <div className="flex items-center justify-between text-xs bg-slate-900/40 p-2 rounded-lg">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-500" />
                    Tokens
                  </span>
                  <span className="font-extrabold text-amber-400">{currentTokens} lượt</span>
                </div>
              </div>

              {/* Navigation Menu - Mobile */}
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        setIsMobileOpen(false);
                        if (item.onClick) item.onClick(e);
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-slate-900 border border-slate-800 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Logout Mobile */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 transition-all"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
