// src/screens/RoomScreen.tsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList,
  TextInput, KeyboardAvoidingView, Platform, StatusBar, Animated, Dimensions, Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '@/components/AppText';
import ShareModal from '@/components/ShareModal';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { useRoom } from '@/hooks/useRoom';
import { useAuth } from '@/contexts/AuthContext';
import { roomsApi } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const VIDEO_HEIGHT = Math.round(SCREEN_H * 0.38);
const CHAT_PANEL_WIDTH = SCREEN_W * 0.75;
const REACTIONS = ['❤️', '😂', '😮', '👏', '🔥', '🥺'];

// Same origin the web app uses for the YouTube IFrame player. Providing a
// real, consistent origin is what lets embeddable videos play (no origin =
// Error 152 in a WebView). baseUrl must match this origin.
const ORIGIN = 'https://watchpartylive.com';

function extractYouTubeId(input?: string): string {
  if (!input) return '';
  const s = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = s.match(p); if (m) return m[1]; }
  return '';
}

// YouTube IFrame HTML — same setup as the web app (origin set). onError posts
// the code so RN can fall back to the full mobile page if a video ever blocks
// embedding (150/152).
function buildYouTubeHtml(videoId: string, startSeconds?: number): string {
  const start = startSeconds && startSeconds > 2 ? Math.floor(startSeconds) : 0;
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}#player{width:100%;height:100%}</style>
</head><body>
<div id="player"></div>
<script>
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
  function post(obj){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e){} }
  function onYouTubeIframeAPIReady() {
    window.ytPlayer = new YT.Player('player', {
      videoId: '${videoId}',
      playerVars: { playsinline:1, autoplay:1, rel:0, modestbranding:1, fs:1, controls:1, start:${start}, origin:'${ORIGIN}' },
      events: {
        onReady: function(e){ try { e.target.playVideo(); } catch(err){} post({ type:'ready' }); },
        onStateChange: function(e){
          try {
            var st = e.data;
            // Only report real play (1) / pause (2) / ended (0). Buffering (3),
            // cued (5) and unstarted (-1) fire rapidly at startup on mobile data
            // and would flood the RN bridge -> freeze. Ignore them.
            if (st === 0 || st === 1 || st === 2) {
              post({ type:'state', state: st, position: window.ytPlayer.getCurrentTime() });
            }
          } catch(err){}
        },
        onError: function(e){ post({ type:'error', code: e.data }); }
      }
    });
  }
</script>
</body></html>`;
}

function buildHlsHtml(src: string, startSeconds?: number): string {
  const start = startSeconds && startSeconds > 2 ? Math.floor(startSeconds) : 0;
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}#v{width:100%;height:100%;background:#000}</style>
</head><body>
<video id="v" playsinline webkit-playsinline controls autoplay></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
<script>
  var video = document.getElementById('v');
  var src = ${JSON.stringify(src)};
  var startAt = ${start};
  function post(o){ try{ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o)); }catch(e){} }
  function ready(){ try { if(startAt>0){ video.currentTime = startAt; } video.play(); }catch(e){} post({type:'ready'}); }
  video.addEventListener('play',  function(){ post({type:'state', state:1, position: video.currentTime}); });
  video.addEventListener('pause', function(){ post({type:'state', state:2, position: video.currentTime}); });
  video.addEventListener('seeked',function(){ post({type:'state', state:3, position: video.currentTime}); });
  window.ytPlayer = {
    seekTo: function(t){ try{ video.currentTime = t; }catch(e){} },
    playVideo: function(){ try{ video.play(); }catch(e){} },
    pauseVideo: function(){ try{ video.pause(); }catch(e){} },
    getCurrentTime: function(){ return video.currentTime || 0; }
  };
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
    video.addEventListener('loadedmetadata', ready);
  } else if (window.Hls && window.Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, ready);
    hls.on(Hls.Events.ERROR, function(_e, d){ if(d && d.fatal){ post({type:'error', detail:d.type}); } });
  } else {
    video.src = src;
    video.addEventListener('loadedmetadata', ready);
  }
</script>
</body></html>`;
}

