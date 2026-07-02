import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { adminApi, AdminRoom } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const STATUS_COLOR: Record<string, string> = { ACTIVE: '#22C55E', PAUSED: '#FF8A3D', ENDED: colors.textMuted };

const AdminRoomsScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const listQ = useQuery({ queryKey: ['admin', 'rooms', search], queryFn: () => adminApi.listRooms(search) });

  const end = useMutation({
    mutationFn: (id: string) => adminApi.endRoom(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'rooms'] }),
    onError: (e) => showApiError(e, 'Could not end room.'),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminApi.deleteRoom(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'rooms'] }),
    onError: (e) => showApiError(e, 'Could not delete room.'),
  });

  const rooms = listQ.data?.rooms || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Room management"
        infoIntro="See every watch party room, force-end a live one, or remove it entirely."
        infoPoints={[
          { icon: 'power', title: 'End', text: 'Force-end a room — everyone inside is kicked out immediately.' },
          { icon: 'trash', title: 'Delete', text: 'Permanently remove a room and its chat history.' },
        ]}
      />
      <FlatList
        data={rooms}
        keyExtractor={(i: AdminRoom) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={() => listQ.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <GradientText variant="h1" style={styles.title}>Rooms</GradientText>
            <View style={styles.searchBox}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search by room name or code" placeholderTextColor={colors.textMuted} style={styles.searchInput} autoCapitalize="none" />
            </View>
            <AppText variant="tiny" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              {rooms.length} room{rooms.length === 1 ? '' : 's'}
            </AppText>
          </View>
        }
        renderItem={({ item }: { item: AdminRoom }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <AppText variant="small" bold numberOfLines={1} style={{ maxWidth: 200 }}>{item.name}</AppText>
                  <View style={[styles.tag, { backgroundColor: `${STATUS_COLOR[item.status]}22` }]}>
                    <AppText variant="tiny" bold color={STATUS_COLOR[item.status]}>{item.status}</AppText>
                  </View>
                  {item.isPrivate && (
                    <View style={[styles.tag, { backgroundColor: 'rgba(123,97,255,0.2)' }]}>
                      <Icon name="lock-closed" size={10} color="#7B61FF" />
                    </View>
                  )}
                </View>
                <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1}>
                  Code: {item.code} · Host: {item.owner?.fullName || item.owner?.username || 'Unknown'}
                </AppText>
                {item.videoTitle && (
                  <AppText variant="tiny" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>
                    🎬 {item.videoTitle}
                  </AppText>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Icon name="people" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <AppText variant="tiny" color={colors.textMuted}>{item.memberCount} member{item.memberCount === 1 ? '' : 's'}</AppText>
                </View>
              </View>
            </View>
            <View style={styles.actions}>
              {item.status !== 'ENDED' && (
                <TouchableOpacity
                  onPress={() => Alert.alert('End room', `End "${item.name}" for everyone right now?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'End Room', style: 'destructive', onPress: () => end.mutate(item.id) },
                  ])}
                  style={styles.actBtn}
                >
                  <Icon name="power" size={14} color="#FF8A3D" />
                  <AppText variant="tiny" bold color="#FF8A3D" style={{ marginLeft: 4 }}>End</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => Alert.alert('Delete room', `Permanently delete "${item.name}"? This also deletes its chat history.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => del.mutate(item.id) },
                ])}
                style={styles.actBtn}
              >
                <Icon name="trash" size={14} color="#E5484D" />
                <AppText variant="tiny" bold color="#E5484D" style={{ marginLeft: 4 }}>Delete</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={listQ.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 20 }}>No rooms.</AppText>}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, height: 44, marginBottom: spacing.md },
  searchInput: { flex: 1, color: colors.white, marginLeft: 8, fontFamily: 'Outfit-Regular' },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, marginLeft: 6, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  actBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border },
});

export default AdminRoomsScreen;