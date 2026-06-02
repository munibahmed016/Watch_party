// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import GradientButton from '@/components/GradientButton';
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
      <AppHeader />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <AppText variant="h1" bold center style={{ marginBottom: spacing.sm }}>Forgot Password</AppText>
          <AppText variant="small" color={colors.textSecondary} center style={{ marginBottom: spacing.xl }}>
            Enter your email so we can send you a code{'\n'}to reset your password.
          </AppText>
          <AppInput placeholder="Your Email" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            containerStyle={{ marginBottom: spacing.xl }} />
          <GradientButton title={loading ? 'Sending...' : 'Send Reset Code'} size="lg"
            onPress={handleSubmit} disabled={loading} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
});

export default ForgotPasswordScreen;
