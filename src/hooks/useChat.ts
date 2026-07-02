import { useCallback, useEffect, useRef, useState } from 'react';
import { chatsApi, Message } from '@/lib/api';
import { getSocket, peekSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';

type TypingUser = { userId: string; username: string };
// Media that a USER can attach when sending (SYSTEM is server-only, so excluded).
type SendType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
type SendMedia = { type?: SendType; mediaUrl?: string };

export const useChat = (chatId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const oldestIdRef = useRef<string | null>(null);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Load initial history
  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    chatsApi
      .listMessages(chatId, undefined, 50)
      .then(({ messages: msgs }) => {
        if (cancelled) return;
        setMessages(msgs);
        oldestIdRef.current = msgs[0]?.id || null;
        setHasMore(msgs.length === 50);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  // Subscribe to socket events
  useEffect(() => {
    if (!chatId) return;
    let mounted = true;
    // Capture the ref for cleanup (its .current may change before cleanup runs).
    const timers = typingTimers.current;

    const handleMessage = (data: { chatId: string; message: Message }) => {
      if (!mounted || data.chatId !== chatId) return;
      setMessages((prev) => {
        // Avoid duplicate if we already have it (e.g. from our own ack)
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      // Auto mark-read if the chat is open
      if (data.message.senderId !== user?.id) {
        peekSocket()?.emit('chat:markRead', { chatId });
      }
    };

    const handleTyping = (data: { chatId: string; userId: string; username: string; isTyping: boolean }) => {
      if (!mounted || data.chatId !== chatId) return;
      if (data.userId === user?.id) return;
      setTypingUsers((prev) => {
        const without = prev.filter((u) => u.userId !== data.userId);
        return data.isTyping ? [...without, { userId: data.userId, username: data.username }] : without;
      });
      // Auto-clear typing after 4s of no signal
      const existing = typingTimers.current.get(data.userId);
      if (existing) clearTimeout(existing);
      if (data.isTyping) {
        const t = setTimeout(() => {
          setTypingUsers((p) => p.filter((u) => u.userId !== data.userId));
          typingTimers.current.delete(data.userId);
        }, 4000);
        typingTimers.current.set(data.userId, t);
      }
    };

    let cleanupFns: Array<() => void> = [];
    (async () => {
      try {
        const socket = await getSocket();
        if (!mounted) return;
        socket.emit('chat:join', { chatId });
        socket.on('chat:message', handleMessage);
        socket.on('chat:typing', handleTyping);
        cleanupFns.push(() => socket.off('chat:message', handleMessage));
        cleanupFns.push(() => socket.off('chat:typing', handleTyping));
        cleanupFns.push(() => socket.emit('chat:leave', { chatId }));
        // Mark current as read on entering
        socket.emit('chat:markRead', { chatId });
      } catch {
        // socket failed — chat still works via REST
      }
    })();

    return () => {
      mounted = false;
      cleanupFns.forEach((fn) => fn());
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [chatId, user?.id]);

  // Send a message. Text goes via socket (live) with a REST fallback.
  // A media message (GIF / image — has a mediaUrl) is sent via REST so the
  // mediaUrl + type are saved reliably (chatsApi.send supports them).
  const send = useCallback(
    async (content: string, media?: SendMedia) => {
      const text = (content || '').trim();
      const mediaUrl = media?.mediaUrl;
      if (!chatId) return;
      if (!text && !mediaUrl) return;
      const type: SendType = media?.type || 'TEXT';
      const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Optimistic local insert
      const optimistic: Message = {
        id: clientId,
        chatId,
        roomId: null,
        senderId: user?.id || 'me',
        sender: {
          id: user?.id || 'me',
          username: user?.username || 'me',
          fullName: user?.fullName || null,
          avatarUrl: user?.avatarUrl || null,
        },
        content: text,
        type,
        mediaUrl: mediaUrl || null,
        replyToId: null,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const socket = peekSocket();
      // Media -> REST (reliable mediaUrl save). Plain text -> socket (live).
      if (!mediaUrl && socket) {
        socket.emit(
          'chat:send',
          { chatId, content: text, clientId },
          (ack: { ok: boolean; messageId?: string; error?: string }) => {
            if (ack.ok && ack.messageId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === clientId ? { ...m, id: ack.messageId! } : m))
              );
            } else {
              // Roll back on failure
              setMessages((prev) => prev.filter((m) => m.id !== clientId));
            }
          }
        );
      } else {
        // REST (media, or text when socket is unavailable)
        try {
          const { message } = await chatsApi.send(chatId, { content: text, type, mediaUrl });
          setMessages((prev) => prev.map((m) => (m.id === clientId ? message : m)));
        } catch {
          setMessages((prev) => prev.filter((m) => m.id !== clientId));
        }
      }
    },
    [chatId, user]
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!chatId) return;
      peekSocket()?.emit('chat:typing', { chatId, isTyping });
    },
    [chatId]
  );

  const loadOlder = useCallback(async () => {
    if (!chatId || loading || !hasMore || !oldestIdRef.current) return;
    setLoading(true);
    try {
      const { messages: older } = await chatsApi.listMessages(chatId, oldestIdRef.current, 50);
      setMessages((prev) => [...older, ...prev]);
      oldestIdRef.current = older[0]?.id || oldestIdRef.current;
      if (older.length < 50) setHasMore(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [chatId, loading, hasMore]);

  return { messages, loading, hasMore, typingUsers, send, setTyping, loadOlder };
};