import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PREFIX, API_URL } from '../constants';

const TOKEN_KEY = 'r_spade_access_token';
const REFRESH_KEY = 'r_spade_refresh_token';
const USER_KEY = 'r_spade_user';

export const api = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const tokenStorage = {
  async save(accessToken: string, refreshToken: string, user: unknown) {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, accessToken],
      [REFRESH_KEY, refreshToken],
      [USER_KEY, JSON.stringify(user)],
    ]);
  },
  async getAccessToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async getUser<T>() {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async clear() {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  },
};

export const authApi = {
  register: (email: string, password: string, username: string) =>
    api.post('/auth/register', { email, password, username }),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  guest: (username?: string) => api.post('/auth/guest', { username }),
  google: (providerId: string, email: string, username: string) =>
    api.post('/auth/google', { providerId, email, username }),
  apple: (providerId: string, email: string | undefined, username: string) =>
    api.post('/auth/apple', { providerId, email, username }),
  me: () => api.get('/auth/me'),
};

export const roomApi = {
  create: (roomType: 3 | 4 | 5, visibility: 'public' | 'private' = 'public') =>
    api.post('/rooms', { roomType, visibility }),
  join: (payload: { inviteCode?: string; roomId?: string }) => api.post('/rooms/join', payload),
  listPublic: (roomType?: 3 | 4 | 5) =>
    api.get('/rooms/public', { params: roomType ? { roomType } : undefined }),
};

export const statsApi = {
  me: () => api.get('/stats/me'),
  history: () => api.get('/stats/history'),
  leaderboard: () => api.get('/stats/leaderboard'),
  achievements: () => api.get('/stats/achievements'),
};
