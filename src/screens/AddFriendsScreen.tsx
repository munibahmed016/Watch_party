import React, { useState } from 'react';
import {
  View, StyleSheet, FlatList, TextInput, Image, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { friendsApi, usersApi, chatsApi, PublicUser } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

type RowItem = PublicUser & { requested?: boolean };

const FriendRow: React.FC<{
  item: RowItem;
  onAdd: () => void;
  onChat: () => void;
  sending: boolean;
}> = ({ item, onAdd, onChat, sending }) => (
  <View style={styles.rowOuter}>
    <View style={styles.rowCard}>
      <LinearGradient
        colors={['rgba(238,48,99,0.30)', 'rgba(74,81,161,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Avatar */}
      <Image
        source={{
          uri:
            item.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
              item.username,
            )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
        }}
        style={styles.avatar}
      />

      {/* Middle: name + add pill */}
      <View style={styles.middle}>
        <View style={styles.nameRow}>
          <AppText bold color={colors.white} numberOfLines={1} style={{ flexShrink: 1 }}>
            {item.fullName || item.username}
          </AppText>
          {item.isOnline && <View style={styles.greenDot} />}
        </View>

        <TouchableOpacity
          onPress={onAdd}
          disabled={item.requested || sending}
          style={[styles.addBtn, item.requested && styles.addBtnDone]}
          activeOpacity={0.85}>
          {sending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <AppText variant="tiny" bold color={item.requested ? colors.white : colors.primary}>
              {item.requested ? 'Requested' : 'Add Friend'}
            </AppText>
          )}
        </TouchableOpacity>
      </View>
    </View>

    {/* Chat circle outside the card */}
    <TouchableOpacity onPress={onChat} style={styles.chatBtn} activeOpacity={0.7}>
      <Icon name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
    </TouchableOpacity>
  </View>
);

const AddFriendsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [requested, setRequested] = useState<Set<string>>(new Set());

  const suggestionsQuery = useQuery({
    queryKey: queryKeys.friendsSuggestions,
    queryFn: () => friendsApi.suggestions(50),
    enabled: q.trim().length === 0,
  });

  const searchQuery = useQuery({
    queryKey: queryKeys.userSearch(q.trim()),
    queryFn: () => usersApi.search(q.trim(), 30),
    enabled: q.trim().length >= 1,
  });

  const sendMutation = useMutation({
    mutationFn: (receiverId: string) => friendsApi.sendRequest(receiverId),
    onSuccess: (_, receiverId) => {
      setRequested((s) => new Set(s).add(receiverId));
      qc.invalidateQueries({ queryKey: queryKeys.friendsOutgoing });
    },
    onError: (err) => showApiError(err, 'Could not send friend request.'),
  });

  const openChatMutation = useMutation({
    mutationFn: (userId: string) => chatsApi.openDirect(userId),
    onSuccess: ({ chat }) => {
      navigation.navigate('ChatDetail', { chatId: chat.id, name: chat.name, avatar: chat.avatarUrl });
    },
    onError: (err) => showApiError(err, 'Could not open chat.'),
  });

  const rawList = q.trim() ? (searchQuery.data?.users || []) : (suggestionsQuery.data?.users || []);
  const list: RowItem[] = rawList.map((u) => ({ ...u, requested: requested.has(u.id) }));
  const loading = q.trim() ? searchQuery.isLoading : suggestionsQuery.isLoading;

  const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

  return (
    <ScreenContainer>
      <BrandHeader
        showBack={!route.params?.fromOnboarding}
        infoTitle="Adding friends"
        infoIntro="Build your circle so watch parties are more fun. You can always do this later."
        infoPoints={[
          { icon: 'search', title: 'Search anyone', text: 'Type a name or username to find specific people on WatchPartyLive.' },
          { icon: 'person-add', title: 'Send a request', text: 'Tap Add Friend to send a request. They appear in your friends once accepted.' },
          { icon: 'chatbubble-ellipses', title: 'Start a chat', text: 'Tap the chat icon to message someone directly, even before they accept.' },
          { icon: 'play-skip-forward', title: 'Skip anytime', text: 'Not ready? Use Skip to jump straight into the app and explore.' },
        ]}
      />

      <AppText variant="h2" style={styles.pageTitle} bold center>
        Add Friends
      </AppText>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color="#999" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or username"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.85}>
          <Icon name="options-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Icon name="people-outline" size={42} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 12 }}>
            {q.trim() ? 'No users found.' : 'No suggestions yet — try searching.'}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          renderItem={({ item }) => (
            <FriendRow
              item={item}
              onAdd={() => sendMutation.mutate(item.id)}
              onChat={() => openChatMutation.mutate(item.id)}
              sending={sendMutation.isPending && sendMutation.variables === item.id}
            />
          )}
        />
      )}

      {/* Bottom action bar — Skip + Continue to Home */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={goHome} style={styles.skipBtn} activeOpacity={0.8}>
          <AppText bold color={colors.textSecondary}>Skip</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={goHome} style={styles.continueBtn} activeOpacity={0.85}>
          <LinearGradient
            colors={colors.buttonGradient as unknown as string[]}
            start={colors.gradientStartPoint}
            end={colors.gradientEndPoint}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <AppText bold color={colors.white}>Continue</AppText>
          <Icon name="arrow-forward" size={16} color={colors.white} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageTitle: { marginBottom: spacing.md, paddingBottom: 2 },

  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: 12,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999, paddingHorizontal: 18, height: 46,
  },
  searchInput: {
    flex: 1, color: '#333', marginLeft: 8,
    fontFamily: 'Outfit-Regular', fontSize: 14,
  },
  filterBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Row
  rowOuter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 10,
    paddingRight: 16,
    borderRadius: 999,
    minHeight: 96,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2.5, borderColor: colors.white,
    backgroundColor: colors.surfaceElevated,
  },
  middle: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginLeft: 6 },
  addBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    minWidth: 104, alignItems: 'center',
  },
  addBtnDone: { backgroundColor: colors.primary },
  chatBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 12,
  },
  skipBtn: {
    paddingHorizontal: 24, height: 50, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: colors.border,
  },
  continueBtn: {
    flex: 1, height: 50, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
});

export default AddFriendsScreen;