// src/components/AppButton.tsx
//
// UNIVERSAL button for the whole app. Replaces ad-hoc inline buttons.
// Implements the WatchPartyLive gradient SYSTEM (per client feedback):
//
//   Variant      Use case                         Look
//   ─────────    ──────────────────────────────   ────────────────────────────
//   'primary'    main CTA (Watch, Create, Save)    135° pink→indigo gradient + glow
//   'secondary'  secondary action                 glass fill + hairline border
//   'outline'    tertiary / cancel                transparent + white border
//   'white'      on-image / on-gradient action    solid white, pink text
//   'danger'     destructive                      solid red
//
//   Size: sm (40) / md (48) / lg (54)
//
// Text NEVER cuts: content area uses flexShrink + proper padding, single line
// with ellipsis only if truly too long.
//
// Usage:
//   <AppButton title="Watch Together" icon="play" onPress={...} />
//   <AppButton title="Cancel" variant="outline" onPress={...} />
//   <AppButton title="Save" variant="primary" loading={saving} fullWidth />

import React from 'react';
import {
  TouchableOpacity, StyleSheet, ViewStyle, StyleProp, ActivityIndicator, View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AppText from './AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

type Variant = 'primary' | 'secondary' | 'outline' | 'white' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: string;            // Ionicons name, shown left of text
  iconRight?: string;       // Ionicons name, shown right of text
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const HEIGHTS: Record<Size, number> = { sm: 40, md: 48, lg: 54 };
const PADS: Record<Size, number> = { sm: spacing.md, md: spacing.lg, lg: spacing.xl };
const ICON_SIZE: Record<Size, number> = { sm: 14, md: 16, lg: 18 };

const AppButton: React.FC<Props> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const height = HEIGHTS[size];
  const padH = PADS[size];
  const iconSize = ICON_SIZE[size];

  // text + icon color per variant
  const fg =
    variant === 'white' ? colors.primary :
    colors.white;

  const spinnerColor = variant === 'white' ? colors.primary : colors.white;

  const Inner = (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {icon && <Icon name={icon} size={iconSize} color={fg} style={styles.iconLeft} />}
          <AppText variant={size === 'sm' ? 'small' : 'body'} bold color={fg} numberOfLines={1}>
            {title}
          </AppText>
          {iconRight && <Icon name={iconRight} size={iconSize} color={fg} style={styles.iconRight} />}
        </>
      )}
    </View>
  );

  const baseContainer: ViewStyle = {
    height,
    paddingHorizontal: padH,
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  // PRIMARY — gradient + glow
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.gradientWrap, baseContainer, style]}>
        {/* Gradient as absolute background — content lays out normally on top */}
        <LinearGradient
          colors={colors.buttonGradient as unknown as string[]}
          start={colors.gradientStartPoint}
          end={colors.gradientEndPoint}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        {Inner}
      </TouchableOpacity>
    );
  }

  // Flat variants
  const flatStyle: ViewStyle =
    variant === 'secondary' ? styles.secondary :
    variant === 'outline'   ? styles.outline :
    variant === 'white'     ? styles.white :
    /* danger */              styles.danger;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.flat, flatStyle, baseContainer, style]}>
      {Inner}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: { marginRight: 7 },
  iconRight: { marginLeft: 7 },

  gradientWrap: {
    borderRadius: layout.radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
  },

  flat: {
    borderRadius: layout.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  white: {
    backgroundColor: colors.white,
  },
  danger: {
    backgroundColor: colors.error,
  },
});

export default AppButton;