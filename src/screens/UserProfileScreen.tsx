import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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
import { usersApi, creatorsApi, chatsApi, friendsApi } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

const UserProfileScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();

  const username: string | undefined = route.params?.username;
  const paramUserId: string | undefined = route.params?.userId;

  const userQuery = useQuery({
    queryKey: ['user', 'by-username', username],
    queryFn: () => usersApi.getByUsername(username as string),
    enabled: !!username,
  });

  // Is this person also a creator? (soft check — fails quietly for normal users)
  const creatorQuery = useQuery({
    queryKey: ['user', 'is-creator', username],
    queryFn: () => creatorsApi.getByUsername(username as string),
    enabled: !!username,
    retry: false,
  });

  const u = userQuery.data?.user;
  const userId = u?.id || paramUserId;
  const isCreator = !!creatorQuery.data && (creatorQuery.data as any).status === 'APPROVED';

  const fs = (u?.friendshipStatus || '').toString().toUpperCase();
  const isFriend = fs.includes('FRIEND') || fs === 'ACCEPTED';
  const isPendingOut = fs.includes('SENT') || fs.includes('OUTGOING') || fs === 'PENDING' || fs === 'REQUESTED';
  const isPendingIn = fs.includes('INCOMING') || fs.includes('RECEIVED');

  // Open (or create) the 1-to-1 chat with this user.
  const openChat = useMutation({
    mutationFn: () => chatsApi.openDirect(userId as string),
    onSuccess: ({ chat }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatsList });
      navigation.navigate('ChatDetail', { chatId: chat.id, name: chat.name, avatar: chat.avatarUrl });
    },
    onError: (e) => showApiError(e, 'Could not open chat.'),
  });

  const sendRequest = useMutation({
    mutationFn: () => friendsApi.sendRequest(userId as string),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', 'by-username', username] }),
    onError: (e) => showApiError(e, 'Could not send request.'),
  });

  const avatar = u?.avatarUrl
    || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username || 'user')}&backgroundColor=ffdfbf`;
  const displayName = u?.fullName || u?.username || username || 'User';

  return (
    <ScreenContainer>
      <BrandHeader
        showBack
        onBack={() => navigation.goBack()}
        infoTitle="Profile"
        infoIntro="View this person, message them, or add them as a friend."
        infoPoints={[
          { icon: 'chatbubble-ellipses', title: 'Message', text: 'Start a direct chat.' },
          { icon: 'person-add', title: 'Add friend', text: 'Send a friend request.' },
        ]}
      />

      {userQuery.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : !u ? (
        <View style={styles.center}>
          <Icon name="person-circle-outline" size={48} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 10 }}>
            Couldn't load this profile.
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 130, paddingHorizontal: spacing.lg }} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: avatar }} style={styles.avatar} />
            </View>
            {u.isOnline && <View style={styles.onlineDot} />}
          </View>

          <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <GradientText variant="h2" center style={{ lineHeight: 30, paddingBottom: 2 }}>{displayName}</GradientText>
              {isCreator && <Icon name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />}
            </View>
            <AppText variant="tiny" color={colors.textSecondary}>@{u.username}</AppText>
            {typeof (u as any).friendsCount === 'number' && (
              <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 2 }}>
                {(u as any).friendsCount} friend{(u as any).friendsCount === 1 ? '' : 's'}
              </AppText>
            )}
          </View>

          {u.bio ? (
            <View style={styles.bioCard}>
              <AppText style={{ lineHeight: 20 }}>{u.bio}</AppText>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => userId && openChat.mutate()}
              disabled={!userId || openChat.isPending}
              style={[styles.actBtn, { overflow: 'hidden' }]}>
              <LinearGradient
                colors={colors.buttonGradient as unknown as string[]}
                start={colors.gradientStartPoint}
                end={colors.gradientEndPoint}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              {openChat.isPending
                ? <ActivityIndicator color={colors.white} size="small" />
                : <><Icon name="chatbubble-ellipses" size={15} color={colors.white} style={{ marginRight: 6 }} />
                    <AppText variant="small" bold color={colors.white}>Message</AppText></>}
            </TouchableOpacity>

            {/* Friend button reflects current status */}
            {isFriend ? (
              <View style={[styles.actBtn, styles.actGhost]}>
                <Icon name="checkmark-circle" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <AppText variant="small" bold color={colors.white}>Friends</AppText>
              </View>
            ) : isPendingOut ? (
              <View style={[styles.actBtn, styles.actGhost]}>
                <Icon name="time-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <AppText variant="small" bold color={colors.textSecondary}>Requested</AppText>
              </View>
            ) : isPendingIn ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('FriendRequests')} style={[styles.actBtn, styles.actGhost]}>
                <Icon name="person-add" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <AppText variant="small" bold color={colors.white}>Respond</AppText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => userId && sendRequest.mutate()}
                disabled={!userId || sendRequest.isPending}
                style={[styles.actBtn, styles.actGhost]}>
                {sendRequest.isPending
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <><Icon name="person-add" size={15} color={colors.white} style={{ marginRight: 6 }} />
                      <AppText variant="small" bold color={colors.white}>Add Friend</AppText></>}
              </TouchableOpacity>
            )}
          </View>

          {/* If they're a creator, jump to their channel */}
          {isCreator && (
            <TouchableOpacity
              style={styles.linkRow}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PodcastHostProfile', { username: u.username })}>
              <Icon name="tv" size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <AppText variant="small" style={{ flex: 1 }}>View channel</AppText>
              <Icon name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  avatarWrap: { alignItems: 'center', marginTop: spacing.md, position: 'relative' },
  avatarRing: { width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.surfaceElevated },
  onlineDot: { position: 'absolute', bottom: 4, right: '34%', width: 18, height: 18, borderRadius: 9, backgroundColor: '#3DD68C', borderWidth: 3, borderColor: colors.background },
  bioCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginTop: spacing.lg },
  actionRow: { flexDirection: 'row', marginTop: spacing.lg, gap: 10 },
  actBtn: { flex: 1, height: 46, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  actGhost: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: colors.border },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginTop: spacing.lg },
});

export default UserProfileScreen;