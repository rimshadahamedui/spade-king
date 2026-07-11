import axios, { type AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PREFIX, API_URL } from '../constants';

const TOKEN_KEY = 'r_spade_access_token';
const REFRESH_KEY = 'r_spade_refresh_token';
const USER_KEY = 'r_spade_user';

const AUTH_PATHS = ['/auth/register', '/auth/login', '/auth/guest', '/auth/google', '/auth/apple'];

/** Auth calls use a plain client so a stale token or storage glitch cannot block sign-in. */
export const authHttp: AxiosInstance = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

export const api = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const path = config.url ?? '';
  if (AUTH_PATHS.some((authPath) => path === authPath || path.endsWith(authPath))) {
    return config;
  }

  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* proceed without token */
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
    authHttp.post('/auth/register', { email, password, username }),
  login: (email: string, password: string) => authHttp.post('/auth/login', { email, password }),
  guest: (username?: string) => authHttp.post('/auth/guest', username ? { username } : {}),
  google: (providerId: string, email: string, username: string) =>
    authHttp.post('/auth/google', { providerId, email, username }),
  apple: (providerId: string, email: string | undefined, username: string) =>
    authHttp.post('/auth/apple', { providerId, email, username }),
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
  matchDetail: (matchId: string) => api.get(`/stats/match/${matchId}`),
  leaderboard: () => api.get('/stats/leaderboard'),
  achievements: () => api.get('/stats/achievements'),
};
