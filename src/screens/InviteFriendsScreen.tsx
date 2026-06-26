import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import ConfirmModal from '@/components/ConfirmModal';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { friendsApi, roomsApi, PublicUser } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

// Pick which friends to invite into a room (no more auto-invite everyone).
// Receives route param: { roomId }
const InviteFriendsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const roomId: string = route.params?.roomId;

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<null | { title: string; message: string }>(null);

  const friendsQuery = useQuery({
    queryKey: ['friends', 'list'],
    queryFn: () => friendsApi.list(50, 0),
  });
  const friends = friendsQuery.data?.friends || [];

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const inviteMutation = useMutation({
    mutationFn: () => roomsApi.inviteFriends(roomId, selectedIds),
    onSuccess: () => {
      setDone({
        title: 'Invites sent! 🎉',
        message: `${selectedIds.length} friend${selectedIds.length > 1 ? 's' : ''} notified. They can tap the notification to join your room.`,
      });
    },
    onError: (err) => showApiError(err, 'Could not send invites.'),
  });

  const onInvite = () => {
    if (selectedIds.length === 0) return;
    inviteMutation.mutate();
  };

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Invite friends"
        infoIntro="Choose who to invite to your watch party. Only the friends you pick get notified."
        infoPoints={[
          { icon: 'people', title: 'Pick friends', text: 'Tap to select who to invite.' },
          { icon: 'notifications', title: 'They get notified', text: 'A notification is sent to each.' },
          { icon: 'enter', title: 'One-tap join', text: 'They tap it to jump straight into the room.' },
        ]}
      />
      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        <GradientText variant="h2" style={{ lineHeight: 32, paddingBottom: 2, marginTop: spacing.sm }}>Invite Friends</GradientText>
        <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
          {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select friends to invite'}
        </AppText>

        {friendsQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : friends.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
            <Icon name="people-outline" size={42} color={colors.textMuted} />
            <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 8 }}>
              No friends yet. Add friends first, then invite them here.
            </AppText>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(f) => f.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: PublicUser }) => {
              const isOn = !!selected[item.id];
              const avatar = item.avatarUrl
                || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(item.username)}&backgroundColor=ffdfbf`;
              return (
                <TouchableOpacity activeOpacity={0.85} onPress={() => toggle(item.id)}
                  style={[styles.row, isOn && styles.rowOn]}>
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText bold numberOfLines={1}>{item.fullName || item.username}</AppText>
                    <AppText variant="tiny" color={colors.textSecondary}>@{item.username}</AppText>
                  </View>
                  <View style={[styles.check, isOn && styles.checkOn]}>
                    {isOn && <Icon name="checkmark" size={15} color={colors.white} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Invite button */}
      {friends.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity activeOpacity={0.85} onPress={onInvite}
            disabled={selectedIds.length === 0 || inviteMutation.isPending}
            style={[styles.inviteBtn, selectedIds.length === 0 && { opacity: 0.5 }]}>
            <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            {inviteMutation.isPending
              ? <ActivityIndicator color={colors.white} />
              : <>
                  <Icon name="paper-plane" size={16} color={colors.white} style={{ marginRight: 8 }} />
                  <AppText bold color={colors.white}>
                    {selectedIds.length > 0 ? `Invite ${selectedIds.length}` : 'Invite'}
                  </AppText>
                </>}
          </TouchableOpacity>
        </View>
      )}

      <ConfirmModal
        visible={!!done}
        title={done?.title || ''}
        message={done?.message}
        confirmLabel="Done"
        cancelLabel="Close"
        icon="checkmark-circle"
        onConfirm={() => { setDone(null); navigation.goBack(); }}
        onCancel={() => { setDone(null); navigation.goBack(); }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.md, padding: spacing.sm, marginBottom: spacing.sm,
  },
  rowOn: { borderColor: colors.primary, backgroundColor: 'rgba(238,48,99,0.12)' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceElevated },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: 'rgba(7,7,14,0.9)' },
  inviteBtn: { height: 52, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

export default InviteFriendsScreen;