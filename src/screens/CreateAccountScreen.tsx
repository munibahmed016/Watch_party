// src/screens/CreateAccountScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import GradientButton from '@/components/GradientButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showApiError } from '@/hooks/useApiErrorAlert';

const SocialBtn: React.FC<{ icon: React.ReactNode; onPress?: () => void }> = ({ icon, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
    <LinearGradient
      colors={colors.buttonGradient as unknown as string[]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.socialBtn}>
      <View style={styles.socialInner}>{icon}</View>
    </LinearGradient>
  </TouchableOpacity>
);

const CreateAccountScreen = () => {
  const navigation = useNavigation<any>();
  const { setSession } = useAuth();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim()) return showApiError(new Error('Please enter your email.'));
    if (password.length < 8) return showApiError(new Error('Password must be at least 8 characters.'));
    if (password !== confirm) return showApiError(new Error('Passwords do not match.'));

    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await authApi.register({
        email: email.trim().toLowerCase(),
        password,
        confirmPassword: confirm,
        phoneNumber: phone.trim() || undefined,
      });
      await setSession(user, accessToken, refreshToken);
      navigation.navigate('AddProfilePicture');
    } catch (err) {
      showApiError(err, 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AppText variant="h1" bold center style={{ marginBottom: spacing.lg }}>
            Create Account
          </AppText>

          <AppInput placeholder="Your Email" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            containerStyle={{ marginBottom: spacing.md }} />
          <AppInput placeholder="Phone Number" value={phone} onChangeText={setPhone}
            keyboardType="phone-pad" containerStyle={{ marginBottom: spacing.md }} />
          <AppInput placeholder="Create Password" value={password} onChangeText={setPassword}
            isPassword containerStyle={{ marginBottom: spacing.md }} />
          <AppInput placeholder="Confirm Password" value={confirm} onChangeText={setConfirm}
            isPassword containerStyle={{ marginBottom: spacing.lg }} />

          <GradientButton title={loading ? 'Creating...' : 'Sign Up'} size="lg"
            onPress={handleSignUp} disabled={loading} />

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <AppText variant="small" color={colors.textSecondary} style={{ marginHorizontal: spacing.sm }}>
              Or sign up with
            </AppText>
            <View style={styles.line} />
          </View>

          <View style={styles.socials}>
            <SocialBtn icon={<FAIcon name="apple" size={22} color={colors.white} />} />
            <SocialBtn icon={<FAIcon name="google" size={20} color={colors.white} />} />
            <SocialBtn icon={<FAIcon name="facebook" size={20} color={colors.white} />} />
          </View>

          <TouchableOpacity style={{ alignSelf: 'center', marginTop: spacing.lg }}
            onPress={() => navigation.navigate('Login')} disabled={loading}>
            <AppText variant="small" color={colors.textSecondary}>
              Already have an account?{' '}
              <AppText variant="small" bold color={colors.textPrimary}>Sign in</AppText>
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
  socials: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  socialBtn: { width: 48, height: 48, borderRadius: 999, padding: 1.5, marginHorizontal: spacing.sm },
  socialInner: { flex: 1, backgroundColor: colors.background, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});

export default CreateAccountScreen;
