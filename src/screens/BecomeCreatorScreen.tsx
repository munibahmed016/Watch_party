import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import ConfirmModal from '@/components/ConfirmModal';
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
  const [popup, setPopup] = useState<null | { title: string; message: string; goProfile?: boolean }>(null);

  // is the user already a creator?
  const mineQuery = useQuery({ queryKey: ['creator', 'me'], queryFn: () => creatorsApi.getMine() });
  const subQuery = useQuery({ queryKey: ['subscription', 'me'], queryFn: () => subscriptionsApi.me() });

  const existing = mineQuery.data?.creator;
  const canCreate = subQuery.data?.canCreate;

  // If already applied, show a status popup as soon as we know the status.
  useEffect(() => {
    if (!existing) return;
    if (existing.status === 'PENDING') {
      setPopup({
        title: 'Profile under review',
        message: 'Your creator application has been submitted and is waiting for admin approval. We\'ll notify you once it\'s reviewed.',
      });
    } else if (existing.status === 'APPROVED') {
      setPopup({
        title: 'You\'re already a creator! 🎉',
        message: 'Your channel is approved. Head to your profile to manage it.',
        goProfile: true,
      });
    }
    // REJECTED -> let them re-apply (no popup, show the form)
  }, [existing?.status]);

  const applyMutation = useMutation({
    mutationFn: () => creatorsApi.apply({ displayName: displayName.trim(), tagline: tagline.trim() || undefined, bio: bio.trim() || undefined, category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creator', 'me'] });
      setPopup({
        title: 'Application submitted! 🎉',
        message: 'Your creator profile has been sent for admin approval. You\'ll be notified once it\'s reviewed.',
      });
    },
    onError: (err) => showApiError(err, 'Could not submit application.'),
  });

  const onSubmit = () => {
    if (displayName.trim().length < 2) return Alert.alert('Name required', 'Please enter a display name.');
    applyMutation.mutate();
  };

  const isPendingOrApproved = existing?.status === 'PENDING' || existing?.status === 'APPROVED';

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
          <View style={[
            styles.statusCard,
            existing.status === 'PENDING' && { backgroundColor: 'rgba(255,176,32,0.12)' },
            existing.status === 'REJECTED' && { backgroundColor: 'rgba(255,90,90,0.12)' },
          ]}>
            <Icon
              name={existing.status === 'APPROVED' ? 'checkmark-circle' : existing.status === 'PENDING' ? 'hourglass-outline' : existing.status === 'REJECTED' ? 'close-circle' : 'information-circle'}
              size={20}
              color={existing.status === 'APPROVED' ? colors.success : existing.status === 'PENDING' ? colors.warning : existing.status === 'REJECTED' ? '#FF5A5A' : colors.primary}
              style={{ marginRight: 8 }}
            />
            <AppText variant="small" style={{ flex: 1 }}>
              {existing.status === 'PENDING'
                ? 'Your application is under review by our team.'
                : existing.status === 'APPROVED'
                ? `You're an approved creator (@${existing.username}).`
                : existing.status === 'REJECTED'
                ? 'Your previous application was not approved. You can update your details and re-apply below.'
                : `Status: ${existing.status}.`}
            </AppText>
          </View>
        ) : null}

        {!canCreate && !isPendingOrApproved && (
          <TouchableOpacity onPress={() => navigation.navigate('Plans')} style={styles.upsell} activeOpacity={0.85}>
            <Icon name="lock-closed" size={16} color={colors.warning} style={{ marginRight: 8 }} />
            <AppText variant="small" style={{ flex: 1 }} color={colors.textSecondary}>
              Becoming a creator needs a Pro plan. Tap to view plans.
            </AppText>
            <Icon name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Hide the form when pending/approved — only show for new or rejected users */}
        {!isPendingOrApproved && (
          <>
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
                : <AppText bold color={colors.white}>{existing?.status === 'REJECTED' ? 'Re-apply' : 'Create Channel'}</AppText>}
            </TouchableOpacity>
          </>
        )}

        {/* When pending/approved, show a button to leave */}
        {isPendingOrApproved && (
          <TouchableOpacity activeOpacity={0.85}
            onPress={() => existing?.status === 'APPROVED' ? navigation.navigate('MyProfile') : navigation.goBack()}
            style={styles.submitBtn}>
            <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            <AppText bold color={colors.white}>{existing?.status === 'APPROVED' ? 'Go to My Profile' : 'Got it'}</AppText>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!popup}
        title={popup?.title || ''}
        message={popup?.message}
        confirmLabel={popup?.goProfile ? 'Go to Profile' : 'Got it'}
        cancelLabel="Close"
        icon={popup?.goProfile ? 'checkmark-circle' : 'hourglass-outline'}
        onConfirm={() => {
          const go = popup?.goProfile;
          setPopup(null);
          if (go) navigation.navigate('MyProfile');
        }}
        onCancel={() => setPopup(null)}
      />
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