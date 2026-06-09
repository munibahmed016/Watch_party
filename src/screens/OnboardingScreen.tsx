import React from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/AppText';
import GradientButton from '@/components/GradientButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';

// Using a remote placeholder, replace with local asset for production
const HERO_IMG = {
  uri: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=900&q=70',
};

const OnboardingScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.root}>
      <ImageBackground source={HERO_IMG} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={['rgba(10,6,18,0.0)', 'rgba(10,6,18,0.6)', 'rgba(10,6,18,0.95)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={{ flex: 1 }} />
          <View style={styles.bottom}>
            <AppText variant="h2" bold center style={styles.title}>
              Start Streaming Now with{'\n'}WatchPartyLive
            </AppText>

            <GradientButton
              title="Sign In"
              size="lg"
              style={{ marginTop: spacing.lg }}
              onPress={() => navigation.navigate('Login')}
            />
            <GradientButton
              title="Sign Up"
              variant="white"
              size="lg"
              style={{ marginTop: spacing.md }}
              onPress={() => navigation.navigate('CreateAccount')}
            />

            <AppText variant="small" color={colors.textSecondary} center style={styles.tos}>
              By login in or registering, you agree{'\n'}with our{' '}
              <AppText variant="small" bold>
                Term
              </AppText>{' '}
              and{' '}
              <AppText variant="small" bold>
                Policy
              </AppText>
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
  bottom: { paddingBottom: spacing.lg },
  title: { marginBottom: spacing.sm },
  tos: { marginTop: spacing.lg },
});

export default OnboardingScreen;
