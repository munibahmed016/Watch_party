import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
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
import { analyticsApi, subscriptionsApi } from '@/lib/api';

const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

const Metric: React.FC<{ icon: string; value: number; label: string }> = ({ icon, value, label }) => (
  <View style={styles.metric}>
    <Icon name={icon} size={18} color={colors.primary} />
    <AppText variant="h3" bold style={{ marginTop: 6 }}>{fmt(value)}</AppText>
    <AppText variant="tiny" color={colors.textSecondary}>{label}</AppText>
  </View>
);

const CreatorDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const q = useQuery({ queryKey: ['analytics', 'creator', 'me'], queryFn: () => analyticsApi.creatorMe() });
  const subQ = useQuery({ queryKey: ['subscription', 'me'], queryFn: () => subscriptionsApi.me() });
  const canGoLive = subQ.data?.canGoLive;

  if (q.isLoading) {
    return <ScreenContainer><BrandHeader /><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></ScreenContainer>;
  }
  if (q.isError || !q.data) {
    return (
      <ScreenContainer><BrandHeader />
        <View style={styles.center}>
          <Icon name="stats-chart-outline" size={42} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }} center>
            Become a creator to see your dashboard.
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  const d = q.data;
  const max = Math.max(1, ...d.viewsSeries.map((s) => s.count));

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Creator Dashboard"
        infoIntro="Track your followers, views and content performance."
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <GradientText variant="h2" style={{ lineHeight: 32, paddingBottom: 2 }}>{d.creator}</GradientText>
        <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>Your channel at a glance</AppText>

        {canGoLive && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('GoLive')} style={styles.goLiveBtn}>
            <LinearGradient colors={['#FF3B30', '#FF0000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            <Icon name="radio" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <AppText bold color={colors.white}>Go Live Now</AppText>
          </TouchableOpacity>
        )}

        {/* metrics grid */}
        <View style={styles.grid}>
          <Metric icon="people" value={d.totals.followers} label="Followers" />
          <Metric icon="star" value={d.totals.subscribers} label="Subscribers" />
          <Metric icon="eye" value={d.totals.totalViews} label="Views" />
          <Metric icon="film" value={d.totals.content} label="Content" />
          <Metric icon="heart" value={d.totals.totalLikes} label="Likes" />
          <Metric icon="chatbubble" value={d.totals.totalComments} label="Comments" />
          <Metric icon="share-social" value={d.totals.totalShares} label="Shares" />
          <Metric icon="radio" value={d.totals.liveSessions} label="Lives" />
          <Metric icon="calendar" value={d.totals.events} label="Events" />
          <Metric icon="tv" value={d.totals.rooms} label="Rooms" />
          <Metric icon="chatbubbles" value={d.totals.roomChats} label="Room Chats" />
        </View>

        {/* views series */}
        <GradientText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.md, lineHeight: 28, paddingBottom: 2 }}>Views (last 14 days)</GradientText>
        <View style={styles.chart}>
          {d.viewsSeries.map((s, i) => (
            <View key={i} style={styles.barCol}>
              <View style={[styles.bar, { height: Math.max(3, (s.count / max) * 90) }]} />
            </View>
          ))}
        </View>

        {/* top content */}
        {d.topContent.length > 0 && (
          <>
            <GradientText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.md, lineHeight: 28, paddingBottom: 2 }}>Top Content</GradientText>
            {d.topContent.map((c) => (
              <View key={c.id} style={styles.row}>
                <AppText variant="small" bold style={{ flex: 1 }} numberOfLines={1}>{c.title}</AppText>
                <Stat icon="eye" v={c.viewCount} />
                <Stat icon="heart" v={c.likeCount} />
                <Stat icon="chatbubble" v={c.commentCount} />
              </View>
            ))}
          </>
        )}

        {/* events */}
        {d.events.length > 0 && (
          <>
            <GradientText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.md, lineHeight: 28, paddingBottom: 2 }}>Your Events</GradientText>
            {d.events.map((e) => (
              <View key={e.id} style={styles.row}>
                <Icon name="calendar" size={14} color={colors.primary} style={{ marginRight: 8 }} />
                <AppText variant="small" style={{ flex: 1 }} numberOfLines={1}>{e.title}</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>{e.status}</AppText>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const Stat: React.FC<{ icon: string; v: number }> = ({ icon, v }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
    <Icon name={icon} size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
    <AppText variant="tiny" color={colors.textSecondary}>{fmt(v)}</AppText>
  </View>
);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 999, overflow: 'hidden', marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    width: '30.5%', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.md, paddingVertical: spacing.md, alignItems: 'center',
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: layout.radius.md, padding: spacing.sm },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', backgroundColor: colors.primary, borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
});

export default CreatorDashboardScreen;