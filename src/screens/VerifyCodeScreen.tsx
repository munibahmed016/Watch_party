// src/screens/VerifyCodeScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import GradientButton from '@/components/GradientButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import typography from '@/constants/typography';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showApiError } from '@/hooks/useApiErrorAlert';

const CELL_COUNT = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const VerifyCodeScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, setUser } = useAuth();
  const email: string = route.params?.email || user?.email || 'example@gmail.com';

  const [values, setValues] = useState<string[]>(Array(CELL_COUNT).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const refs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleChange = (text: string, idx: number) => {
    const ch = text.replace(/\D/g, '').slice(-1);
    const next = [...values];
    next[idx] = ch;
    setValues(next);
    if (ch && idx < CELL_COUNT - 1) refs.current[idx + 1]?.focus();
    if (ch && idx === CELL_COUNT - 1 && next.every((v) => v.length === 1)) {
      void doVerify(next.join(''));
    }
  };

  const handleKey = (e: { nativeEvent: { key: string } }, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !values[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const doVerify = async (codeOverride?: string) => {
    const code = codeOverride ?? values.join('');
    if (code.length !== CELL_COUNT) return showApiError(new Error('Please enter the 6-digit code.'));
    setLoading(true);
    try {
      const { user: verifiedUser } = await authApi.verifyCode(email, code);
      await setUser(verifiedUser);
      navigation.reset({ index: 0, routes: [{ name: 'AddProfilePicture' }] });
    } catch (err) {
      showApiError(err, 'Invalid or expired code.');
      setValues(Array(CELL_COUNT).fill(''));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const doResend = async () => {
    if (resendIn > 0) return;
    try {
      await authApi.resendCode(email, 'EMAIL_VERIFICATION');
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      showApiError(err, 'Could not resend code.');
    }
  };

  return (
    <ScreenContainer>
      <AppHeader />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <AppText variant="h1" bold center style={{ marginBottom: spacing.sm }}>Verify Code</AppText>
          <AppText variant="small" color={colors.textSecondary} center>
            Please enter the code we just sent to email{'\n'}
            <AppText variant="small" bold color={colors.textPrimary} style={{ textDecorationLine: 'underline' }}>
              {email}
            </AppText>
          </AppText>

          <View style={styles.row}>
            {values.map((v, i) => (
              <TextInput key={i}
                ref={(r) => { refs.current[i] = r; }}
                value={v}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKey(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                style={[styles.cell, v && styles.cellFilled]}
                selectionColor={colors.primary}
                editable={!loading} />
            ))}
          </View>

          <TouchableOpacity style={{ alignSelf: 'center', marginBottom: spacing.xl }}
            onPress={doResend} disabled={resendIn > 0}>
            <AppText variant="small" color={colors.textSecondary}>
              Don't receive OTP?{' '}
              <AppText variant="small" bold
                color={resendIn > 0 ? colors.textMuted : colors.textPrimary}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </AppText>
            </AppText>
          </TouchableOpacity>

          <GradientButton title={loading ? 'Verifying...' : 'Verify'} size="lg"
            onPress={() => doVerify()} disabled={loading} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.xl },
  cell: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.inputBackground, color: colors.white,
    textAlign: 'center', fontSize: typography.h3, fontFamily: typography.fontFamilyBody,
  },
  cellFilled: { backgroundColor: colors.surfaceElevated },
});

export default VerifyCodeScreen;
