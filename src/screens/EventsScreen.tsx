import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { creatorsApi, CreatorEvent } from '@/lib/api';

const fmtWhen = (iso: string) => {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch { return ''; }
};

const STATUS_COLORS: Record<string, string> = {
  LIVE: '#FF0000', UPCOMING: colors.primary, PAST: colors.textMuted, CANCELED: colors.error,
};

const EventsScreen = () => {
  const navigation = useNavigation<any>();

  const eventsQuery = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => creatorsApi.upcomingEvents(50),
  });

  const events = eventsQuery.data?.items || [];

  const openCreator = (username?: string) => {
    if (username) navigation.navigate('PodcastHostProfile', { username });
  };

  const renderItem = ({ item }: { item: CreatorEvent }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.primary;
    const isLive = item.status === 'LIVE';
    return (
      <View style={styles.card}>
        {/* banner */}
        <View style={styles.cardBanner}>
          {item.thumbnailUrl
            ? <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject as any} />
            : <LinearGradient colors={['#F7971E', '#FF3B30']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />}
          <View style={styles.bannerShade} />
          <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
            {isLive && <View style={styles.liveDot} />}
            <AppText variant="tiny" bold color={colors.white} style={{ fontSize: 9 }}>{item.status}</AppText>
          </View>
          <View style={styles.bannerTextWrap}>
            <AppText variant="h3" bold color={colors.white} numberOfLines={2}>{item.title}</AppText>
          </View>
        </View>

        {/* body */}
        <View style={styles.cardBody}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon name="time-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <AppText variant="small" color={colors.textSecondary}>{fmtWhen(item.scheduledAt)}</AppText>
          </View>

          {item.description ? (
            <AppText variant="small" color={colors.textSecondary} numberOfLines={2} style={{ marginBottom: 10 }}>
              {item.description}
            </AppText>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.8}
              onPress={() => openCreator(item.creator?.username)}>
              <Image
                source={{ uri: item.creator?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(item.creator?.username || 'x')}&backgroundColor=ffdfbf` }}
                style={styles.creatorAvatar}
              />
              <AppText variant="tiny" bold color={colors.textSecondary}>{item.creator?.displayName || 'Creator'}</AppText>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={() => openCreator(item.creator?.username)} style={styles.joinBtn}>
              <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <Icon name={isLive ? 'play' : 'eye'} size={13} color={colors.white} style={{ marginRight: 5 }} />
              <AppText variant="tiny" bold color={colors.white}>{isLive ? 'Watch' : 'View'}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={['top']}>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Upcoming Events"
        infoIntro="See what creators have planned — live sessions, premieres and watch parties."
        infoPoints={[
          { icon: 'calendar', title: 'Schedule', text: 'Upcoming events from creators you can join.' },
          { icon: 'play-circle', title: 'Join live', text: 'Tap a live event to watch together.' },
        ]}
      />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <GradientText variant="h2" style={{ lineHeight: 32, paddingBottom: 2 }}>Upcoming Events</GradientText>
      </View>

      {eventsQuery.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Icon name="calendar-outline" size={46} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 12 }}>No upcoming events right now.</AppText>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          refreshing={eventsQuery.isRefetching}
          onRefresh={() => eventsQuery.refetch()}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.lg, marginBottom: spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardBanner: { height: 120, position: 'relative', justifyContent: 'flex-end' },
  bannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  statusPill: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.white, marginRight: 4 },
  bannerTextWrap: { padding: spacing.md },
  cardBody: { padding: spacing.md },
  creatorAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: colors.surfaceElevated },
  joinBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, height: 34, borderRadius: 999, overflow: 'hidden' },
});

export default EventsScreen;