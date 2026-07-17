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
import { creatorsApi } from '@/lib/api';

const LiveSessionsScreen = () => {
  const navigation = useNavigation<any>();
  const q = useQuery({ queryKey: ['creator', 'live-sessions'], queryFn: () => creatorsApi.myLiveSessions(1, 50) });
  const items = q.data?.items || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()} infoTitle="Live History" infoIntro="Every live session you've hosted, past and present." />
      {q.isLoading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          ListHeaderComponent={
            <View>
              <GradientText variant="h1" style={styles.title}>Lives</GradientText>
              <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>{items.length} session{items.length === 1 ? '' : 's'}</AppText>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} /> : (
                <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}><Icon name="radio" size={18} color={colors.textMuted} /></View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText bold numberOfLines={1}>{item.title}</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>
                  {new Date(item.startedAt).toLocaleDateString()} · peak {item.peakViewers} viewers
                </AppText>
              </View>
              <View style={[styles.statusPill, { backgroundColor: item.status === 'LIVE' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)' }]}>
                <AppText variant="tiny" bold color={item.status === 'LIVE' ? '#22C55E' : colors.textMuted}>{item.status}</AppText>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Icon name="radio-outline" size={42} color={colors.textMuted} /><AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>No live sessions yet.</AppText></View>}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { lineHeight: 40, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  thumb: { width: 44, height: 44, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});

export default LiveSessionsScreen;