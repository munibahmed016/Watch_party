import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { creatorsApi, roomsApi, Creator, CreatorContent, CreatorEvent } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const fmtCount = (n: number) => (n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
};
const fmtDuration = (sec?: number | null) => {
  if (!sec) return '';
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

type TabKey = 'videos' | 'clips' | 'schedule';

const StatBox: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
  <View style={styles.statBox}>
    <AppText variant="h3" bold>{value}</AppText>
    <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 2 }}>{label}</AppText>
  </View>
);

const PodcastHostProfileScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const username: string = route.params?.username || '';
  const [tab, setTab] = useState<TabKey>('videos');

  const creatorKey = ['creator', username];

  const creatorQuery = useQuery({
    queryKey: creatorKey,
    queryFn: () => creatorsApi.getByUsername(username),
    enabled: !!username,
  });

  const videosQuery = useQuery({
    queryKey: ['creator', username, 'content', 'FULL'],
    queryFn: () => creatorsApi.contentByUsername(username, 'FULL'),
    enabled: !!username,
  });
  const clipsQuery = useQuery({
    queryKey: ['creator', username, 'content', 'CLIP'],
    queryFn: () => creatorsApi.contentByUsername(username, 'CLIP'),
    enabled: !!username && tab === 'clips',
  });
  const eventsQuery = useQuery({
    queryKey: ['creator', username, 'events'],
    queryFn: () => creatorsApi.eventsByUsername(username),
    enabled: !!username && tab === 'schedule',
  });

  const creator = creatorQuery.data?.creator as Creator | undefined;

  const followMutation = useMutation({
    mutationFn: () => (creator?.isFollowing ? creatorsApi.unfollow(creator.id) : creatorsApi.follow(creator!.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: creatorKey }),
    onError: (err) => showApiError(err, 'Could not update follow.'),
  });
  const subMutation = useMutation({
    mutationFn: () => (creator?.isSubscribed ? creatorsApi.unsubscribe(creator.id) : creatorsApi.subscribe(creator!.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: creatorKey }),
    onError: (err) => showApiError(err, 'Could not update subscription.'),
  });

  // Watch a piece of content together (creates a room)
  const watchMutation = useMutation({
    mutationFn: (item: CreatorContent) =>
      roomsApi.create({ name: item.title, videoUrl: (item.hlsUrl || item.videoUrl || '') as string, isPrivate: false } as any),
    onSuccess: ({ room }: any) => navigation.navigate('Room', { roomId: room.id }),
    onError: (err) => showApiError(err, 'Could not start playback.'),
  });

  // Watch the creator's LIVE stream — find the active session, open the viewer
  const watchLiveMutation = useMutation({
    mutationFn: async () => {
      const { items } = await creatorsApi.liveSessions(50);
      const mine = items.find((s: any) => s.creator?.username === username);
      if (!mine) throw new Error('Live stream not found');
      return mine;
    },
    onSuccess: (session: any) => {
      navigation.navigate('LiveViewer', { sessionId: session.id, title: session.title });
    },
    onError: (err) => showApiError(err, 'This stream is not available right now.'),
  });

  if (creatorQuery.isLoading) {
    return <ScreenContainer><BrandHeader /><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></ScreenContainer>;
  }
  if (!creator) {
    return (
      <ScreenContainer>
        <BrandHeader />
        <View style={styles.center}>
          <Icon name="person-circle-outline" size={48} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>Creator not found.</AppText>
        </View>
      </ScreenContainer>
    );
  }

  const videos = videosQuery.data?.items || [];
  const clips = clipsQuery.data?.items || [];
  const events = eventsQuery.data?.items || [];

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle={creator.displayName}
        infoIntro={`Explore ${creator.displayName}'s channel — videos, clips and upcoming events.`}
        infoPoints={[
          { icon: 'heart', title: 'Follow', text: 'Follow to keep up with new uploads and lives.' },
          { icon: 'star', title: 'Subscribe', text: 'Subscribe for the full experience.' },
          { icon: 'play-circle', title: 'Watch', text: 'Tap any video to watch it together in a room.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={styles.banner}>
          {creator.bannerUrl
            ? <Image source={{ uri: creator.bannerUrl }} style={StyleSheet.absoluteFillObject as any} />
            : <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} />}
          <View style={styles.bannerShade} />
        </View>

        {/* Avatar + live badge */}
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: creator.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(creator.username)}&backgroundColor=ffdfbf` }}
            style={styles.avatar}
          />
          {creator.isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <AppText variant="tiny" bold style={{ fontSize: 9 }}>LIVE</AppText>
            </View>
          )}
        </View>

        {/* Watch Live Now — only when the creator is live */}
        {creator.isLive && (
          <View style={{ alignItems: 'center', marginTop: spacing.md }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => watchLiveMutation.mutate()}
              disabled={watchLiveMutation.isPending}
              style={styles.watchLiveBtn}>
              <LinearGradient
                colors={['#FF0000', '#FF4444']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              {watchLiveMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <View style={styles.watchLiveDot} />
                  <AppText bold color={colors.white} style={{ marginLeft: 8 }}>Watch Live Now</AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <GradientText variant="h2" center style={{ lineHeight: 30, paddingBottom: 2 }}>{creator.displayName}</GradientText>
            <Icon name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />
          </View>
          <AppText variant="tiny" color={colors.textSecondary}>@{creator.username}</AppText>
          {creator.tagline ? <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 6, paddingHorizontal: spacing.lg }}>{creator.tagline}</AppText> : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox value={fmtCount(creator.followerCount)} label="Followers" />
          <View style={styles.statDivider} />
          <StatBox value={fmtCount(creator.subscriberCount)} label="Subscribers" />
          <View style={styles.statDivider} />
          <StatBox value={creator.category.charAt(0) + creator.category.slice(1).toLowerCase()} label="Category" />
        </View>

        {/* Follow / Subscribe */}
        <View style={styles.actionRow}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => followMutation.mutate()} disabled={followMutation.isPending} style={styles.actionPill}>
            <View style={[styles.actBtn, { overflow: 'hidden' }]}>
              {!creator.isFollowing && (
                <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              )}
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: creator.isFollowing ? 'rgba(255,255,255,0.1)' : 'transparent', borderWidth: creator.isFollowing ? 1 : 0, borderColor: colors.border, borderRadius: 999 }]} pointerEvents="none" />
              <Icon name={creator.isFollowing ? 'heart' : 'heart-outline'} size={14} color={colors.white} style={{ marginRight: 6 }} />
              <AppText variant="small" bold color={colors.white}>{creator.isFollowing ? 'Following' : 'Follow'}</AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={() => subMutation.mutate()} disabled={subMutation.isPending} style={[styles.actionPill, styles.actBtn, styles.actBtnGhost]}>
            <Icon name={creator.isSubscribed ? 'star' : 'star-outline'} size={14} color={colors.white} style={{ marginRight: 6 }} />
            <AppText variant="small" bold color={colors.white}>{creator.isSubscribed ? 'Subscribed' : 'Subscribe'}</AppText>
          </TouchableOpacity>
        </View>

        {creator.bio ? (
          <View style={styles.bioCard}>
            <AppText variant="small" color={colors.textSecondary}>About</AppText>
            <AppText style={{ marginTop: 4, lineHeight: 20 }}>{creator.bio}</AppText>
          </View>
        ) : null}

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {([['videos', 'Videos'], ['clips', 'Clips'], ['schedule', 'Schedule']] as [TabKey, string][]).map(([key, label]) => (
            <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.tabBtn} activeOpacity={0.8}>
              {tab === key
                ? <GradientText variant="small" style={{ paddingBottom: 2 }}>{label}</GradientText>
                : <AppText variant="small" color={colors.textSecondary}>{label}</AppText>}
              {tab === key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          {tab === 'videos' && (
            videosQuery.isLoading
              ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
              : videos.length === 0
                ? <Empty icon="film-outline" text="No videos yet." />
                : videos.map((v) => <ContentRow key={v.id} item={v} onPress={() => watchMutation.mutate(v)} />)
          )}
          {tab === 'clips' && (
            clipsQuery.isLoading
              ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
              : clips.length === 0
                ? <Empty icon="cut-outline" text="No clips yet." />
                : clips.map((c) => <ContentRow key={c.id} item={c} onPress={() => watchMutation.mutate(c)} />)
          )}
          {tab === 'schedule' && (
            eventsQuery.isLoading
              ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
              : events.length === 0
                ? <Empty icon="calendar-outline" text="No upcoming events." />
                : events.map((e) => <EventRow key={e.id} item={e} />)
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const ContentRow: React.FC<{ item: CreatorContent; onPress: () => void }> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.contentCard} activeOpacity={0.85} onPress={onPress}>
    <View style={styles.contentThumbWrap}>
      {item.thumbnailUrl
        ? <Image source={{ uri: item.thumbnailUrl }} style={styles.contentThumb} />
        : <View style={[styles.contentThumb, { alignItems: 'center', justifyContent: 'center' }]}><Icon name="film" size={20} color={colors.textMuted} /></View>}
      <View style={styles.playOverlay}><Icon name="play" size={16} color={colors.white} /></View>
      {!!item.durationSec && (
        <View style={styles.durationBadge}><AppText variant="tiny" style={{ fontSize: 9 }}>{fmtDuration(item.durationSec)}</AppText></View>
      )}
    </View>
    <View style={{ flex: 1, padding: spacing.sm }}>
      <AppText bold numberOfLines={2}>{item.title}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 14 }}>
        <Meta icon="eye" value={fmtCount(item.viewCount)} />
        <Meta icon="heart" value={fmtCount(item.likeCount ?? 0)} />
        <Meta icon="chatbubble" value={fmtCount(item.commentCount ?? 0)} />
      </View>
    </View>
  </TouchableOpacity>
);

const EventRow: React.FC<{ item: CreatorEvent }> = ({ item }) => (
  <View style={styles.eventCard}>
    <View style={styles.eventDateBox}>
      <Icon name="calendar" size={18} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <AppText bold numberOfLines={1}>{item.title}</AppText>
      <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 2 }}>{fmtDate(item.scheduledAt)}</AppText>
    </View>
    <View style={styles.eventStatus}>
      <AppText variant="tiny" bold color={colors.primary}>{item.status}</AppText>
    </View>
  </View>
);

const Meta: React.FC<{ icon: string; value: string }> = ({ icon, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Icon name={icon} size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
    <AppText variant="tiny" color={colors.textSecondary}>{value}</AppText>
  </View>
);

const Empty: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
    <Icon name={icon} size={40} color={colors.textMuted} />
    <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>{text}</AppText>
  </View>
);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  banner: { height: 120, marginHorizontal: spacing.lg, borderRadius: layout.radius.lg, overflow: 'hidden', marginTop: spacing.sm },
  bannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  avatarWrap: { alignItems: 'center', marginTop: -44, position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.background, backgroundColor: colors.surfaceElevated },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF0000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: -10 },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.white, marginRight: 3 },
  watchLiveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 46, paddingHorizontal: 28, borderRadius: 999, overflow: 'hidden',
  },
  watchLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.lg, paddingVertical: spacing.md, marginTop: spacing.lg, marginHorizontal: spacing.lg,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  actionRow: { flexDirection: 'row', marginTop: spacing.lg, gap: 10, paddingHorizontal: spacing.lg },
  actionPill: { flex: 1 },
  actBtn: { height: 44, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  actBtnGhost: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: colors.border },
  bioCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.md, borderRadius: layout.radius.md, marginTop: spacing.lg, marginHorizontal: spacing.lg },
  tabsRow: { flexDirection: 'row', marginTop: spacing.xl, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.xl },
  tabBtn: { paddingBottom: spacing.sm, alignItems: 'center' },
  tabUnderline: { height: 2, backgroundColor: colors.primary, width: '100%', marginTop: 6, borderRadius: 2, position: 'absolute', bottom: 0 },
  contentCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.md, marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  contentThumbWrap: { width: 120, height: 80, position: 'relative' },
  contentThumb: { width: 120, height: 80, backgroundColor: colors.surfaceElevated },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  durationBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 4, borderRadius: 3 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: 12 },
  eventDateBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(238,48,99,0.15)', alignItems: 'center', justifyContent: 'center' },
  eventStatus: { backgroundColor: 'rgba(238,48,99,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
});

export default PodcastHostProfileScreen;