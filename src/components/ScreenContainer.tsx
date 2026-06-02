import React from 'react';
import { StyleSheet, ViewStyle, StyleProp, StatusBar } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import GradientBackground from './GradientBackground';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ReadonlyArray<Edge>;
  withGradient?: boolean;
};

const ScreenContainer: React.FC<Props> = ({
  children,
  style,
  edges = ['top', 'bottom'],
  withGradient = true,
}) => {
  if (!withGradient) {
    return (
      <SafeAreaView style={[styles.container, style]} edges={edges}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        {children}
      </SafeAreaView>
    );
  }
  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={[styles.container, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenContainer;
