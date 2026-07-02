import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, Modal, Pressable, Switch } from 'react-native';
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
import { adminApi, AdminPlanTier } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

// This screen manages the REAL subscription tiers (BASIC/PRO/ADVANCE) — the
// system actually used app-wide for entitlements (creator access, live
// streaming, etc). There used to be a separate "create custom plan" form
// here that wrote to an unrelated, unused database table — that's why plans
// never appeared even after being "created". It's been replaced with editing
// the 3 real tiers directly.

const AdminSubscriptionsScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [editingTier, setEditingTier] = useState<AdminPlanTier | null>(null);
  const [assignFor, setAssignFor] = useState<any | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const tiersQ = useQuery({ queryKey: ['admin', 'subscription-tiers'], queryFn: () => adminApi.listSubscriptionTiers() });
  const usersQ = useQuery({ queryKey: ['admin', 'subusers', userSearch], queryFn: () => adminApi.listUsers(userSearch) });

  const updateTier = useMutation({
    mutationFn: (vars: { tier: string; price: number; durationDays: number; features: string[]; isActive: boolean }) =>
      adminApi.updateSubscriptionTier(vars.tier, { price: vars.price, durationDays: vars.durationDays, features: vars.features, isActive: vars.isActive }),
    onSuccess: () => { setEditingTier(null); qc.invalidateQueries({ queryKey: ['admin', 'subscription-tiers'] }); Alert.alert('Saved', 'Plan updated.'); },
    onError: (e) => showApiError(e, 'Could not update plan.'),
  });

  const assignTier = useMutation({
    mutationFn: ({ userId, tier }: { userId: string; tier: string }) => adminApi.assignUserTier(userId, tier),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'subusers'] }); qc.invalidateQueries({ queryKey: ['admin', 'subscription-tiers'] }); Alert.alert('Done', 'Subscription assigned.'); },
    onError: (e) => showApiError(e, 'Could not assign.'),
  });
  const removeTier = useMutation({
    mutationFn: (userId: string) => adminApi.assignUserTier(userId, 'BASIC'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'subusers'] }); },
    onError: (e) => showApiError(e, 'Could not remove.'),
  });

  const tiers = tiersQ.data?.plans || [];
  const users = usersQ.data?.users || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Subscriptions"
        infoIntro="Edit the real Basic / Pro / Advance plans and assign them to users."
        infoPoints={[
          { icon: 'pricetags', title: 'Edit plans', text: 'Tap a plan to change its price, duration or features.' },
          { icon: 'person-add', title: 'Assign', text: 'Give any user a plan; expiry is auto-set.' },
          { icon: 'close-circle', title: 'Remove', text: 'Drop a user back to Basic anytime.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={tiersQ.isFetching} onRefresh={() => tiersQ.refetch()} tintColor={colors.primary} />}>
        <GradientText variant="h1" style={styles.title}>Subscriptions</GradientText>

        {/* The 3 real plans */}
        <AppText variant="h3" bold style={{ marginBottom: spacing.sm }}>Plans</AppText>
        {tiersQ.isLoading ? <ActivityIndicator color={colors.primary} /> : tiers.map((p) => (
          <TouchableOpacity key={p.tier} onPress={() => setEditingTier(p)} activeOpacity={0.85} style={styles.planCard}>
            <LinearGradient colors={p.gradient as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <View style={styles.planCardOverlay} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText bold style={{ fontSize: 18 }}>{p.name}</AppText>
                <AppText variant="small" bold style={{ marginLeft: 8 }}>${p.price}/{p.durationDays}d</AppText>
                {!p.isActive && (
                  <View style={styles.inactivePill}><AppText variant="tiny" bold color="#fff">HIDDEN</AppText></View>
                )}
              </View>
              <AppText variant="tiny" color="rgba(0,0,0,0.6)" numberOfLines={2} style={{ marginTop: 2 }}>
                {p.features?.join(' · ') || 'No features listed'}
              </AppText>
            </View>
            <Icon name="create-outline" size={20} color="rgba(0,0,0,0.6)" />
          </TouchableOpacity>
        ))}

        {/* Assign to users */}
        <AppText variant="h3" bold style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>Manage User Subscriptions</AppText>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={colors.textSecondary} />
          <TextInput value={userSearch} onChangeText={setUserSearch} placeholder="Search users" placeholderTextColor={colors.textMuted} style={styles.searchInput} autoCapitalize="none" />
        </View>
        {users.slice(0, 20).map((u) => {
          const tierInfo = tiers.find((t) => t.tier === u.planTier);
          const isPaid = u.planTier && u.planTier !== 'BASIC';
          return (
            <View key={u.id} style={styles.userRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="small" bold numberOfLines={1}>{u.fullName || u.username}</AppText>
                <AppText variant="tiny" color={isPaid ? '#7B61FF' : colors.textSecondary}>
                  {tierInfo?.name || 'Basic'}{isPaid && u.subscriptionExpiresAt ? ` · until ${new Date(u.subscriptionExpiresAt).toLocaleDateString()}` : ''}
                </AppText>
              </View>
              {isPaid ? (
                <TouchableOpacity onPress={() => removeTier.mutate(u.id)} style={styles.smBtn}>
                  <AppText variant="tiny" bold color="#E5484D">Remove</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setAssignFor(u)} style={styles.smBtn}>
                  <AppText variant="tiny" bold color={colors.primary}>Assign</AppText>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Edit plan modal */}
      <Modal visible={!!editingTier} transparent animationType="fade" onRequestClose={() => setEditingTier(null)}>
        <Pressable style={styles.modalBg} onPress={() => setEditingTier(null)}>
          <Pressable style={styles.modalCard}>
            {editingTier && (
              <EditTierForm
                tier={editingTier}
                saving={updateTier.isPending}
                onCancel={() => setEditingTier(null)}
                onSave={(vals) => updateTier.mutate({ tier: editingTier.tier, ...vals })}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Assign modal */}
      <Modal visible={!!assignFor} transparent animationType="fade" onRequestClose={() => setAssignFor(null)}>
        <Pressable style={styles.modalBg} onPress={() => setAssignFor(null)}>
          <Pressable style={styles.modalCard}>
            <AppText variant="h3" bold center style={{ marginBottom: spacing.md }}>Assign plan to {assignFor?.username}</AppText>
            {tiers.filter((p) => p.tier !== 'BASIC').map((p) => (
              <TouchableOpacity key={p.tier} onPress={() => { assignTier.mutate({ userId: assignFor.id, tier: p.tier }); setAssignFor(null); }} style={styles.planOption}>
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

// Small inline form used inside the edit-plan modal.
const EditTierForm: React.FC<{
  tier: AdminPlanTier;
  saving: boolean;
  onCancel: () => void;
  onSave: (vals: { price: number; durationDays: number; features: string[]; isActive: boolean }) => void;
}> = ({ tier, saving, onCancel, onSave }) => {
  const [price, setPrice] = useState(String(tier.price));
  const [days, setDays] = useState(String(tier.durationDays));
  const [features, setFeatures] = useState(tier.features.join('\n'));
  const [isActive, setIsActive] = useState(tier.isActive);

  return (
    <View>
      <AppText variant="h3" bold center style={{ marginBottom: spacing.md }}>Edit {tier.name}</AppText>

      <AppText variant="tiny" color={colors.textSecondary} style={{ marginBottom: 4 }}>Price (USD)</AppText>
      <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} />

      <AppText variant="tiny" color={colors.textSecondary} style={{ marginBottom: 4 }}>Duration (days)</AppText>
      <TextInput value={days} onChangeText={setDays} keyboardType="number-pad" style={styles.input} />

      <AppText variant="tiny" color={colors.textSecondary} style={{ marginBottom: 4 }}>Features (one per line)</AppText>
      <TextInput
        value={features} onChangeText={setFeatures} multiline
        style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
      />

      <View style={styles.toggleRow}>
        <AppText variant="small" bold>Visible to users</AppText>
        <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.primary }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <AppText bold color={colors.textSecondary}>Cancel</AppText>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppButton
            title={saving ? 'Saving…' : 'Save'}
            size="md" fullWidth disabled={saving}
            onPress={() => onSave({
              price: parseFloat(price) || 0,
              durationDays: parseInt(days, 10) || tier.durationDays,
              features: features.split('\n').map((f) => f.trim()).filter(Boolean),
              isActive,
            })}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  planCard: { flexDirection: 'row', alignItems: 'center', borderRadius: layout.radius.lg, padding: spacing.md, marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  planCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.15)' },
  inactivePill: { marginLeft: 8, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, height: 44, marginBottom: spacing.md },
  searchInput: { flex: 1, color: colors.white, marginLeft: 8, fontFamily: 'Outfit-Regular' },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm },
  smBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  modalCard: { width: '100%', backgroundColor: colors.bg3, borderRadius: layout.radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  planOption: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.white, fontFamily: 'Outfit-Regular', fontSize: 14, marginBottom: spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 },
  cancelBtn: { paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});

export default AdminSubscriptionsScreen;