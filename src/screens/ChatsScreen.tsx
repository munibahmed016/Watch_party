// src/screens/ChatsScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View, StyleSheet, FlatList, Image, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { chatsApi, friendsApi, Chat, PublicUser } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

const Avatar: React.FC<{ uri: string | null; name: string; size?: number; showDot?: boolean }> = ({
  uri, name, size = 48, showDot,
}) => {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const avStyle = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={{ position: 'relative' }}>
      {uri ? (
        <Image source={{ uri }} style={avStyle} />
      ) : (
        <View style={[avStyle, styles.avatarFallback]}>
          <AppText bold>{initials}</AppText>
        </View>
      )}
      {showDot && <View style={styles.dot} />}
    </View>
  );
};

const ChatsScreen = () => {
  const navigation = useNavigation<any>();
  const [q, setQ] = useState('');

  const chatsQuery = useQuery({
    queryKey: queryKeys.chatsList,
    queryFn: () => chatsApi.list(),
    refetchInterval: 30 * 1000, // refresh chat list every 30s
  });

  const friendsQuery = useQuery({
    queryKey: queryKeys.friendsList,
    queryFn: () => friendsApi.list(20, 0),
  });

  const openDirectMutation = useMutation({
    mutationFn: (userId: string) => chatsApi.openDirect(userId),
    onSuccess: ({ chat }) => {
      navigation.navigate('ChatDetail', {
        chatId: chat.id,
        name: chat.name,
        avatar: chat.avatarUrl,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatsList });
    },
    onError: (err) => showApiError(err, 'Could not open chat.'),
  });

  const filteredChats = useMemo(() => {
    const all = chatsQuery.data?.chats || [];
    if (!q.trim()) return all;
    const lc = q.toLowerCase();
    return all.filter((c) => (c.name || '').toLowerCase().includes(lc));
  }, [chatsQuery.data, q]);

  const filteredFriends = useMemo(() => {
    const all = friendsQuery.data?.friends || [];
    if (!q.trim()) return all;
    const lc = q.toLowerCase();
    return all.filter((f) =>
      (f.fullName || '').toLowerCase().includes(lc) || f.username.toLowerCase().includes(lc)
    );
  }, [friendsQuery.data, q]);

  const refresh = () => {
    chatsQuery.refetch();
    friendsQuery.refetch();
  };

  const renderChat = ({ item }: { item: Chat }) => {
    const previewText = item.lastMessage?.content || 'No messages yet';
    const time = item.lastMessage?.createdAt
      ? formatTime(item.lastMessage.createdAt)
      : '';
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('ChatDetail', {
            chatId: item.id,
            name: item.name,
            avatar: item.avatarUrl,
          })
        }>
        <Avatar
          uri={item.avatarUrl}
          name={item.name || '?'}
          showDot={!!item.members.find((m) => m.id !== item.otherUser?.id ? false : m.isOnline)}
        />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={styles.rowTop}>
            <AppText bold numberOfLines={1} style={{ flex: 1 }}>
              {item.name || '(unknown)'}
            </AppText>
            <AppText variant="tiny" color={colors.textSecondary}>{time}</AppText>
          </View>
          <View style={styles.rowBottom}>
            <AppText
              variant="small"
              color={item.unreadCount ? colors.textPrimary : colors.textSecondary}
              numberOfLines={1}
              style={{ flex: 1 }}>
              {previewText}
            </AppText>
            {item.unreadCount > 0 && (
              <View style={styles.unread}>
                <AppText variant="tiny" bold>{item.unreadCount}</AppText>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriend = ({ item }: { item: PublicUser }) => (
    <TouchableOpacity
      onPress={() => openDirectMutation.mutate(item.id)}
      style={styles.friendCard}
      activeOpacity={0.85}>
      <Avatar uri={item.avatarUrl} name={item.fullName || item.username} size={56} showDot={item.isOnline} />
      <AppText variant="tiny" numberOfLines={1} style={{ marginTop: 6, maxWidth: 64, textAlign: 'center' }}>
        {(item.fullName || item.username).split(' ')[0]}
      </AppText>
    </TouchableOpacity>
  );

  if (chatsQuery.isLoading && !chatsQuery.data) {
    return (
      <ScreenContainer>
        <AppHeader showBack={false} title="Chats" showLogo={false} />
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader showBack={false} title="Chats" showLogo={false} />

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={renderChat}
        refreshControl={
          <RefreshControl
            refreshing={chatsQuery.isFetching && !chatsQuery.isLoading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          filteredFriends.length > 0 ? (
            <View style={{ marginBottom: spacing.md }}>
              <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                Friends
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {filteredFriends.map((f) => (
                  <View key={f.id}>{renderFriend({ item: f })}</View>
                ))}
              </ScrollView>
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
                Messages
              </AppText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <AppText variant="small" color={colors.textSecondary} center>
              {q.trim()
                ? 'No conversations match your search.'
                : 'Start a chat by tapping a friend above.'}
            </AppText>
          </View>
        }
      />
    </ScreenContainer>
  );
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const dayMs = 1000 * 60 * 60 * 24;
  const diff = (today.getTime() - d.getTime()) / dayMs;
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: layout.radius.pill,
    paddingHorizontal: spacing.md, height: 44,
  },
  searchInput: {
    flex: 1, color: colors.white, marginLeft: spacing.sm,
    fontFamily: 'SchibstedGrotesk',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: layout.radius.lg,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  rowBottom: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2, borderColor: colors.background,
  },
  unread: {
    minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  friendCard: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 64,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});

export default ChatsScreen;
