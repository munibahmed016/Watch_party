// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import GradientButton from '@/components/GradientButton';
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
  const [showRecaptchaInfo, setShowRecaptchaInfo] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      showApiError(new Error('Please enter your email and password.'));
      return;
    }
    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await authApi.login(
        email.trim().toLowerCase(),
        password
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
      <AppHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, justifyContent: 'center' }}>
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

            <GradientButton
              title={loading ? 'Signing in...' : 'Sign In'}
              size="lg"
              onPress={handleSignIn}
              disabled={loading}
            />

            <TouchableOpacity
              style={{ marginTop: spacing.lg, alignSelf: 'center' }}
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}>
              <AppText bold style={{ textDecorationLine: 'underline' }}>
                Forgot Password
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: spacing.xl, alignSelf: 'center' }}
              onPress={() => navigation.navigate('CreateAccount')}
              disabled={loading}>
              <AppText variant="small" color={colors.textSecondary}>
                Don't have an account?{' '}
                <AppText variant="small" bold color={colors.textPrimary}>
                  Sign Up
                </AppText>
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <AppText variant="tiny" color={colors.textSecondary} center>
              Sign in is protected by Google reCAPTCHA to{'\n'}
              ensure you're not a bot.{' '}
              <AppText
                variant="tiny"
                bold
                color={colors.textPrimary}
                onPress={() => setShowRecaptchaInfo(true)}>
                Learn more.
              </AppText>
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent
        visible={showRecaptchaInfo}
        onRequestClose={() => setShowRecaptchaInfo(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowRecaptchaInfo(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <AppText variant="h3" bold style={styles.modalTitle}>
              About reCAPTCHA
            </AppText>
            <AppText variant="small" style={styles.modalBody}>
              We use Google reCAPTCHA to verify that you're not a bot. This helps
              keep your account and our service secure. By signing in, you agree
              to Google's Terms of Service and Privacy Policy.
            </AppText>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setShowRecaptchaInfo(false)}
              activeOpacity={0.85}>
              <AppText bold style={{ color: colors.white }}>
                Got it
              </AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  footer: { paddingTop: spacing.lg },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#111111',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalBody: {
    color: '#444444',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    minWidth: 140,
    alignItems: 'center',
  },
});

export default LoginScreen;
