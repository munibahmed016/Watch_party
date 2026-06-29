import { useEffect, useRef } from 'react';
import { Linking, Alert } from 'react-native';
import { roomsApi } from '@/lib/api';
import { navigate } from './navigationRef';

type Parsed = { segments: string[]; query: Record<string, string> };

// Strip the scheme/host and split into path segments + query map.
function parseUrl(rawUrl: string): Parsed {
  let s = (rawUrl || '').trim();

  // Remove the known prefixes. Whatever is left is "path?query".
  s = s.replace(/^watchpartylive:\/\//i, '');
  s = s.replace(/^https?:\/\/(www\.)?watchpartylive\.(app|com)\/?/i, '');

  const [pathPart = '', queryPart = ''] = s.split('?');
  const segments = pathPart.split('/').map((x) => x.trim()).filter(Boolean);

  const query: Record<string, string> = {};
  if (queryPart) {
    for (const kv of queryPart.split('&')) {
      const [k, v] = kv.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }
  return { segments, query };
}

// Resolve a room invite/code/id and open the Room. Tries the safest paths in
// order so it works no matter which identifier the link carried.
async function openRoom(identifier?: string, password?: string) {
  const id = (identifier || '').trim();
  if (!id) { Alert.alert('Invalid link', 'This room link looks incomplete.'); return; }

  const roomIdFrom = (res: any) =>
    res?.room?.id || res?.roomId || res?.data?.room?.id || res?.id || null;

  // 1) Treat it as an invite token
  try {
    const res: any = await roomsApi.acceptInvite(id, password);
    const roomId = roomIdFrom(res);
    if (roomId) { navigate('Room', { roomId }); return; }
  } catch { /* not an invite token, try next */ }

  // 2) Treat it as a room code
  try {
    const res: any = await roomsApi.joinByCode(id, password);
    const roomId = roomIdFrom(res);
    if (roomId) { navigate('Room', { roomId }); return; }
  } catch { /* not a code either */ }

  // 3) Last resort: maybe it already IS the room id
  navigate('Room', { roomId: id });
}

async function handleUrl(rawUrl: string) {
  const { segments, query } = parseUrl(rawUrl);
  const key = (segments[0] || '').toLowerCase();

  // Room invite / join / open
  if (key === 'invite' || key === 'i' || key === 'join' || key === 'room' || key === 'r') {
    await openRoom(segments[1] || query.token || query.invite || query.code, query.password || query.pw);
    return;
  }

  // Direct message / chat (from a NEW_MESSAGE push)
  if (key === 'chat' || key === 'dm') {
    const chatId = segments[1] || query.chatId || query.id;
    if (chatId) navigate('ChatDetail', { chatId });
    return;
  }

  // Token / code passed only as a query (no path)
  if (!key && (query.token || query.invite)) { await openRoom(query.token || query.invite, query.password); return; }
  if (!key && query.code) { await openRoom(query.code, query.password); return; }

  // Friend requests
  if (key === 'friend-requests' || key === 'friends' || key === 'requests') {
    navigate('FriendRequests');
    return;
  }

  // Creator live broadcast
  if (key === 'live' || key === 'watch-live') {
    const sessionId = segments[1] || query.session || query.sessionId;
    if (sessionId) navigate('LiveViewer', { sessionId });
    return;
  }

  // Generic user profile (follower / subscriber / friend)
  if (key === 'user' || key === 'profile' || key === 'u') {
    const username = segments[1] || query.username || query.u;
    if (username) navigate('UserProfile', { username, userId: query.id || query.userId });
    return;
  }

  // Creator channel
  if (key === 'creator' || key === 'channel') {
    const username = segments[1] || query.username;
    if (username) navigate('PodcastHostProfile', { username });
    return;
  }

  // Notifications
  if (key === 'notifications' || key === 'notification') {
    navigate('Notifications');
    return;
  }

  // Unknown link -> do nothing, let the app open normally.
}

const DeepLinkHandler = () => {
  // Avoid handling the same URL twice (cold-start initial URL + the 'url' event).
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const process = (url?: string | null) => {
      if (!url || !mounted) return;
      if (url === lastUrl.current) return;
      lastUrl.current = url;
      handleUrl(url).catch(() => undefined);
    };

    // App opened from a cold start via a link
    Linking.getInitialURL().then(process).catch(() => undefined);

    // App already running and a link comes in
    const sub = Linking.addEventListener('url', ({ url }) => process(url));

    return () => { mounted = false; sub.remove(); };
  }, []);

  return null;
};

export default DeepLinkHandler;