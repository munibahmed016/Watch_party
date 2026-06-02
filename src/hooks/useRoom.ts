// src/hooks/useRoom.ts
// Watchparty sync engine on the client.
//
// Algorithm:
//   - On every server sync event (play/pause/seek), compute expected position
//     from `position + (Date.now() - serverTime) / 1000` (if isPlaying).
//   - Compare to local player position. If drift > 1.5s, seek locally.
//   - Apply play/pause to local player.
//
// The hook returns expectedPosition + isPlaying state, plus emit helpers.
// The screen wires this to its video player.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomVideoProvider, roomsApi, Message } from '@/lib/api';
import { getSocket, peekSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';

export type RoomVideoState = {
  url: string | null;
  provider: RoomVideoProvider;
  videoId: string | null;
  title: string | null;
  position: number;       // last known authoritative position (seconds)
  isPlaying: boolean;
  serverTime: number;     // when this state was emitted from server (ms)
};

export type RoomPresenceUser = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type RoomChatMessage = Message;

export type RoomReaction = {
  userId: string;
  username: string;
  emoji: string;
  at: number;
};

const DRIFT_TOLERANCE_SEC = 1.5;

export const useRoom = (roomId: string | null) => {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [videoState, setVideoState] = useState<RoomVideoState | null>(null);
  const [presentUsers, setPresentUsers] = useState<RoomPresenceUser[]>([]);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [reactions, setReactions] = useState<RoomReaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Track our local "currentPosition" so we can echo to server for play/seek
  const localPositionRef = useRef(0);

  // ---- Initial fetch ----
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    roomsApi
      .get(roomId)
      .then(({ room: r }) => {
        if (cancelled) return;
        setRoom(r);
        setVideoState({
          url: r.videoUrl,
          provider: r.videoProvider,
          videoId: r.videoId,
          title: r.videoTitle,
          position: r.videoPosition,
          isPlaying: r.isPlaying,
          serverTime: Date.now(),
        });
        setPresentUsers(r.members.map((m) => m.user as RoomPresenceUser));
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // ---- Socket subscriptions ----
  useEffect(() => {
    if (!roomId) return;
    let mounted = true;
    let cleanupFns: Array<() => void> = [];

    const handleJoined = (data: { roomId: string; state: RoomVideoState | null }) => {
      if (data.roomId !== roomId || !data.state) return;
      setVideoState({
        url: data.state.videoUrl ?? null,
        provider: data.state.videoProvider ?? null,
        videoId: data.state.videoId ?? null,
        title: room?.videoTitle || null,
        position: data.state.position,
        isPlaying: data.state.isPlaying,
        serverTime: data.state.serverTime,
      });
    };

    const handleState = handleJoined; // same shape

    const handlePlay = (data: { roomId: string; position: number; serverTime: number }) => {
      if (data.roomId !== roomId) return;
      setVideoState((prev) => prev && {
        ...prev,
        position: data.position,
        isPlaying: true,
        serverTime: data.serverTime,
      });
    };
    const handlePause = (data: { roomId: string; position: number; serverTime: number }) => {
      if (data.roomId !== roomId) return;
      setVideoState((prev) => prev && {
        ...prev,
        position: data.position,
        isPlaying: false,
        serverTime: data.serverTime,
      });
    };
    const handleSeek = (data: { roomId: string; position: number; isPlaying: boolean; serverTime: number }) => {
      if (data.roomId !== roomId) return;
      setVideoState((prev) => prev && {
        ...prev,
        position: data.position,
        isPlaying: data.isPlaying,
        serverTime: data.serverTime,
      });
    };

    const handleVideoChange = (data: {
      roomId: string;
      video: { url: string; provider: RoomVideoProvider; videoId: string | null; title: string | null };
    }) => {
      if (data.roomId !== roomId) return;
      setVideoState({
        url: data.video.url,
        provider: data.video.provider,
        videoId: data.video.videoId,
        title: data.video.title,
        position: 0,
        isPlaying: false,
        serverTime: Date.now(),
      });
    };

    const handleUserJoined = (data: { roomId: string; user: RoomPresenceUser }) => {
      if (data.roomId !== roomId) return;
      setPresentUsers((prev) =>
        prev.some((u) => u.id === data.user.id) ? prev : [...prev, data.user]
      );
    };
    const handleUserLeft = (data: { roomId: string; userId: string }) => {
      if (data.roomId !== roomId) return;
      setPresentUsers((prev) => prev.filter((u) => u.id !== data.userId));
    };

    const handleMessage = (data: { roomId: string; message: RoomChatMessage }) => {
      if (data.roomId !== roomId) return;
      setChatMessages((prev) =>
        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
      );
    };
    const handleReaction = (data: RoomReaction & { roomId: string }) => {
      if (data.roomId !== roomId) return;
      const r = { userId: data.userId, username: data.username, emoji: data.emoji, at: data.at };
      setReactions((prev) => [...prev, r]);
      // Auto-fade after 2s
      setTimeout(() => {
        setReactions((prev) => prev.filter((x) => x !== r));
      }, 2000);
    };

    (async () => {
      try {
        const socket = await getSocket();
        if (!mounted) return;
        socket.emit('room:join', { roomId });

        socket.on('room:joined', handleJoined);
        socket.on('room:state', handleState);
        socket.on('room:play', handlePlay);
        socket.on('room:pause', handlePause);
        socket.on('room:seek', handleSeek);
        socket.on('room:videoChange', handleVideoChange);
        socket.on('room:userJoined', handleUserJoined);
        socket.on('room:userLeft', handleUserLeft);
        socket.on('room:message', handleMessage);
        socket.on('room:reaction', handleReaction);

        cleanupFns.push(() => socket.off('room:joined', handleJoined));
        cleanupFns.push(() => socket.off('room:state', handleState));
        cleanupFns.push(() => socket.off('room:play', handlePlay));
        cleanupFns.push(() => socket.off('room:pause', handlePause));
        cleanupFns.push(() => socket.off('room:seek', handleSeek));
        cleanupFns.push(() => socket.off('room:videoChange', handleVideoChange));
        cleanupFns.push(() => socket.off('room:userJoined', handleUserJoined));
        cleanupFns.push(() => socket.off('room:userLeft', handleUserLeft));
        cleanupFns.push(() => socket.off('room:message', handleMessage));
        cleanupFns.push(() => socket.off('room:reaction', handleReaction));
        cleanupFns.push(() => socket.emit('room:leave', { roomId }));
      } catch {
        // socket failed
      }
    })();

    return () => {
      mounted = false;
      cleanupFns.forEach((fn) => fn());
    };
  }, [roomId, room?.videoTitle]);

  // ---- Compute expected position now (for player drift correction) ----
  const computeExpectedPosition = useCallback((): number => {
    if (!videoState) return 0;
    if (!videoState.isPlaying) return videoState.position;
    const elapsedSec = (Date.now() - videoState.serverTime) / 1000;
    return videoState.position + elapsedSec;
  }, [videoState]);

  // ---- Should the player seek? Caller passes its current player position. ----
  const shouldCorrect = useCallback(
    (playerPositionSec: number): { correct: boolean; target: number } => {
      const target = computeExpectedPosition();
      const drift = Math.abs(target - playerPositionSec);
      return { correct: drift > DRIFT_TOLERANCE_SEC, target };
    },
    [computeExpectedPosition]
  );


  // ---- Moderator controls ----
  const isModerator = (() => {
    if (!room || !user) return false;
    const m = room.members.find((mm) => mm.user.id === user.id);
    return m?.role === 'OWNER' || m?.role === 'MODERATOR';
  })();

  const play = useCallback(
    (position: number) => {
      if (!roomId) return;
      localPositionRef.current = position;
      peekSocket()?.emit('room:play', { roomId, position });
    },
    [roomId]
  );

  const pause = useCallback(
    (position: number) => {
      if (!roomId) return;
      localPositionRef.current = position;
      peekSocket()?.emit('room:pause', { roomId, position });
    },
    [roomId]
  );

  const seek = useCallback(
    (position: number, isPlaying: boolean) => {
      if (!roomId) return;
      localPositionRef.current = position;
      peekSocket()?.emit('room:seek', { roomId, position, isPlaying });
    },
    [roomId]
  );

  const changeVideo = useCallback(
    (url: string) => {
      if (!roomId) return;
      peekSocket()?.emit('room:videoChange', { roomId, url });
    },
    [roomId]
  );

  const sendChat = useCallback(
    (content: string) => {
      if (!roomId || !content.trim()) return;
      peekSocket()?.emit('room:message', { roomId, content });
    },
    [roomId]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!roomId) return;
      peekSocket()?.emit('room:reaction', { roomId, emoji });
    },
    [roomId]
  );

  return {
    room,
    videoState,
    presentUsers,
    chatMessages,
    reactions,
    loading,
    isModerator,
    computeExpectedPosition,
    shouldCorrect,
    play,
    pause,
    seek,
    changeVideo,
    sendChat,
    sendReaction,
  };
};
