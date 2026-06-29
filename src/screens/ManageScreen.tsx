import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import ConfirmModal from '@/components/ConfirmModal';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import {
  meApi, analyticsApi, roomsApi, creatorsApi,
  MyRoom, MyCreatorLink,
} from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

type TabKey = 'rooms' | 'following' | 'subscriptions' | 'followers' | 'subscribers';

const fmtCount = (n: number) =>
  n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

const ManageScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();

  // Am I a creator? (controls whether Followers/Subscribers tabs are shown)
  const creatorQuery = useQuery({ queryKey: ['creator', 'me'], queryFn: () => creatorsApi.getMine() });
  const isCreator = !!creatorQuery.data?.creator && creatorQuery.data.creator.status === 'APPROVED';

  // Tabs available to this user
  const tabs = useMemo<[TabKey, string][]>(() => {
    const base: [TabKey, string][] = [
      ['rooms', 'Rooms'],
      ['following', 'Following'],
      ['subscriptions', 'Subscriptions'],
    ];
    if (isCreator) {
      base.push(['followers', 'Followers']);
      base.push(['subscribers', 'Subscribers']);
    }
    return base;
  }, [isCreator]);

  const [tab, setTab] = useState<TabKey>((route.params?.tab as TabKey) || 'rooms');
  // If we landed on a creator-only tab but the user isn't a creator, fall back.
  useEffect(() => {
    if (!tabs.find(([k]) => k === tab)) setTab('rooms');
  }, [tabs, tab]);

  // ---- data ----
  const roomsQuery = useQuery({ queryKey: ['me', 'rooms'], queryFn: () => meApi.rooms() });
  const followingQuery = useQuery({ queryKey: ['me', 'following'], queryFn: () => meApi.following() });
  const subscriptionsQuery = useQuery({ queryKey: ['me', 'subscriptions'], queryFn: () => meApi.subscriptions() });
  const followersQuery = useQuery({
    queryKey: ['creator', 'followers'],
    queryFn: () => analyticsApi.creatorFollowers(1, 100),
    enabled: isCreator && tab === 'followers',
  });
  const subscribersQuery = useQuery({
    queryKey: ['creator', 'subscribers'],
    queryFn: () => analyticsApi.creatorSubscribers(1, 100),
    enabled: isCreator && tab === 'subscribers',
  });

  // ---- mutations ----
  const [confirm, setConfirm] = useState<null | { title: string; message: string; onYes: () => void }>(null);

  const deleteRoom = useMutation({
    mutationFn: (id: string) => roomsApi.end(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'rooms'] }),
    onError: (e) => showApiError(e, 'Could not delete the room.'),
  });
  const leaveRoom = useMutation({
    mutationFn: (id: string) => roomsApi.leave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'rooms'] }),
    onError: (e) => showApiError(e, 'Could not leave the room.'),
  });
  const unfollow = useMutation({
    mutationFn: (creatorId: string) => creatorsApi.unfollow(creatorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'following'] }),
    onError: (e) => showApiError(e, 'Could not unfollow.'),
  });
  const unsubscribe = useMutation({
    mutationFn: (creatorId: string) => creatorsApi.unsubscribe(creatorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'subscriptions'] }),
    onError: (e) => showApiError(e, 'Could not unsubscribe.'),
  });

  const askDeleteRoom = (r: MyRoom) =>
    setConfirm({
      title: 'Delete room?',
      message: `"${r.name}" will be permanently removed for everyone.`,
      onYes: () => { setConfirm(null); deleteRoom.mutate(r.id); },
    });
  const askLeaveRoom = (r: MyRoom) =>
    setConfirm({
      title: 'Leave room?',
      message: `You'll leave "${r.name}". You can re-join later with the code.`,
      onYes: () => { setConfirm(null); leaveRoom.mutate(r.id); },
    });

  // ---- renderers ----
  const renderRoom = ({ item }: { item: MyRoom }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('Room', { roomId: item.id })}>
      <View style={styles.thumbWrap}>
        {item.thumbnailUrl
          ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
          : <View style={[styles.thumb, styles.thumbFallback]}><Icon name="albums" size={18} color={colors.textMuted} /></View>}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <AppText bold numberOfLines={1}>{item.name}</AppText>
        <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1}>
          Code {item.code} · {fmtCount(item.memberCount)} members · {fmtCount(item.messageCount)} msgs
        </AppText>
        <View style={styles.tagRow}>
          <View style={[styles.tag, item.isOwner ? styles.tagOwner : styles.tagMember]}>
            <AppText variant="tiny" bold style={{ fontSize: 9 }} color={item.isOwner ? colors.primary : colors.textSecondary}>
              {item.isOwner ? 'OWNER' : item.role || 'MEMBER'}
            </AppText>
          </View>
          {item.status ? (
            <View style={styles.tag}><AppText variant="tiny" style={{ fontSize: 9 }} color={colors.textSecondary}>{item.status}</AppText></View>
          ) : null}
        </View>
      </View>
      {item.isOwner ? (
        <TouchableOpacity onPress={() => askDeleteRoom(item)} style={styles.trashBtn} hitSlop={8}>
          <Icon name="trash-outline" size={18} color={colors.error || '#FF5A5A'} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => askLeaveRoom(item)} style={styles.leaveBtn} hitSlop={8}>
          <Icon name="exit-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderCreatorLink = (kind: 'following' | 'subscriptions') => ({ item }: { item: MyCreatorLink }) => {
    const avatar = item.avatarUrl
      || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(item.username)}&backgroundColor=ffdfbf`;
    const busy = kind === 'following'
      ? unfollow.isPending && unfollow.variables === item.creatorId
      : unsubscribe.isPending && unsubscribe.variables === item.creatorId;
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PodcastHostProfile', { username: item.username, creatorId: item.creatorId })}>
        <View>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          {item.isLive && <View style={styles.liveDot} />}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText bold numberOfLines={1}>{item.displayName || item.username}</AppText>
          <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1}>
            @{item.username}{item.tier ? ` · ${item.tier}` : ''}{typeof item.followerCount === 'number' ? ` · ${fmtCount(item.followerCount)} followers` : ''}
          </AppText>
        </View>
        <TouchableOpacity
          onPress={() => (kind === 'following' ? unfollow.mutate(item.creatorId) : unsubscribe.mutate(item.creatorId))}
          style={styles.pillBtn}
          activeOpacity={0.85}
          disabled={busy}>
          {busy
            ? <ActivityIndicator size="small" color={colors.textSecondary} />
            : <AppText variant="tiny" bold color={colors.textSecondary}>{kind === 'following' ? 'Unfollow' : 'Unsub'}</AppText>}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Followers / subscribers come from analytics (shape can vary) — render safely.
  const renderViewer = (showTier: boolean) => ({ item }: { item: any }) => {
    const u = item.user || item;
    const uname = u.username || item.username || '';
    const fname = u.fullName || u.displayName || item.fullName || uname || 'User';
    const av = u.avatarUrl || item.avatarUrl
      || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(uname || 'user')}&backgroundColor=ffdfbf`;
    const tierLabel = item.tier || u.tier;
    return (
      <View style={styles.row}>
        <Image source={{ uri: av }} style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText bold numberOfLines={1}>{fname}</AppText>
          <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1}>
            {uname ? `@${uname}` : ''}{showTier && tierLabel ? ` · ${tierLabel}` : ''}
          </AppText>
        </View>
      </View>
    );
  };

  const renderEmpty = (text: string, icon: string) => (
    <View style={styles.empty}>
      <Icon name={icon} size={42} color={colors.textMuted} />
      <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 8 }}>{text}</AppText>
    </View>
  );

  // ---- active list config ----
  const active = (() => {
    switch (tab) {
      case 'rooms':
        return { q: roomsQuery, data: roomsQuery.data?.items || [], render: renderRoom, empty: ['No rooms yet.', 'albums-outline'] as const };
      case 'following':
        return { q: followingQuery, data: followingQuery.data?.items || [], render: renderCreatorLink('following'), empty: ['You are not following anyone yet.', 'people-outline'] as const };
      case 'subscriptions':
        return { q: subscriptionsQuery, data: subscriptionsQuery.data?.items || [], render: renderCreatorLink('subscriptions'), empty: ['No subscriptions yet.', 'star-outline'] as const };
      case 'followers':
        return { q: followersQuery, data: followersQuery.data?.items || [], render: renderViewer(false), empty: ['No followers yet.', 'heart-outline'] as const };
      case 'subscribers':
        return { q: subscribersQuery, data: subscribersQuery.data?.items || [], render: renderViewer(true), empty: ['No subscribers yet.', 'star-outline'] as const };
    }
  })();

  return (
    <ScreenContainer>
      <BrandHeader
        showBack
        onBack={() => navigation.goBack()}
        infoTitle="Manage"
        infoIntro="Your rooms, the creators you follow & subscribe to, and your own audience."
        infoPoints={[
          { icon: 'albums', title: 'Rooms', text: 'Open or delete the rooms you created.' },
          { icon: 'people', title: 'Following', text: 'Creators you follow or subscribe to.' },
          { icon: 'heart', title: 'Audience', text: 'Who follows and subscribes to you.' },
        ]}
      />
      <View style={{ flex: 1 }}>
        <GradientText variant="h1" center style={styles.pageTitle}>Manage</GradientText>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}>
          {tabs.map(([key, label]) => {
            const on = tab === key;
            return (
              <TouchableOpacity key={key} onPress={() => setTab(key)} activeOpacity={0.85} style={[styles.chip, on && styles.chipOn]}>
                <AppText variant="small" bold color={on ? colors.white : colors.textSecondary}>{label}</AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {active!.q.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : active!.data.length === 0 ? (
          renderEmpty(active!.empty[0], active!.empty[1])
        ) : (
          <FlatList
            data={active!.data as any[]}
            keyExtractor={(it: any, idx) => it.id || it.creatorId || it.username || String(idx)}
            renderItem={active!.render as any}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 130 }}
            showsVerticalScrollIndicator={false}
            refreshing={active!.q.isRefetching}
            onRefresh={() => active!.q.refetch()}
          />
        )}
      </View>

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message}
        confirmLabel="Confirm"
        destructive
        icon="trash-outline"
        onConfirm={() => confirm?.onYes()}
        onCancel={() => setConfirm(null)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageTitle: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  tabsRow: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.md, padding: spacing.sm, marginBottom: spacing.sm,
  },
  thumbWrap: { width: 54, height: 54, borderRadius: 12, overflow: 'hidden' },
  thumb: { width: 54, height: 54, backgroundColor: colors.surfaceElevated },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceElevated },
  liveDot: { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: '#FF3B30', borderWidth: 2, borderColor: colors.background },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 5 },
  tag: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  tagOwner: { backgroundColor: 'rgba(238,48,99,0.18)' },
  tagMember: { backgroundColor: 'rgba(255,255,255,0.08)' },
  trashBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,90,90,0.12)', alignItems: 'center', justifyContent: 'center' },
  leaveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  pillBtn: { paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  empty: { alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.xl },
});

export default ManageScreen;