import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { friendsApi, subscriptionsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}><Icon name={icon} size={16} color={colors.primary} /></View>
    <View style={{ flex: 1 }}>
      <AppText variant="tiny" color={colors.textSecondary}>{label}</AppText>
      <AppText variant="small" bold numberOfLines={1}>{value}</AppText>
    </View>
  </View>
);

// Tappable navigation row (for Creator & Plans section)
const NavRow: React.FC<{ icon: string; label: string; sub?: string; onPress: () => void; tint?: string }> =
  ({ icon, label, sub, onPress, tint }) => (
  <TouchableOpacity style={styles.navRow} activeOpacity={0.85} onPress={onPress}>
    <View style={[styles.infoIconWrap, tint ? { backgroundColor: `${tint}22` } : null]}>
      <Icon name={icon} size={16} color={tint || colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <AppText variant="small" bold numberOfLines={1}>{label}</AppText>
      {sub ? <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1}>{sub}</AppText> : null}
    </View>
    <Icon name="chevron-forward" size={16} color={colors.textMuted} />
  </TouchableOpacity>
);

const QuickAction: React.FC<{ icon: string; label: string; onPress?: () => void }> = ({ icon, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.quick} activeOpacity={0.85}>
    <View style={styles.quickIcon}><Icon name={icon} size={24} color={colors.primary} /></View>
    <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 8 }} numberOfLines={1}>{label}</AppText>
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

  // current plan (for the tier color + label)
  const subQuery = useQuery({ queryKey: ['subscription', 'me'], queryFn: () => subscriptionsApi.me() });
  const tier = subQuery.data;

  const incomingReqQuery = useQuery({
    queryKey: queryKeys.friendsIncoming,
    queryFn: () => friendsApi.incoming(),
  });
  const requestCount = incomingReqQuery.data?.requests.length || 0;

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] }); } },
    ]);
  };

  return (
    <ScreenContainer>
      <BrandHeader
        showBack={false}
        infoTitle="Your settings"
        infoIntro="Manage your profile, plan, creator tools, friends and account."
        infoPoints={[
          { icon: 'create', title: 'Edit profile', text: 'Update your name, username, bio and photo any time.' },
          { icon: 'diamond', title: 'Plans', text: 'Upgrade to Pro or Advance to unlock creator tools.' },
          { icon: 'cloud-upload', title: 'Creator', text: 'Become a creator, upload content and go live.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: spacing.lg }} showsVerticalScrollIndicator={false}>

        <GradientText variant="h1" center style={styles.pageTitle}>Settings</GradientText>

        {/* Avatar — ring tinted by plan tier */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarRing, { borderColor: tier?.color || colors.primary }]}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <AppText variant="h1" bold>{(user?.fullName || user?.username || '?').slice(0, 1).toUpperCase()}</AppText>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.cameraBtn} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.85}>
            <LinearGradient colors={colors.buttonGradient as unknown as string[]}
              start={colors.gradientStartPoint} end={colors.gradientEndPoint}
              style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            <Icon name="camera" size={15} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.nameRow}>
          <AppText variant="h3" bold>{user?.fullName || user?.username || 'Welcome'}</AppText>
          {user?.isVerified && <Icon name="checkmark-circle" size={16} color={colors.primary} style={{ marginLeft: 4 }} />}
        </View>
        <AppText variant="tiny" color={colors.textSecondary} center>
          @{user?.username} · {friendsCount} friends{tier ? ` · ${tier.planName}` : ''}
        </AppText>

        {/* Action pills */}
        <View style={styles.actionRow}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('EditProfile')} style={styles.actionPill}>
            <View style={[styles.actBtn, { overflow: 'hidden' }]}>
              <LinearGradient colors={colors.buttonGradient as unknown as string[]}
                start={colors.gradientStartPoint} end={colors.gradientEndPoint}
                style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <Icon name="pencil" size={15} color={colors.white} style={{ marginRight: 8 }} />
              <AppText variant="small" bold color={colors.white} numberOfLines={1}>Edit Profile</AppText>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AddFriends')} activeOpacity={0.85} style={[styles.actionPill, styles.actBtn, styles.actBtnGhost]}>
            <Icon name="person-add" size={15} color={colors.white} style={{ marginRight: 8 }} />
            <AppText variant="small" bold color={colors.white} numberOfLines={1}>Add Friends</AppText>
          </TouchableOpacity>
        </View>

        {/* Friend requests row with badge */}
        <TouchableOpacity
          style={styles.friendReqRow}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('FriendRequests')}>
          <View style={styles.infoIconWrap}><Icon name="person-add" size={16} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <AppText variant="small" bold>Friend Requests</AppText>
            <AppText variant="tiny" color={colors.textSecondary}>
              {requestCount > 0 ? `${requestCount} pending request${requestCount === 1 ? '' : 's'}` : 'No pending requests'}
            </AppText>
          </View>
          {requestCount > 0 && (
            <View style={styles.reqBadge}><AppText variant="tiny" bold color={colors.white}>{requestCount}</AppText></View>
          )}
          <Icon name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* REAL info rows */}
        <View style={styles.info}>
          <InfoRow icon="mail-outline" label="Email" value={user?.email || '—'} />
          {user?.phoneNumber ? <InfoRow icon="call-outline" label="Phone" value={user.phoneNumber} /> : null}
          <InfoRow icon="shield-checkmark-outline" label="Account status" value={user?.isVerified ? 'Verified' : 'Unverified'} />
          {user?.bio ? <InfoRow icon="document-text-outline" label="Bio" value={user.bio} /> : null}
        </View>

        {/* ===== Creator & Plans (hidden for admins) ===== */}
        {!(user as any)?.isAdmin && (
        <>
        <GradientText variant="h3" style={styles.sectionTitle}>Creator & Plans</GradientText>
        <View style={styles.info}>
          <NavRow icon="person-circle" label="My Profile" sub="Rooms, following & subscriptions"
            onPress={() => navigation.navigate('MyProfile')} />
          <NavRow icon="diamond" label="Plans" sub={tier ? `Current: ${tier.planName}` : 'Basic / Pro / Advance'}
            tint={tier?.color} onPress={() => navigation.navigate('Plans')} />
          <NavRow icon="rocket" label="Become a Creator" sub="Set up your channel"
            onPress={() => navigation.navigate('BecomeCreator')} />
          <NavRow icon="cloud-upload" label="Upload Content" sub="Movies, podcasts, clips & reels"
            onPress={() => navigation.navigate('CreatorUpload')} />
          <NavRow icon="stats-chart" label="Creator Dashboard" sub="Your views & analytics"
            onPress={() => navigation.navigate('CreatorDashboard')} />
        </View>
        </>
        )}

        {/* Quick actions — real navigation */}
        <View style={styles.quickRow}>
          <QuickAction icon="calendar" label="Events" onPress={() => navigation.navigate('CreatePost', { kind: 'EVENT' })} />
          <QuickAction icon="newspaper" label="News" onPress={() => navigation.navigate('CreatePost', { kind: 'NEWS' })} />
          <QuickAction icon="videocam" label="Watch" onPress={() => navigation.navigate('CreateRoom')} />
          <QuickAction icon="mic" label="Podcast" onPress={() => navigation.navigate('JoinPodcast')} />
        </View>

        {/* Admin-only — invisible to normal users */}
        {(user as any)?.isAdmin && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Admin')}
            activeOpacity={0.85}
            style={styles.adminBtn}>
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={colors.gradientStartPoint} end={colors.gradientEndPoint}
              style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            <Icon name="shield-checkmark" size={16} color={colors.white} style={{ marginRight: 8 }} />
            <AppText bold color={colors.white}>Admin Panel</AppText>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
          <Icon name="log-out-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <AppText bold color={colors.textSecondary}>Sign Out</AppText>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageTitle: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  avatarWrap: { alignItems: 'center', marginTop: spacing.sm, position: 'relative' },
  avatarRing: { width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: 122, height: 122, borderRadius: 61 },
  avatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  cameraBtn: { position: 'absolute', bottom: 0, right: '33%', width: 34, height: 34, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  actionRow: { flexDirection: 'row', marginTop: spacing.lg, gap: 12 },
  actionPill: { flex: 1 },
  actBtn: { height: 46, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  actBtnGhost: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: colors.border },
  info: { marginTop: spacing.md, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(238,48,99,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, lineHeight: 28, paddingBottom: 2 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl, gap: 10 },
  quick: { alignItems: 'center', flex: 1 },
  quickIcon: { width: 66, height: 66, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  adminBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, paddingVertical: 14, borderRadius: 999, overflow: 'hidden' },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, paddingVertical: 10 },
  friendReqRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, marginTop: spacing.lg },
  reqBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 6 },
});

export default SettingsScreen;