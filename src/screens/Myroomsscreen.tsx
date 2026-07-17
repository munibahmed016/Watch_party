import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
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
import { roomsApi, Room } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = { ACTIVE: '#22C55E', PAUSED: '#FF8A3D', ENDED: colors.textMuted };

const MyRoomsScreen = () => {
  const navigation = useNavigation<any>();

  const roomsQ = useQuery({
    queryKey: ['rooms', 'mine-creator-dashboard'],
    queryFn: () => roomsApi.list({ filter: 'mine', limit: 50 }),
  });

  const items = roomsQ.data?.rooms || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Your Rooms"
        infoIntro="Every watch party you've hosted."
      />
      {roomsQ.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i: Room) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          ListHeaderComponent={
            <View>
              <GradientText variant="h1" style={styles.title}>Rooms</GradientText>
              <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
                {items.length} room{items.length === 1 ? '' : 's'}
              </AppText>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Room', { roomId: item.id })}
            >
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Icon name="tv" size={20} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText bold numberOfLines={1}>{item.name}</AppText>
                <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
                  Code: {item.code} · {item.memberCount} watching
                </AppText>
                <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[item.status]}22` }]}>
                  <AppText variant="tiny" bold color={STATUS_COLOR[item.status]}>{item.status}</AppText>
                </View>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="tv-outline" size={42} color={colors.textMuted} />
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>No rooms yet.</AppText>
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});

export default MyRoomsScreen;