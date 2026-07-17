import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity, ImageBackground,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandLogo from '@/components/BrandLogo';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import AppButton from '@/components/AppButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { discoverApi, roomsApi, Room, ContentItem } from '@/lib/api';
import { queryKeys, queryClient } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

// ============================================================
// Shared image-fallback chain: explicit thumbnail -> YouTube CDN
// fallbacks by videoId -> flat placeholder. Used by every card below so
// every section looks/behaves consistently.
// ============================================================
const PosterImage: React.FC<{
  videoId?: string | null;
  thumbnailUrl?: string | null;
  style?: any;
}> = ({ videoId, thumbnailUrl, style }) => {
  const sources = useMemo(() => {
    const list: string[] = [];
    if (thumbnailUrl) list.push(thumbnailUrl);
    if (videoId) {
      list.push(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
      list.push(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      list.push(`https://img.youtube.com/vi/${videoId}/default.jpg`);
    }
    return list;
  }, [thumbnailUrl, videoId]);

  const [index, setIndex] = useState(0);
  const currentUri = sources[index];

  if (!currentUri) {
    return (
      <View style={[style, styles.posterFallback]}>
        <Icon name="film-outline" size={30} color="rgba(255,255,255,0.45)" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: currentUri }}
      style={style}
      onError={() => { if (index < sources.length - 1) setIndex(index + 1); }}
    />
  );
};

// ============================================================
// PosterCard — the ONE card design used across the entire Home screen
// (Top 10, My Watch Parties, Public Rooms, Latest Movies, Comedy, Live
// News, Creators). Netflix/Prime-style: title + meta sit in a gradient
// scrim baked into the bottom of the poster itself, badges pin to the
// corners, and an optional giant rank numeral overlaps the bottom-left
// edge for Top 10. One consistent, premium look everywhere.
// ============================================================
const RANK_GUTTER = 18;

const PosterCard: React.FC<{
  title: string;
  subtitle?: string;
  videoId?: string | null;
  thumbnailUrl?: string | null;
  onPress: () => void;
  width?: number;
  height?: number;
  rank?: number;
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  bottomRight?: React.ReactNode;
}> = ({ title, subtitle, videoId, thumbnailUrl, onPress, width = 150, height = 210, rank, topLeft, topRight, bottomRight }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.88}
    style={[styles.posterCard, { width: rank ? width + RANK_GUTTER : width }]}
  >
    <View style={[styles.posterImgWrap, { width, height, marginLeft: rank ? RANK_GUTTER : 0 }]}>
      <PosterImage videoId={videoId} thumbnailUrl={thumbnailUrl} style={StyleSheet.absoluteFillObject} />

      {/* Bottom scrim + title baked into the poster, Netflix-style */}
      <LinearGradient
        colors={['transparent', 'rgba(4,4,8,0.55)', 'rgba(4,4,8,0.96)']}
        locations={[0, 0.5, 1]}
        style={styles.posterScrim}
      >
        <AppText variant="small" bold numberOfLines={2} style={styles.posterTitle}>{title}</AppText>
        {subtitle ? (
          <AppText variant="tiny" color="rgba(255,255,255,0.75)" numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </LinearGradient>

      {topLeft && <View style={styles.badgeTopLeft}>{topLeft}</View>}
      {topRight && <View style={styles.badgeTopRight}>{topRight}</View>}
      {bottomRight && <View style={styles.badgeBottomRight}>{bottomRight}</View>}

      <View style={styles.posterBorder} pointerEvents="none" />
    </View>

    {/* Rank numeral — overlaps the poster's bottom-left corner by a small,
        fixed amount and sits well ABOVE the title scrim (bottom offset
        clears it), so it can never cover the text. Single Text + shadow —
        simple and renders reliably, unlike the earlier layered/hidden-behind
        attempts which looked broken on-device. */}
    {rank ? (
      <View style={styles.rankWrap} pointerEvents="none">
        <AppText style={styles.rankNumber}>{rank}</AppText>
      </View>
    ) : null}
  </TouchableOpacity>
);

// Small reusable badge chips ---------------------------------------------
const LiveBadge = () => (
  <View style={styles.chip}>
    <View style={styles.liveDot} />
    <AppText variant="tiny" bold color="#fff">LIVE</AppText>
  </View>
);
const EyeBadge: React.FC<{ count: number }> = ({ count }) => (
  <View style={styles.chip}>
    <Icon name="eye" size={10} color="#fff" style={{ marginRight: 3 }} />
    <AppText variant="tiny" bold color="#fff">{count}</AppText>
  </View>
);
const LockBadge = () => (
  <View style={styles.chip}>
    <Icon name="lock-closed" size={10} color="#fff" />
  </View>
);
const CreatorBadge: React.FC<{ name: string; avatarUrl?: string | null }> = ({ name, avatarUrl }) => (
  <View style={styles.chip}>
    {avatarUrl ? (
      <Image source={{ uri: avatarUrl }} style={styles.creatorAvatar} />
    ) : (
      <View style={[styles.creatorAvatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
        <AppText style={{ fontSize: 8, fontWeight: '800', color: '#fff' }}>{name.slice(0, 1).toUpperCase()}</AppText>
      </View>
    )}
    <AppText variant="tiny" bold numberOfLines={1} color="#fff" style={{ marginLeft: 4, maxWidth: 80 }}>{name}</AppText>
  </View>
);

// Section header — small icon + gradient title + count, consistent everywhere.
const SectionHeader: React.FC<{ icon: string; title: string; count?: string }> = ({ icon, title, count }) => (
  <View style={styles.sectionHead}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={styles.sectionIconWrap}>
        <Icon name={icon} size={13} color={colors.primary} />
      </View>
      <GradientText variant="h3" style={styles.sectionTitle}>{title}</GradientText>
    </View>
    {count ? <AppText variant="tiny" color={colors.textSecondary}>{count}</AppText> : null}
  </View>
);

const EmptyRow: React.FC<{ text: string }> = ({ text }) => (
  <View style={{ paddingHorizontal: spacing.lg }}>
    <View style={styles.emptyBox}>
      <Icon name="film-outline" size={20} color={colors.textMuted} />
      <AppText variant="small" color={colors.textSecondary} style={{ marginLeft: 8, flex: 1 }}>{text}</AppText>
    </View>
  </View>
);

// ============================================================
// Content-library sections (real WatchParty + YouTube content). Tapping
// starts a NEW room from that content — same flow as WatchParty Movies.
// ============================================================

const TopContentRow: React.FC<{ items: ContentItem[]; onStart: (item: ContentItem) => void }> = ({ items, onStart }) => (
  <View style={styles.section}>
    <SectionHeader icon="trophy" title="Top 10 Movies" />
    {items.length === 0 ? <EmptyRow text="Nothing trending yet." /> : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
        {items.map((item, idx) => (
          <PosterCard
            key={item.id}
            title={item.title}
            subtitle={`${item.viewCount} views`}
            videoId={item.videoId}
            thumbnailUrl={item.thumbnailUrl}
            onPress={() => onStart(item)}
            width={130}
            height={200}
            rank={idx + 1}
          />
        ))}
      </ScrollView>
    )}
  </View>
);

const ContentSingleRow: React.FC<{ items: ContentItem[]; onStart: (item: ContentItem) => void; showCreator?: boolean }> = ({ items, onStart, showCreator }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
    {items.map((item) => (
      <PosterCard
        key={item.id}
        title={item.title}
        subtitle={item.creator?.displayName}
        videoId={item.videoId}
        thumbnailUrl={item.thumbnailUrl}
        onPress={() => onStart(item)}
        topRight={<EyeBadge count={item.viewCount} />}
        bottomRight={showCreator && item.creator ? <CreatorBadge name={item.creator.displayName} avatarUrl={item.creator.avatarUrl} /> : undefined}
      />
    ))}
  </ScrollView>
);

const ContentMultiRowSection: React.FC<{
  icon: string; title: string; items: ContentItem[]; numRows?: number; onStart: (item: ContentItem) => void; showCreator?: boolean;
}> = ({ icon, title, items, numRows = 3, onStart, showCreator }) => {
  const rows = useMemo(() => {
    const result: ContentItem[][] = Array.from({ length: numRows }, () => []);
    items.forEach((it, idx) => { result[idx % numRows].push(it); });
    return result;
  }, [items, numRows]);

  return (
    <View style={styles.section}>
      <SectionHeader icon={icon} title={title} count={`${items.length} ${items.length === 1 ? 'title' : 'titles'}`} />
      {items.length === 0 ? <EmptyRow text="Nothing here yet." /> : (
        rows.map((rowItems, rowIdx) => (
          rowItems.length === 0 ? null : (
            <View key={rowIdx} style={{ marginBottom: rowIdx < numRows - 1 ? spacing.md : 0 }}>
              <ContentSingleRow items={rowItems} onStart={onStart} showCreator={showCreator} />
            </View>
          )
        ))
      )}
    </View>
  );
};

const ContentSingleRowSection: React.FC<{ icon: string; title: string; items: ContentItem[]; onStart: (item: ContentItem) => void; showCreator?: boolean }> = ({ icon, title, items, onStart, showCreator }) => (
  <View style={styles.section}>
    <SectionHeader icon={icon} title={title} count={`${items.length} ${items.length === 1 ? 'title' : 'titles'}`} />
    {items.length === 0 ? <EmptyRow text="Nothing here yet." /> : <ContentSingleRow items={items} onStart={onStart} showCreator={showCreator} />}
  </View>
);

// ============================================================
// Room sections (My Watch Parties / Public Rooms) — same PosterCard look.
// ============================================================

const RoomRow: React.FC<{ rooms: Room[]; onJoin: (id: string) => void }> = ({ rooms, onJoin }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
    {rooms.map((r) => (
      <PosterCard
        key={r.id}
        title={r.name?.trim() || `Room ${r.code}`}
        subtitle={r.videoTitle || undefined}
        videoId={r.videoId}
        thumbnailUrl={r.thumbnailUrl}
        onPress={() => onJoin(r.id)}
        topLeft={r.status === 'ACTIVE' ? <LiveBadge /> : undefined}
        topRight={<EyeBadge count={r.memberCount} />}
        bottomRight={r.isPrivate ? <LockBadge /> : undefined}
      />
    ))}
  </ScrollView>
);

const RoomSection: React.FC<{ icon: string; title: string; rooms: Room[]; onJoin: (id: string) => void; emptyText: string }> = ({ icon, title, rooms, onJoin, emptyText }) => (
  <View style={styles.section}>
    <SectionHeader icon={icon} title={title} count={`${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}`} />
    {rooms.length === 0 ? <EmptyRow text={emptyText} /> : <RoomRow rooms={rooms} onJoin={onJoin} />}
  </View>
);

const Pill: React.FC<{ label: string; icon?: string; onPress?: () => void }> = ({ label, icon, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.pill} activeOpacity={0.85}>
    {icon && <Icon name={icon} size={13} color={colors.white} style={{ marginRight: 6 }} />}
    <AppText variant="small" bold numberOfLines={1}>{label}</AppText>
  </TouchableOpacity>
);

// ============================================================
// Home screen
// ============================================================

const HomeScreen = () => {
  const navigation = useNavigation<any>();

  const discoverQuery = useQuery({
    queryKey: queryKeys.discoverHome,
    queryFn: () => discoverApi.home(),
  });

  const myRoomsQuery = useQuery({
    queryKey: queryKeys.roomsList('mine', undefined),
    queryFn: () => roomsApi.list({ filter: 'mine', limit: 20 }),
  });

  const publicRoomsQuery = useQuery({
    queryKey: queryKeys.roomsList('public', undefined),
    queryFn: () => roomsApi.list({ filter: 'public', limit: 20 }),
    refetchInterval: 30 * 1000,
  });

  const joinMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => roomsApi.join(id),
    onSuccess: ({ room }) => { navigation.navigate('Room', { roomId: room.id }); },
    onError: (err: any) => { showApiError(err, 'Could not join room.'); },
  });

  const openOwnRoom = (id: string) => navigation.navigate('Room', { roomId: id });

  const startFromContent = (item: ContentItem) => {
    navigation.navigate('CreateRoom', {
      content: { title: item.title, videoUrl: item.videoUrl, thumbnailUrl: item.thumbnailUrl, videoId: item.videoId },
    });
  };

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.discoverHome });
    queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
  };

  const data: any = discoverQuery.data || {};
  const topContent: ContentItem[] = data.topContent || [];
  const latestMoviesContent: ContentItem[] = data.latestMoviesContent || [];
  const comedyContent: ContentItem[] = data.comedyContent || [];
  const liveNewsContent: ContentItem[] = data.liveNewsContent || [];
  const creatorsContent: ContentItem[] = data.creatorsContent || [];
  const featuredContent: ContentItem | null = data.featuredContent || null;

  const myRooms: Room[] = myRoomsQuery.data?.rooms || [];
  const publicRooms: Room[] = publicRoomsQuery.data?.rooms || [];

  const loading = discoverQuery.isLoading && !discoverQuery.data;

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centerLoader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.head}>
        <BrandLogo size="sm" variant="small" />
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.headIcon} onPress={() => navigation.navigate('Browse')}>
            <Icon name="tv-outline" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headIcon, { marginLeft: 8 }]} onPress={() => navigation.navigate('Browse')}>
            <Icon name="search" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headIcon, { marginLeft: 8 }]} onPress={() => navigation.navigate('Browse')}>
            <Icon name="options-outline" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={discoverQuery.isFetching || myRoomsQuery.isFetching || publicRoomsQuery.isFetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          <Pill label="Create Room" icon="add" onPress={() => navigation.navigate('CreateRoom')} />
          <Pill label="WatchParty Movies" icon="film" onPress={() => navigation.navigate('WatchPartyMovies')} />
          <Pill label="Join podcast" icon="key" onPress={() => navigation.navigate('JoinPodcast')} />
        </ScrollView>

        {featuredContent && (
          <TouchableOpacity style={styles.featuredWrap} activeOpacity={0.92} onPress={() => startFromContent(featuredContent)}>
            <ImageBackground
              source={{
                uri: featuredContent.thumbnailUrl ||
                  (featuredContent.videoId ? `https://img.youtube.com/vi/${featuredContent.videoId}/hqdefault.jpg` : undefined),
              }}
              style={styles.featured}
              imageStyle={{ borderRadius: layout.radius.lg }}>
              <LinearGradient
                colors={['transparent', 'rgba(5,5,10,0.55)', 'rgba(5,5,10,0.97)']}
                locations={[0, 0.55, 1]}
                style={[StyleSheet.absoluteFillObject, { borderRadius: layout.radius.lg }]}
              />
              <View style={styles.featuredTopRow}>
                <View style={styles.featuredPill}>
                  <Icon name="sparkles" size={11} color="#fff" style={{ marginRight: 4 }} />
                  <AppText variant="tiny" bold color="#fff">WATCHPARTY PICK</AppText>
                </View>
              </View>
              <View style={styles.featuredOverlay}>
                <AppText variant="h2" bold numberOfLines={2} style={styles.featuredTitle}>{featuredContent.title}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Icon name="eye" size={12} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
                  <AppText variant="tiny" color="rgba(255,255,255,0.7)">{featuredContent.viewCount} views</AppText>
                </View>
                <View style={styles.featuredBtns}>
                  <AppButton title="Watch Together" icon="play" fullWidth onPress={() => startFromContent(featuredContent)} />
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        )}

        <TopContentRow items={topContent} onStart={startFromContent} />

        <RoomSection
          icon="people-circle"
          title="My Watch Parties"
          rooms={myRooms}
          onJoin={openOwnRoom}
          emptyText="You haven't created a room yet — tap Create Room above to start one."
        />

        <RoomSection
          icon="globe"
          title="Public Rooms"
          rooms={publicRooms}
          onJoin={(id) => joinMutation.mutate({ id })}
          emptyText="No public rooms right now."
        />

        <ContentMultiRowSection icon="film" title="Latest Movies" items={latestMoviesContent} numRows={3} onStart={startFromContent} />
        <ContentMultiRowSection icon="happy" title="Comedy Shows" items={comedyContent} numRows={3} onStart={startFromContent} />
        <ContentSingleRowSection icon="newspaper" title="Live News" items={liveNewsContent} onStart={startFromContent} />
        <ContentSingleRowSection icon="star" title="From Our Creators" items={creatorsContent} onStart={startFromContent} showCreator />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  headIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pillRow: { paddingLeft: spacing.lg, paddingRight: spacing.xl, paddingVertical: spacing.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.pill, marginRight: 10,
  },

  // ---- Featured banner ----
  featuredWrap: {
    paddingHorizontal: spacing.lg, marginTop: spacing.sm,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  featured: {
    height: 300, justifyContent: 'flex-end',
    borderRadius: layout.radius.lg, overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  featuredTopRow: { position: 'absolute', top: spacing.md, left: spacing.md },
  featuredPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(238,48,99,0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  featuredOverlay: { padding: spacing.lg },
  featuredTitle: { lineHeight: 34, paddingBottom: 2 },
  featuredBtns: { flexDirection: 'row', marginTop: spacing.md },

  // ---- Sections ----
  section: { marginTop: spacing.xl },
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  sectionIconWrap: {
    width: 24, height: 24, borderRadius: 8, marginRight: 8,
    backgroundColor: 'rgba(238,48,99,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { lineHeight: 28, paddingBottom: 3 },
  rowScroll: { paddingLeft: spacing.lg, paddingRight: spacing.xl },

  emptyBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: layout.radius.md, padding: spacing.md,
  },

  // ---- PosterCard (shared everywhere) ----
  posterCard: { marginRight: spacing.md },
  posterImgWrap: {
    borderRadius: layout.radius.md, overflow: 'hidden', backgroundColor: colors.surfaceElevated,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  posterFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#15151d' },
  posterScrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, paddingTop: 30, paddingBottom: 10,
  },
  posterTitle: { lineHeight: 17 },
  posterBorder: {
    ...StyleSheet.absoluteFillObject, borderRadius: layout.radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  badgeTopLeft: { position: 'absolute', top: 8, left: 8 },
  badgeTopRight: { position: 'absolute', top: 8, right: 8 },
  badgeBottomRight: { position: 'absolute', bottom: 44, right: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FF3B5C', marginRight: 4 },
  creatorAvatar: { width: 14, height: 14, borderRadius: 7 },

  // Rank numeral — sits at the poster's bottom-left corner, well above the
  // title scrim (bottom offset clears the ~54px text area), never covering it.
  rankWrap: {
    position: 'absolute', left: -2, bottom: 68,
  },
  rankNumber: {
    fontFamily: 'Syne-ExtraBold', fontSize: 44, color: '#fff', lineHeight: 46,
    textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },

  centerLoader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default HomeScreen;