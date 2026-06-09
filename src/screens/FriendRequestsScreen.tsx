import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { friendsApi, FriendRequestSummary } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

type Tab = 'incoming' | 'outgoing';

const Avatar: React.FC<{ uri: string | null; name: string }> = ({ uri, name }) => {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return uri ? (
    <Image source={{ uri }} style={styles.avatar} />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback]}><AppText bold>{initials}</AppText></View>
  );
};

const FriendRequestsScreen = () => {
  const _navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('incoming');

  const incoming = useQuery({ queryKey: queryKeys.friendsIncoming, queryFn: () => friendsApi.incoming() });
  const outgoing = useQuery({ queryKey: queryKeys.friendsOutgoing, queryFn: () => friendsApi.outgoing() });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => friendsApi.acceptRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.friendsIncoming });
      qc.invalidateQueries({ queryKey: queryKeys.friendsList });
      qc.invalidateQueries({ queryKey: queryKeys.chatsList });
    },
    onError: (err) => showApiError(err, 'Could not accept.'),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => friendsApi.rejectRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.friendsIncoming }),
    onError: (err) => showApiError(err, 'Could not reject.'),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => friendsApi.cancelRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.friendsOutgoing }),
    onError: (err) => showApiError(err, 'Could not cancel.'),
  });

  const renderIncoming = ({ item }: { item: FriendRequestSummary }) => {
    if (!item.sender) return null;
    const sender = item.sender;
    return (
      <View style={styles.row}>
        <Avatar uri={sender.avatarUrl} name={sender.fullName || sender.username} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <AppText bold>{sender.fullName || sender.username}</AppText>
          <AppText variant="tiny" color={colors.textSecondary}>@{sender.username}</AppText>
        </View>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptMutation.mutate(item.id)} disabled={acceptMutation.isPending} activeOpacity={0.85}>
          <LinearGradient
            colors={colors.buttonGradient as unknown as string[]}
            start={colors.gradientStartPoint}
            end={colors.gradientEndPoint}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <AppText bold variant="small" color={colors.white}>Accept</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectMutation.mutate(item.id)} disabled={rejectMutation.isPending}>
          <AppText bold variant="small" color={colors.textPrimary}>Reject</AppText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOutgoing = ({ item }: { item: FriendRequestSummary }) => {
    if (!item.receiver) return null;
    const receiver = item.receiver;
    return (
      <View style={styles.row}>
        <Avatar uri={receiver.avatarUrl} name={receiver.fullName || receiver.username} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <AppText bold>{receiver.fullName || receiver.username}</AppText>
          <AppText variant="tiny" color={colors.textSecondary}>@{receiver.username}</AppText>
        </View>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => cancelMutation.mutate(item.id)} disabled={cancelMutation.isPending}>
          <AppText bold variant="small" color={colors.textPrimary}>Cancel</AppText>
        </TouchableOpacity>
      </View>
    );
  };

  const data = tab === 'incoming' ? incoming.data?.requests || [] : outgoing.data?.requests || [];
  const loading = tab === 'incoming' ? incoming.isLoading : outgoing.isLoading;

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Friend requests"
        infoIntro="Manage who you connect with on WatchPartyLive."
        infoPoints={[
          { icon: 'arrow-down-circle', title: 'Incoming', text: 'People who want to be your friend. Accept or reject each one.' },
          { icon: 'arrow-up-circle', title: 'Sent', text: 'Requests you sent. Cancel any that are still pending.' },
          { icon: 'people', title: 'Once accepted', text: 'New friends appear in your friends list and chats automatically.' },
        ]}
      />

      <GradientText variant="h1" style={styles.pageTitle}>Friend Requests</GradientText>

      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setTab('incoming')} style={[styles.tab, tab === 'incoming' && styles.tabActive]}>
          <AppText bold color={tab === 'incoming' ? colors.white : colors.textSecondary}>
            Incoming {incoming.data?.requests.length ? `(${incoming.data.requests.length})` : ''}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('outgoing')} style={[styles.tab, tab === 'outgoing' && styles.tabActive]}>
          <AppText bold color={tab === 'outgoing' ? colors.white : colors.textSecondary}>
            Sent {outgoing.data?.requests.length ? `(${outgoing.data.requests.length})` : ''}
          </AppText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <AppText variant="small" color={colors.textSecondary}>
            {tab === 'incoming' ? 'No incoming requests.' : 'No outgoing requests.'}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={tab === 'incoming' ? renderIncoming : renderOutgoing}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageTitle: { paddingHorizontal: spacing.lg, marginBottom: spacing.md, lineHeight: 40, paddingBottom: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: layout.radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999,
    marginLeft: spacing.xs, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: colors.border,
    marginLeft: spacing.xs,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});

export default FriendRequestsScreen;