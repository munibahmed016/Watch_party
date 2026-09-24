import { io, Socket } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from './config';
import { tokenStorage } from './storage';

let socket: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;
let refreshingPromise: Promise<string | null> | null = null;

// Refresh the access token using the stored refresh token.
async function refreshSocketToken(): Promise<string | null> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) return null;
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const json: any = await res.json();
      const at = json?.data?.accessToken;
      const rt = json?.data?.refreshToken;
      if (at && rt) {
        await tokenStorage.setTokens(at, rt);
        return at;
      }
      return null;
    } catch {
      return null;
    } finally {
      setTimeout(() => {
        refreshingPromise = null;
      }, 50);
    }
  })();
  return refreshingPromise;
}

export const getSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;
  if (connectPromise) return connectPromise;
  connectPromise = (async () => {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      connectPromise = null;
      throw new Error('Not authenticated');
    }
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    socket = io(SOCKET_URL, {
      auth: (cb: (data: { token: string }) => void) => {
        tokenStorage
          .getAccessToken()
          .then((t) => cb({ token: t || '' }))
          .catch(() => cb({ token: '' }));
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.io.on('reconnect_attempt', () => {
      void refreshSocketToken();
    });

    return new Promise<Socket>((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve(socket!);
      };
      const onConnectError = (err: Error) => {
        const msg = String(err?.message || '').toLowerCase();
        if (/auth|token|unauth|jwt|expired/.test(msg)) {
          void refreshSocketToken();
        }
        cleanup();
        socket = null;
        reject(err);
      };
      const cleanup = () => {
        socket?.off('connect', onConnect);
        socket?.off('connect_error', onConnectError);
      };
      socket!.once('connect', onConnect);
      socket!.once('connect_error', onConnectError);
    });
  })().finally(() => {
    connectPromise = null;
  });
  return connectPromise;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectPromise = null;
};

/** Returns the current socket instance if already connected, else null. */
export const peekSocket = (): Socket | null => (socket?.connected ? socket : null);