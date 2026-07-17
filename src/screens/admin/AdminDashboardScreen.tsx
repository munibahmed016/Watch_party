// src/screens/admin/AdminDashboardScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import { BarChart, Distribution, StatCard } from '@/components/admin/AdminCharts';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { adminApi, creatorsApi } from '@/lib/api';

const NavCard: React.FC<{ icon: string; title: string; subtitle: string; onPress: () => void; badge?: number }> = ({ icon, title, subtitle, onPress, badge }) => (
  <TouchableOpacity onPress={onPress} style={styles.navCard} activeOpacity={0.85}>
    <View style={styles.navIcon}>
      <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <Icon name={icon} size={22} color={colors.white} />
    </View>
    <View style={{ flex: 1 }}>
      <AppText bold>{title}</AppText>
      <AppText variant="tiny" color={colors.textSecondary}>{subtitle}</AppText>
    </View>
    {badge ? (
      <View style={styles.badge}><AppText variant="tiny" bold color={colors.white}>{badge}</AppText></View>
    ) : null}
    <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
  </TouchableOpacity>
);

// Wraps a StatCard so every top-metric tile routes somewhere relevant, without
// touching StatCard's own internals (it doesn't accept an onPress prop).
const ClickableStat: React.FC<{ onPress?: () => void; style?: any; children: React.ReactNode }> = ({ onPress, style, children }) =>
  onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      {children}
    </TouchableOpacity>
  ) : (
    <View style={style}>{children}</View>
  );

const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const statsQ = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => adminApi.stats() });
  const anQ = useQuery({ queryKey: ['admin', 'analytics'], queryFn: () => adminApi.analytics() });
  const pendingCreatorsQ = useQuery({ queryKey: ['admin', 'creators', 'pending'], queryFn: () => creatorsApi.adminPendingCreators(1, 50) });
  const pendingContentQ = useQuery({ queryKey: ['admin', 'content', 'pending'], queryFn: () => creatorsApi.adminPendingContent(1, 50) });

  const s = statsQ.data;
  const series = anQ.data?.series || [];
  const subDist = anQ.data?.subscriptionsByPlan || [];
  const loading = statsQ.isLoading || anQ.isLoading;

  const pendingCreators = pendingCreatorsQ.data?.items?.length || 0;
  const pendingContent = pendingContentQ.data?.items?.length || 0;

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Admin dashboard"
        infoIntro="Live analytics and full control of your platform. Tap any card to jump straight to it."
        infoPoints={[
          { icon: 'stats-chart', title: 'Analytics', text: 'Track signups, rooms and subscriptions over time.' },
          { icon: 'film', title: 'Content & creators', text: 'Approve creators, review uploads, manage the library.' },
          { icon: 'people', title: 'Users & plans', text: 'Verify, ban, and manage user subscriptions.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={statsQ.isFetching || anQ.isFetching} onRefresh={() => { statsQ.refetch(); anQ.refetch(); pendingCreatorsQ.refetch(); pendingContentQ.refetch(); }} tintColor={colors.primary} />}>

        <GradientText variant="h1" style={styles.title}>Dashboard</GradientText>

        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
          <>
            {/* Top stat cards — every tile is now tappable and routes to the
                screen that manages that number. */}
            <View style={styles.statRow}>
              <ClickableStat style={{ flex: 1 }} onPress={() => navigation.navigate('AdminUsers')}>
                <StatCard value={s?.users ?? 0} label="Total Users" accent />
              </ClickableStat>
              <ClickableStat style={{ flex: 1 }} onPress={() => navigation.navigate('AdminUsers', { filter: 'subscribed' })}>
                <StatCard value={s?.subscribedUsers ?? 0} label="Subscribed" />
              </ClickableStat>
              <ClickableStat style={{ flex: 1 }} onPress={() => navigation.navigate('AdminContent')}>
                <StatCard value={s?.content ?? 0} label="Content" />
              </ClickableStat>
            </View>
            <View style={[styles.statRow, { marginTop: spacing.sm }]}>
              <ClickableStat style={{ flex: 1 }} onPress={() => navigation.navigate('AdminRooms')}>
                <StatCard value={s?.rooms ?? 0} label="Rooms" />
              </ClickableStat>
              <ClickableStat style={{ flex: 1 }} onPress={() => navigation.navigate('AdminUsers', { filter: 'verified' })}>
                <StatCard value={s?.verifiedUsers ?? 0} label="Verified" />
              </ClickableStat>
              <ClickableStat style={{ flex: 1 }} onPress={() => navigation.navigate('AdminUsers', { filter: 'banned' })}>
                <StatCard value={s?.bannedUsers ?? 0} label="Banned" />
              </ClickableStat>
            </View>

            {/* Signups chart -> Users screen */}
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('AdminUsers')} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <AppText bold>Signups (last 14 days)</AppText>
                <Icon name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
              <BarChart data={series.map((d: any) => ({ label: d.date.slice(5), value: d.signups }))} />
            </TouchableOpacity>

            {/* Rooms chart -> Rooms screen */}
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('AdminRooms')} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <AppText bold>Rooms created (last 14 days)</AppText>
                <Icon name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
              <BarChart data={series.map((d: any) => ({ label: d.date.slice(5), value: d.rooms }))} />
            </TouchableOpacity>

            {/* Subscription distribution -> Subscriptions screen */}
            {subDist.length > 0 && (
              <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('AdminSubscriptions')} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <AppText bold>Users by Plan</AppText>
                  <Icon name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
                <Distribution data={subDist.map((d: any) => ({ label: d.plan, value: d.count }))} />
              </TouchableOpacity>
            )}

            {/* Navigation — full control */}
            <AppText variant="h3" bold style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>Manage</AppText>
            <NavCard icon="ribbon" title="Creator Approvals" subtitle="Approve or reject new creators" badge={pendingCreators} onPress={() => navigation.navigate('AdminCreators')} />
            <NavCard icon="shield-checkmark" title="Content Review" subtitle="Approve or reject creator uploads" badge={pendingContent} onPress={() => navigation.navigate('AdminReview')} />
            <NavCard icon="film" title="Content Library" subtitle="Add, feature & delete content" onPress={() => navigation.navigate('AdminContent')} />
            <NavCard icon="people" title="Users" subtitle="Verify, ban, roles & delete" onPress={() => navigation.navigate('AdminUsers')} />
            <NavCard icon="tv" title="Rooms" subtitle="View, end or delete watch parties" onPress={() => navigation.navigate('AdminRooms')} />
            <NavCard icon="card" title="Subscriptions" subtitle="Plans & user subscriptions" onPress={() => navigation.navigate('AdminSubscriptions')} />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.lg, padding: spacing.md, marginTop: spacing.lg },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  navIcon: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#FF8A3D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 8 },
});

export default AdminDashboardScreen;