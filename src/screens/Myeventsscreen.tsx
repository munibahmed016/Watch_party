import React from 'react';
import { View, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
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

const STATUS_COLOR: Record<string, string> = {
  UPCOMING: colors.primary, LIVE: '#22C55E', PAST: colors.textMuted, CANCELED: '#E5484D',
};

const MyEventsScreen = () => {
  const navigation = useNavigation<any>();

  // Need our own username first (events are fetched by username).
  const mineQ = useQuery({ queryKey: ['creator', 'me'], queryFn: () => creatorsApi.getMine() });
  const username = mineQ.data?.creator?.username;

  const eventsQ = useQuery({
    queryKey: ['creator', 'events', username],
    queryFn: () => creatorsApi.eventsByUsername(username!),
    enabled: !!username,
  });

  const items = eventsQ.data?.items || [];
  const loading = mineQ.isLoading || (!!username && eventsQ.isLoading);

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Your Events"
        infoIntro="All the events you've scheduled — upcoming, live, past, and canceled."
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i: CreatorEvent) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          ListHeaderComponent={
            <View>
              <GradientText variant="h1" style={styles.title}>Events</GradientText>
              <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
                {items.length} event{items.length === 1 ? '' : 's'}
              </AppText>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Icon name="calendar" size={20} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText bold numberOfLines={1}>{item.title}</AppText>
                <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {new Date(item.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </AppText>
                <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[item.status]}22` }]}>
                  <AppText variant="tiny" bold color={STATUS_COLOR[item.status]}>{item.status}</AppText>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="calendar-outline" size={42} color={colors.textMuted} />
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>No events yet.</AppText>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { lineHeight: 40, paddingBottom: 4 },
  card: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});

export default MyEventsScreen;