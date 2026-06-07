'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  Calendar,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  prompt?: string;
  status: 'READY' | 'RENDERING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  thumbnailUrl?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách dự án:', error);
      // Mock data cho chế độ Demo nếu api chưa khởi động hoặc chưa deploy
      setProjects([
        {
          id: 'p-1',
          name: 'Căn hộ Studio Vinhomes Grand Park',
          prompt: 'Tạo video giới thiệu căn hộ studio diện tích 30m2 đẹp...',
          status: 'COMPLETED',
          createdAt: '2026-06-06T12:00:00.000Z',
          thumbnailUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300',
        },
        {
          id: 'p-2',
          name: 'Biệt thự song lập Aqua City',
          prompt: 'Dựng kịch bản biệt thự Aqua City view sông thoáng mát...',
          status: 'READY',
          createdAt: '2026-06-07T02:30:00.000Z',
        },
        {
          id: 'p-3',
          name: 'Penthouse Riverpark Premier',
          prompt: 'Giới thiệu căn Penthouse xa hoa đẳng cấp Phú Mỹ Hưng...',
          status: 'RENDERING',
          createdAt: '2026-06-07T08:15:00.000Z',
        },
        {
          id: 'p-4',
          name: 'Nhà phố thương mại Shophouse',
          prompt: 'Quay video giới thiệu shophouse kinh doanh đắc địa...',
          status: 'FAILED',
          createdAt: '2026-06-05T09:45:00.000Z',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Lỗi khi xóa dự án:', error);
      // Demo remove
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const renderStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            Đã hoàn thành
          </span>
        );
      case 'RENDERING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            Đang dựng video
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-450 border border-amber-500/20">
            <Play size={12} />
            Chờ duyệt kịch bản
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle size={12} />
            Lỗi dựng
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Dự án của tôi
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-medium">
            Quản lý và theo dõi tiến trình tạo video marketing bất động sản.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg shadow-purple-500/15"
        >
          <Plus size={16} />
          Tạo dự án mới
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-900 rounded-3xl bg-slate-900/10 backdrop-blur-md space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-850 flex items-center justify-center mx-auto text-slate-500">
            <FolderOpen size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-slate-200 font-bold">Chưa có dự án nào</h3>
            <p className="text-xs text-slate-500">
              Bắt đầu tạo kịch bản video BĐS đầu tiên ngay bây giờ!
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex px-4 py-2 rounded-lg bg-slate-900 border border-slate-850 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            Bắt đầu tạo ngay
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}/wizard`}
              className="group rounded-2xl border border-slate-900 bg-slate-950/20 hover:border-slate-800 transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              {/* Image Preview Block */}
              <div className="aspect-video bg-slate-900/80 border-b border-slate-900/60 relative overflow-hidden flex items-center justify-center">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <FolderOpen
                    size={32}
                    className="text-slate-700 group-hover:text-slate-650 transition-colors"
                  />
                )}

                {/* Status Badge in Thumbnail */}
                <div className="absolute top-3 left-3">{renderStatusBadge(project.status)}</div>

                {/* Trash option */}
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-950/60 border border-slate-900 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Text Info Block */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {project.prompt || 'Không có mô tả chi tiết.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                  <Calendar size={12} />
                  <span>{new Date(project.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
