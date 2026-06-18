import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
import { subscriptionsApi, Plan, SubscriptionTier } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const PlansScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();

  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: () => subscriptionsApi.plans() });
  const meQuery = useQuery({ queryKey: ['subscription', 'me'], queryFn: () => subscriptionsApi.me() });

  const upgradeMutation = useMutation({
    mutationFn: (tier: SubscriptionTier) => subscriptionsApi.upgrade(tier),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['subscription', 'me'] });
      Alert.alert('Success', `You are now on the ${data.planName} plan.`);
    },
    onError: (err) => showApiError(err, 'Could not upgrade.'),
  });

  const plans: Plan[] = plansQuery.data?.plans || [];
  const currentTier = meQuery.data?.tier;

  const onChoose = (p: Plan) => {
    if (p.tier === currentTier) return;
    if (p.tier === 'BASIC') { upgradeMutation.mutate('BASIC'); return; }
    Alert.alert(
      `Upgrade to ${p.name}`,
      `Get ${p.name} for $${p.price}/mo?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => upgradeMutation.mutate(p.tier) }]
    );
  };

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Plans"
        infoIntro="Choose a plan that fits you. Upgrade any time."
        infoPoints={[
          { icon: 'play-circle', title: 'Basic', text: 'Watch, join parties, comment and share.' },
          { icon: 'cloud-upload', title: 'Pro', text: 'Become a creator and upload your content.' },
          { icon: 'radio', title: 'Advance', text: 'Go live and host podcasts.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <GradientText variant="h2" center style={{ lineHeight: 32, paddingBottom: 2 }}>Choose Your Plan</GradientText>
        <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 4, marginBottom: spacing.lg }}>
          Unlock creator tools and go live
        </AppText>

        {plansQuery.isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />}

        {plans.map((p) => {
          const isCurrent = p.tier === currentTier;
          return (
            <View key={p.tier} style={[styles.card, { borderColor: p.color }]}>
              {/* tier ring + name */}
              <View style={styles.cardHead}>
                <View style={[styles.tierRing, { borderColor: p.color }]}>
                  <LinearGradient colors={p.gradient as unknown as string[]} style={styles.tierInner} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="h3" bold style={{ color: p.color }}>{p.name}</AppText>
                  <AppText variant="tiny" color={colors.textSecondary}>
                    {p.price === 0 ? 'Free forever' : `$${p.price} / month`}
                  </AppText>
                </View>
                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: p.color }]}>
                    <AppText variant="tiny" bold color="#000">CURRENT</AppText>
                  </View>
                )}
              </View>

              {/* features */}
              <View style={{ marginTop: spacing.md }}>
                {p.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Icon name="checkmark-circle" size={16} color={p.color} style={{ marginRight: 8 }} />
                    <AppText variant="small" color={colors.textSecondary} style={{ flex: 1 }}>{f}</AppText>
                  </View>
                ))}
              </View>

              {/* action */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isCurrent || upgradeMutation.isPending}
                onPress={() => onChoose(p)}
                style={[styles.cardBtn, { backgroundColor: isCurrent ? 'rgba(255,255,255,0.08)' : 'transparent', overflow: 'hidden' }]}>
                {!isCurrent && (
                  <LinearGradient colors={p.gradient as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
                )}
                {upgradeMutation.isPending && upgradeMutation.variables === p.tier
                  ? <ActivityIndicator color="#000" size="small" />
                  : <AppText bold color={isCurrent ? colors.textSecondary : '#000'}>
                      {isCurrent ? 'Active' : p.tier === 'BASIC' ? 'Switch to Basic' : `Get ${p.name}`}
                    </AppText>}
              </TouchableOpacity>
            </View>
          );
        })}

        <AppText variant="tiny" color={colors.textMuted} center style={{ marginTop: spacing.md }}>
          Payments are processed securely. You can change your plan any time.
        </AppText>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderRadius: layout.radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  tierRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  tierInner: { width: 34, height: 34, borderRadius: 17 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardBtn: { height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
});

export default PlansScreen;