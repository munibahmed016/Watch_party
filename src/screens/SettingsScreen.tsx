// src/screens/SettingsScreen.tsx
//
// PIXEL-MATCH to Figma:
//   - Bigger 140x140 avatar with thick white border + green online dot
//   - Camera button bottom-right of avatar (white circle, dark icon)
//   - Edit Profile pill — pink gradient with pencil icon
//   - Add Friends pill — transparent with white border, person+ icon
//   - Info rows with proper icons + "at" prefix bold
//   - 4 colorful quick action tiles (Events/Reels/Live Videos/Streaming) — white bg, pink icons
//   - Sign Out underlined at bottom

import React from 'react';
import {
  View, StyleSheet, Image, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { friendsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={18} color={colors.white} style={styles.infoIcon} />
    <AppText variant="small" color={colors.white}>
      {label}{' '}
      <AppText variant="small" bold color={colors.white}>
        {value}
      </AppText>
    </AppText>
  </View>
);

const QuickAction: React.FC<{ icon: string; label: string; onPress?: () => void }> = ({
  icon, label, onPress,
}) => (
  <TouchableOpacity onPress={onPress} style={styles.quick} activeOpacity={0.85}>
    <View style={styles.quickIcon}>
      <Icon name={icon} size={26} color={colors.primary} />
    </View>
    <AppText variant="tiny" color={colors.white} style={{ marginTop: 8 }} numberOfLines={1}>
      {label}
    </AppText>
  </TouchableOpacity>
);

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();

  const friendsQuery = useQuery({
    queryKey: queryKeys.friendsList,
    queryFn: () => friendsApi.list(50, 0),
  });

  const friendsCount = friendsQuery.data?.friends.length || 0;

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <AppHeader showBack={true} title="" showLogo={false} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: spacing.lg }}
        showsVerticalScrollIndicator={false}>

        <AppText variant="h2" bold center style={{ marginBottom: spacing.lg }}>
          Setting
        </AppText>

        {/* Big avatar with thick white border */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <AppText variant="h1" bold>
                  {(user?.fullName || user?.username || '?').slice(0, 1).toUpperCase()}
                </AppText>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.85}>
            <Icon name="camera" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>

        <AppText variant="h2" bold center style={{ marginTop: spacing.md }}>
          {user?.fullName || user?.username || 'Welcome'}
          <AppText variant="h2" bold color="#22C55E"> ·</AppText>
        </AppText>
        <AppText variant="small" color={colors.textSecondary} center>
          {friendsCount}+ Friends
        </AppText>

        {/* Edit Profile / Add Friends */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.actionPill}>
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.actBtn}>
              <Icon name="pencil" size={16} color={colors.white} style={{ marginRight: 8 }} />
              <AppText variant="small" bold color={colors.white} numberOfLines={1}>Edit Profile</AppText>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddFriends')}
            activeOpacity={0.85}
            style={[styles.actionPill, styles.actBtnGhost]}>
            <Icon name="person-add" size={16} color={colors.white} style={{ marginRight: 8 }} />
            <AppText variant="small" bold color={colors.white} numberOfLines={1}>Add Friends</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <InfoRow icon="briefcase-outline" label="Work at" value="Lorem Ipsum" />
          <View style={styles.divider} />
          <InfoRow icon="school-outline" label="Studied at" value="Lorem Ipsum" />
          <View style={styles.divider} />
          <InfoRow icon="heart-outline" label="Went to" value="Lorem Ipsum" />
          <View style={styles.divider} />
          <InfoRow icon="home-outline" label="Lives in" value="Lorem Ipsum" />
        </View>

        {/* 4 white tile quick actions */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="calendar"
            label="Events"
            onPress={() => navigation.navigate('CreatePost', { kind: 'EVENT' })}
          />
          <QuickAction
            icon="play-circle"
            label="Reels"
            onPress={() => navigation.navigate('MainTabs', { screen: 'News' })}
          />
          <QuickAction
            icon="videocam"
            label="Live Videos"
            onPress={() => navigation.navigate('CreateRoom')}
          />
          <QuickAction
            icon="radio"
            label="Streaming"
            onPress={() => navigation.navigate('CreateRoom')}
          />
        </View>

        <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
          <AppText bold style={{ textDecorationLine: 'underline' }}>
            Sign Out
          </AppText>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
    position: 'relative',
  },
  avatarRing: {
    width: 150, height: 150, borderRadius: 75,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 142, height: 142, borderRadius: 71,
  },
  avatarFallback: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: '32%',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.white,
  },

  // ---- Action pills ----
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: 12,
  },
  actionPill: { flex: 1 },
  actBtn: {
    height: 46,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actBtnGhost: {
    height: 46,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  info: { marginTop: spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoIcon: { marginRight: 12, opacity: 0.9 },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.15)' },

  // ---- Quick action tiles (Figma: white tiles with pink icons) ----
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: 10,
  },
  quick: { alignItems: 'center', flex: 1 },
  quickIcon: {
    width: 70, height: 70, borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  signOut: { alignItems: 'center', marginTop: spacing.xl, paddingVertical: 8 },
});

export default SettingsScreen;