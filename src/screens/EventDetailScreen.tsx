import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
import { creatorsApi, CreatorEvent } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1489599735734-79b4625e5b76?w=1000';
const pad = (n: number) => String(n).padStart(2, '0');

// time remaining -> {d,h,m,s,done}
const useCountdown = (target: number) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const done = diff <= 0;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, done };
};

const EventDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();

  // Event can be passed directly, or we fetch by id from upcoming list
  const passed: CreatorEvent | undefined = route.params?.event;
  const eventId: string | undefined = route.params?.eventId || passed?.id;

  const listQuery = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => creatorsApi.upcomingEvents(50),
    enabled: !passed,
  });

  const event: CreatorEvent | undefined =
    passed || listQuery.data?.items.find((e) => e.id === eventId);

  // Is this creator live right now? (so "Join" can open it)
  const liveQuery = useQuery({
    queryKey: ['creators', 'live-sessions'],
    queryFn: () => creatorsApi.liveSessions(30),
    refetchInterval: 20 * 1000,
  });
  const creatorIsLive = !!(event && liveQuery.data?.items?.some((s: any) => s.creatorId === event.creatorId));

  // local "going" state (RSVP). Persisted intent = follow the creator for notifications.
  const [going, setGoing] = useState(false);

  const target = event ? new Date(event.scheduledAt).getTime() : Date.now();
  const { d, h, m, s, done } = useCountdown(target);

  // follow creator (so they get the "live now" notification we send on startLive)
  const followMutation = useMutation({
    mutationFn: () => {
      if (!event) throw new Error('No event');
      return creatorsApi.follow(event.creatorId);
    },
    onSuccess: () => {
      setGoing(true);
      qc.invalidateQueries({ queryKey: ['events', 'upcoming'] });
    },
    onError: (err: any) => {
      // already-following returns following:true; treat as success
      setGoing(true);
    },
  });
  const unfollowMutation = useMutation({
    mutationFn: () => {
      if (!event) throw new Error('No event');
      return creatorsApi.unfollow(event.creatorId);
    },
    onSuccess: () => setGoing(false),
    onError: (err) => showApiError(err, 'Could not update.'),
  });

  const onJoinLive = () => {
    if (event?.creator?.username) {
      navigation.navigate('PodcastHostProfile', { username: event.creator.username });
    } else {
      Alert.alert('Creator is live', 'Open the creator profile to join the live session.');
    }
  };

  if (!event) {
    return (
      <ScreenContainer>
        <BrandHeader showBack onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {listQuery.isLoading ? <ActivityIndicator color={colors.primary} />
            : <AppText color={colors.textSecondary}>Event not found.</AppText>}
        </View>
      </ScreenContainer>
    );
  }

  const niceDate = new Date(event.scheduledAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const niceTime = new Date(event.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Event"
        infoIntro="Join the watch party when it starts. Tap Going to get notified."
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Banner / countdown card (Figma style) */}
        <View style={styles.bannerWrap}>
          <Image source={{ uri: event.thumbnailUrl || FALLBACK_IMG }} style={styles.bannerImg} />
          <LinearGradient colors={['transparent', 'rgba(7,7,14,0.92)']} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          <View style={styles.bannerOverlay}>
            <AppText variant="h1" bold numberOfLines={2} style={{ textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 }}>
              {event.title}
            </AppText>
            {creatorIsLive ? (
              <View style={styles.liveNow}>
                <View style={styles.liveDot} />
                <AppText variant="small" bold color={colors.white}>LIVE NOW</AppText>
              </View>
            ) : (
              <View style={styles.timerRow}>
                <TimeBox value={d} label="DAYS" />
                <Colon />
                <TimeBox value={h} label="HRS" />
                <Colon />
                <TimeBox value={m} label="MIN" />
                <Colon />
                <TimeBox value={s} label="SEC" />
              </View>
            )}
          </View>
        </View>

        {/* Creator row */}
        {event.creator && (
          <TouchableOpacity style={styles.creatorRow} activeOpacity={0.85}
            onPress={() => event.creator?.username && navigation.navigate('PodcastHostProfile', { username: event.creator.username })}>
            {event.creator.avatarUrl ? (
              <Image source={{ uri: event.creator.avatarUrl }} style={styles.creatorAvatar} />
            ) : (
              <View style={[styles.creatorAvatar, styles.avatarFallback]}><Icon name="person" size={18} color={colors.textMuted} /></View>
            )}
            <View style={{ marginLeft: 10, flex: 1 }}>
              <AppText bold>{event.creator.displayName}</AppText>
              <AppText variant="small" color={colors.textSecondary}>@{event.creator.username}</AppText>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* When */}
        <View style={styles.infoCard}>
          <Icon name="calendar" size={18} color={colors.primary} style={{ marginRight: 10 }} />
          <View>
            <AppText bold>{niceDate}</AppText>
            <AppText variant="small" color={colors.textSecondary}>{niceTime}</AppText>
          </View>
        </View>

        {event.description ? (
          <View style={{ marginTop: spacing.md }}>
            <AppText variant="small" bold color={colors.textSecondary} style={{ marginBottom: 6 }}>About</AppText>
            <AppText color={colors.textSecondary} style={{ lineHeight: 20 }}>{event.description}</AppText>
          </View>
        ) : null}

        {/* Action: Join (if live) or Going/Cancel */}
        {creatorIsLive ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onJoinLive} style={styles.primaryBtn}>
            <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            <Icon name="play" size={16} color={colors.white} style={{ marginRight: 8 }} />
            <AppText bold color={colors.white}>Join Live</AppText>
          </TouchableOpacity>
        ) : going ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => unfollowMutation.mutate()} disabled={unfollowMutation.isPending} style={[styles.primaryBtn, styles.goingBtn]}>
            {unfollowMutation.isPending ? <ActivityIndicator color={colors.primary} /> : (
              <>
                <Icon name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <AppText bold color={colors.primary}>You're going · Cancel</AppText>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity activeOpacity={0.85} onPress={() => followMutation.mutate()} disabled={followMutation.isPending} style={styles.primaryBtn}>
            <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            {followMutation.isPending ? <ActivityIndicator color={colors.white} /> : (
              <>
                <Icon name="notifications" size={16} color={colors.white} style={{ marginRight: 8 }} />
                <AppText bold color={colors.white}>I'm Going · Notify me</AppText>
              </>
            )}
          </TouchableOpacity>
        )}
        <AppText variant="tiny" color={colors.textMuted} center style={{ marginTop: 10 }}>
          {creatorIsLive ? 'The creator is live — jump in now!' : 'We\'ll notify you when the creator goes live.'}
        </AppText>
      </ScrollView>
    </ScreenContainer>
  );
};

const TimeBox: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <View style={styles.timeBox}>
    <AppText variant="h1" bold color={colors.white} style={{ lineHeight: 34 }}>{pad(value)}</AppText>
    <AppText variant="tiny" color={colors.textSecondary} style={{ letterSpacing: 1 }}>{label}</AppText>
  </View>
);
const Colon = () => <AppText variant="h1" bold color={colors.primary} style={{ marginHorizontal: 2, lineHeight: 34 }}>:</AppText>;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  bannerWrap: { width: '100%', height: 240, borderRadius: layout.radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceElevated },
  bannerImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg },
  timerRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 },
  timeBox: { alignItems: 'center', minWidth: 40 },
  liveNow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#FF0000', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, marginRight: 6 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginTop: spacing.lg },
  creatorAvatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginTop: spacing.md },
  primaryBtn: { height: 52, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  goingBtn: { backgroundColor: 'rgba(238,48,99,0.12)', borderWidth: 1, borderColor: colors.primary },
});

export default EventDetailScreen;