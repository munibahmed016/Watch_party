import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, ImageBackground, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import ShareModal from '@/components/ShareModal';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { postsApi, Post, RsvpStatus } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';
import { useAuth } from '@/contexts/AuthContext';

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};
const formatEventDate = (iso: string) => {
  const d = new Date(iso);
  return {
    dateStr: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    timeStr: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

const PodcastDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const id: string = route.params?.id;
  const [shareOpen, setShareOpen] = useState(false);

  const postQuery = useQuery({ queryKey: queryKeys.post(id), queryFn: () => postsApi.getOne(id), enabled: !!id });

  const likeMutation = useMutation({
    mutationFn: () => postsApi.toggleLike(id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.post(id) });
      const prev = qc.getQueryData<{ post: Post }>(queryKeys.post(id));
      if (prev) {
        const liked = !prev.post.isLikedByMe;
        qc.setQueryData(queryKeys.post(id), { post: { ...prev.post, isLikedByMe: liked, likeCount: prev.post.likeCount + (liked ? 1 : -1) } });
      }
      return { prev };
    },
    onError: (err, _v, ctx) => { if (ctx?.prev) qc.setQueryData(queryKeys.post(id), ctx.prev); showApiError(err, 'Could not toggle like.'); },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.posts }),
  });
  const rsvpMutation = useMutation({
    mutationFn: (status: RsvpStatus) => postsApi.rsvp(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.post(id) }),
    onError: (err) => showApiError(err, 'Could not RSVP.'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => postsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.posts }); navigation.goBack(); },
    onError: (err) => showApiError(err, 'Could not delete post.'),
  });
  const onDelete = () => Alert.alert('Delete post', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
  ]);

  if (postQuery.isLoading) return <ScreenContainer><View style={styles.center}><ActivityIndicator color={colors.primary} /></View></ScreenContainer>;
  if (!postQuery.data) return (
    <ScreenContainer>
      <View style={styles.center}>
        <Icon name="alert-circle-outline" size={42} color={colors.textMuted} />
        <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>Post not found.</AppText>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}><AppText bold color={colors.primary}>Go back</AppText></TouchableOpacity>
      </View>
    </ScreenContainer>
  );

  const post = postQuery.data.post;
  const isAuthor = user?.id === post.author.id;
  const isEvent = post.kind === 'EVENT';
  const eventDate = isEvent && post.eventAt ? formatEventDate(post.eventAt) : null;
  const heroUri = post.coverUrl || 'https://images.unsplash.com/photo-1489599735734-79b4625e5b76?w=1200';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <ImageBackground source={{ uri: heroUri }} style={styles.hero}>
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(7,7,14,0.95)']} style={StyleSheet.absoluteFillObject} />
          <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><Icon name="chevron-back" size={22} color={colors.white} /></TouchableOpacity>
            <View style={{ flex: 1 }} />
            {isAuthor && (
              <>
                <TouchableOpacity onPress={() => navigation.navigate('CreatePost', { kind: post.kind, postId: post.id })} style={styles.iconBtn}><Icon name="create-outline" size={20} color={colors.white} /></TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, { marginLeft: 8 }]}><Icon name="trash-outline" size={20} color={colors.white} /></TouchableOpacity>
              </>
            )}
          </View>
          <View style={styles.kindBadge}>
            <Icon name={isEvent ? 'calendar' : 'newspaper'} size={11} color={colors.white} style={{ marginRight: 4 }} />
            <AppText variant="tiny" bold>{post.kind}</AppText>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <GradientText variant="h1">{post.title}</GradientText>

          <TouchableOpacity onPress={() => navigation.navigate('PodcastHostProfile', { username: post.author.username })} activeOpacity={0.85} style={styles.authorRow}>
            <Image source={{ uri: post.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${post.author.username}` }} style={styles.authorAvatar} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <AppText bold>{post.author.fullName || post.author.username}</AppText>
              <AppText variant="tiny" color={colors.textSecondary}>@{post.author.username} · {timeAgo(post.createdAt)}</AppText>
            </View>
          </TouchableOpacity>

          {isEvent && (
            <View style={styles.eventCard}>
              {eventDate && (
                <View style={styles.eventRow}>
                  <View style={styles.eventIconWrap}><Icon name="calendar" size={18} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}><AppText bold>{eventDate.dateStr}</AppText><AppText variant="tiny" color={colors.textSecondary}>{eventDate.timeStr}</AppText></View>
                </View>
              )}
              {post.location && (
                <View style={styles.eventRow}>
                  <View style={styles.eventIconWrap}><Icon name="location" size={18} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}><AppText bold>{post.location}</AppText></View>
                </View>
              )}
              <View style={styles.eventRow}>
                <View style={styles.eventIconWrap}><Icon name="people" size={18} color={colors.primary} /></View>
                <View style={{ flex: 1 }}><AppText bold>{post.rsvpCount} going{post.rsvpLimit ? ` · ${post.rsvpLimit - post.rsvpCount} spots left` : ''}</AppText></View>
              </View>
              <View style={styles.rsvpRow}>
                {(['GOING', 'MAYBE', 'NOT_GOING'] as RsvpStatus[]).map((status) => {
                  const active = post.myRsvpStatus === status;
                  const labelMap: Record<RsvpStatus, string> = { GOING: 'Going', MAYBE: 'Maybe', NOT_GOING: "Can't go" };
                  return (
                    <TouchableOpacity key={status} onPress={() => rsvpMutation.mutate(status)} disabled={rsvpMutation.isPending}
                      style={[styles.rsvpBtn, active && styles.rsvpBtnActive]} activeOpacity={0.85}>
                      {active && <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                      <AppText variant="small" bold={active} color={active ? colors.white : colors.textSecondary}>{labelMap[status]}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {post.body && <AppText variant="body" color={colors.textPrimary} style={styles.bodyText}>{post.body}</AppText>}
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity onPress={() => likeMutation.mutate()} disabled={likeMutation.isPending} style={styles.barBtn} activeOpacity={0.7}>
          <Icon name={post.isLikedByMe ? 'heart' : 'heart-outline'} size={22} color={post.isLikedByMe ? colors.primary : colors.white} />
          <AppText variant="tiny" style={{ marginLeft: 6 }}>{post.likeCount}</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShareOpen(true)} style={styles.barBtn} activeOpacity={0.7}>
          <Icon name="share-social-outline" size={20} color={colors.white} />
          <AppText variant="tiny" style={{ marginLeft: 6 }}>Share</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('PodcastHostProfile', { username: post.author.username })} style={[styles.barBtn, { flex: 1, justifyContent: 'flex-end' }]} activeOpacity={0.7}>
          <AppText variant="tiny" color={colors.textSecondary}>View profile</AppText>
          <Icon name="chevron-forward" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <ShareModal visible={shareOpen} onClose={() => setShareOpen(false)} title={post.title}
        subtitle={`watchpartylive.app/posts/${post.id}`} thumbnailUrl={post.coverUrl || undefined}
        shareUrl={`https://watchpartylive.app/posts/${post.id}`} />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  hero: { height: 280, width: '100%', justifyContent: 'flex-end' },
  heroTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  kindBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primary, margin: spacing.md },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceElevated },
  eventCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.md, padding: spacing.md, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  eventIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(238,48,99,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rsvpRow: { flexDirection: 'row', marginTop: spacing.sm, gap: 8 },
  rsvpBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', overflow: 'hidden' },
  rsvpBtnActive: {},
  bodyText: { marginTop: spacing.lg, lineHeight: 22 },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 12, backgroundColor: 'rgba(7,7,14,0.95)', borderTopWidth: 1, borderTopColor: colors.border },
  barBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: spacing.lg },
});

export default PodcastDetailScreen;