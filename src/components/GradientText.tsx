// src/components/GradientText.tsx
//
// Gradient text — matches web app's .g-text (background-clip: text with --grad).
// Uses MaskedView so the gradient shows THROUGH the text glyphs.
//
// Requires: @react-native-masked-view/masked-view (already common in RN projects).
// If not installed:  npm i @react-native-masked-view/masked-view && cd ios && pod install
//
// Usage:
//   <GradientText variant="h1" bold>Watch Together</GradientText>

import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import AppText from './AppText';
import colors from '@/constants/colors';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'tiny';

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  bold?: boolean;
  center?: boolean;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  colorsOverride?: string[];
};

const GradientText: React.FC<Props> = ({
  children,
  variant = 'h2',
  bold = true,
  center = false,
  style,
  numberOfLines,
  colorsOverride,
}) => {
  return (
    <MaskedView
      maskElement={
        <AppText
          variant={variant}
          bold={bold}
          center={center}
          numberOfLines={numberOfLines}
          style={style}>
          {children}
        </AppText>
      }>
      <LinearGradient
        colors={(colorsOverride || colors.buttonGradient) as unknown as string[]}
        start={colors.gradientStartPoint}
        end={colors.gradientEndPoint}>
        {/* Invisible copy sets the size; gradient fills the masked glyphs */}
        <AppText
          variant={variant}
          bold={bold}
          center={center}
          numberOfLines={numberOfLines}
          style={[style, styles.hidden]}>
          {children}
        </AppText>
      </LinearGradient>
    </MaskedView>
  );
};

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
});

export default GradientText;