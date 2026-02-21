import { create } from 'zustand';
import type { User } from '../types';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const { access_token } = await authApi.login(username, password);
      localStorage.setItem('access_token', access_token);
      set({ token: access_token });
      const user = await authApi.getMe();
      set({ user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const user = await authApi.getMe();
      set({ user });
    } catch {
      set({ user: null, token: null });
      localStorage.removeItem('access_token');
    }
  },
}));
