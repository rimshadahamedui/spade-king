import { create } from 'zustand';
import type { User } from '../models/types';
import { authApi, tokenStorage } from '../services/api';
import { ensureSocketConnected, disconnectSocket } from '../services/socket';
import { formatApiError } from '../utils/network';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  loginGuest: (username?: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function applyAuth(data: {
  accessToken: string;
  refreshToken: string;
  user: User;
}): Promise<void> {
  await tokenStorage.save(data.accessToken, data.refreshToken, data.user);
  await ensureSocketConnected();
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrated: false,

  hydrate: async () => {
    const user = await tokenStorage.getUser<User>();
    const accessToken = await tokenStorage.getAccessToken();
    if (user && accessToken) {
      set({ user, accessToken, hydrated: true });
      try {
        await ensureSocketConnected();
      } catch {
        /* socket will retry when bindings mount */
      }
    } else {
      set({ hydrated: true });
    }
  },

  loginEmail: async (email, password) => {
    try {
      const res = await authApi.login(email, password);
      await applyAuth(res.data.data);
      set({ user: res.data.data.user, accessToken: res.data.data.accessToken });
    } catch (e) {
      throw new Error(formatApiError(e));
    }
  },

  register: async (email, password, username) => {
    try {
      const res = await authApi.register(email, password, username);
      await applyAuth(res.data.data);
      set({ user: res.data.data.user, accessToken: res.data.data.accessToken });
    } catch (e) {
      throw new Error(formatApiError(e));
    }
  },

  loginGuest: async (username) => {
    try {
      const res = await authApi.guest(username);
      await applyAuth(res.data.data);
      set({ user: res.data.data.user, accessToken: res.data.data.accessToken });
    } catch (e) {
      throw new Error(formatApiError(e));
    }
  },

  logout: async () => {
    await disconnectSocket();
    await tokenStorage.clear();
    set({ user: null, accessToken: null });
  },
}));
