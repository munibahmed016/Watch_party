// src/screens/ProfilePictureAddedScreen.tsx
// Confirmation screen after avatar upload. Shows the uploaded photo,
// "Done" continues to contact permission, "Change Photo" re-opens picker.

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import GradientButton from '@/components/GradientButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { useAuth } from '@/contexts/AuthContext';

const ProfilePictureAddedScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  return (
    <ScreenContainer>
      <AppHeader />
      <View style={styles.body}>
        <AppText variant="h1" bold center>Profile picture added</AppText>
        <AppText variant="small" color={colors.textSecondary} center style={styles.subtitle}>
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
          <GradientButton
            title="Done"
            size="lg"
            onPress={() => navigation.replace('ContactPermission')}
          />
          <View style={{ height: spacing.md }} />
          <View style={styles.changeBtn}>
            <AppText
              bold
              color={colors.primary}
              onPress={() => navigation.goBack()}>
              Change Photo
            </AppText>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  avatarWrap: {
    alignSelf: 'center',
    marginTop: spacing.xxl,
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 3, borderColor: colors.white,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    position: 'absolute', bottom: 32,
    left: spacing.lg, right: spacing.lg,
  },
  changeBtn: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: 999,
    alignItems: 'center',
  },
});

export default ProfilePictureAddedScreen;
