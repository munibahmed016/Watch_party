import { io, Socket } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from './config';
import { tokenStorage } from './storage';

let socket: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;
let refreshingPromise: Promise<string | null> | null = null;

// Refresh the access token using the stored refresh token, and persist the new
// pair. De-duped so several reconnection attempts don't fire multiple refreshes
// at once. This mirrors the API layer's refresh so the socket can recover on
// its own even when it's the only thing active (e.g. a user sitting idle in a
// room while a movie plays).
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
    // If we have a stale socket instance, recycle it
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    socket = io(SOCKET_URL, {
      // `auth` is a FUNCTION, not a static object, so EVERY (re)connection reads
      // the LATEST token from storage instead of the one captured when the
      // socket was first created. The old `auth: { token }` reused that original
      // token forever — so once it expired (after a few minutes) every
      // reconnection was rejected silently, the socket never rejoined the room,
      // and that user stopped receiving messages / sync / "host ended" even
      // though their own messages still sent. This is the fix for that.
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

    // Before each reconnection attempt, refresh the access token so the `auth`
    // function has a valid one to send. Without this, a socket idle past the
    // token's lifetime could never reconnect (the refresh updates storage; the
    // next attempt a second later picks it up).
    socket.io.on('reconnect_attempt', () => {
      void refreshSocketToken();
    });

    return new Promise<Socket>((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve(socket!);
      };
      const onConnectError = (err: Error) => {
        // If the initial connection is rejected for auth reasons, kick off a
        // token refresh (fire-and-forget) so the next getSocket() uses a fresh
        // token, then fail this attempt as before (so callers never hang).
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