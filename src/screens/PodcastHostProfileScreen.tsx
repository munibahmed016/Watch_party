import React from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { usersApi, friendsApi, chatsApi, postsApi, Post } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

const avatarUrl = (username: string, override: string | null) =>
  override ||
  `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

const StatBox: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
  <View style={styles.statBox}>
    <AppText variant="h3" bold>{value}</AppText>
    <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 2 }}>{label}</AppText>
  </View>
);

const QuickAction: React.FC<{ icon: string; label: string; onPress?: () => void }> = ({ icon, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.quick} activeOpacity={0.85}>
    <View style={styles.quickIcon}><Icon name={icon} size={20} color={colors.primary} /></View>
    <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 6 }} numberOfLines={1}>{label}</AppText>
  </TouchableOpacity>
);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.user(username) }); Alert.alert('Sent!', 'Friend request sent.'); },
    onError: (err) => showApiError(err, 'Could not send request.'),
  });
  const unfriendMutation = useMutation({
    mutationFn: () => friendsApi.unfriend(profileQuery.data!.user.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.user(username) }); qc.invalidateQueries({ queryKey: queryKeys.friendsList }); },
    onError: (err) => showApiError(err, 'Could not unfriend.'),
  });
  const openChatMutation = useMutation({
    mutationFn: () => chatsApi.openDirect(profileQuery.data!.user.id),
    onSuccess: ({ chat }) => navigation.navigate('ChatDetail', { chatId: chat.id, name: chat.name, avatar: chat.avatarUrl }),
    onError: (err) => showApiError(err, 'Could not open chat.'),
  });

  if (profileQuery.isLoading) {
    return <ScreenContainer><BrandHeader /><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></ScreenContainer>;
  }
  if (!profileQuery.data) {
    return (
      <ScreenContainer>
        <BrandHeader />
        <View style={styles.center}>
          <Icon name="person-circle-outline" size={48} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>Profile not found.</AppText>
        </View>
      </ScreenContainer>
    );
  }

  const u = profileQuery.data.user;
  const isFriend = u.friendshipStatus === 'FRIENDS';
  const isPending = u.friendshipStatus === 'REQUEST_SENT';
  const posts: Post[] = postsQuery.data?.posts || [];

  const onPrimaryPress = () => {
    if (isFriend) {
      Alert.alert('Unfriend', `Remove ${u.username} from friends?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unfriend', style: 'destructive', onPress: () => unfriendMutation.mutate() },
      ]);
    } else if (!isPending) {
      sendReqMutation.mutate();
    }
  };
  const primaryLabel = isFriend ? 'Friends' : isPending ? 'Requested' : 'Add Friend';
  const primaryIcon = isFriend ? 'people' : isPending ? 'time' : 'person-add';

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle={`@${u.username}`}
        infoIntro={`View ${u.fullName || u.username}'s profile, posts, and connect with them.`}
        infoPoints={[
          { icon: 'person-add', title: 'Add friend', text: 'Send a friend request to connect and chat directly.' },
          { icon: 'chatbubble', title: 'Message', text: 'Start a direct conversation any time.' },
          { icon: 'newspaper', title: 'Their posts', text: 'See the news and events this person has shared.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatarUrl(u.username, u.avatarUrl) }} style={styles.avatar} />
          {u.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.nameRow}>
          <GradientText variant="h2" center style={{ lineHeight: 30, paddingBottom: 2 }}>
            {u.fullName || u.username}
          </GradientText>
        </View>
        <AppText variant="tiny" color={colors.textSecondary} center>@{u.username}</AppText>

        {/* Real stats */}
        <View style={styles.statsRow}>
          <StatBox value={u.friendsCount ?? 0} label="Friends" />
          <View style={styles.statDivider} />
          <StatBox value={posts.length} label="Posts" />
          <View style={styles.statDivider} />
          <StatBox value={u.isOnline ? 'Online' : 'Offline'} label="Status" />
        </View>

        {/* Action pills */}
        <View style={styles.actionRow}>
          <TouchableOpacity activeOpacity={0.85} onPress={onPrimaryPress}
            disabled={sendReqMutation.isPending || isPending} style={styles.actionPill}>
            <View style={[styles.actBtn, { overflow: 'hidden' }]}>
              <LinearGradient colors={colors.buttonGradient as unknown as string[]}
                start={colors.gradientStartPoint} end={colors.gradientEndPoint}
                style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <Icon name={primaryIcon} size={14} color={colors.white} style={{ marginRight: 6 }} />
              <AppText variant="small" bold color={colors.white} numberOfLines={1}>{primaryLabel}</AppText>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openChatMutation.mutate()} disabled={openChatMutation.isPending}
            activeOpacity={0.85} style={[styles.actionPill, styles.actBtn, styles.actBtnGhost]}>
            <Icon name="chatbubble" size={14} color={colors.white} style={{ marginRight: 6 }} />
            <AppText variant="small" bold color={colors.white} numberOfLines={1}>Message</AppText>
          </TouchableOpacity>
        </View>

        {/* Real bio (only if present) */}
        {u.bio ? (
          <View style={styles.bioCard}>
            <AppText variant="small" color={colors.textSecondary}>About</AppText>
            <AppText style={{ marginTop: 4, lineHeight: 20 }}>{u.bio}</AppText>
          </View>
        ) : null}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction icon="calendar" label="Events" onPress={() => navigation.navigate('NewsHot')} />
          <QuickAction icon="newspaper" label="News" onPress={() => navigation.navigate('NewsHot')} />
          <QuickAction icon="mic" label="Podcast" onPress={() => navigation.navigate('JoinPodcast')} />
          <QuickAction icon="tv" label="Browse" onPress={() => navigation.navigate('Browse')} />
        </View>

        {/* Their real posts */}
        {postsQuery.isLoading ? (
          <View style={{ paddingVertical: spacing.xl }}><ActivityIndicator color={colors.primary} /></View>
        ) : posts.length > 0 ? (
          <>
            <GradientText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.sm, lineHeight: 28, paddingBottom: 2 }}>Posts</GradientText>
            {posts.map((p) => (
              <TouchableOpacity key={p.id} style={styles.postCard} activeOpacity={0.85}
                onPress={() => navigation.navigate('PostDetail', { id: p.id })}>
                {p.coverUrl && <Image source={{ uri: p.coverUrl }} style={styles.postImg} />}
                <View style={styles.postBody}>
                  <View style={styles.kindBadge}>
                    <Icon name={p.kind === 'EVENT' ? 'calendar' : 'newspaper'} size={10} color={colors.white} style={{ marginRight: 4 }} />
                    <AppText variant="tiny" bold>{p.kind}</AppText>
                  </View>
                  <AppText bold style={{ marginTop: 6 }} numberOfLines={2}>{p.title}</AppText>
                  {p.body ? <AppText variant="small" color={colors.textSecondary} numberOfLines={2} style={{ marginTop: 4 }}>{p.body}</AppText> : null}
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <AppText variant="small" color={colors.textSecondary}>No posts yet.</AppText>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  avatarWrap: { alignItems: 'center', marginTop: spacing.md, position: 'relative' },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  onlineDot: { position: 'absolute', bottom: 6, alignSelf: 'center', marginLeft: 84, width: 16, height: 16, borderRadius: 8, backgroundColor: '#22C55E', borderWidth: 3, borderColor: colors.background },
  nameRow: { alignItems: 'center', marginTop: spacing.md },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.lg, paddingVertical: spacing.md, marginTop: spacing.lg,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  actionRow: { flexDirection: 'row', marginTop: spacing.lg, gap: 10 },
  actionPill: { flex: 1 },
  actBtn: { height: 44, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  actBtnGhost: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: colors.border },
  bioCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.md, borderRadius: layout.radius.md, marginTop: spacing.lg },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, gap: 8 },
  quick: { alignItems: 'center', flex: 1 },
  quickIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  postCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.md, marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  postImg: { width: 90, height: 90, backgroundColor: colors.surfaceElevated },
  postBody: { flex: 1, padding: spacing.sm },
  kindBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.primary },
});

export default PodcastHostProfileScreen;