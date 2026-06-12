import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import AppButton from '@/components/AppButton';
import BrandLogo from '@/components/BrandLogo';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';

const HERO_IMG = {
  uri: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=900&q=70',
};

const OnboardingScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.root}>
      <ImageBackground source={HERO_IMG} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={['rgba(7,7,14,0.1)', 'rgba(7,7,14,0.65)', 'rgba(7,7,14,0.97)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.logoTop}><BrandLogo size="sm" variant="small" /></View>
          <View style={{ flex: 1 }} />
          <View style={styles.bottom}>
            <AppText variant="h2" bold center style={{ lineHeight: 34 }}>Start streaming now with</AppText>
            <GradientText variant="h2" center style={styles.title}>WatchPartyLive</GradientText>

            <AppButton title="Sign In" icon="log-in" size="lg" fullWidth
              style={{ marginTop: spacing.lg }} onPress={() => navigation.navigate('Login')} />
            <AppButton title="Sign Up" variant="white" size="lg" fullWidth
              style={{ marginTop: spacing.md }} onPress={() => navigation.navigate('CreateAccount')} />

            <AppText variant="tiny" color={colors.textSecondary} center style={styles.tos}>
              By signing in or registering, you agree with our{' '}
              <AppText variant="tiny" bold>Terms</AppText> and <AppText variant="tiny" bold>Policy</AppText>
            </AppText>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  bg: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing.lg },
  logoTop: { alignItems: 'center', paddingTop: spacing.md },
  bottom: { paddingBottom: spacing.lg },
  title: { lineHeight: 44, paddingBottom: 4, marginTop: 2 },
  tos: { marginTop: spacing.lg, lineHeight: 18 },
});

export default OnboardingScreen;