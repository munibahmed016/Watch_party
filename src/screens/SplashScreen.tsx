// src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';

const MIN_SPLASH_MS = 1000;

const SplashScreen = () => {
  const navigation = useNavigation<any>();
  const { ready, user } = useAuth();

  useEffect(() => {
    if (!ready) return;
    const start = Date.now();
    const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - start));
    const t = setTimeout(() => {
      if (user) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      }
    }, wait);
    return () => clearTimeout(t);
  }, [ready, user, navigation]);

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <BrandLogo size="xl" />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default SplashScreen;
