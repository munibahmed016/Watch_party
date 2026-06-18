import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { creatorsApi, Creator } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const AdminCreatorsScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();

  const pendingQ = useQuery({
    queryKey: ['admin', 'creators', 'pending'],
    queryFn: () => creatorsApi.adminPendingCreators(1, 50),
  });

  const approve = useMutation({
    mutationFn: (id: string) => creatorsApi.adminApproveCreator(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'creators', 'pending'] }); Alert.alert('Approved', 'Creator is now live.'); },
    onError: (e) => showApiError(e, 'Could not approve.'),
  });
  const reject = useMutation({
    mutationFn: (id: string) => creatorsApi.adminRejectCreator(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'creators', 'pending'] }); },
    onError: (e) => showApiError(e, 'Could not reject.'),
  });

  const onReject = (c: Creator) =>
    Alert.alert('Reject creator', `Reject @${c.username}'s application?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => reject.mutate(c.id) },
    ]);

  const items = pendingQ.data?.items || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Creator approvals"
        infoIntro="Review and approve people applying to become creators."
        infoPoints={[
          { icon: 'checkmark-circle', title: 'Approve', text: 'Approve to let them upload and go live.' },
          { icon: 'close-circle', title: 'Reject', text: 'Reject applications that don\'t qualify.' },
        ]}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={pendingQ.isFetching} onRefresh={() => pendingQ.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <GradientText variant="h1" style={styles.title}>Creators</GradientText>
            <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
              {items.length} pending application{items.length === 1 ? '' : 's'}
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: item.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(item.username)}&backgroundColor=ffdfbf` }}
                style={styles.avatar}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText bold numberOfLines={1}>{item.displayName}</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>@{item.username} · {item.category}</AppText>
                {item.tagline ? <AppText variant="tiny" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>{item.tagline}</AppText> : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <AppButton title={approve.isPending ? '…' : 'Approve'} size="sm" fullWidth
                  disabled={approve.isPending} onPress={() => approve.mutate(item.id)} />
              </View>
              <TouchableOpacity onPress={() => onReject(item)} style={styles.rejectBtn} activeOpacity={0.85}>
                <Icon name="close" size={16} color={colors.error} style={{ marginRight: 6 }} />
                <AppText variant="small" bold color={colors.error}>Reject</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !pendingQ.isLoading ? (
            <View style={styles.empty}>
              <Icon name="checkmark-done-circle-outline" size={42} color={colors.textMuted} />
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>No pending applications.</AppText>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceElevated },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.error, backgroundColor: 'rgba(239,68,68,0.1)' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});

export default AdminCreatorsScreen;