import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, SOCKET_URL } from '../constants';
import { tokenStorage } from './api';

let socket: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;
let sessionRestoreTimer: ReturnType<typeof setTimeout> | null = null;
let sessionRestoreInFlight = false;

type SessionRestoreHandler = () => void | Promise<void>;
let onSessionRestore: SessionRestoreHandler | null = null;

export function registerSessionRestore(handler: SessionRestoreHandler): void {
  onSessionRestore = handler;
}

function scheduleSessionRestore(): void {
  if (sessionRestoreTimer) clearTimeout(sessionRestoreTimer);
  sessionRestoreTimer = setTimeout(() => {
    sessionRestoreTimer = null;
    if (!onSessionRestore || sessionRestoreInFlight) return;
    sessionRestoreInFlight = true;
    void Promise.resolve(onSessionRestore())
      .catch(() => undefined)
      .finally(() => {
        sessionRestoreInFlight = false;
      });
  }, 200);
}

function attachDebugHandlers(s: Socket): void {
  s.off('connect').on('connect', () => {
    if (__DEV__) console.log('[socket] connected', s.id);
    scheduleSessionRestore();
  });
  s.off('disconnect').on('disconnect', (reason) => {
    if (__DEV__) console.log('[socket] disconnected', reason);
  });
  s.off('connect_error').on('connect_error', (err) => {
    if (__DEV__) console.warn('[socket] connect_error', err.message);
  });
}

/** Ensures an authenticated socket connection. Reconnects when the token changes. */
export async function ensureSocketConnected(): Promise<Socket> {
  const token = await tokenStorage.getAccessToken();
  if (!token) throw new Error('Not authenticated — sign in first');

  if (socket?.connected) {
    const current = (socket.auth as { token?: string } | undefined)?.token;
    if (current === token) return socket;
    socket.disconnect();
    socket = null;
  }

  if (connectPromise) return connectPromise;

  connectPromise = new Promise<Socket>((resolve, reject) => {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 20000,
      autoConnect: true,
    });

    attachDebugHandlers(socket);

    const onConnect = () => {
      cleanup();
      connectPromise = null;
      resolve(socket!);
    };

    const onError = (err: Error) => {
      cleanup();
      connectPromise = null;
      reject(err);
    };

    const cleanup = () => {
      socket?.off('connect', onConnect);
      socket?.off('connect_error', onError);
    };

    if (socket.connected) {
      onConnect();
      return;
    }

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });

  return connectPromise;
}

/** @deprecated Use ensureSocketConnected */
export async function connectSocket(): Promise<Socket> {
  return ensureSocketConnected();
}

export function getSocket(): Socket | null {
  return socket;
}

export async function disconnectSocket(): Promise<void> {
  connectPromise = null;
  if (sessionRestoreTimer) {
    clearTimeout(sessionRestoreTimer);
    sessionRestoreTimer = null;
  }
  sessionRestoreInFlight = false;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function emitAck<T = unknown>(event: string, payload?: unknown): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const s = await ensureSocketConnected();
      const timer = setTimeout(() => reject(new Error('Socket request timed out')), 20000);

      s.emit(event, payload ?? {}, (res: T & { success?: boolean; message?: string }) => {
        clearTimeout(timer);
        if (res && typeof res === 'object' && 'success' in res && res.success === false) {
          reject(new Error(res.message ?? 'Request failed'));
          return;
        }
        resolve(res);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export { SOCKET_EVENTS };
