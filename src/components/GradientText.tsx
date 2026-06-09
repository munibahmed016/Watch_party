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
      style={center ? styles.stretch : undefined}
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
        end={colors.gradientEndPoint}
        style={center ? styles.stretch : undefined}>
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
  stretch: { alignSelf: 'stretch', width: '100%' },
});

export default GradientText;