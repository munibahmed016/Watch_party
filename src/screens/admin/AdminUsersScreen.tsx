import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, RefreshControl } from 'react-native';
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
import { adminApi } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

type UserFilter = 'all' | 'verified' | 'banned' | 'admin';

const AdminUsersScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  // Dashboard tiles ("Verified" / "Banned") land here with a filter param so
  // only that subset shows, instead of dumping the whole user list.
  const [filter, setFilter] = useState<UserFilter>((route.params?.filter as UserFilter) || 'all');

  const listQ = useQuery({ queryKey: ['admin', 'users', search], queryFn: () => adminApi.listUsers(search) });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => adminApi.updateUser(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (e) => showApiError(e, 'Could not update.'),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (e) => showApiError(e, 'Could not delete.'),
  });

  const allUsers = listQ.data?.users || [];
  const users = useMemo(() => {
    switch (filter) {
      case 'verified': return allUsers.filter((u: any) => u.isVerified);
      case 'banned': return allUsers.filter((u: any) => u.isBanned);
      case 'admin': return allUsers.filter((u: any) => u.isAdmin);
      default: return allUsers;
    }
  }, [allUsers, filter]);

  const FILTERS: { key: UserFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'people' },
    { key: 'verified', label: 'Verified', icon: 'shield-checkmark' },
    { key: 'banned', label: 'Banned', icon: 'ban' },
    { key: 'admin', label: 'Admins', icon: 'star' },
  ];

  const Action = (icon: string, label: string, color: string, onPress: () => void) => (
    <TouchableOpacity onPress={onPress} style={styles.actBtn}>
      <Icon name={icon} size={14} color={color} />
      <AppText variant="tiny" bold color={color} style={{ marginLeft: 4 }}>{label}</AppText>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="User management"
        infoIntro="Verify, ban, promote and remove users."
        infoPoints={[
          { icon: 'shield-checkmark', title: 'Verify', text: 'Mark accounts as verified.' },
          { icon: 'ban', title: 'Ban', text: 'Block users who break the rules.' },
          { icon: 'star', title: 'Admin role', text: 'Promote trusted users to admin.' },
        ]}
      />
      <FlatList
        data={users}
        keyExtractor={(i: any) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={() => listQ.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <GradientText variant="h1" style={styles.title}>Users</GradientText>
            <View style={styles.searchBox}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search users" placeholderTextColor={colors.textMuted} style={styles.searchInput} autoCapitalize="none" />
            </View>
            {/* Filter chips — tapping a dashboard stat lands here pre-filtered,
                but the admin can also switch freely between filters. */}
            <View style={styles.filterRow}>
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterChip, active && styles.filterChipActive]}>
                    <Icon name={f.icon} size={13} color={active ? colors.white : colors.textSecondary} style={{ marginRight: 5 }} />
                    <AppText variant="tiny" bold color={active ? colors.white : colors.textSecondary}>{f.label}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <AppText variant="tiny" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              {users.length} user{users.length === 1 ? '' : 's'}{filter !== 'all' ? ` · ${filter}` : ''}
            </AppText>
          </View>
        }
        renderItem={({ item }: { item: any }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <AppText variant="small" bold>{item.fullName || item.username}</AppText>
                  {item.isAdmin && <View style={[styles.tag, { backgroundColor: 'rgba(238,48,99,0.2)' }]}><AppText variant="tiny" bold color={colors.primary}>ADMIN</AppText></View>}
                  {item.isVerified && <View style={[styles.tag, { backgroundColor: 'rgba(34,197,94,0.2)' }]}><AppText variant="tiny" bold color="#22C55E">VERIFIED</AppText></View>}
                  {item.isBanned && <View style={[styles.tag, { backgroundColor: 'rgba(229,72,77,0.2)' }]}><AppText variant="tiny" bold color="#E5484D">BANNED</AppText></View>}
                  {item.plan?.name && <View style={[styles.tag, { backgroundColor: 'rgba(123,97,255,0.2)' }]}><AppText variant="tiny" bold color="#7B61FF">{item.plan.name}</AppText></View>}
                </View>
                <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1}>{item.email}</AppText>
              </View>
            </View>
            <View style={styles.actions}>
              {Action(item.isVerified ? 'close-circle' : 'checkmark-circle', item.isVerified ? 'Unverify' : 'Verify', colors.primary, () => update.mutate({ id: item.id, body: { isVerified: !item.isVerified } }))}
              {Action(item.isBanned ? 'lock-open' : 'ban', item.isBanned ? 'Unban' : 'Ban', '#FF8A3D', () => update.mutate({ id: item.id, body: { isBanned: !item.isBanned } }))}
              {Action('star', item.isAdmin ? 'Unadmin' : 'Make Admin', '#7B61FF', () => update.mutate({ id: item.id, body: { isAdmin: !item.isAdmin } }))}
              {Action('trash', 'Delete', '#E5484D', () => Alert.alert('Delete user', item.username, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => del.mutate(item.id) }]))}
            </View>
          </View>
        )}
        ListEmptyComponent={listQ.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 20 }}>No users{filter !== 'all' ? ` (${filter})` : ''}.</AppText>}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, height: 44, marginBottom: spacing.md },
  searchInput: { flex: 1, color: colors.white, marginLeft: 8, fontFamily: 'Outfit-Regular' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, marginLeft: 6, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  actBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border },
});

export default AdminUsersScreen;