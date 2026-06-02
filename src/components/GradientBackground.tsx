import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import colors from '@/constants/colors';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Web-app-matched background: deep near-black navy, subtle vertical wash.
// (Was a bright pink gradient — now matches the web app's dark surface.)
const GradientBackground: React.FC<Props> = ({ children, style }) => {
  return (
    <LinearGradient
      colors={colors.backgroundGradientColors as unknown as string[]}
      locations={colors.backgroundGradientLocations as unknown as number[]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default GradientBackground;