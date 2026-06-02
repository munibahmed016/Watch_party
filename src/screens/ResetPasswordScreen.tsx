// src/screens/ResetPasswordScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import GradientButton from '@/components/GradientButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { authApi } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const ResetPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email: string = route.params?.email || '';

  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) return showApiError(new Error('Email is missing. Please request a reset code again.'));
    if (code.length !== 6) return showApiError(new Error('Please enter the 6-digit code.'));
    if (pwd.length < 8) return showApiError(new Error('Password must be at least 8 characters.'));
    if (pwd !== confirm) return showApiError(new Error('Passwords do not match.'));

    setLoading(true);
    try {
      await authApi.resetPassword(email, code, pwd);
      Alert.alert('Password reset', 'Your password has been reset. Please sign in.', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) },
      ]);
    } catch (err) {
      showApiError(err, 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <AppText variant="h1" bold center style={{ marginBottom: spacing.sm }}>Reset Password</AppText>
          <AppText variant="small" color={colors.textSecondary} center style={{ marginBottom: spacing.xl }}>
            Enter the code we sent to {email || 'your email'} and{'\n'}create a new password.
          </AppText>
          <AppInput placeholder="6-digit code" value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad" maxLength={6}
            containerStyle={{ marginBottom: spacing.md }} />
          <AppInput placeholder="New Password" value={pwd} onChangeText={setPwd} isPassword
            containerStyle={{ marginBottom: spacing.md }} />
          <AppInput placeholder="Confirm Password" value={confirm} onChangeText={setConfirm} isPassword
            containerStyle={{ marginBottom: spacing.xl }} />
          <GradientButton title={loading ? 'Resetting...' : 'Reset Password'} size="lg"
            onPress={handleSubmit} disabled={loading} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
});

export default ResetPasswordScreen;
