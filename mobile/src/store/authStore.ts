import { create } from 'zustand';
import type { User } from '../models/types';
import { authApi, tokenStorage } from '../services/api';
import { disconnectSocket, ensureSocketConnected } from '../services/socket';
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function persistAuth(data: {
  accessToken: string;
  refreshToken: string;
  user: User;
}): Promise<void> {
  await tokenStorage.save(data.accessToken, data.refreshToken, data.user);
}

async function connectSocketBestEffort(): Promise<void> {
  try {
    await ensureSocketConnected();
  } catch {
    /* useSocketBindings reconnects when user state is set */
  }
}

async function beginNewSession(): Promise<void> {
  await disconnectSocket();
  await tokenStorage.clear();
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
      await connectSocketBestEffort();
    } else {
      set({ hydrated: true });
    }
  },

  loginEmail: async (email, password) => {
    try {
      await beginNewSession();
      const res = await authApi.login(normalizeEmail(email), password);
      const data = res.data.data;
      await persistAuth(data);
      set({ user: data.user, accessToken: data.accessToken });
      await connectSocketBestEffort();
    } catch (e) {
      throw new Error(formatApiError(e));
    }
  },

  register: async (email, password, username) => {
    try {
      await beginNewSession();
      const res = await authApi.register(normalizeEmail(email), password, username.trim());
      const data = res.data.data;
      await persistAuth(data);
      set({ user: data.user, accessToken: data.accessToken });
      await connectSocketBestEffort();
    } catch (e) {
      throw new Error(formatApiError(e));
    }
  },

  loginGuest: async (username) => {
    try {
      await beginNewSession();
      const trimmed = username?.trim();
      const res = await authApi.guest(trimmed || undefined);
      const data = res.data.data;
      await persistAuth(data);
      set({ user: data.user, accessToken: data.accessToken });
      await connectSocketBestEffort();
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
