import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import GradientButton from '@/components/GradientButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';

const ScreenShareInfoScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <ScreenContainer>
      <AppHeader title="Screen Share Info" showLogo={false} />
      <View style={styles.body}>
        <AppText variant="h2" bold center style={{ marginBottom: spacing.md }}>
          Share Your Screen
        </AppText>
        <AppText
          variant="small"
          color={colors.textSecondary}
          center
          style={{ marginBottom: spacing.xl }}>
          Lorem ipsum is simply dummy text of the printing and typesetting industry.
        </AppText>
        <GradientButton title="Got It" size="lg" onPress={() => navigation.goBack()} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
});

export default ScreenShareInfoScreen;
