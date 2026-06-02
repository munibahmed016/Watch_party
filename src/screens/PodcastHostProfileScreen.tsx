// src/screens/PodcastHostProfileScreen.tsx
//
// PIXEL-PERFECT match to Figma "Profile" screen:
//   - Large circular avatar (centered, white border)
//   - Name + verified badge + friends count below avatar
//   - Edit/Add Friend gradient pill + Add Friends ghost pill (mirrors SettingsScreen layout)
//   - 4-line info section (Work / Studied / Went to / Lives in)
//   - 4 quick action cards: Events, Reels, Live Videos, Streaming
//   - At the bottom: "Posts by {user}" list pulled from /api/posts?authorUsername=...
//
// This screen serves as the public profile view for ANY user (other people OR your own).
//
// Route param: { username: string }

import React from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { usersApi, friendsApi, chatsApi, postsApi, Post } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

// =============================================================
// Helpers
// =============================================================

const avatarUrl = (username: string, override: string | null) =>
  override ||
  `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
    username,
  )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={16} color={colors.white} style={styles.infoIcon} />
    <AppText variant="small" color={colors.textSecondary}>
      {label}{' '}
      <AppText variant="small" bold color={colors.white}>{value}</AppText>
    </AppText>
  </View>
);

const QuickAction: React.FC<{ icon: string; label: string; onPress?: () => void }> = ({
  icon, label, onPress,
}) => (
  <TouchableOpacity onPress={onPress} style={styles.quick} activeOpacity={0.85}>
    <View style={styles.quickIcon}>
      <Icon name={icon} size={20} color={colors.primary} />
    </View>
    <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 6 }} numberOfLines={1}>
      {label}
    </AppText>
  </TouchableOpacity>
);

// =============================================================
// Screen
// =============================================================

const PodcastHostProfileScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const username: string = route.params?.username || '';

  const profileQuery = useQuery({
    queryKey: queryKeys.user(username),
    queryFn: () => usersApi.getByUsername(username),
    enabled: !!username,
  });

  const postsQuery = useQuery({
    queryKey: queryKeys.postsByAuthor(username),
    queryFn: () => postsApi.list({ authorUsername: username, limit: 20 }),
    enabled: !!username,
  });

  const sendReqMutation = useMutation({
    mutationFn: () => friendsApi.sendRequest(profileQuery.data!.user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user(username) });
      Alert.alert('Sent!', 'Friend request sent.');
    },
    onError: (err) => showApiError(err, 'Could not send request.'),
  });

  const unfriendMutation = useMutation({
    mutationFn: () => friendsApi.unfriend(profileQuery.data!.user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user(username) });
      qc.invalidateQueries({ queryKey: queryKeys.friendsList });
    },
    onError: (err) => showApiError(err, 'Could not unfriend.'),
  });

  const openChatMutation = useMutation({
    mutationFn: () => chatsApi.openDirect(profileQuery.data!.user.id),
    onSuccess: ({ chat }) => {
      navigation.navigate('ChatDetail', {
        chatId: chat.id,
        name: chat.name,
        avatar: chat.avatarUrl,
      });
    },
    onError: (err) => showApiError(err, 'Could not open chat.'),
  });

  if (profileQuery.isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!profileQuery.data) {
    return (
      <ScreenContainer>
        <AppHeader showLogo={false} />
        <View style={styles.center}>
          <Icon name="person-circle-outline" size={48} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>
            Profile not found.
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  const u = profileQuery.data.user;
  const isFriend = u.friendshipStatus === 'FRIENDS';
  const isPending = u.friendshipStatus === 'REQUEST_SENT';

  const onPrimaryPress = () => {
    if (isFriend) {
      Alert.alert('Unfriend', `Remove ${u.username} from friends?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unfriend', style: 'destructive', onPress: () => unfriendMutation.mutate() },
      ]);
    } else if (isPending) {
      // No-op visual feedback (already sent)
    } else {
      sendReqMutation.mutate();
    }
  };

  const primaryLabel = isFriend ? 'Friends' : isPending ? 'Requested' : 'Add Friend';
  const primaryIcon = isFriend ? 'people' : isPending ? 'time' : 'person-add';

  const posts: Post[] = postsQuery.data?.posts || [];

  return (
    <ScreenContainer>
      <AppHeader showLogo={false} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>

        {/* Avatar block */}
        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatarUrl(u.username, u.avatarUrl) }} style={styles.avatar} />
          {u.isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* Name + verified */}
        <View style={styles.nameRow}>
          <AppText variant="h3" bold>
            {u.fullName || u.username}
          </AppText>
          <Icon name="checkmark-circle" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
        </View>
        <AppText variant="tiny" color={colors.textSecondary} center>
          {u.friendsCount}+ Friends
        </AppText>

        {/* Action pills */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPrimaryPress}
            disabled={sendReqMutation.isPending || isPending}
            style={styles.actionPill}>
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.actBtn}>
              <Icon name={primaryIcon} size={14} color={colors.white} style={{ marginRight: 6 }} />
              <AppText variant="small" bold numberOfLines={1}>{primaryLabel}</AppText>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openChatMutation.mutate()}
            disabled={openChatMutation.isPending}
            activeOpacity={0.85}
            style={[styles.actionPill, styles.actBtn, styles.actBtnGhost]}>
            <Icon name="chatbubble" size={14} color={colors.white} style={{ marginRight: 6 }} />
            <AppText variant="small" bold numberOfLines={1}>Message</AppText>
          </TouchableOpacity>
        </View>

        {/* Info rows */}
        <View style={styles.info}>
          <InfoRow icon="briefcase-outline" label="Work at" value="Lorem Ipsum" />
          <View style={styles.divider} />
          <InfoRow icon="school-outline" label="Studied at" value="Lorem Ipsum" />
          <View style={styles.divider} />
          <InfoRow icon="heart-outline" label="Went to" value="Lorem Ipsum" />
          <View style={styles.divider} />
          <InfoRow icon="home-outline" label="Lives in" value="Lorem Ipsum" />
        </View>

        {/* Bio */}
        {u.bio ? (
          <View style={styles.bioCard}>
            <AppText variant="small" color={colors.textSecondary}>About</AppText>
            <AppText style={{ marginTop: 4 }}>{u.bio}</AppText>
          </View>
        ) : null}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction icon="calendar" label="Events" />
          <QuickAction icon="newspaper" label="News" />
          <QuickAction icon="mic" label="Podcast" onPress={() => navigation.navigate('JoinPodcast')} />
          <QuickAction icon="cloud-upload" label="Streaming" />
        </View>

        {/* Their posts */}
        {posts.length > 0 && (
          <>
            <AppText variant="h3" bold style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
              Posts
            </AppText>
            {posts.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.postCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('PostDetail', { id: p.id })}>
                {p.coverUrl && <Image source={{ uri: p.coverUrl }} style={styles.postImg} />}
                <View style={styles.postBody}>
                  <View style={styles.kindBadge}>
                    <Icon
                      name={p.kind === 'EVENT' ? 'calendar' : 'newspaper'}
                      size={10}
                      color={colors.white}
                      style={{ marginRight: 4 }}
                    />
                    <AppText variant="tiny" bold>{p.kind}</AppText>
                  </View>
                  <AppText bold style={{ marginTop: 6 }} numberOfLines={2}>{p.title}</AppText>
                  {p.body ? (
                    <AppText variant="small" color={colors.textSecondary} numberOfLines={2}
                      style={{ marginTop: 4 }}>
                      {p.body}
                    </AppText>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl,
  },

  // Avatar
  avatarWrap: { alignItems: 'center', marginTop: spacing.lg, position: 'relative' },
  avatar: {
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 3, borderColor: colors.white,
    backgroundColor: colors.surfaceElevated,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4, alignSelf: 'center',
    marginLeft: 90,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 3, borderColor: colors.background,
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.md,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: 10,
  },
  actionPill: { flex: 1 },
  actBtn: {
    height: 42, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actBtnGhost: { backgroundColor: 'rgba(255,255,255,0.12)' },

  // Info
  info: { marginTop: spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  infoIcon: { marginRight: 10, opacity: 0.85 },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)' },

  bioCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: spacing.md,
    borderRadius: layout.radius.md,
    marginTop: spacing.md,
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: 8,
  },
  quick: { alignItems: 'center', flex: 1 },
  quickIcon: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Posts
  postCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: layout.radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  postImg: { width: 90, height: 90 },
  postBody: {
    flex: 1,
    padding: spacing.sm,
  },
  kindBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
});

export default PodcastHostProfileScreen;