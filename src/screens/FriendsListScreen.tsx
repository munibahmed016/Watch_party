import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { friendsApi, chatsApi, PublicUser } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

// Dashboard list of the user's friends.
const FriendsListScreen = () => {
  const navigation = useNavigation<any>();

  const friendsQuery = useQuery({
    queryKey: ['friends', 'list'],
    queryFn: () => friendsApi.list(100, 0),
  });
  const incomingQuery = useQuery({
    queryKey: ['friends', 'incoming'],
    queryFn: () => friendsApi.incoming(),
  });

  const friends = friendsQuery.data?.friends || [];
  const incoming = incomingQuery.data?.requests || [];

  // Tapping a friend opens (or creates) the 1-to-1 chat with them, then jumps
  // straight into the conversation. This is the same flow ChatsScreen uses.
  const openDirectMutation = useMutation({
    mutationFn: (userId: string) => chatsApi.openDirect(userId),
    onSuccess: ({ chat }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatsList });
      navigation.navigate('ChatDetail', {
        chatId: chat.id,
        name: chat.name,
        avatar: chat.avatarUrl,
      });
    },
    onError: err => showApiError(err, 'Could not open chat.'),
  });

  return (
    <ScreenContainer>
      <BrandHeader
        showBack
        onBack={() => navigation.goBack()}
        infoTitle="My Friends"
        infoIntro="Everyone you're connected with. Tap a friend to start chatting."
        infoPoints={[
          {
            icon: 'people',
            title: 'Friends',
            text: 'Your connections — tap to open a chat.',
          },
          {
            icon: 'person-add',
            title: 'Requests',
            text: 'Pending requests to accept.',
          },
        ]}
      />
      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.sm,
            marginBottom: spacing.md,
          }}>
          <GradientText
            variant="h2"
            style={{ lineHeight: 32, paddingBottom: 2 }}>
            My Friends
          </GradientText>
          <TouchableOpacity
            onPress={() => navigation.navigate('Friends')}
            style={styles.addBtn}
            activeOpacity={0.85}>
            <Icon name="person-add" size={16} color={colors.primary} />
            <AppText
              variant="tiny"
              bold
              color={colors.primary}
              style={{ marginLeft: 4 }}>
              Add
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Pending requests badge row */}
        {incoming.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('FriendRequests')}
            style={styles.pendingCard}>
            <View style={styles.pendingIcon}>
              <Icon name="person-add" size={18} color={colors.primary} />
            </View>
            <AppText variant="small" bold style={{ flex: 1 }}>
              {incoming.length} pending request{incoming.length > 1 ? 's' : ''}
            </AppText>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {friendsQuery.isLoading ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: spacing.xl }}
          />
        ) : friends.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
            <Icon name="people-outline" size={42} color={colors.textMuted} />
            <AppText
              variant="small"
              color={colors.textSecondary}
              center
              style={{ marginTop: 8 }}>
              No friends yet. Tap Add to find people.
            </AppText>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={f => f.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: PublicUser }) => {
              const avatar =
                item.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
                  item.username,
                )}&backgroundColor=ffdfbf`;
              const openChat = () => openDirectMutation.mutate(item.id);
              return (
                // Whole row is tappable -> opens the chat with this friend.
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.85}
                  onPress={openChat}>
                  <View>
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                    {item.isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText bold numberOfLines={1}>
                      {item.fullName || item.username}
                    </AppText>
                    <AppText variant="tiny" color={colors.textSecondary}>
                      @{item.username}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={openChat}
                    style={styles.chatBtn}
                    activeOpacity={0.85}
                    disabled={openDirectMutation.isPending}>
                    {openDirectMutation.isPending &&
                    openDirectMutation.variables === item.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Icon
                        name="chatbubble-ellipses"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(238,48,99,0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(238,48,99,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(238,48,99,0.3)',
    borderRadius: layout.radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 10,
  },
  pendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(238,48,99,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceElevated,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#3DD68C',
    borderWidth: 2,
    borderColor: colors.background,
  },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(238,48,99,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FriendsListScreen;
