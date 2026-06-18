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
import { creatorsApi, CreatorContent } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const AdminReviewScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();

  const pendingQ = useQuery({
    queryKey: ['admin', 'content', 'pending'],
    queryFn: () => creatorsApi.adminPendingContent(1, 50),
  });

  const approve = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => creatorsApi.adminApproveContent(id, featured),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'content', 'pending'] }); Alert.alert('Approved', 'Content is now public.'); },
    onError: (e) => showApiError(e, 'Could not approve.'),
  });
  const reject = useMutation({
    mutationFn: (id: string) => creatorsApi.adminRejectContent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'content', 'pending'] }); },
    onError: (e) => showApiError(e, 'Could not reject.'),
  });

  const onReject = (c: CreatorContent) =>
    Alert.alert('Reject content', `Reject "${c.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => reject.mutate(c.id) },
    ]);

  const onApprove = (c: CreatorContent) =>
    Alert.alert('Approve content', `Approve "${c.title}"?`, [
      { text: 'Approve', onPress: () => approve.mutate({ id: c.id, featured: false }) },
      { text: 'Approve + Feature', onPress: () => approve.mutate({ id: c.id, featured: true }) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const items = pendingQ.data?.items || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Content review"
        infoIntro="Review uploads from creators before they go public."
        infoPoints={[
          { icon: 'checkmark-circle', title: 'Approve', text: 'Make the upload public — optionally feature it.' },
          { icon: 'close-circle', title: 'Reject', text: 'Reject content that breaks the rules.' },
        ]}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={pendingQ.isFetching} onRefresh={() => pendingQ.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <GradientText variant="h1" style={styles.title}>Review</GradientText>
            <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
              {items.length} item{items.length === 1 ? '' : 's'} awaiting review
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row' }}>
              {item.thumbnailUrl
                ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
                : <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}><Icon name="film" size={20} color={colors.textMuted} /></View>}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText bold numberOfLines={2}>{item.title}</AppText>
                <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {item.format} · {(item as any).category || ''}
                </AppText>
                {(item as any).creator?.displayName ? (
                  <AppText variant="tiny" color={colors.textMuted} style={{ marginTop: 2 }}>
                    by {(item as any).creator.displayName}
                  </AppText>
                ) : null}
                <View style={styles.statusPill}>
                  <AppText variant="tiny" bold color={colors.warning}>{item.uploadStatus}</AppText>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <AppButton title="Approve" size="sm" fullWidth disabled={approve.isPending} onPress={() => onApprove(item)} />
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
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>Nothing to review.</AppText>
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
  thumb: { width: 100, height: 64, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated },
  statusPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,176,32,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 6 },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.error, backgroundColor: 'rgba(239,68,68,0.1)' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});

export default AdminReviewScreen;