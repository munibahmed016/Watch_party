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
import { discoverApi, roomsApi, Room } from '@/lib/api';
import { queryKeys, queryClient } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

const RoomThumbnail: React.FC<{
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
    return <View style={[style, { backgroundColor: colors.surfaceElevated }]} />;
  }

  return (
    <Image
      source={{ uri: currentUri }}
      style={style}
      onError={() => { if (index < sources.length - 1) setIndex(index + 1); }}
    />
  );
};

const Pill: React.FC<{ label: string; icon?: string; onPress?: () => void }> = ({
  label, icon, onPress,
}) => (
  <TouchableOpacity onPress={onPress} style={styles.pill} activeOpacity={0.85}>
    {icon && <Icon name={icon} size={13} color={colors.white} style={{ marginRight: 6 }} />}
    <AppText variant="small" bold numberOfLines={1}>{label}</AppText>
  </TouchableOpacity>
);

const TopRoomsRow: React.FC<{ rooms: Room[]; onJoin: (id: string) => void }> = ({ rooms, onJoin }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <GradientText variant="h3" style={styles.sectionTitle}>Top 10 Rooms</GradientText>
    </View>
    {rooms.length === 0 ? (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <AppText variant="small" color={colors.textSecondary}>No rooms yet.</AppText>
      </View>
    ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
        {rooms.map((r, idx) => (
          <TouchableOpacity key={r.id} style={styles.topCard} activeOpacity={0.85} onPress={() => onJoin(r.id)}>
            <View style={styles.topCardImgWrap}>
              <RoomThumbnail videoId={r.videoId} thumbnailUrl={r.thumbnailUrl} style={styles.topCardImg} />
              <View style={styles.topCardOverlay}>
                <AppText style={styles.topCardNumber}>{idx + 1}</AppText>
              </View>
            </View>
            <AppText variant="small" bold numberOfLines={1} style={{ marginTop: 8, width: 130 }}>{r.name}</AppText>
            <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1} style={{ width: 130 }}>
              {r.memberCount} watching
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}
  </View>
);

const SingleRow: React.FC<{ rooms: Room[]; onJoin: (id: string) => void }> = ({ rooms, onJoin }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
    {rooms.map((r) => (
      <TouchableOpacity key={r.id} style={styles.contentCard} activeOpacity={0.85} onPress={() => onJoin(r.id)}>
        <View style={styles.contentImgWrap}>
          <RoomThumbnail videoId={r.videoId} thumbnailUrl={r.thumbnailUrl} style={styles.contentImg} />
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <AppText variant="tiny" bold>LIVE</AppText>
          </View>
          <View style={styles.liveCount}>
            <Icon name="eye" size={10} color={colors.white} style={{ marginRight: 3 }} />
            <AppText variant="tiny" bold>{r.memberCount}</AppText>
          </View>
        </View>
        <AppText variant="small" bold numberOfLines={1} style={{ marginTop: 8, width: 150 }}>{r.name}</AppText>
        {r.videoTitle && (
          <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1} style={{ width: 150 }}>
            {r.videoTitle}
          </AppText>
        )}
      </TouchableOpacity>
    ))}
  </ScrollView>
);

const MultiRowSection: React.FC<{
  title: string; rooms: Room[]; numRows?: number; onJoin: (id: string) => void;
}> = ({ title, rooms, numRows = 3, onJoin }) => {
  const rows = useMemo(() => {
    const result: Room[][] = Array.from({ length: numRows }, () => []);
    rooms.forEach((room, idx) => { result[idx % numRows].push(room); });
    return result;
  }, [rooms, numRows]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <GradientText variant="h3" style={styles.sectionTitle}>{title}</GradientText>
        <AppText variant="tiny" color={colors.textSecondary}>
          {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
        </AppText>
      </View>
      {rooms.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <AppText variant="small" color={colors.textSecondary}>Nothing here yet.</AppText>
        </View>
      ) : (
        rows.map((rowItems, rowIdx) => (
          <View key={rowIdx} style={{ marginBottom: rowIdx < numRows - 1 ? spacing.md : 0 }}>
            <SingleRow rooms={rowItems} onJoin={onJoin} />
          </View>
        ))
      )}
    </View>
  );
};

const SingleRowSection: React.FC<{ title: string; rooms: Room[]; onJoin: (id: string) => void }> = ({ title, rooms, onJoin }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <GradientText variant="h3" style={styles.sectionTitle}>{title}</GradientText>
      <AppText variant="tiny" color={colors.textSecondary}>
        {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
      </AppText>
    </View>
    {rooms.length === 0 ? (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <AppText variant="small" color={colors.textSecondary}>Nothing here yet.</AppText>
      </View>
    ) : (
      <SingleRow rooms={rooms} onJoin={onJoin} />
    )}
  </View>
);

const HomeScreen = () => {
  const navigation = useNavigation<any>();

  const discoverQuery = useQuery({
    queryKey: queryKeys.discoverHome,
    queryFn: () => discoverApi.home(),
  });

  const roomsQuery = useQuery({
    queryKey: queryKeys.roomsList('public', undefined),
    queryFn: () => roomsApi.list({ filter: 'public', limit: 50 }),
    refetchInterval: 30 * 1000,
  });

  const joinMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => roomsApi.join(id),
    onSuccess: ({ room }) => { navigation.navigate('Room', { roomId: room.id }); },
    onError: (err: any) => { showApiError(err, 'Could not join room.'); },
  });

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.discoverHome });
    queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
  };

  const data: any = discoverQuery.data || {};
  const topRooms: Room[] = data.topRooms || [];
  const latestMovies: Room[] = data.latestMovies || [];
  const comedy: Room[] = data.comedy || [];
  const liveNews: Room[] = data.liveNews || [];
  const featured: Room | null = data.featured || null;

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
            refreshing={discoverQuery.isFetching || roomsQuery.isFetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          <Pill label="Create Room" icon="add" onPress={() => navigation.navigate('CreateRoom')} />
          <Pill label="WatchParty Movies" icon="film" onPress={() => navigation.navigate('WatchPartyMovies')} />
          <Pill label="Join podcast" icon="key" onPress={() => navigation.navigate('JoinPodcast')} />
        </ScrollView>

        {featured && (
          <TouchableOpacity style={styles.featuredWrap} activeOpacity={0.9} onPress={() => joinMutation.mutate({ id: featured.id })}>
            <ImageBackground
              source={{
                uri: featured.thumbnailUrl ||
                  (featured.videoId ? `https://img.youtube.com/vi/${featured.videoId}/hqdefault.jpg` : undefined),
              }}
              style={styles.featured}
              imageStyle={{ borderRadius: layout.radius.lg }}>
              <LinearGradient
                colors={['transparent', 'rgba(7,7,14,0.95)']}
                style={[StyleSheet.absoluteFillObject, { borderRadius: layout.radius.lg }]}
              />
              <View style={styles.featuredOverlay}>
                <AppText variant="tiny" color={colors.textSecondary} style={{ letterSpacing: 1 }}>FEATURED</AppText>
                <AppText variant="h2" bold numberOfLines={2} style={styles.featuredTitle}>{featured.name}</AppText>
                <View style={styles.featuredBtns}>
                  <AppButton
                    title="Watch Together"
                    icon="play"
                    fullWidth
                    onPress={() => joinMutation.mutate({ id: featured.id })}
                  />
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        )}

        <TopRoomsRow rooms={topRooms} onJoin={(id) => joinMutation.mutate({ id })} />
        <MultiRowSection title="🎬 Latest Movies" rooms={latestMovies} numRows={3} onJoin={(id) => joinMutation.mutate({ id })} />
        <MultiRowSection title="😂 Comedy Shows" rooms={comedy} numRows={3} onJoin={(id) => joinMutation.mutate({ id })} />
        <SingleRowSection title="📺 Live News" rooms={liveNews} onJoin={(id) => joinMutation.mutate({ id })} />
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
  featuredWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  featured: {
    height: 290, justifyContent: 'flex-end',
    borderRadius: layout.radius.lg, overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  featuredOverlay: { padding: spacing.lg },
  featuredTitle: { marginTop: spacing.xs, lineHeight: 34, paddingBottom: 2 },
  featuredBtns: { flexDirection: 'row', marginTop: spacing.md },
  playBtnWrap: {
    borderRadius: layout.radius.pill, overflow: 'hidden',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  playBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 11,
    borderRadius: layout.radius.pill,
  },
  section: { marginTop: spacing.xl },
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  sectionTitle: { lineHeight: 28, paddingBottom: 3 },
  rowScroll: { paddingLeft: spacing.lg, paddingRight: spacing.xl },
  topCard: { marginRight: spacing.md, width: 130 },
  topCardImgWrap: { position: 'relative' },
  topCardImg: {
    width: 130, height: 180, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated,
  },
  topCardOverlay: { position: 'absolute', bottom: -6, left: -6 },
  topCardNumber: {
    fontFamily: 'Syne-ExtraBold', fontSize: 72, color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, lineHeight: 80,
  },
  contentCard: { marginRight: spacing.md, width: 150 },
  contentImgWrap: { position: 'relative' },
  contentImg: {
    width: 150, height: 200, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated,
  },
  liveBadge: {
    position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary, marginRight: 4 },
  liveCount: {
    position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  centerLoader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default HomeScreen;