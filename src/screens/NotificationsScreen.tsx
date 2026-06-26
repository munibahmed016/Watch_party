import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { notificationsApi, Notification } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const ICONS: Record<string, string> = {
  FRIEND_REQUEST:  'person-add',
  FRIEND_ACCEPTED: 'people',
  ROOM_INVITE:     'albums',
  NEW_MESSAGE:     'chatbubble',
  FOLLOW:          'heart',
  SUBSCRIBE:       'star',
  CONTENT_LIKE:    'thumbs-up',
  COMMENT:         'chatbubble-ellipses',
  SYSTEM:          'notifications',
};

const timeAgo = (iso: string) => {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  } catch { return ''; }
};

const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list({ limit: 50 }),
  });

  const items = listQuery.data?.items || [];
  const unreadCount = listQuery.data?.unreadCount || 0;

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'list'] }),
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'list'] }),
    onError: (err) => showApiError(err, 'Could not mark all read.'),
  });
  const removeOne = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'list'] }),
  });

  const onPressItem = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const data = (n.data as any) || {};

    switch (n.type) {
      case 'FRIEND_REQUEST':
        navigation.navigate('FriendRequests');
        break;
      case 'FRIEND_ACCEPTED':
        navigation.navigate('FriendsList');
        break;
      case 'ROOM_INVITE':
        if (data.roomId) navigation.navigate('Room', { roomId: data.roomId });
        else navigation.navigate('FriendRequests');
        break;
      case 'NEW_MESSAGE':
        if (data.chatId) navigation.navigate('ChatDetail', { chatId: data.chatId });
        break;
      case 'FOLLOW':
      case 'SUBSCRIBE':
        // Go to creator's own profile or the follower's profile
        if (data.creatorId || data.username) {
          navigation.navigate('PodcastHostProfile', {
            username: data.username,
            creatorId: data.creatorId,
          });
        } else {
          navigation.navigate('MyProfile');
        }
        break;
      case 'CONTENT_LIKE':
      case 'COMMENT':
        // Go to creator dashboard to see content stats
        navigation.navigate('CreatorDashboard');
        break;
      default:
        break;
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.row, !item.isRead && styles.rowUnread]}
      activeOpacity={0.8}
      onPress={() => onPressItem(item)}>
      <View style={[styles.iconWrap, !item.isRead && { backgroundColor: 'rgba(238,48,99,0.18)' }]}>
        <Icon
          name={ICONS[item.type] || 'notifications'}
          size={18}
          color={item.isRead ? colors.textSecondary : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="small" bold numberOfLines={1}>{item.title}</AppText>
        <AppText variant="tiny" color={colors.textSecondary} numberOfLines={2} style={{ marginTop: 2 }}>
          {item.body}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="tiny" color={colors.textMuted}>{timeAgo(item.createdAt)}</AppText>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      <TouchableOpacity
        onPress={() => removeOne.mutate(item.id)}
        style={styles.delBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="close" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={['top']}>
      <BrandHeader
        showBack
        onBack={() => navigation.goBack()}
        infoTitle="Notifications"
        infoIntro="Friend requests, room invites, messages and updates."
        infoPoints={[
          { icon: 'notifications', title: 'Stay updated', text: 'All your alerts in one place.' },
          { icon: 'checkmark-done', title: 'Mark read', text: 'Tap an alert to open it.' },
        ]}
      />
      <View style={styles.head}>
        <GradientText variant="h2" style={{ lineHeight: 32, paddingBottom: 2 }}>Notifications</GradientText>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAll.mutate()} style={styles.markAllBtn} activeOpacity={0.8}>
            <Icon name="checkmark-done" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <AppText variant="tiny" bold color={colors.primary}>Mark all read</AppText>
          </TouchableOpacity>
        )}
      </View>

      {listQuery.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Icon name="notifications-off-outline" size={46} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 12 }}>
            No notifications yet.
          </AppText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          refreshing={listQuery.isRefetching}
          onRefresh={() => listQuery.refetch()}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: layout.radius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  rowUnread: { backgroundColor: 'rgba(238,48,99,0.07)', borderColor: 'rgba(238,48,99,0.3)' },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  delBtn: { padding: 4 },
});

export default NotificationsScreen;