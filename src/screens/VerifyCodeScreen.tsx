import React, { useRef, useState } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { authApi } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';
import { useAuth } from '@/contexts/AuthContext';

const VerifyCodeScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { refresh } = useAuth() as any;
  const email: string = route.params?.email || '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  const code = digits.join('');

  const onChange = (text: string, idx: number) => {
    const val = text.replace(/\D/g, '');
    if (val.length > 1) {
      // paste full code
      const arr = val.slice(0, 6).split('');
      const next = [...digits];
      arr.forEach((d, i) => { if (i < 6) next[i] = d; });
      setDigits(next);
      inputs.current[Math.min(arr.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const onKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const verify = async () => {
    if (code.length !== 6) return showApiError(new Error('Please enter the 6-digit code.'));
    setLoading(true);
    try {
      await authApi.verifyCode(email, code);
      if (refresh) await refresh();
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err) {
      showApiError(err, 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) return showApiError(new Error('Email missing.'));
    setResending(true);
    try {
      await authApi.resendCode(email, 'EMAIL_VERIFICATION');
      Alert.alert('Sent', 'A new code has been emailed to you.');
    } catch (err) {
      showApiError(err, 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Verify your email"
        infoIntro="We sent a 6-digit code to confirm it's really you."
        infoPoints={[
          { icon: 'mail', title: 'Check inbox', text: `Enter the code we sent to ${email || 'your email'}.` },
          { icon: 'refresh', title: 'Didn\'t get it?', text: 'Tap Resend to get a fresh code in seconds.' },
          { icon: 'shield-checkmark', title: 'Stay secure', text: 'Verifying helps keep your account and friends safe.' },
        ]}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <GradientText variant="h1" center style={styles.title}>Verify Code</GradientText>
          <AppText variant="small" color={colors.textSecondary} center style={{ marginBottom: spacing.xl }}>
            Enter the 6-digit code sent to{'\n'}{email || 'your email'}
          </AppText>

          <View style={styles.codeRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                value={d}
                onChangeText={(t) => onChange(t, i)}
                onKeyPress={(e) => onKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.codeBox, d && styles.codeBoxFilled]}
                selectTextOnFocus
                returnKeyType="done"
              />
            ))}
          </View>

          <AppButton title={loading ? 'Verifying…' : 'Verify'} size="lg" fullWidth
            onPress={verify} disabled={loading || code.length !== 6} style={{ marginTop: spacing.xl }} />

          <TouchableOpacity onPress={resend} disabled={resending} style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <AppText variant="small" color={colors.textSecondary}>
              Didn't receive it?{' '}
              <AppText variant="small" bold color={colors.primary}>{resending ? 'Sending…' : 'Resend'}</AppText>
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.sm },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  codeBox: {
    width: 48, height: 56, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: colors.border,
    color: colors.white, fontFamily: 'Syne-ExtraBold', fontSize: 24,
    textAlign: 'center',
  },
  codeBoxFilled: { borderColor: colors.primary },
});

export default VerifyCodeScreen;