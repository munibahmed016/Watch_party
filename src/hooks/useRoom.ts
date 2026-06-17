// src/hooks/useRoom.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomVideoProvider, roomsApi, Message } from '@/lib/api';
import { getSocket, peekSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';

export type RoomVideoState = {
  url: string | null;
  provider: RoomVideoProvider;
  videoId: string | null;
  title: string | null;
  position: number;
  isPlaying: boolean;
  serverTime: number;
};
export type RoomPresenceUser = { id: string; username: string; fullName: string | null; avatarUrl: string | null; };
export type RoomChatMessage = Message;
export type RoomReaction = { userId: string; username: string; emoji: string; at: number; };

const DRIFT_TOLERANCE_SEC = 1.5;

export const useRoom = (roomId: string | null) => {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [videoState, setVideoState] = useState<RoomVideoState | null>(null);
  const [presentUsers, setPresentUsers] = useState<RoomPresenceUser[]>([]);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [reactions, setReactions] = useState<RoomReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const localPositionRef = useRef(0);

  // ---- Initial fetch (REST: real videoUrl comes from here) ----
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    roomsApi.get(roomId)
      .then(({ room: r }) => {
        if (cancelled) return;
        setRoom(r);
        setVideoState({
          url: r.videoUrl, provider: r.videoProvider, videoId: r.videoId,
          title: r.videoTitle, position: r.videoPosition, isPlaying: r.isPlaying,
          serverTime: Date.now(),
        });
        setPresentUsers(r.members.map((m) => m.user as RoomPresenceUser));
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [roomId]);

  // ---- Socket ----
  useEffect(() => {
    if (!roomId) return;
    let mounted = true;
    let cleanupFns: Array<() => void> = [];

    // socket "state" has NO videoUrl -> keep previous (REST) url, don't null it
    const handleJoined = (data: { roomId: string; state: any | null }) => {
      if (data.roomId !== roomId || !data.state) return;
      const st = data.state;
      setVideoState((prev) => ({
        url: st.videoUrl ?? prev?.url ?? null,
        provider: st.videoProvider ?? prev?.provider ?? null,
        videoId: st.videoId ?? prev?.videoId ?? null,
        title: st.videoTitle ?? prev?.title ?? room?.videoTitle ?? null,
        position: typeof st.position === 'number' ? st.position : (prev?.position ?? 0),
        isPlaying: typeof st.isPlaying === 'boolean' ? st.isPlaying : (prev?.isPlaying ?? false),
        serverTime: st.serverTime ?? Date.now(),
      }));
    };
    const handleState = handleJoined;
    const handlePlay = (d: any) => { if (d.roomId !== roomId) return; setVideoState((p) => p && { ...p, position: d.position, isPlaying: true, serverTime: d.serverTime }); };
    const handlePause = (d: any) => { if (d.roomId !== roomId) return; setVideoState((p) => p && { ...p, position: d.position, isPlaying: false, serverTime: d.serverTime }); };
    const handleSeek = (d: any) => { if (d.roomId !== roomId) return; setVideoState((p) => p && { ...p, position: d.position, isPlaying: d.isPlaying, serverTime: d.serverTime }); };
    const handleVideoChange = (d: any) => {
      if (d.roomId !== roomId) return;
      setVideoState({ url: d.video.url, provider: d.video.provider, videoId: d.video.videoId, title: d.video.title, position: 0, isPlaying: false, serverTime: Date.now() });
    };
    const handleUserJoined = (d: any) => { if (d.roomId !== roomId) return; setPresentUsers((p) => p.some((u) => u.id === d.user.id) ? p : [...p, d.user]); };
    const handleUserLeft = (d: any) => { if (d.roomId !== roomId) return; setPresentUsers((p) => p.filter((u) => u.id !== d.userId)); };
    const handleMessage = (d: any) => { if (d.roomId !== roomId) return; setChatMessages((p) => p.some((m) => m.id === d.message.id) ? p : [...p, d.message]); };
    const handleReaction = (d: any) => {
      if (d.roomId !== roomId) return;
      const r = { userId: d.userId, username: d.username, emoji: d.emoji, at: d.at };
      setReactions((p) => [...p, r]);
      setTimeout(() => setReactions((p) => p.filter((x) => x !== r)), 2000);
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
      } catch {}
    })();

    return () => { mounted = false; cleanupFns.forEach((fn) => fn()); };
  }, [roomId, room?.videoTitle]);

  const computeExpectedPosition = useCallback((): number => {
    if (!videoState) return 0;
    if (!videoState.isPlaying) return videoState.position;
    return videoState.position + (Date.now() - videoState.serverTime) / 1000;
  }, [videoState]);

  const shouldCorrect = useCallback((playerPositionSec: number) => {
    const target = computeExpectedPosition();
    return { correct: Math.abs(target - playerPositionSec) > DRIFT_TOLERANCE_SEC, target };
  }, [computeExpectedPosition]);

  const isModerator = (() => {
    if (!room || !user) return false;
    const m = room.members.find((mm) => mm.user.id === user.id);
    return m?.role === 'OWNER' || m?.role === 'MODERATOR';
  })();

  const play = useCallback((position: number) => { if (!roomId) return; localPositionRef.current = position; peekSocket()?.emit('room:play', { roomId, position }); }, [roomId]);
  const pause = useCallback((position: number) => { if (!roomId) return; localPositionRef.current = position; peekSocket()?.emit('room:pause', { roomId, position }); }, [roomId]);
  const seek = useCallback((position: number, isPlaying: boolean) => { if (!roomId) return; localPositionRef.current = position; peekSocket()?.emit('room:seek', { roomId, position, isPlaying }); }, [roomId]);
  const changeVideo = useCallback((url: string) => { if (!roomId) return; peekSocket()?.emit('room:videoChange', { roomId, url }); }, [roomId]);
  const sendChat = useCallback((content: string) => { if (!roomId || !content.trim()) return; peekSocket()?.emit('room:message', { roomId, content }); }, [roomId]);
  const sendReaction = useCallback((emoji: string) => { if (!roomId) return; peekSocket()?.emit('room:reaction', { roomId, emoji }); }, [roomId]);

  return { room, videoState, presentUsers, chatMessages, reactions, loading, isModerator, computeExpectedPosition, shouldCorrect, play, pause, seek, changeVideo, sendChat, sendReaction };
};