import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import AppButton from '@/components/AppButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { useAuth } from '@/contexts/AuthContext';

const ProfilePictureAddedScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  return (
    <ScreenContainer>
      <BrandHeader
        showBack={false}
        infoTitle="You're all set"
        infoIntro="Your profile picture is saved. Next, connect with friends to start watching together."
        infoPoints={[
          { icon: 'checkmark-circle', title: 'Saved securely', text: 'Your photo is now part of your profile and visible to friends.' },
          { icon: 'create', title: 'Edit anytime', text: 'Change your picture later from Settings → Edit Profile.' },
        ]}
      />

      <View style={styles.body}>
        <View style={styles.checkWrap}>
          <LinearGradient
            colors={colors.buttonGradient as unknown as string[]}
            start={colors.gradientStartPoint}
            end={colors.gradientEndPoint}
            style={StyleSheet.absoluteFillObject}
          />
          <Icon name="checkmark" size={34} color={colors.white} />
        </View>

        <GradientText variant="h2" center style={styles.title}>
          Profile picture added
        </GradientText>
        <AppText variant="small" color={colors.textSecondary} center style={styles.sub}>
          Looking good! You can change this anytime from your profile settings.
        </AppText>

        <View style={styles.avatarWrap}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <AppText variant="h1" bold>
                {(user?.fullName || user?.username || '?').slice(0, 1).toUpperCase()}
              </AppText>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <AppButton title="Continue" size="lg" fullWidth onPress={() => navigation.replace('ContactPermission')} />
          <TouchableOpacity style={styles.changeBtn} onPress={() => navigation.goBack()}>
            <AppText bold color={colors.textSecondary}>Change Photo</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, alignItems: 'center' },
  checkWrap: {
    width: 64, height: 64, borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
  },
  title: { lineHeight: 40, paddingBottom: 4 },
  sub: { marginTop: spacing.xs, marginBottom: spacing.xl, paddingHorizontal: spacing.md },
  avatarWrap: {
    width: 170, height: 170, borderRadius: 85,
    borderWidth: 3, borderColor: colors.primary,
    overflow: 'hidden', marginTop: spacing.md,
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', bottom: 32, left: spacing.lg, right: spacing.lg },
  changeBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
});

export default ProfilePictureAddedScreen;