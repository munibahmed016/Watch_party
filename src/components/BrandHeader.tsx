// src/components/BrandHeader.tsx
//
// Standard top header used across the app:
//   [ back ]      [ WP logo center ]      [ info (i) ]
//
// The info button opens a bottom sheet explaining what the screen does.
// Pass infoTitle + infoPoints to populate it.
//
// Usage:
//   <BrandHeader
//     infoTitle="Find your friends"
//     infoIntro="Here's what this screen does."
//     infoPoints={[{ icon: 'search', title: 'Search', text: '...' }]}
//   />

import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from './AppText';
import GradientText from './GradientText';
import BrandLogo from './BrandLogo';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

export type InfoPoint = { icon: string; title: string; text: string };

type Props = {
  showBack?: boolean;
  showInfo?: boolean;
  onBack?: () => void;
  infoTitle?: string;
  infoIntro?: string;
  infoPoints?: InfoPoint[];
};

const BrandHeader: React.FC<Props> = ({
  showBack = true,
  showInfo = true,
  onBack,
  infoTitle = 'About this screen',
  infoIntro,
  infoPoints = [],
}) => {
  const navigation = useNavigation<any>();
  const [showSheet, setShowSheet] = useState(false);

  const handleBack = () => {
    if (onBack) return onBack();
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity style={styles.sideBtn} onPress={handleBack} activeOpacity={0.8}>
          <Icon name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideBtn} />
      )}

      <View style={styles.center}>
        <BrandLogo size="sm" variant="small" />
      </View>

      {showInfo ? (
        <TouchableOpacity style={styles.sideBtn} onPress={() => setShowSheet(true)} activeOpacity={0.8}>
          <Icon name="information-circle-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideBtn} />
      )}

      {/* Info bottom sheet */}
      <Modal
        visible={showSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSheet(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowSheet(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Grab handle */}
            <View style={styles.handle} />

            {/* Logo centered, gradient title below */}
            <View style={styles.sheetHead}>
              <BrandLogo size="sm" variant="small" />
              <GradientText variant="h2" center style={styles.sheetTitle}>{infoTitle}</GradientText>
            </View>

            {infoIntro ? (
              <AppText variant="small" color={colors.textSecondary} style={styles.sheetIntro}>
                {infoIntro}
              </AppText>
            ) : null}

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {infoPoints.map((p, i) => (
                <View key={i} style={styles.pointRow}>
                  <LinearGradient
                    colors={colors.buttonGradient as unknown as string[]}
                    start={colors.gradientStartPoint}
                    end={colors.gradientEndPoint}
                    style={styles.pointIconRing}>
                    <View style={styles.pointIconInner}>
                      <Icon name={p.icon} size={17} color={colors.primary} />
                    </View>
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="small" bold>{p.title}</AppText>
                    <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 2, lineHeight: 19 }}>
                      {p.text}
                    </AppText>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSheet(false)} activeOpacity={0.85}>
              <LinearGradient
                colors={colors.buttonGradient as unknown as string[]}
                start={colors.gradientStartPoint}
                end={colors.gradientEndPoint}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              <AppText bold color={colors.white}>Got it</AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sideBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg3,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetHead: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    marginTop: 10,
    lineHeight: 30,
    paddingBottom: 3,
    paddingHorizontal: spacing.md,
    alignSelf: 'stretch',
  },
  sheetIntro: { marginBottom: spacing.md, lineHeight: 20, textAlign: 'center' },
  pointRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  pointIconRing: {
    width: 40, height: 40, borderRadius: 20,
    padding: 2, alignItems: 'center', justifyContent: 'center',
  },
  pointIconInner: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bg3,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    marginTop: spacing.md,
    height: 50, borderRadius: layout.radius.pill,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
});

export default BrandHeader;