import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
import { creatorsApi, subscriptionsApi, CreatorCategory } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const CATEGORIES: CreatorCategory[] = ['PODCASTER', 'FILMMAKER', 'MUSICIAN', 'GAMER', 'EDUCATOR', 'OTHER'];

const BecomeCreatorScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState<CreatorCategory>('PODCASTER');

  // is the user already a creator?
  const mineQuery = useQuery({ queryKey: ['creator', 'me'], queryFn: () => creatorsApi.getMine() });
  const subQuery = useQuery({ queryKey: ['subscription', 'me'], queryFn: () => subscriptionsApi.me() });

  const applyMutation = useMutation({
    mutationFn: () => creatorsApi.apply({ displayName: displayName.trim(), tagline: tagline.trim() || undefined, bio: bio.trim() || undefined, category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creator', 'me'] });
      Alert.alert('Submitted!', 'Your creator profile is ready. You can now set up your channel.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err) => showApiError(err, 'Could not submit application.'),
  });

  const existing = mineQuery.data?.creator;
  const canCreate = subQuery.data?.canCreate;

  const onSubmit = () => {
    if (displayName.trim().length < 2) return Alert.alert('Name required', 'Please enter a display name.');
    applyMutation.mutate();
  };

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Become a Creator"
        infoIntro="Set up your creator channel to upload content and grow an audience."
        infoPoints={[
          { icon: 'cloud-upload', title: 'Upload', text: 'Share movies, podcasts, clips and reels.' },
          { icon: 'people', title: 'Audience', text: 'Gain followers and subscribers.' },
          { icon: 'stats-chart', title: 'Analytics', text: 'Track your views and engagement.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <GradientText variant="h2" style={{ lineHeight: 32, paddingBottom: 2 }}>Create your channel</GradientText>

        {existing ? (
          <View style={styles.statusCard}>
            <Icon name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: 8 }} />
            <AppText variant="small" style={{ flex: 1 }}>
              You already have a creator profile (@{existing.username}). Status: {existing.status}.
            </AppText>
          </View>
        ) : null}

        {!canCreate && (
          <TouchableOpacity onPress={() => navigation.navigate('Plans')} style={styles.upsell} activeOpacity={0.85}>
            <Icon name="lock-closed" size={16} color={colors.warning} style={{ marginRight: 8 }} />
            <AppText variant="small" style={{ flex: 1 }} color={colors.textSecondary}>
              Becoming a creator needs a Pro plan. Tap to view plans.
            </AppText>
            <Icon name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="e.g. Jack_1555" />
        <Field label="Tagline" value={tagline} onChange={setTagline} placeholder="One line about your channel" />
        <Field label="Bio" value={bio} onChange={setBio} placeholder="Tell viewers about yourself" multiline />

        <AppText variant="small" color={colors.textSecondary} style={{ marginTop: spacing.md, marginBottom: 8 }}>Category</AppText>
        <View style={styles.catWrap}>
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <TouchableOpacity key={c} onPress={() => setCategory(c)} activeOpacity={0.85}
                style={[styles.catChip, active && { borderColor: colors.primary, backgroundColor: 'rgba(238,48,99,0.15)' }]}>
                <AppText variant="tiny" bold color={active ? colors.primary : colors.textSecondary}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={onSubmit} disabled={applyMutation.isPending} style={styles.submitBtn}>
          <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          {applyMutation.isPending
            ? <ActivityIndicator color={colors.white} />
            : <AppText bold color={colors.white}>{existing ? 'Update Channel' : 'Create Channel'}</AppText>}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (s: string) => void; placeholder: string; multiline?: boolean }> =
  ({ label, value, onChange, placeholder, multiline }) => (
  <View style={{ marginTop: spacing.md }}>
    <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: 6 }}>{label}</AppText>
    <TextInput
      value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted}
      multiline={multiline} style={[styles.input, multiline && { height: 90, textAlignVertical: 'top' }]}
    />
  </View>
);

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.md, paddingHorizontal: 14, height: 48, color: colors.white,
    fontFamily: 'Outfit-Regular', fontSize: 14,
  },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  submitBtn: { height: 50, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(61,214,140,0.1)', borderRadius: layout.radius.md, padding: spacing.md, marginTop: spacing.md },
  upsell: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,176,32,0.1)', borderRadius: layout.radius.md, padding: spacing.md, marginTop: spacing.md },
});

export default BecomeCreatorScreen;