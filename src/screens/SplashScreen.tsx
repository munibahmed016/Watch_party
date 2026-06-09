// src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
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
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});

export default SplashScreen;