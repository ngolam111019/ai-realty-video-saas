import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface AppState {
  currentUser: User | null;
  activeProject: Project | null;
  tokens: number;
  setCurrentUser: (user: User | null) => void;
  setActiveProject: (project: Project | null) => void;
  setTokens: (tokens: number) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  activeProject: null,
  tokens: 0,
  setCurrentUser: (user) => set({ currentUser: user }),
  setActiveProject: (project) => set({ activeProject: project }),
  setTokens: (tokens) => set({ tokens }),
  reset: () => set({ currentUser: null, activeProject: null, tokens: 0 }),
}));
