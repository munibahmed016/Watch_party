import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, StyleSheet, Image, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StatusBar, ListRenderItem,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import type { Message } from '@/lib/api';

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
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

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

  const renderItem: ListRenderItem<Message> = ({ item }) => {
    const mine = item.senderId === user?.id;
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
        {mine ? (
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
        <View style={styles.headInfo}>
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
              {typingUsers.length > 0 ? 'Typing…' : 'Active now'}
            </AppText>
          </View>
        </View>
        <TouchableOpacity style={styles.actBtn}>
          <Icon name="call-outline" size={20} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actBtn}>
          <Icon name="videocam-outline" size={22} color={colors.white} />
        </TouchableOpacity>
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

        <View style={[styles.inputBar, { paddingBottom: Math.max(8, insets.bottom) }]}>
          <TouchableOpacity style={styles.iconBtn}>
            <Icon name="camera-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Icon name="image-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.inputBox}>
            <TextInput
              value={input}
              onChangeText={handleType}
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
            <TouchableOpacity style={styles.iconBtn}>
              <Icon name="happy-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
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
  actBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingTop: 6,
    backgroundColor: colors.background,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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