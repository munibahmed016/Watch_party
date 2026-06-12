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
import { adminApi } from '@/lib/api';

const NavCard: React.FC<{ icon: string; title: string; subtitle: string; onPress: () => void }> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.navCard} activeOpacity={0.85}>
    <View style={styles.navIcon}>
      <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <Icon name={icon} size={22} color={colors.white} />
    </View>
    <View style={{ flex: 1 }}>
      <AppText bold>{title}</AppText>
      <AppText variant="tiny" color={colors.textSecondary}>{subtitle}</AppText>
    </View>
    <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
  </TouchableOpacity>
);

const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const statsQ = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => adminApi.stats() });
  const anQ = useQuery({ queryKey: ['admin', 'analytics'], queryFn: () => adminApi.analytics() });

  const s = statsQ.data;
  const series = anQ.data?.series || [];
  const subDist = anQ.data?.subscriptionsByPlan || [];
  const loading = statsQ.isLoading || anQ.isLoading;

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Admin dashboard"
        infoIntro="Live analytics and quick access to manage your platform."
        infoPoints={[
          { icon: 'stats-chart', title: 'Analytics', text: 'Track signups, rooms and subscriptions over time.' },
          { icon: 'film', title: 'Content', text: 'Manage your entire content library.' },
          { icon: 'people', title: 'Users & plans', text: 'Verify, ban, and manage user subscriptions.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={statsQ.isFetching || anQ.isFetching} onRefresh={() => { statsQ.refetch(); anQ.refetch(); }} tintColor={colors.primary} />}>

        <GradientText variant="h1" style={styles.title}>Dashboard</GradientText>

        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
          <>
            {/* Top stat cards */}
            <View style={styles.statRow}>
              <StatCard value={s?.users ?? 0} label="Total Users" accent />
              <StatCard value={s?.subscribedUsers ?? 0} label="Subscribed" />
              <StatCard value={s?.content ?? 0} label="Content" />
            </View>
            <View style={[styles.statRow, { marginTop: spacing.sm }]}>
              <StatCard value={s?.rooms ?? 0} label="Rooms" />
              <StatCard value={s?.verifiedUsers ?? 0} label="Verified" />
              <StatCard value={s?.bannedUsers ?? 0} label="Banned" />
            </View>

            {/* Signups chart */}
            <View style={styles.card}>
              <AppText bold style={{ marginBottom: spacing.sm }}>Signups (last 14 days)</AppText>
              <BarChart data={series.map((d: any) => ({ label: d.date.slice(5), value: d.signups }))} />
            </View>

            {/* Rooms chart */}
            <View style={styles.card}>
              <AppText bold style={{ marginBottom: spacing.sm }}>Rooms created (last 14 days)</AppText>
              <BarChart data={series.map((d: any) => ({ label: d.date.slice(5), value: d.rooms }))} />
            </View>

            {/* Subscription distribution */}
            {subDist.length > 0 && (
              <View style={styles.card}>
                <AppText bold style={{ marginBottom: spacing.md }}>Users by Plan</AppText>
                <Distribution data={subDist.map((d: any) => ({ label: d.plan, value: d.count }))} />
              </View>
            )}

            {/* Navigation */}
            <AppText variant="h3" bold style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>Manage</AppText>
            <NavCard icon="film" title="Content" subtitle="Add, edit, feature & delete" onPress={() => navigation.navigate('AdminContent')} />
            <NavCard icon="people" title="Users" subtitle="Verify, ban, roles & delete" onPress={() => navigation.navigate('AdminUsers')} />
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
  navCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  navIcon: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
});

export default AdminDashboardScreen;