// Bunny iframe embed (admin uploads) — plays in WebView via iframe.
function buildBunnyEmbedHtml(embedUrl: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}iframe{width:100%;height:100%;border:none}</style>
</head><body>
<iframe src="${embedUrl}?autoplay=true&loop=false&muted=false&preload=true&responsive=true"
  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture"
  allowfullscreen></iframe>
<script>
  function post(o){ try{ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o)); }catch(e){} }
  window.ytPlayer = {
    seekTo: function(){}, playVideo: function(){}, pauseVideo: function(){}, getCurrentTime: function(){ return 0; }
  };
  setTimeout(function(){ post({type:'ready'}); }, 1500);
</script>
</body></html>`;
}

// Bunny embed -> iframe. HLS (.m3u8 / b-cdn) -> hls.js. YouTube -> IFrame API. Else -> uri.
function buildSource(rawUri?: string, startSeconds?: number): any {
  const s = (rawUri || '').trim();
  // Bunny iframe embed (admin upload)
  if (/iframe\.mediadelivery\.net\/embed/i.test(s)) {
    return { html: buildBunnyEmbedHtml(s), baseUrl: ORIGIN };
  }
  // Bunny HLS stream
  if (/\.m3u8($|\?)/i.test(s) || /b-cdn\.net/i.test(s)) {
    return { html: buildHlsHtml(s, startSeconds), baseUrl: ORIGIN };
  }
  // YouTube
  const id = extractYouTubeId(s);
  if (id) return { html: buildYouTubeHtml(id, startSeconds), baseUrl: ORIGIN };
  return { uri: s || 'https://m.youtube.com' };
}

const RoomScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const roomId: string = route.params?.roomId;

  const {
    room, videoState, presentUsers, chatMessages, reactions,
    loading, isModerator, changeVideo, sendChat, sendReaction, computeExpectedPosition,
    play, pause, seek,
  } = useRoom(roomId);

  const webviewRef = useRef<WebView>(null);
  const chatListRef = useRef<FlatList<any>>(null);
  const inputRef = useRef<TextInput>(null);
  const lastBroadcastUrl = useRef<string>('');
  const lastReceivedUrl = useRef<string>('');
  // True while the active player is an HTML embed (YouTube/Bunny/HLS). For those
  // the WebView's top-level URL is just our ORIGIN, NOT the video — so we must
  // never treat a navigation change as "the host picked a new video".
  const isHtmlSourceRef = useRef(false);

  const playerReadyRef = useRef(false);
  const lastAppliedSyncRef = useRef(0);
  const applyingRemoteRef = useRef(false);
  const lastInjectRef = useRef(0);
  const lastHostStateRef = useRef<{ playing: boolean; pos: number }>({ playing: false, pos: 0 });

  const [currentUrl, setCurrentUrl] = useState('');
  const [webLoading, setWebLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [input, setInput] = useState('');
  // Safety net: if a YouTube video ever blocks embedding (150/152), load the
  // full mobile page instead. With the correct origin this rarely triggers.
  const [ytFallbackId, setYtFallbackId] = useState<string | null>(null);
  const rawUriRef = useRef('');

  const chatPanelAnim = useRef(new Animated.Value(CHAT_PANEL_WIDTH)).current;

  // ===== Player source — MEMOIZED =====
  // Computed only when the actual video (or fallback) changes. This is critical:
  // if we rebuilt the source object on every render (new chat msg, reaction,
  // keystroke...) the WebView would reload and the video would keep restarting /
  // freezing. A stable source + stable key keeps the player mounted and playing.
  const rawUri = currentUrl || room?.videoUrl || (room as any)?.videoId || '';
  rawUriRef.current = rawUri;
  const playerSource = useMemo(() => {
    if (ytFallbackId) return { uri: `https://m.youtube.com/watch?v=${ytFallbackId}` };
    const start = computeExpectedPosition ? computeExpectedPosition() : 0;
    return buildSource(rawUri, start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawUri, ytFallbackId]);
  isHtmlSourceRef.current = !!(playerSource as any).html;
  const playerKey = ytFallbackId || rawUri || 'player';

  useEffect(() => {
    const newUrl = videoState?.url;
    if (!newUrl) return;
    if (!currentUrl) { setCurrentUrl(newUrl); lastReceivedUrl.current = newUrl; return; }
    if (newUrl !== currentUrl && newUrl !== lastBroadcastUrl.current) {
      lastReceivedUrl.current = newUrl;
      setCurrentUrl(newUrl);
      setYtFallbackId(null); // new video -> reset fallback
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState?.url, currentUrl]);

  const applySyncToPlayer = useCallback(() => {
    if (!playerReadyRef.current || !webviewRef.current) return;
    // Throttle injections so a burst of sync updates can never flood the
    // WebView (which on a real device can hang the video surface).
    const now = Date.now();
    if (now - lastInjectRef.current < 400) return;
    lastInjectRef.current = now;
    const pos = computeExpectedPosition ? computeExpectedPosition() : 0;
    const playing = !!videoState?.isPlaying;
    applyingRemoteRef.current = true;
    const js =
      '(function(){try{if(window.ytPlayer && window.ytPlayer.seekTo){' +
      'window.ytPlayer.seekTo(' + (pos || 0) + ', true);' +
      (playing ? 'window.ytPlayer.playVideo();' : 'window.ytPlayer.pauseVideo();') +
      '}}catch(e){}})(); true;';
    webviewRef.current.injectJavaScript(js);
    setTimeout(() => { applyingRemoteRef.current = false; }, 1200);
  }, [computeExpectedPosition, videoState?.isPlaying]);

  const onPlayerMessage = useCallback((event: any) => {
    let data: any = {};
    try { data = JSON.parse(event?.nativeEvent?.data || '{}'); } catch { return; }

    if (data.type === 'ready') {
      playerReadyRef.current = true;
      // The host (moderator) is the source of truth: their video must just
      // autoplay and keep playing. Applying remote sync here was pausing the
      // host's video ~350ms after it started (videoState.isPlaying still false
      // before the server round-trip) — THAT is the "loads a little then
      // freezes" bug. Only viewers snap to the host's position.
      if (!isModerator) setTimeout(() => applySyncToPlayer(), 350);
      return;
    }

    if (data.type === 'error') {
      // 101/150/152 = embedding disabled; 100 = not found.
      // Reload as the full mobile YouTube page so the video still plays.
      if ([100, 101, 150, 152].includes(data.code)) {
        const id = extractYouTubeId(rawUriRef.current);
        if (id) setYtFallbackId(id);
      }
      return;
    }

    if (data.type === 'state') {
      if (!isModerator) return;
      if (applyingRemoteRef.current) return;

      const pos = typeof data.position === 'number' ? data.position : 0;
      const ytState = data.state;
      const last = lastHostStateRef.current;

      if (ytState === 1) {
        if (!last.playing) { play?.(pos); }
        else if (Math.abs(pos - last.pos) > 1.5) { seek?.(pos, true); }
        lastHostStateRef.current = { playing: true, pos };
      } else if (ytState === 2) {
        pause?.(pos);
        lastHostStateRef.current = { playing: false, pos };
      } else if (ytState === 3) {
        if (Math.abs(pos - last.pos) > 1.5) { seek?.(pos, last.playing); }
        lastHostStateRef.current = { playing: last.playing, pos };
      }
    }
  }, [isModerator, play, pause, seek, applySyncToPlayer]);

  useEffect(() => {
    if (!videoState) return;
    if (videoState.serverTime === lastAppliedSyncRef.current) return;
    lastAppliedSyncRef.current = videoState.serverTime;
    if (!isModerator) applySyncToPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState?.serverTime, videoState?.isPlaying, isModerator, applySyncToPlayer]);

  useEffect(() => { playerReadyRef.current = false; }, [currentUrl, ytFallbackId]);

  const onNavStateChange = useCallback((navState: WebViewNavigation) => {
    setWebLoading(navState.loading);
    // HTML-embed players (YouTube/Bunny/HLS): the top-level URL is only our
    // ORIGIN/about:blank, never a real video. Broadcasting it would make the
    // host overwrite the room video with watchpartylive.com and freeze playback.
    if (isHtmlSourceRef.current) return;
    if (!isModerator) return;
    if (navState.loading) return;
    const url = navState.url || '';
    if (!url || url === 'about:blank') return;
    if (url.indexOf('watchpartylive.com') !== -1) return;       // our origin, ignore
    if (url === lastBroadcastUrl.current) return;
    if (url === lastReceivedUrl.current) return;
    // Only broadcast a navigation that is actually a YouTube video (full-page
    // fallback case where the host browses to another clip).
    if (!extractYouTubeId(url)) return;
    lastBroadcastUrl.current = url;
    setCurrentUrl(url);
    changeVideo(url);
  }, [isModerator, changeVideo]);

  const onShouldStartLoadWithRequest = useCallback((request: any) => {
    const u = request?.url || '';
    // Allow internal schemes the player/iframe needs; otherwise only http(s).
    if (u === 'about:blank' || u.startsWith('data:') || u.startsWith('blob:')) return true;
    return u.startsWith('http://') || u.startsWith('https://');
  }, []);

  useEffect(() => { if (chatMessages.length > 0) requestAnimationFrame(() => chatListRef.current?.scrollToEnd({ animated: true })); }, [chatMessages.length]);
  useEffect(() => { Animated.timing(chatPanelAnim, { toValue: showChatPanel ? 0 : CHAT_PANEL_WIDTH, duration: 250, useNativeDriver: true }).start(); }, [showChatPanel, chatPanelAnim]);

  const shareMutation = useMutation({
    mutationFn: () => roomsApi.createInvite(roomId, 24 * 60),
    onSuccess: ({ invite }) => { setShareUrl(invite.url); setShowShare(true); },
    onError: (err) => showApiError(err, 'Could not create invite.'),
  });

  const sendText = useCallback(() => {
    const text = input.trim();
    if (!text || typeof sendChat !== 'function') return;
    sendChat(text); setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, sendChat]);

  const leaveRoom = () => navigation.goBack();

  if (loading || !room) {
    return <SafeAreaView style={[styles.root, styles.center]}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  // Stable key => the WebView only remounts when the video itself changes.
  // Re-renders (chat, reactions, typing) reuse the same player instance.
  const WebPlayer = (
    <WebView
      key={playerKey}
      ref={webviewRef}
      source={playerSource}
      onMessage={onPlayerMessage}
      onNavigationStateChange={onNavStateChange}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      originWhitelist={['*']}
      javaScriptEnabled domStorageEnabled allowsFullscreenVideo
      allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false} sharedCookiesEnabled thirdPartyCookiesEnabled
      mixedContentMode="always"
      // Hardware layer keeps the video surface from going black on Android.
      androidLayerType="hardware"
      nestedScrollEnabled
      style={styles.webview}
    />
  );

  if (isFullscreen) {
    return (
      <View style={styles.fullscreenRoot}>
        <StatusBar hidden />
        {WebPlayer}
        <View style={styles.reactionsOverlay} pointerEvents="none">
          {reactions.map((r, i) => <FloatingReaction key={`${r.at}-${i}-${r.emoji}`} emoji={r.emoji} />)}
        </View>
        <TouchableOpacity onPress={() => setIsFullscreen(false)} style={styles.fsExitBtn}><Icon name="contract-outline" size={20} color="#fff" /></TouchableOpacity>
        <TouchableOpacity onPress={() => setShowChatPanel(!showChatPanel)} style={styles.fsChatToggle}>
          <Icon name="chatbubble-ellipses" size={20} color="#fff" />
          {chatMessages.length > 0 && <View style={styles.fsBadge}><AppText variant="tiny" bold>{chatMessages.length}</AppText></View>}
        </TouchableOpacity>
        <Animated.View style={[styles.fsChatPanel, { transform: [{ translateX: chatPanelAnim }] }]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.fsChatHeader}><AppText bold>Chat</AppText><TouchableOpacity onPress={() => setShowChatPanel(false)}><Icon name="close" size={20} color="#fff" /></TouchableOpacity></View>
            <FlatList ref={chatListRef} data={chatMessages} keyExtractor={(m) => m.id} contentContainerStyle={{ padding: 10 }} keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={styles.fsMessageRow}>
                  {item.sender.avatarUrl ? <Image source={{ uri: item.sender.avatarUrl }} style={styles.fsAvatar} /> : <View style={[styles.fsAvatar, styles.fsAvatarFallback]}><AppText variant="tiny" bold>{(item.sender.fullName || item.sender.username).slice(0,1).toUpperCase()}</AppText></View>}
                  <View style={{ flex: 1, marginLeft: 8 }}><AppText variant="tiny" color={colors.textSecondary}>{item.sender.fullName || item.sender.username}</AppText><AppText variant="small">{item.content}</AppText></View>
                </View>
              )} />
            <View style={styles.fsReactionRow}>{REACTIONS.map((r) => <TouchableOpacity key={r} onPress={() => sendReaction(r)}><AppText style={{ fontSize: 22 }}>{r}</AppText></TouchableOpacity>)}</View>
            <View style={styles.fsInputRow}>
              <TextInput value={input} onChangeText={setInput} onSubmitEditing={sendText} returnKeyType="send" blurOnSubmit={false} placeholder="Say something…" placeholderTextColor={colors.textMuted} style={styles.fsInput} />
              <TouchableOpacity onPress={sendText} style={{ padding: 8 }}><Icon name="send" size={20} color={colors.primary} /></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={leaveRoom} style={styles.headerBtn}><Icon name="chevron-back" size={22} color={colors.white} /></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <AppText bold numberOfLines={1}>{room.name}</AppText>
            <AppText variant="tiny" color={colors.textSecondary}>{presentUsers.length} watching · Code: {room.code}</AppText>
          </View>
          {/* Share via social media (WhatsApp / Instagram / copy link) */}
          <TouchableOpacity onPress={() => shareMutation.mutate()} style={styles.headerBtn}>
            {shareMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="share-social" size={19} color={colors.white} />}
          </TouchableOpacity>
          {/* Invite WatchParty friends */}
          <TouchableOpacity onPress={() => navigation.navigate('InviteFriends', { roomId })} style={styles.headerBtn}>
            <Icon name="person-add" size={19} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsFullscreen(true)} style={styles.headerBtn}><Icon name="expand-outline" size={19} color={colors.white} /></TouchableOpacity>
        </View>

        <View style={[styles.videoWrap, { height: VIDEO_HEIGHT }]}>
          {WebPlayer}
          <View style={styles.reactionsOverlay} pointerEvents="none">{reactions.map((r, i) => <FloatingReaction key={`${r.at}-${i}-${r.emoji}`} emoji={r.emoji} />)}</View>
          {webLoading && <View style={styles.webLoader} pointerEvents="none"><ActivityIndicator color={colors.primary} /></View>}
          {!isModerator && <View style={styles.guestBadge}><Icon name="eye" size={12} color="#fff" /><AppText variant="tiny" bold style={{ marginLeft: 4 }}>Watching with host</AppText></View>}
        </View>

        <View style={styles.reactionRow}>{REACTIONS.map((r) => <TouchableOpacity key={r} onPress={() => sendReaction(r)} style={styles.reactionBtn}><AppText style={{ fontSize: 22 }}>{r}</AppText></TouchableOpacity>)}</View>

        {isChatMinimized ? (
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setIsChatMinimized(false)} activeOpacity={0.85} style={styles.chatBubble}>
              <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chatBubbleInner}>
                <Icon name="chatbubble-ellipses" size={24} color="#fff" />
                {chatMessages.length > 0 && <View style={styles.chatBubbleBadge}><AppText variant="tiny" bold style={{ color: colors.primary }}>{chatMessages.length > 9 ? '9+' : chatMessages.length}</AppText></View>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}><AppText bold variant="small">Chat with the room</AppText><TouchableOpacity onPress={() => setIsChatMinimized(true)}><Icon name="chevron-down" size={20} color="#fff" /></TouchableOpacity></View>
            <FlatList ref={chatListRef} data={chatMessages} keyExtractor={(m) => m.id} contentContainerStyle={{ padding: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const mine = item.senderId === user?.id;
                return (
                  <View style={[styles.messageRow, mine && { flexDirection: 'row-reverse' }]}>
                    {item.sender.avatarUrl ? <Image source={{ uri: item.sender.avatarUrl }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><AppText variant="tiny" bold>{(item.sender.fullName || item.sender.username).slice(0,1).toUpperCase()}</AppText></View>}
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, mine ? { marginRight: 8 } : { marginLeft: 8 }]}>
                      {!mine && <AppText variant="tiny" color={colors.textSecondary} style={{ marginBottom: 2 }}>{item.sender.fullName || item.sender.username}</AppText>}
                      <AppText variant="small">{item.content}</AppText>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: spacing.lg }}><AppText variant="small" color={colors.textMuted}>Say something to start the chat 👋</AppText></View>} />
            <View style={styles.inputRow}>
              <TextInput ref={inputRef} value={input} onChangeText={setInput} onSubmitEditing={sendText} returnKeyType="send" blurOnSubmit={false} placeholder="Say something…" placeholderTextColor={colors.textMuted} style={styles.input} multiline={false} />
              <TouchableOpacity onPress={sendText} style={styles.sendBtn} hitSlop={10}><Icon name="send" size={20} color={colors.primary} /></TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <ShareModal visible={showShare && !!shareUrl} onClose={() => setShowShare(false)} title={room.name || 'Watch Party'} subtitle="WatchPartyLive" thumbnailUrl={room.thumbnailUrl || undefined} shareUrl={shareUrl || ''} />
    </SafeAreaView>
  );
};

