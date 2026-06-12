import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, Modal, Pressable, FlatList } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
import { adminApi } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const AdminSubscriptionsScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('30');
  const [features, setFeatures] = useState('');
  const [assignFor, setAssignFor] = useState<any | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const plansQ = useQuery({ queryKey: ['admin', 'plans'], queryFn: () => adminApi.listPlans() });
  const usersQ = useQuery({ queryKey: ['admin', 'subusers', userSearch], queryFn: () => adminApi.listUsers(userSearch) });

  const createPlan = useMutation({
    mutationFn: () => adminApi.createPlan({ name: name.trim(), price: price ? parseFloat(price) : 0, durationDays: parseInt(days, 10) || 30, features: features.split(',').map((f) => f.trim()).filter(Boolean) }),
    onSuccess: () => { setName(''); setPrice(''); setFeatures(''); qc.invalidateQueries({ queryKey: ['admin', 'plans'] }); },
    onError: (e) => showApiError(e, 'Could not create plan.'),
  });
  const delPlan = useMutation({
    mutationFn: (id: string) => adminApi.deletePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] }),
    onError: (e) => showApiError(e, 'Could not delete plan.'),
  });
  const assign = useMutation({
    mutationFn: ({ userId, planId }: { userId: string; planId: string }) => adminApi.assignSubscription(userId, planId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'subusers'] }); qc.invalidateQueries({ queryKey: ['admin', 'plans'] }); Alert.alert('Done', 'Subscription assigned.'); },
    onError: (e) => showApiError(e, 'Could not assign.'),
  });
  const removeSub = useMutation({
    mutationFn: (userId: string) => adminApi.removeSubscription(userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'subusers'] }); qc.invalidateQueries({ queryKey: ['admin', 'plans'] }); },
    onError: (e) => showApiError(e, 'Could not remove.'),
  });

  const plans = plansQ.data?.plans || [];
  const users = usersQ.data?.users || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Subscriptions"
        infoIntro="Create plans and manually assign them to users (no payment yet)."
        infoPoints={[
          { icon: 'pricetags', title: 'Plans', text: 'Define plan name, price and duration.' },
          { icon: 'person-add', title: 'Assign', text: 'Give any user a plan; expiry is auto-set.' },
          { icon: 'close-circle', title: 'Remove', text: 'Revoke a subscription anytime.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={plansQ.isFetching} onRefresh={() => plansQ.refetch()} tintColor={colors.primary} />}>
        <GradientText variant="h1" style={styles.title}>Subscriptions</GradientText>

        {/* Create plan */}
        <View style={styles.card}>
          <AppText bold style={{ marginBottom: spacing.sm }}>Create Plan</AppText>
          <TextInput value={name} onChangeText={setName} placeholder="Plan name (e.g. Premium)" placeholderTextColor={colors.textMuted} style={styles.input} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput value={price} onChangeText={setPrice} placeholder="Price ($)" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} />
            <TextInput value={days} onChangeText={setDays} placeholder="Days" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={[styles.input, { flex: 1 }]} />
          </View>
          <TextInput value={features} onChangeText={setFeatures} placeholder="Features (comma separated)" placeholderTextColor={colors.textMuted} style={styles.input} />
          <AppButton title={createPlan.isPending ? 'Creating…' : '+ Create Plan'} size="md" fullWidth disabled={createPlan.isPending}
            onPress={() => { if (!name.trim()) return Alert.alert('Missing', 'Plan name required.'); createPlan.mutate(); }} />
        </View>

        {/* Plans list */}
        <AppText variant="h3" bold style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Plans</AppText>
        {plansQ.isLoading ? <ActivityIndicator color={colors.primary} /> : plans.length === 0 ? (
          <AppText variant="small" color={colors.textSecondary}>No plans yet. Create one above.</AppText>
        ) : plans.map((p: any) => (
          <View key={p.id} style={styles.planCard}>
            <LinearGradient colors={['rgba(238,48,99,0.12)', 'rgba(74,81,161,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GradientText variant="h3" style={{ lineHeight: 26, paddingBottom: 2 }}>{p.name}</GradientText>
                <AppText variant="small" bold style={{ marginLeft: 8 }}>${p.price}/{p.durationDays}d</AppText>
              </View>
              <AppText variant="tiny" color={colors.textSecondary}>{p.subscriberCount} subscribers · {p.features?.join(', ') || 'No features listed'}</AppText>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Delete plan', p.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => delPlan.mutate(p.id) }])} style={{ padding: 8 }}>
              <Icon name="trash-outline" size={18} color="#E5484D" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Assign to users */}
        <AppText variant="h3" bold style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>Manage User Subscriptions</AppText>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={colors.textSecondary} />
          <TextInput value={userSearch} onChangeText={setUserSearch} placeholder="Search users" placeholderTextColor={colors.textMuted} style={styles.searchInput} autoCapitalize="none" />
        </View>
        {users.slice(0, 20).map((u: any) => (
          <View key={u.id} style={styles.userRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="small" bold numberOfLines={1}>{u.fullName || u.username}</AppText>
              <AppText variant="tiny" color={u.plan?.name ? '#7B61FF' : colors.textSecondary}>
                {u.plan?.name ? `${u.plan.name}${u.subscriptionExpiresAt ? ' · until ' + new Date(u.subscriptionExpiresAt).toLocaleDateString() : ''}` : 'Free'}
              </AppText>
            </View>
            {u.plan?.name ? (
              <TouchableOpacity onPress={() => removeSub.mutate(u.id)} style={styles.smBtn}>
                <AppText variant="tiny" bold color="#E5484D">Remove</AppText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { if (plans.length === 0) return Alert.alert('No plans', 'Create a plan first.'); setAssignFor(u); }} style={styles.smBtn}>
                <AppText variant="tiny" bold color={colors.primary}>Assign</AppText>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Assign modal */}
      <Modal visible={!!assignFor} transparent animationType="fade" onRequestClose={() => setAssignFor(null)}>
        <Pressable style={styles.modalBg} onPress={() => setAssignFor(null)}>
          <Pressable style={styles.modalCard}>
            <AppText variant="h3" bold center style={{ marginBottom: spacing.md }}>Assign plan to {assignFor?.username}</AppText>
            {plans.map((p: any) => (
              <TouchableOpacity key={p.id} onPress={() => { assign.mutate({ userId: assignFor.id, planId: p.id }); setAssignFor(null); }} style={styles.planOption}>
                <AppText bold>{p.name}</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>${p.price} · {p.durationDays} days</AppText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setAssignFor(null)} style={{ marginTop: spacing.sm, alignItems: 'center', paddingVertical: 10 }}>
              <AppText bold color={colors.textSecondary}>Cancel</AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.lg, padding: spacing.md },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.white, fontFamily: 'Outfit-Regular', fontSize: 14, marginBottom: spacing.sm },
  planCard: { flexDirection: 'row', alignItems: 'center', borderRadius: layout.radius.lg, padding: spacing.md, marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, height: 44, marginBottom: spacing.md },
  searchInput: { flex: 1, color: colors.white, marginLeft: 8, fontFamily: 'Outfit-Regular' },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm },
  smBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  modalCard: { width: '100%', backgroundColor: colors.bg3, borderRadius: layout.radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  planOption: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm },
});

export default AdminSubscriptionsScreen;