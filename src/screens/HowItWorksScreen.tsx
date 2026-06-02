// src/screens/HowItWorksScreen.tsx
//
// Simple "How it works" info screen for Browse / discovery.
// Explains the 3-step flow + key features. On-brand (gradient accents, Syne headings).

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import AppButton from '@/components/AppButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

const STEPS = [
  {
    icon: 'search',
    title: 'Browse & Discover',
    body: 'Explore 500+ movies, shows, comedy, news, anime, sports and more — all in one place.',
  },
  {
    icon: 'play-circle',
    title: 'Pick Something to Watch',
    body: 'Tap any title to instantly start a watch room with that video ready to play.',
  },
  {
    icon: 'people',
    title: 'Watch Together, Live',
    body: 'Invite friends with a room code. Everyone watches in perfect sync — play, pause, seek together.',
  },
  {
    icon: 'chatbubble-ellipses',
    title: 'React & Chat',
    body: 'Send live messages and emoji reactions while you watch. It feels like being in the same room.',
  },
];

const FEATURES = [
  { icon: 'sync', label: 'Synced playback' },
  { icon: 'happy', label: 'Live reactions' },
  { icon: 'lock-closed', label: 'Private rooms' },
  { icon: 'flash', label: 'Instant rooms' },
];

const HowItWorksScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenContainer edges={['top']}>
      {/* Header */}
      <View style={styles.head}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <GradientText variant="h3" style={{ lineHeight: 28, paddingBottom: 2 }}>How It Works</GradientText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={colors.buttonGradient as unknown as string[]}
            start={colors.gradientStartPoint}
            end={colors.gradientEndPoint}
            style={styles.heroIcon}>
            <Icon name="play" size={30} color={colors.white} />
          </LinearGradient>
          <GradientText variant="h2" center style={{ lineHeight: 32, paddingBottom: 2, marginTop: spacing.md }}>
            Watch Together, Anywhere
          </GradientText>
          <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: spacing.xs }}>
            WatchPartyLive turns any video into a shared experience with friends.
          </AppText>
        </View>

        {/* Steps */}
        {STEPS.map((s, i) => (
          <View key={i} style={styles.stepCard}>
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={colors.gradientStartPoint}
              end={colors.gradientEndPoint}
              style={styles.stepIconRing}>
              <View style={styles.stepIconInner}>
                <Icon name={s.icon} size={20} color={colors.primary} />
              </View>
            </LinearGradient>
            <View style={styles.stepText}>
              <View style={styles.stepTitleRow}>
                <View style={styles.stepNum}>
                  <AppText variant="tiny" bold color={colors.white}>{i + 1}</AppText>
                </View>
                <AppText variant="body" bold>{s.title}</AppText>
              </View>
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 4 }}>
                {s.body}
              </AppText>
            </View>
          </View>
        ))}

        {/* Feature chips */}
        <View style={styles.featuresWrap}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureChip}>
              <Icon name={f.icon} size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <AppText variant="small" bold>{f.label}</AppText>
            </View>
          ))}
        </View>

        {/* CTA */}
        <AppButton
          title="Start Browsing"
          icon="compass"
          fullWidth
          size="lg"
          style={{ marginTop: spacing.xl }}
          onPress={() => navigation.goBack()}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg3,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stepIconRing: {
    width: 48, height: 48, borderRadius: 24,
    padding: 2, alignItems: 'center', justifyContent: 'center',
  },
  stepIconInner: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bg3,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center' },
  stepNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  featuresWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginTop: spacing.md,
  },
  featureChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: layout.radius.pill,
  },
});

export default HowItWorksScreen;