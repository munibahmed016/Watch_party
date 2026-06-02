// src/screens/RoomScreen.tsx
// Synced watch party. WebView (top) + Chat (bottom). Moderator broadcasts URL changes.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList,
  TextInput, KeyboardAvoidingView, Platform, StatusBar, Animated,
  Dimensions, Image, Keyboard,
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
const VIDEO_HEIGHT = Math.round(SCREEN_H * 0.38); // slightly smaller so chat has room
const CHAT_PANEL_WIDTH = SCREEN_W * 0.75;

const REACTIONS = ['❤️', '😂', '😮', '👏', '🔥', '🥺'];

const RoomScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const roomId: string = route.params?.roomId;

  const {
    room,
    videoState,
    presentUsers,
    chatMessages,
    reactions,
    loading,
    isModerator,
    changeVideo,
    sendChat,
    sendReaction,
  } = useRoom(roomId);

  const webviewRef = useRef<WebView>(null);
  const chatListRef = useRef<FlatList<any>>(null);
  const inputRef = useRef<TextInput>(null);
  const lastBroadcastUrl = useRef<string>('');
  const lastReceivedUrl = useRef<string>('');

  const [currentUrl, setCurrentUrl] = useState('');
  const [webLoading, setWebLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const chatPanelAnim = useRef(new Animated.Value(CHAT_PANEL_WIDTH)).current;

  // Initial URL set + guest follows host's URL changes
  useEffect(() => {
    const newUrl = videoState?.url;
    if (!newUrl) return;

    if (!currentUrl) {
      setCurrentUrl(newUrl);
      lastReceivedUrl.current = newUrl;
      return;
    }

    if (newUrl !== currentUrl && newUrl !== lastBroadcastUrl.current) {
      lastReceivedUrl.current = newUrl;
      setCurrentUrl(newUrl);
      if (!isModerator) {
        webviewRef.current?.injectJavaScript(
          `window.location.href = "${newUrl}"; true;`
        );
      }
    }
  }, [videoState?.url, currentUrl, isModerator]);

  // Moderator: broadcast URL changes as they navigate
  const onNavStateChange = (navState: WebViewNavigation) => {
    setWebLoading(navState.loading);
    if (!isModerator) return;
    if (navState.loading) return;
    if (navState.url === lastBroadcastUrl.current) return;
    if (navState.url === lastReceivedUrl.current) return;
    lastBroadcastUrl.current = navState.url;
    setCurrentUrl(navState.url);
    changeVideo(navState.url);
  };

  // === FIX 3: Stop WebView from reloading when YouTube tries to open new windows ===
  const onShouldStartLoadWithRequest = useCallback((request: any) => {
    // Always allow http(s); block deep links / app-store schemes that would refresh us
    if (!request.url) return false;
    if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
      return true;
    }
    // Block youtube://, vnd.youtube://, itms-apps://, mailto:, etc.
    return false;
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatMessages.length > 0) {
      requestAnimationFrame(() => chatListRef.current?.scrollToEnd({ animated: true }));
    }
  }, [chatMessages.length]);

  // Slide chat panel for fullscreen mode
  useEffect(() => {
    Animated.timing(chatPanelAnim, {
      toValue: showChatPanel ? 0 : CHAT_PANEL_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [showChatPanel, chatPanelAnim]);

  const shareMutation = useMutation({
    mutationFn: () => roomsApi.createInvite(roomId, 24 * 60),
    onSuccess: ({ invite }) => {
      setShareUrl(invite.url);
      setShowShare(true);
    },
    onError: (err) => showApiError(err, 'Could not create invite.'),
  });

  // === FIX 1: Debug logging + correct send flow ===
  const sendText = useCallback(() => {
    const text = input.trim();
    console.log('[CHAT] Send tapped. text:', text, 'sendChat fn?', typeof sendChat);
    if (!text) return;
    if (typeof sendChat !== 'function') {
      console.warn('[CHAT] sendChat is not a function — useRoom hook broken');
      return;
    }
    sendChat(text);
    setInput('');
    // Keep focus on the input for rapid messaging
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, sendChat]);

  const leaveRoom = () => navigation.goBack();

  if (loading || !room) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const initialUri = currentUrl || room.videoUrl || 'https://m.youtube.com';

  // ====== FULLSCREEN MODE ======
  if (isFullscreen) {
    return (
      <View style={styles.fullscreenRoot}>
        <StatusBar hidden />

        <WebView
          ref={webviewRef}
          source={{ uri: initialUri }}
          onNavigationStateChange={onNavStateChange}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          originWhitelist={['http://*', 'https://*']}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          style={{ flex: 1 }}
        />

        <View style={styles.reactionsOverlay} pointerEvents="none">
          {reactions.map((r, i) => (
            <FloatingReaction key={`${r.at}-${i}-${r.emoji}`} emoji={r.emoji} />
          ))}
        </View>

        <TouchableOpacity onPress={() => setIsFullscreen(false)} style={styles.fsExitBtn}>
          <Icon name="contract-outline" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowChatPanel(!showChatPanel)}
          style={styles.fsChatToggle}>
          <Icon name="chatbubble-ellipses" size={20} color="#fff" />
          {chatMessages.length > 0 && (
            <View style={styles.fsBadge}>
              <AppText variant="tiny" bold>{chatMessages.length}</AppText>
            </View>
          )}
        </TouchableOpacity>

        <Animated.View
          style={[styles.fsChatPanel, { transform: [{ translateX: chatPanelAnim }] }]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}>
            <View style={styles.fsChatHeader}>
              <AppText bold>Chat</AppText>
              <TouchableOpacity onPress={() => setShowChatPanel(false)}>
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={chatListRef}
              data={chatMessages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: 10 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={styles.fsMessageRow}>
                  {item.sender.avatarUrl ? (
                    <Image source={{ uri: item.sender.avatarUrl }} style={styles.fsAvatar} />
                  ) : (
                    <View style={[styles.fsAvatar, styles.fsAvatarFallback]}>
                      <AppText variant="tiny" bold>
                        {(item.sender.fullName || item.sender.username).slice(0, 1).toUpperCase()}
                      </AppText>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <AppText variant="tiny" color={colors.textSecondary}>
                      {item.sender.fullName || item.sender.username}
                    </AppText>
                    <AppText variant="small">{item.content}</AppText>
                  </View>
                </View>
              )}
            />

            <View style={styles.fsReactionRow}>
              {REACTIONS.map((r) => (
                <TouchableOpacity key={r} onPress={() => sendReaction(r)}>
                  <AppText style={{ fontSize: 22 }}>{r}</AppText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.fsInputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendText}
                returnKeyType="send"
                blurOnSubmit={false}
                placeholder="Say something…"
                placeholderTextColor={colors.textMuted}
                style={styles.fsInput}
              />
              <TouchableOpacity onPress={sendText} style={{ padding: 8 }}>
                <Icon name="send" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    );
  }

  // ====== HALF-SCREEN MODE ======
  // === FIX 2: Wrap the ENTIRE screen in KeyboardAvoidingView, not just chat ===
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={leaveRoom} style={styles.headerBtn}>
            <Icon name="chevron-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <AppText bold numberOfLines={1}>{room.name}</AppText>
            <AppText variant="tiny" color={colors.textSecondary}>
              {presentUsers.length} watching · Code: {room.code}
            </AppText>
          </View>
          <TouchableOpacity onPress={() => shareMutation.mutate()} style={styles.headerBtn}>
            {shareMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Icon name="people" size={20} color={colors.white} />
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsFullscreen(true)} style={styles.headerBtn}>
            <Icon name="expand-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Video — fixed height */}
        <View style={[styles.videoWrap, { height: VIDEO_HEIGHT }]}>
          <WebView
            ref={webviewRef}
            source={{ uri: initialUri }}
            onNavigationStateChange={onNavStateChange}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            originWhitelist={['http://*', 'https://*']}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            style={{ flex: 1 }}
          />

          <View style={styles.reactionsOverlay} pointerEvents="none">
            {reactions.map((r, i) => (
              <FloatingReaction key={`${r.at}-${i}-${r.emoji}`} emoji={r.emoji} />
            ))}
          </View>

          {webLoading && (
            <View style={styles.webLoader} pointerEvents="none">
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
          {!isModerator && (
            <View style={styles.guestBadge}>
              <Icon name="eye" size={12} color="#fff" />
              <AppText variant="tiny" bold style={{ marginLeft: 4 }}>
                Watching with host
              </AppText>
            </View>
          )}
        </View>

        {/* Reaction row */}
        <View style={styles.reactionRow}>
          {REACTIONS.map((r) => (
            <TouchableOpacity key={r} onPress={() => sendReaction(r)} style={styles.reactionBtn}>
              <AppText style={{ fontSize: 22 }}>{r}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chat — flex: 1 so it actually has space */}
        {isChatMinimized ? (
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => setIsChatMinimized(false)}
              activeOpacity={0.85}
              style={styles.chatBubble}>
              <LinearGradient
                colors={colors.buttonGradient as unknown as string[]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.chatBubbleInner}>
                <Icon name="chatbubble-ellipses" size={24} color="#fff" />
                {chatMessages.length > 0 && (
                  <View style={styles.chatBubbleBadge}>
                    <AppText variant="tiny" bold style={{ color: colors.primary }}>
                      {chatMessages.length > 9 ? '9+' : chatMessages.length}
                    </AppText>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <AppText bold variant="small">Chat with the room</AppText>
              <TouchableOpacity onPress={() => setIsChatMinimized(true)}>
                <Icon name="chevron-down" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={chatListRef}
              data={chatMessages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: 12, flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const mine = item.senderId === user?.id;
                return (
                  <View style={[styles.messageRow, mine && { flexDirection: 'row-reverse' }]}>
                    {item.sender.avatarUrl ? (
                      <Image source={{ uri: item.sender.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <AppText variant="tiny" bold>
                          {(item.sender.fullName || item.sender.username).slice(0, 1).toUpperCase()}
                        </AppText>
                      </View>
                    )}
                    <View style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                      mine ? { marginRight: 8 } : { marginLeft: 8 },
                    ]}>
                      {!mine && (
                        <AppText variant="tiny" color={colors.textSecondary} style={{ marginBottom: 2 }}>
                          {item.sender.fullName || item.sender.username}
                        </AppText>
                      )}
                      <AppText variant="small">{item.content}</AppText>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: spacing.lg }}>
                  <AppText variant="small" color={colors.textMuted}>
                    Say something to start the chat 👋
                  </AppText>
                </View>
              }
            />

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendText}
                returnKeyType="send"
                blurOnSubmit={false}
                placeholder="Say something…"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline={false}
              />
              <TouchableOpacity onPress={sendText} style={styles.sendBtn} hitSlop={10}>
                <Icon name="send" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <ShareModal
        visible={showShare && !!shareUrl}
        onClose={() => setShowShare(false)}
        title={room.name || 'Watch Party'}
        subtitle="WatchPartyLive"
        thumbnailUrl={room.thumbnailUrl || undefined}
        shareUrl={shareUrl || ''}
      />
    </SafeAreaView>
  );
};

const FloatingReaction: React.FC<{ emoji: string }> = ({ emoji }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const leftPos = useRef(20 + Math.random() * (SCREEN_W - 80)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: leftPos,
        opacity: anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{
          translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -200] }),
        }],
      }}>
      <AppText style={{ fontSize: 36 }}>{emoji}</AppText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  fullscreenRoot: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: '#0a0a0a',
  },
  headerBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },

  videoWrap: {
    backgroundColor: '#000',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  webLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  guestBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  reactionsOverlay: { ...StyleSheet.absoluteFillObject },

  reactionRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  reactionBtn: { padding: 6 },

  // === Container for the chat section so it claims remaining space ===
  chatContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 4 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  bubble: { maxWidth: '70%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: 'rgba(255,255,255,0.1)' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingHorizontal: 14,
    color: '#fff', height: 40,
    fontFamily: 'SchibstedGrotesk',
  },
  sendBtn: { padding: 8, marginLeft: 4 },

  chatBubble: {
    position: 'absolute',
    bottom: 24, right: 24,
    width: 60, height: 60,
    elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  chatBubbleInner: {
    flex: 1, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  chatBubbleBadge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 22, height: 22, paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0a0a0a',
  },

  fsExitBtn: {
    position: 'absolute', top: 50, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  fsChatToggle: {
    position: 'absolute', top: 50, right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  fsBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 20, height: 20, paddingHorizontal: 4,
    borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  fsChatPanel: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: CHAT_PANEL_WIDTH,
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  fsChatHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, paddingTop: 50,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  fsMessageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  fsAvatar: { width: 28, height: 28, borderRadius: 14 },
  fsAvatarFallback: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  fsReactionRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  fsInputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  fsInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingHorizontal: 14,
    color: '#fff', height: 40,
    fontFamily: 'SchibstedGrotesk',
  },
});

export default RoomScreen;
