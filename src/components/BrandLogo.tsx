import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Image } from 'react-native';
import AppText from './AppText';
import colors from '@/constants/colors';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: StyleProp<ViewStyle>;
  showText?: boolean;
  /**
   * variant:
   *   'small' → uses wp-small.png  (in-app header logo, all screens)
   *   'full'  → uses logo.png      (splash / onboarding)
   */
  variant?: 'small' | 'full';
};

const sizeMap = {
  sm: { mark: 120, h: 34 },
  md: { mark: 150, h: 42 },
  lg: { mark: 200, h: 56 },
  xl: { mark: 280, h: 80 },
};

const BrandLogo: React.FC<Props> = ({ size = 'lg', style, variant = 'small' }) => {
  const m = sizeMap[size];
  const source =
    variant === 'full'
      ? require('@/assets/images/logo.png')
      : require('@/assets/images/wp-small.png');

  return (
    <View style={[styles.row, style]}>
      <Image
        source={source}
        style={{ width: m.mark, height: m.h }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default BrandLogo;