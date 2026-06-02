import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from './AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

type Props = {
  title: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'gradient' | 'outline' | 'white' | 'glass';
  size?: 'sm' | 'md' | 'lg';
};

const GradientButton: React.FC<Props> = ({
  title,
  onPress,
  style,
  disabled,
  loading,
  variant = 'gradient',
  size = 'md',
}) => {
  const heightMap = { sm: 40, md: 48, lg: 54 };
  const paddingMap = { sm: spacing.md, md: spacing.lg, lg: spacing.xl };
  const containerStyle: ViewStyle = {
    height: heightMap[size],
    paddingHorizontal: paddingMap[size],
    opacity: disabled ? 0.5 : 1,
  };

  // White pill (web .btn — used for "Add Friend" etc.)
  if (variant === 'white') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.flatBtn, containerStyle, styles.whiteBtn, style]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <AppText variant="body" bold color={colors.primary}>{title}</AppText>
        )}
      </TouchableOpacity>
    );
  }

  // Outline (web .btn-o — transparent + hairline border)
  if (variant === 'outline') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.flatBtn, containerStyle, styles.outlineBtn, style]}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <AppText variant="body" bold>{title}</AppText>
        )}
      </TouchableOpacity>
    );
  }

  // Glass (web .btn-g — subtle translucent fill)
  if (variant === 'glass') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.flatBtn, containerStyle, styles.glassBtn, style]}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <AppText variant="body" bold>{title}</AppText>
        )}
      </TouchableOpacity>
    );
  }

  // Primary gradient (web .btn-p — 135deg #EE3063 → #4A51A1 + brand shadow)
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.gradientWrap, containerStyle, style]}>
      <LinearGradient
        colors={colors.buttonGradient as unknown as string[]}
        start={colors.gradientStartPoint}
        end={colors.gradientEndPoint}
        style={styles.gradientFill}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <AppText variant="body" bold color={colors.white}>{title}</AppText>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gradientWrap: {
    borderRadius: layout.radius.pill,
    overflow: 'hidden',
    // web .btn-p shadow: 0 4px 15px rgba(238,48,99,.2)
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  gradientFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius.pill,
  },
  flatBtn: {
    borderRadius: layout.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteBtn: {
    backgroundColor: colors.white,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
  },
  glassBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
});

export default GradientButton;