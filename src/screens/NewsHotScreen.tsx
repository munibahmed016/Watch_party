import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { postsApi, roomsApi, creatorsApi, Post, Room, CreatorEvent } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

type Tab = 'coming' | 'watching';

// Unified upcoming item (post-event OR creator-event)
type UpcomingItem =
  | { kind: 'post'; id: string; at: number; post: Post }
  | { kind: 'creator'; id: string; at: number; event: CreatorEvent };

const NewsHotScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('coming');

  const eventsQuery = useQuery({
    queryKey: queryKeys.postsList({ kind: 'EVENT', upcoming: true }),
    queryFn: () => postsApi.list({ kind: 'EVENT', upcoming: true, limit: 20 }),
  });
  // Creator-scheduled events (Schedule tab) — merged into Coming Soon
  const creatorEventsQuery = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => creatorsApi.upcomingEvents(30),
  });
  const newsQuery = useQuery({
    queryKey: queryKeys.postsList({ kind: 'NEWS' }),
    queryFn: () => postsApi.list({ kind: 'NEWS', limit: 20 }),
  });
  const roomsQuery = useQuery({
    queryKey: queryKeys.roomsList('public', undefined),
    queryFn: () => roomsApi.list({ filter: 'public', limit: 20 }),
    refetchInterval: 30 * 1000,
  });

  const joinMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => roomsApi.join(id),
    onSuccess: ({ room }) => navigation.navigate('Room', { roomId: room.id }),
    onError: (err) => showApiError(err, 'Could not join room.'),
  });

  const onRefresh = () => {
    qc.invalidateQueries({ queryKey: queryKeys.posts });
    qc.invalidateQueries({ queryKey: queryKeys.rooms });
    qc.invalidateQueries({ queryKey: ['events', 'upcoming'] });
  };

  const postEvents: Post[] = eventsQuery.data?.posts || [];
  const creatorEvents: CreatorEvent[] = creatorEventsQuery.data?.items || [];
  const news: Post[] = newsQuery.data?.posts || [];
  const rooms: Room[] = roomsQuery.data?.rooms || [];

  // Merge both event sources, soonest first
  const upcoming: UpcomingItem[] = [
    ...postEvents.map((p) => ({
      kind: 'post' as const, id: `post_${p.id}`,
      at: p.eventAt ? new Date(p.eventAt).getTime() : Number.MAX_SAFE_INTEGER, post: p,
    })),
    ...creatorEvents.map((e) => ({
      kind: 'creator' as const, id: `creator_${e.id}`,
      at: new Date(e.scheduledAt).getTime(), event: e,
    })),
  ].sort((a, b) => a.at - b.at);

  const loading =
    (tab === 'coming'
      ? eventsQuery.isLoading || creatorEventsQuery.isLoading
      : newsQuery.isLoading || roomsQuery.isLoading) &&
    !eventsQuery.data && !newsQuery.data && !creatorEventsQuery.data;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.head}>
        <GradientText variant="h2" style={{ lineHeight: 30, paddingBottom: 2 }}>New &amp; Hot</GradientText>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.headIcon} onPress={() => navigation.navigate('Browse')}>
            <Icon name="tv-outline" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headIcon, { marginLeft: 8 }]} onPress={() => navigation.navigate('Browse')}>
            <Icon name="search" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab('coming')} activeOpacity={0.85}
          style={[styles.tab, tab === 'coming' ? styles.tabActive : styles.tabInactive]}>
          {tab === 'coming' && (
            <LinearGradient colors={colors.buttonGradient as unknown as string[]}
              start={colors.gradientStartPoint} end={colors.gradientEndPoint}
              style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          )}
          <AppText style={{ fontSize: 13 }}>🍿</AppText>
          <AppText variant="small" bold color={tab === 'coming' ? colors.white : colors.textSecondary}
            style={{ marginLeft: 6 }} numberOfLines={1}>Coming Soon</AppText>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setTab('watching')} activeOpacity={0.85}
          style={[styles.tab, tab === 'watching' ? styles.tabActive : styles.tabInactive]}>
          {tab === 'watching' && (
            <LinearGradient colors={colors.buttonGradient as unknown as string[]}
              start={colors.gradientStartPoint} end={colors.gradientEndPoint}
              style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          )}
          <AppText style={{ fontSize: 13 }}>🔥</AppText>
          <AppText variant="small" bold color={tab === 'watching' ? colors.white : colors.textSecondary}
            style={{ marginLeft: 6 }} numberOfLines={1}>Everyone's Watching</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isFetching || newsQuery.isFetching || roomsQuery.isFetching || creatorEventsQuery.isFetching}
            onRefresh={onRefresh} tintColor={colors.primary} />
        }>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
        ) : tab === 'coming' ? (
          upcoming.length === 0 ? (
            <EmptyState text="No upcoming events yet." subText="Tap + to create the first one."
              onPress={() => navigation.navigate('CreatePost', { kind: 'EVENT' })} ctaLabel="Create Event" />
          ) : (
            upcoming.map((item) =>
              item.kind === 'post' ? (
                <EventCard key={item.id} post={item.post}
                  onPress={() => navigation.navigate('PostDetail', { id: item.post.id })} />
              ) : (
                <CreatorEventCard key={item.id} event={item.event}
                  onPress={() => navigation.navigate('EventDetail', { event: item.event })} />
              )
            )
          )
        ) : (
          <>
            {news.map((p) => (
              <NewsCard key={p.id} post={p} onPress={() => navigation.navigate('PostDetail', { id: p.id })} />
            ))}
            {rooms.map((r) => (
              <LiveRoomCard key={r.id} room={r} onJoin={() => joinMutation.mutate({ id: r.id })} />
            ))}
            {news.length === 0 && rooms.length === 0 && (
              <EmptyState text="Nothing hot right now." subText="Post some news or create a room."
                onPress={() => navigation.navigate('CreatePost', { kind: 'NEWS' })} ctaLabel="Post News" />
            )}
          </>
        )}
      </ScrollView>

      {/* Floating + */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}
        onPress={() => navigation.navigate('CreatePost', { kind: tab === 'coming' ? 'EVENT' : 'NEWS' })}>
        <LinearGradient colors={colors.buttonGradient as unknown as string[]}
          start={colors.gradientStartPoint} end={colors.gradientEndPoint}
          style={StyleSheet.absoluteFillObject} pointerEvents="none" />
        <Icon name="add" size={26} color={colors.white} />
      </TouchableOpacity>
    </ScreenContainer>
  );
};

