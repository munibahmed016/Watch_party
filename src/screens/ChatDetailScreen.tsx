import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, StyleSheet, Image, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StatusBar, ListRenderItem, Keyboard, Alert, ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary, MediaType, PhotoQuality } from 'react-native-image-picker';
import AppText from '@/components/AppText';
import EmojiPicker from '@/components/EmojiPicker';
import GifPicker from '@/components/GifPicker';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { chatsApi } from '@/lib/api';
import type { Message } from '@/lib/api';

type Panel = 'none' | 'emoji' | 'gif';

const ChatDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const chatId: string | null = route.params?.chatId || null;
  const name = route.params?.name || 'Chat';
  const avatar = route.params?.avatar || null;

  const { messages, loading, typingUsers, send, setTyping } = useChat(chatId);

  // Dedupe by id — prevents duplicate render + React duplicate-key warning
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (!m || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);
  const [input, setInput] = useState('');
  const [panel, setPanel] = useState<Panel>('none');
  const [uploading, setUploading] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  // Who we're chatting with (for opening their profile from the header).
  const [otherUser, setOtherUser] = useState<{ id: string; username: string } | null>(
    route.params?.username ? { id: route.params?.userId || '', username: route.params.username } : null
  );
  useEffect(() => {
    if (!chatId) return;
    let alive = true;
    chatsApi
      .get(chatId)
      .then(({ chat }) => {
        const ou = (chat as any).otherUser;
        if (alive && ou?.username) setOtherUser({ id: ou.id, username: ou.username });
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [chatId]);

  const openProfile = () => {
    if (!otherUser?.username && !otherUser?.id) return;
    navigation.navigate('UserProfile', { username: otherUser?.username, userId: otherUser?.id });
  };

  useEffect(() => {
    if (uniqueMessages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [uniqueMessages.length]);

  const handleType = (text: string) => {
    setInput(text);
    setTyping(text.trim().length > 0);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTyping(false), 2000);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    void send(text);
    setInput('');
    setTyping(false);
  };

  // Send a GIF (from Giphy) as an IMAGE message carrying its url as mediaUrl.
  const handleSendGif = (gifUrl: string) => {
    setPanel('none');
    void send('', { type: 'IMAGE', mediaUrl: gifUrl });
  };

  const handleEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
  };

  // Android: CAMERA is declared in the manifest, so launchCamera needs a
  // runtime grant first (otherwise image-picker fails with a permission error).
  const ensureCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera access',
          message: 'Allow camera access to take a photo to send.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  // Pick a photo (camera or gallery), upload to Cloudinary, then send as an image message.
  const attachImage = async (source: 'camera' | 'gallery') => {
    setPanel('none');
    try {
      if (source === 'camera') {
        const ok = await ensureCameraPermission();
        if (!ok) {
          Alert.alert('Camera access needed', 'Please allow camera access to take a photo.');
          return;
        }
      }
      const opts = {
        mediaType: 'photo' as MediaType,
        selectionLimit: 1,
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.85 as PhotoQuality,
        saveToPhotos: false,
      };
      const res = source === 'camera'
        ? await launchCamera(opts)
        : await launchImageLibrary(opts);
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      setUploading(true);
      const { url } = await chatsApi.uploadMedia(asset.uri, asset.type || 'image/jpeg');
      void send('', { type: 'IMAGE', mediaUrl: url });
    } catch {
      Alert.alert('Upload failed', 'Could not send that photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const togglePanel = (p: Panel) => {
    setPanel((cur) => {
      const next = cur === p ? 'none' : p;
      if (next !== 'none') Keyboard.dismiss();
      return next;
    });
  };

  const renderItem: ListRenderItem<Message> = ({ item }) => {
    const mine = item.senderId === user?.id;
    const hasMedia = !!item.mediaUrl;
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        {!mine && (
          <View style={styles.smallAvatarWrap}>
            {item.sender.avatarUrl ? (
              <Image source={{ uri: item.sender.avatarUrl }} style={styles.smallAvatar} />
            ) : (
              <View style={[styles.smallAvatar, styles.smallAvatarFallback]}>
                <AppText variant="tiny" bold>
                  {(item.sender.fullName || item.sender.username).slice(0, 1).toUpperCase()}
                </AppText>
              </View>
            )}
          </View>
        )}

        {hasMedia ? (
          // Image / GIF message
          <View style={[styles.mediaWrap, mine ? styles.mediaMine : styles.mediaTheirs]}>
            <Image source={{ uri: item.mediaUrl as string }} style={styles.mediaImg} resizeMode="cover" />
            {!!item.content && (
              <AppText variant="small" color={mine ? colors.white : undefined} style={{ marginTop: 6 }}>
                {item.content}
              </AppText>
            )}
          </View>
        ) : mine ? (
          <View style={[styles.bubble, styles.bubbleMine]}>
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={colors.gradientStartPoint}
              end={colors.gradientEndPoint}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            <AppText variant="small" color={colors.white}>{item.content}</AppText>
          </View>
        ) : (
          <View style={[styles.bubble, styles.bubbleTheirs]}>
            <AppText variant="small">{item.content}</AppText>
          </View>
        )}

        {mine && (
          <View style={[styles.smallAvatarWrap, { marginLeft: 6, marginRight: 0 }]}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.smallAvatar} />
            ) : (
              <View style={[styles.smallAvatar, styles.smallAvatarFallback]}>
                <AppText variant="tiny" bold>
                  {(user?.fullName || user?.username || '?').slice(0, 1).toUpperCase()}
                </AppText>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.head}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headInfo} activeOpacity={0.7} onPress={openProfile}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.headAvatar} />
          ) : (
            <View style={[styles.headAvatar, styles.smallAvatarFallback]}>
              <AppText bold variant="small">
                {(name || '?').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
              </AppText>
            </View>
          )}
          <View style={{ marginLeft: 8 }}>
            <AppText bold numberOfLines={1}>{name}</AppText>
            <AppText variant="tiny" color={typingUsers.length > 0 ? colors.primary : colors.textSecondary}>
              {typingUsers.length > 0 ? 'Typing…' : 'Tap to view profile'}
            </AppText>
          </View>
        </TouchableOpacity>
        {/* Call + video icons removed per request. */}
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>

        <FlatList
          ref={listRef}
          data={uniqueMessages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setPanel('none')}
          ListHeaderComponent={
            <View style={styles.profileHeader}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.bigAvatar} />
              ) : (
                <View style={[styles.bigAvatar, styles.smallAvatarFallback]}>
                  <AppText variant="h2" bold>{(name || '?').slice(0, 1).toUpperCase()}</AppText>
                </View>
              )}
              <View style={styles.bigOnlineDot} />
              <AppText variant="h2" bold style={{ marginTop: spacing.md }}>{name}</AppText>
              <AppText variant="tiny" color={colors.textSecondary}>WatchPartyLive</AppText>
              {!loading && uniqueMessages.length === 0 && (
                <AppText variant="tiny" color={colors.textMuted} center style={{ marginTop: 8, paddingHorizontal: spacing.xl }}>
                  Say hi 👋 to start the conversation.
                </AppText>
              )}
            </View>
          }
        />

        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="tiny" color={colors.textSecondary} style={{ marginLeft: 8 }}>
              Sending photo…
            </AppText>
          </View>
        )}

        <View style={[styles.inputBar, panel === 'none' && { paddingBottom: Math.max(8, insets.bottom) }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => attachImage('camera')} disabled={uploading}>
            <Icon name="camera-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => attachImage('gallery')} disabled={uploading}>
            <Icon name="image-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gifBtn} onPress={() => togglePanel('gif')}>
            <AppText variant="tiny" bold color={panel === 'gif' ? colors.primary : colors.textSecondary}>GIF</AppText>
          </TouchableOpacity>
          <View style={styles.inputBox}>
            <TextInput
              value={input}
              onChangeText={handleType}
              onFocus={() => setPanel('none')}
              placeholder="Message…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
            />
          </View>
          {input.trim() ? (
            <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.85}>
              <LinearGradient
                colors={colors.buttonGradient as unknown as string[]}
                start={colors.gradientStartPoint}
                end={colors.gradientEndPoint}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              <Icon name="send" size={18} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.iconBtn} onPress={() => togglePanel('emoji')}>
              <Icon name="happy-outline" size={22} color={panel === 'emoji' ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Emoji / GIF panels */}
        {panel === 'emoji' && <EmojiPicker onSelect={handleEmoji} onClose={() => setPanel('none')} />}
        {panel === 'gif' && <GifPicker onSelect={handleSendGif} onClose={() => setPanel('none')} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headAvatar: { width: 36, height: 36, borderRadius: 18 },
  chat: { flex: 1 },
  chatContent: { padding: spacing.md, paddingBottom: 8 },
  profileHeader: { alignItems: 'center', paddingVertical: spacing.xl, position: 'relative' },
  bigAvatar: { width: 96, height: 96, borderRadius: 48 },
  bigOnlineDot: {
    position: 'absolute', top: spacing.xl + 70, right: '38%',
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#22C55E', borderWidth: 3, borderColor: colors.background,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  smallAvatarWrap: { marginRight: 6 },
  smallAvatar: { width: 24, height: 24, borderRadius: 12 },
  smallAvatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    maxWidth: '76%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, overflow: 'hidden',
  },
  bubbleMine: { borderBottomRightRadius: 5 },
  bubbleTheirs: {
    backgroundColor: colors.bg4,
    borderBottomLeftRadius: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  mediaWrap: { maxWidth: '70%', padding: 4, borderRadius: 16, overflow: 'hidden' },
  mediaMine: { backgroundColor: 'rgba(238,48,99,0.18)', borderBottomRightRadius: 5 },
  mediaTheirs: { backgroundColor: colors.bg4, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 },
  mediaImg: { width: 200, height: 180, borderRadius: 12, backgroundColor: colors.surfaceElevated },
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingTop: 6,
    backgroundColor: colors.background,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  uploadingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, backgroundColor: 'rgba(238,48,99,0.08)',
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  gifBtn: {
    height: 26, paddingHorizontal: 8, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 2,
  },
  inputBox: {
    flex: 1, marginHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 999, paddingHorizontal: 14,
    minHeight: 40, maxHeight: 100, justifyContent: 'center',
  },
  input: {
    color: colors.white, fontSize: 15,
    fontFamily: 'Outfit-Regular',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    marginHorizontal: 4, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
});

export default ChatDetailScreen;