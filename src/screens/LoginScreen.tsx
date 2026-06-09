import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import spacing from '@/constants/spacing';
import colors from '@/constants/colors';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showApiError } from '@/hooks/useApiErrorAlert';

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      showApiError(new Error('Please enter your email and password.'));
      return;
    }
    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await authApi.login(
        email.trim().toLowerCase(), password
      );
      await setSession(user, accessToken, refreshToken);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err) {
      showApiError(err, 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Signing in"
        infoIntro="Welcome back to WatchPartyLive. Sign in to rejoin your rooms and friends."
        infoPoints={[
          { icon: 'shield-checkmark', title: 'Secure login', text: 'Protected by Google reCAPTCHA to keep bots out and your account safe.' },
          { icon: 'key', title: 'Forgot password?', text: 'Tap "Forgot Password" to get a reset code sent to your email.' },
          { icon: 'person-add', title: 'New here?', text: 'Tap "Sign Up" to create an account in under a minute.' },
        ]}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.titleWrap}>
            <GradientText variant="h2" style={styles.title}>Welcome back</GradientText>
            <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 4, justifyContent: 'center', textAlign: 'center' }}>
              Sign in to jump back into the party.
            </AppText>
          </View>

          <AppInput
            placeholder="Email or phone number"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={{ marginBottom: spacing.md }}
          />
          <AppInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            isPassword
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <AppButton
            title={loading ? 'Signing in…' : 'Sign In'}
            size="lg"
            fullWidth
            onPress={handleSignIn}
            disabled={loading}
          />

          <TouchableOpacity
            style={{ marginTop: spacing.lg, alignSelf: 'center' }}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}>
            <AppText bold style={{ textDecorationLine: 'underline' }}>Forgot Password</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: spacing.xl, alignSelf: 'center' }}
            onPress={() => navigation.navigate('CreateAccount')}
            disabled={loading}>
            <AppText variant="small" color={colors.textSecondary}>
              Don't have an account?{' '}
              <AppText variant="small" bold color={colors.textPrimary}>Sign Up</AppText>
            </AppText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <AppText variant="tiny" color={colors.textMuted} center>
              Sign in is protected by Google reCAPTCHA to ensure you're not a bot.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  titleWrap: { marginBottom: spacing.xl, justifyContent: 'center', textAlign: 'center'  },
  title: { lineHeight: 40, paddingBottom: 4, justifyContent: 'center', textAlign: 'center' },
  footer: { marginTop: 'auto', paddingTop: spacing.xl },
});

export default LoginScreen;