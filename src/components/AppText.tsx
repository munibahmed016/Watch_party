import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import colors from '@/constants/colors';
import typography from '@/constants/typography';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'tiny';
type Props = TextProps & {
  variant?: Variant;
  bold?: boolean;
  color?: string;
  center?: boolean;
  style?: TextStyle | TextStyle[];
};

// IMPORTANT: custom TTF fonts do NOT respond to fontWeight on iOS.
// Each weight is a separate font file, so we pick the family by weight.
const AppText: React.FC<Props> = ({
  children,
  style,
  variant = 'body',
  bold = false,
  color,
  center = false,
  ...rest
}) => {
  const size = typography[variant];
  const isHeading =
    variant === 'h1' || variant === 'h2' || variant === 'h3' || variant === 'h4';

  let fontFamily: string;
  if (isHeading) {
    // Headings always use Syne (display). ExtraBold for impact.
    fontFamily = typography.fontFamilyHeading; // Syne-ExtraBold
  } else if (bold) {
    fontFamily = typography.fontFamilyBodySemiBold; // Outfit-SemiBold
  } else {
    fontFamily = typography.fontFamilyBody; // Outfit-Regular
  }

  return (
    <Text
      {...rest}
      style={[
        styles.base,
        { fontSize: size, fontFamily },
        color ? { color } : null,
        center && styles.center,
        style,
      ]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
  },
  center: {
    textAlign: 'center',
  },
});

export default AppText;