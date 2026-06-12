import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

const Step: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => (
  <View style={styles.step}>
    <View style={styles.stepIcon}><Icon name={icon} size={20} color={colors.primary} /></View>
    <View style={{ flex: 1 }}>
      <AppText bold>{title}</AppText>
      <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 2, lineHeight: 19 }}>{text}</AppText>
    </View>
  </View>
);

const ScreenShareInfoScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="About screen sharing"
        infoIntro="Share what's on your screen with everyone in the room, in real time."
        infoPoints={[
          { icon: 'phone-portrait', title: 'Your whole screen', text: 'Everything you see, your friends see — synced live.' },
          { icon: 'lock-closed', title: 'You\'re in control', text: 'Start and stop sharing whenever you want.' },
          { icon: 'wifi', title: 'Best on Wi‑Fi', text: 'A strong connection keeps the stream smooth for everyone.' },
        ]}
      />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.iconRing}>
          <Icon name="phone-portrait-outline" size={44} color={colors.primary} />
        </View>

        <GradientText variant="h1" center style={styles.title}>Share Your Screen</GradientText>
        <AppText variant="small" color={colors.textSecondary} center style={styles.intro}>
          Cast your phone screen into the room so everyone watches exactly what you see — in perfect sync.
        </AppText>

        <View style={styles.card}>
          <Step icon="play-circle" title="1. Tap Share" text="Hit the share button inside any room to begin broadcasting your screen." />
          <View style={styles.divider} />
          <Step icon="people" title="2. Everyone joins" text="Your friends instantly see your screen and react together in chat." />
          <View style={styles.divider} />
          <Step icon="stop-circle" title="3. Stop anytime" text="Tap stop to end sharing — you stay in full control the whole time." />
        </View>

        <AppText variant="tiny" color={colors.textMuted} center style={{ marginTop: spacing.lg }}>
          DRM-protected apps (Netflix, Disney+, HBO) may appear black when shared.
        </AppText>

        <AppButton title="Got It" size="lg" fullWidth onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, alignItems: 'center' },
  iconRing: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(238,48,99,0.12)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  title: { lineHeight: 40, paddingBottom: 4, marginTop: spacing.lg },
  intro: { marginTop: spacing.xs, paddingHorizontal: spacing.md, lineHeight: 20, marginBottom: spacing.lg },
  card: { width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: layout.radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  step: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm },
  stepIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(238,48,99,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  divider: { height: 0.5, backgroundColor: colors.border, marginVertical: 4 },
});

export default ScreenShareInfoScreen;