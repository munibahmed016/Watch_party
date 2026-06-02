// src/screens/AddFriendsScreen.tsx
// Figma Screen 32 — 100% replication
//
// Card layout (left → right):
//   [Avatar 60x60]  [Name on top, Add Friend pill below]  [Chat icon circle]
//
// Card itself: pill-shape with purple→magenta gradient, NOT cut on right
// Add Friend pill sits in the middle area, NOT overlapping the name

import React, { useState } from 'react';
import {
  View, StyleSheet, FlatList, TextInput, Image, TouchableOpacity, ActivityIndicator,
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
    <LinearGradient
      colors={['rgba(236, 72, 153, 0.45)', 'rgba(168, 85, 247, 0.18)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.rowGradient}>

      {/* Avatar */}
      <View style={styles.avatarWrap}>
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
      </View>

      {/* Middle: name on top, Add Friend pill below */}
      <View style={styles.middle}>
        <View style={styles.nameRow}>
          <AppText bold color={colors.white} numberOfLines={1} style={{ marginRight: 6 }}>
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
            <AppText
              variant="small"
              bold
              color={item.requested ? colors.white : colors.primary}>
              {item.requested ? 'Requested' : 'Add Friend'}
            </AppText>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>

    {/* Chat circle OUTSIDE the gradient — sits at the far right */}
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

  const showDoneFab = route.params?.fromOnboarding === true;

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
      navigation.navigate('ChatDetail', {
        chatId: chat.id,
        name: chat.name,
        avatar: chat.avatarUrl,
      });
    },
    onError: (err) => showApiError(err, 'Could not open chat.'),
  });

  const rawList = q.trim()
    ? (searchQuery.data?.users || [])
    : (suggestionsQuery.data?.users || []);

  const list: RowItem[] = rawList.map((u) => ({ ...u, requested: requested.has(u.id) }));
  const loading = q.trim() ? searchQuery.isLoading : suggestionsQuery.isLoading;

  return (
    <ScreenContainer>
      <AppHeader title="Add Friends" showLogo={false} />

      {/* Search row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color="#999" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder=""
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
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
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
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: showDoneFab ? 110 : 30,
          }}
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

      {showDoneFab && (
        <TouchableOpacity
          style={styles.doneFab}
          onPress={() => navigation.replace('MainTabs')}
          activeOpacity={0.85}>
          <LinearGradient
            colors={colors.buttonGradient as unknown as string[]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.doneFabInner}>
            <AppText bold color={colors.white}>Done</AppText>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  // ---- Search ----
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: 12,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#333',
    marginLeft: 8,
    fontFamily: 'SchibstedGrotesk',
    fontSize: 14,
  },
  filterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ---- Row: outer container holds gradient pill + chat circle separately ----
  rowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: 999,
    minHeight: 86,
  },

  // ---- Avatar ----
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 2.5,
    borderColor: colors.white,
    backgroundColor: colors.surfaceElevated,
  },

  // ---- Middle: name + Add Friend stacked vertically ----
  middle: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  greenDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#22C55E',
  },

  // ---- Add Friend pill ----
  addBtn: {
    paddingHorizontal: 22, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    minWidth: 110,
    alignItems: 'center',
  },
  addBtnDone: { backgroundColor: colors.primary },

  // ---- Chat circle outside the gradient pill ----
  chatBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  center: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl,
  },

  doneFab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  doneFabInner: {
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 999,
  },
});

export default AddFriendsScreen;