const FloatingReaction: React.FC<{ emoji: string }> = ({ emoji }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const leftPos = useRef(20 + Math.random() * (SCREEN_W - 80)).current;
  useEffect(() => { Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }).start(); }, [anim]);
  return (
    <Animated.View style={{ position: 'absolute', bottom: 0, left: leftPos, opacity: anim.interpolate({ inputRange: [0,0.2,0.8,1], outputRange: [0,1,1,0] }), transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [0,-200] }) }] }}>
      <AppText style={{ fontSize: 36 }}>{emoji}</AppText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  fullscreenRoot: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  webview: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#0a0a0a' },
  headerBtn: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  videoWrap: { backgroundColor: '#000', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  webLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  guestBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  reactionsOverlay: { ...StyleSheet.absoluteFillObject },
  reactionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  reactionBtn: { padding: 6 },
  chatContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 4 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '70%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: 'rgba(255,255,255,0.1)' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 14, color: '#fff', height: 40, fontFamily: 'SchibstedGrotesk' },
  sendBtn: { padding: 8, marginLeft: 4 },
  chatBubble: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, elevation: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  chatBubbleInner: { flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  chatBubbleBadge: { position: 'absolute', top: -2, right: -2, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0a0a0a' },
  fsExitBtn: { position: 'absolute', top: 50, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  fsChatToggle: { position: 'absolute', top: 50, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  fsBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  fsChatPanel: { position: 'absolute', top: 0, right: 0, bottom: 0, width: CHAT_PANEL_WIDTH, backgroundColor: 'rgba(10,10,10,0.95)', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' },
  fsChatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 50, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  fsMessageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  fsAvatar: { width: 28, height: 28, borderRadius: 14 },
  fsAvatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  fsReactionRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' },
  fsInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' },
  fsInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 14, color: '#fff', height: 40, fontFamily: 'SchibstedGrotesk' },
});

export default RoomScreen;