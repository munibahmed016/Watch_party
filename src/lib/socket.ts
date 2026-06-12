import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';
import { tokenStorage } from './storage';

let socket: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;

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
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    return new Promise<Socket>((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve(socket!);
      };
      const onConnectError = (err: Error) => {
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
export const peekSocket = (): Socket | null => socket?.connected ? socket : null;