// =============================================================
// Cards
// =============================================================

const EventCard: React.FC<{ post: Post; onPress: () => void }> = ({ post, onPress }) => {
  const date = post.eventAt
    ? new Date(post.eventAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      <Image source={{ uri: post.coverUrl || 'https://images.unsplash.com/photo-1489599735734-79b4625e5b76?w=800' }} style={styles.cardImg} />
      <View style={styles.cardActions}>
        <AppText variant="small" color={colors.textSecondary}>{date}</AppText>
        <View style={{ flexDirection: 'row' }}>
          <View style={styles.iconChip}>
            <Icon name="people" size={12} color={colors.textSecondary} />
            <AppText variant="tiny" color={colors.textSecondary} style={{ marginLeft: 4 }}>{post.rsvpCount}</AppText>
          </View>
          <View style={[styles.iconChip, { marginLeft: 6 }]}>
            <Icon name="heart" size={12} color={colors.textSecondary} />
            <AppText variant="tiny" color={colors.textSecondary} style={{ marginLeft: 4 }}>{post.likeCount}</AppText>
          </View>
        </View>
      </View>
      <AppText variant="h2" bold style={{ marginTop: 8 }}>{post.title}</AppText>
      {post.body ? (
        <AppText variant="small" color={colors.textSecondary} numberOfLines={3} style={{ marginTop: 6, lineHeight: 18 }}>{post.body}</AppText>
      ) : null}
    </TouchableOpacity>
  );
};

