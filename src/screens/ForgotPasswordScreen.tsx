import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { authApi } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return showApiError(new Error('Please enter your email.'));
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (err) {
      showApiError(err, 'Unable to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Resetting your password"
        infoIntro="Forgot your password? No problem — we'll email you a code to set a new one."
        infoPoints={[
          { icon: 'mail', title: 'Enter your email', text: 'Use the email linked to your WatchPartyLive account.' },
          { icon: 'shield-checkmark', title: 'Get a secure code', text: 'We send a one-time code. Enter it on the next screen to continue.' },
          { icon: 'lock-open', title: 'Set a new password', text: 'Choose a fresh password and sign straight back in.' },
        ]}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <GradientText variant="h1" center style={styles.title}>Forgot Password</GradientText>
          <AppText variant="small" color={colors.textSecondary} center style={{ marginBottom: spacing.xl }}>
            Enter your email so we can send you a code to reset your password.
          </AppText>
          <AppInput placeholder="Your Email" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            containerStyle={{ marginBottom: spacing.xl }} />
          <AppButton
            title={loading ? 'Sending…' : 'Send Reset Code'}
            size="lg"
            fullWidth
            onPress={handleSubmit}
            disabled={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.sm },
});

export default ForgotPasswordScreen;