// Creator-scheduled event card (from Schedule tab) — orange/calendar style
const CreatorEventCard: React.FC<{ event: CreatorEvent; onPress?: () => void }> = ({ event, onPress }) => {
  const date = new Date(event.scheduledAt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      <View style={styles.cardImgWrap}>
        <Image source={{ uri: event.thumbnailUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800' }} style={styles.cardImg} />
        <View style={styles.eventBadge}>
          <Icon name="calendar" size={11} color={colors.white} style={{ marginRight: 4 }} />
          <AppText variant="tiny" bold>UPCOMING</AppText>
        </View>
      </View>
      <View style={styles.cardActions}>
        <AppText variant="small" color={colors.textSecondary}>{date}</AppText>
        {event.creator && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {event.creator.avatarUrl ? (
              <Image source={{ uri: event.creator.avatarUrl }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
                <Icon name="person" size={12} color={colors.textMuted} />
              </View>
            )}
            <AppText variant="small" color={colors.textSecondary} style={{ marginLeft: 6 }}>{event.creator.displayName}</AppText>
          </View>
        )}
      </View>
      <AppText variant="h2" bold style={{ marginTop: 8 }}>{event.title}</AppText>
      {event.description ? (
        <AppText variant="small" color={colors.textSecondary} numberOfLines={3} style={{ marginTop: 6, lineHeight: 18 }}>{event.description}</AppText>
      ) : null}
    </TouchableOpacity>
  );
};

const NewsCard: React.FC<{ post: Post; onPress: () => void }> = ({ post, onPress }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
    {post.coverUrl && <Image source={{ uri: post.coverUrl }} style={styles.cardImg} />}
    <View style={styles.cardActions}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {post.author.avatarUrl ? (
          <Image source={{ uri: post.author.avatarUrl }} style={styles.authorAvatar} />
        ) : (
          <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
            <AppText variant="tiny" bold>{(post.author.fullName || post.author.username).slice(0, 1).toUpperCase()}</AppText>
          </View>
        )}
        <AppText variant="small" color={colors.textSecondary} style={{ marginLeft: 6 }}>@{post.author.username}</AppText>
      </View>
      <AppText variant="tiny" color={colors.textSecondary}>{timeAgo(post.createdAt)}</AppText>
    </View>
    <AppText variant="h3" bold style={{ marginTop: 8 }}>{post.title}</AppText>
    {post.body ? (
      <AppText variant="small" color={colors.textSecondary} numberOfLines={3} style={{ marginTop: 6, lineHeight: 18 }}>{post.body}</AppText>
    ) : null}
  </TouchableOpacity>
);

const LiveRoomCard: React.FC<{ room: Room; onJoin: () => void }> = ({ room, onJoin }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onJoin} style={styles.card}>
    <View style={styles.cardImgWrap}>
      <Image source={{ uri: room.thumbnailUrl || 'https://images.unsplash.com/photo-1489599735734-79b4625e5b76?w=800' }} style={styles.cardImg} />
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <AppText variant="tiny" bold>LIVE</AppText>
      </View>
    </View>
    <View style={styles.cardActions}>
      <AppText variant="small" color={colors.textSecondary}>{room.memberCount} watching now</AppText>
      <View style={styles.joinPill}>
        <Icon name="play" size={10} color={colors.white} style={{ marginRight: 3 }} />
        <AppText variant="tiny" bold>JOIN</AppText>
      </View>
    </View>
    <AppText variant="h3" bold style={{ marginTop: 8 }}>{room.name}</AppText>
    {room.videoTitle ? (
      <AppText variant="small" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 4 }}>Now playing: {room.videoTitle}</AppText>
    ) : null}
  </TouchableOpacity>
);

const EmptyState: React.FC<{ text: string; subText: string; ctaLabel: string; onPress: () => void }> =
  ({ text, subText, ctaLabel, onPress }) => (
  <View style={styles.empty}>
    <AppText variant="h3" bold center>{text}</AppText>
    <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 6 }}>{subText}</AppText>
    <TouchableOpacity onPress={onPress} style={styles.emptyBtnWrap} activeOpacity={0.85}>
      <LinearGradient colors={colors.buttonGradient as unknown as string[]}
        start={colors.gradientStartPoint} end={colors.gradientEndPoint}
        style={StyleSheet.absoluteFillObject} pointerEvents="none" />
      <AppText bold color={colors.white}>{ctaLabel}</AppText>
    </TouchableOpacity>
  </View>
);

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden', marginHorizontal: 4 },
  tabActive: {},
  tabInactive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  card: { marginBottom: spacing.xl },
  cardImgWrap: { position: 'relative' },
  cardImg: { width: '100%', height: 200, borderRadius: layout.radius.lg, backgroundColor: colors.surfaceElevated },
  liveBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF0000', marginRight: 4 },
  eventBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  iconChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  joinPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  authorAvatar: { width: 22, height: 22, borderRadius: 11 },
  authorAvatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: spacing.xxl * 1.5, alignItems: 'center' },
  emptyBtnWrap: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
  fab: { position: 'absolute', bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
});

export default NewsHotScreen;