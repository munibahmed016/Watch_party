// src/screens/JoinPodcastScreen.tsx
//
// PIXEL-PERFECT match to Figma Screen 27 ("Join Podcast"):
//   - "Live on WatchPartyLive" row — 4 live host avatars with pink ring + "LIVE" red label
//   - "Best Suggestion For You" — 2 rows × 4 hosts each
//   - Tap host → opens their profile (PodcastHostProfile)
//   - "Join by code" floating input at the top (matches the "Join by code" pill on Home)
//
// Backend:
//   - For now uses friends suggestions + a subset of users as "live" — when you have a real
//     /api/podcasts/live endpoint we just swap the query function. The UI stays identical.

import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { friendsApi, roomsApi, PublicUser } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

// =============================================================
// Avatar tile (matches Figma — round avatar w/ optional LIVE badge)
// =============================================================

const HostTile: React.FC<{
  user: PublicUser;
  live?: boolean;
  onPress: () => void;
}> = ({ user, live, onPress }) => {
  const avatarUrl =
    user.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
      user.username,
    )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.tile}>
      <View style={[styles.avatarRing, live && styles.avatarRingLive]}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        {live && (
          <View style={styles.liveBadge}>
            <AppText variant="tiny" bold style={{ fontSize: 9 }}>LIVE</AppText>
          </View>
        )}
      </View>
      <AppText variant="tiny" style={{ marginTop: 6 }} numberOfLines={1}>
        @{user.username}
      </AppText>
    </TouchableOpacity>
  );
};

// =============================================================
// Screen
// =============================================================

const JoinPodcastScreen = () => {
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');

  // Suggestions (will serve both rows for now)
  const suggestionsQuery = useQuery({
    queryKey: queryKeys.friendsSuggestions,
    queryFn: () => friendsApi.suggestions(20),
  });

  const all: PublicUser[] = suggestionsQuery.data?.users || [];
  const live = all.slice(0, 4);
  const suggestions = all.slice(4, 12);

  // Join room by code
  const joinByCodeMutation = useMutation({
    mutationFn: () => roomsApi.joinByCode(code.trim().toUpperCase()),
    onSuccess: ({ room }) => {
      setCode('');
      navigation.navigate('Room', { roomId: room.id });
    },
    onError: (err) => showApiError(err, 'Could not join room with that code.'),
  });

  const onSubmitCode = () => {
    if (code.trim().length < 4) {
      return Alert.alert('Invalid code', 'Please enter a valid room code.');
    }
    joinByCodeMutation.mutate();
  };

  return (
    <ScreenContainer>
      <AppHeader title="Join Podcast" showLogo={false} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>

        <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 4 }}>
          Lorem ipsum is simply dummy text of the printing and typesetting{'\n'}
          industry. Lorem Ipsum has been the.
        </AppText>

        {/* Join by code */}
        <View style={styles.codeWrap}>
          <View style={styles.codeBox}>
            <Icon name="key-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Enter room code"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              style={styles.codeInput}
              onSubmitEditing={onSubmitCode}
              returnKeyType="go"
            />
          </View>
          <TouchableOpacity
            onPress={onSubmitCode}
            disabled={joinByCodeMutation.isPending}
            activeOpacity={0.85}
            style={styles.codeBtn}>
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.codeBtnInner}>
              {joinByCodeMutation.isPending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <AppText variant="small" bold>Join</AppText>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {suggestionsQuery.isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {/* Live row */}
        {live.length > 0 && (
          <>
            <AppText variant="h3" bold center style={{ marginTop: spacing.xl }}>
              Live on{'\n'}WatchPartyLive
            </AppText>
            <View style={styles.row}>
              {live.map((u) => (
                <HostTile
                  key={u.id}
                  user={u}
                  live
                  onPress={() => navigation.navigate('PodcastHostProfile', { username: u.username })}
                />
              ))}
            </View>
          </>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <>
            <AppText variant="h3" bold center style={{ marginTop: spacing.xl }}>
              Best Suggestion For You
            </AppText>
            <View style={styles.gridSuggest}>
              {suggestions.map((u) => (
                <HostTile
                  key={u.id}
                  user={u}
                  onPress={() => navigation.navigate('PodcastHostProfile', { username: u.username })}
                />
              ))}
            </View>
          </>
        )}

        {!suggestionsQuery.isLoading && all.length === 0 && (
          <View style={styles.center}>
            <Icon name="mic-outline" size={42} color={colors.textMuted} />
            <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }} center>
              No podcasts available yet.{'\n'}Check back soon.
            </AppText>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  // Join by code
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: 8,
  },
  codeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 44,
  },
  codeInput: {
    flex: 1,
    color: colors.white,
    fontFamily: 'SchibstedGrotesk',
    fontSize: 14,
    marginLeft: 8,
    letterSpacing: 2,
  },
  codeBtn: { height: 44 },
  codeBtnInner: {
    paddingHorizontal: 22, height: 44,
    borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },

  // Tile
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  avatarRing: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    position: 'relative',
  },
  avatarRingLive: {
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 1,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 999 },
  liveBadge: {
    position: 'absolute', bottom: -4,
    paddingHorizontal: 6, paddingVertical: 1,
    backgroundColor: '#FF0000',
    borderRadius: 4,
  },

  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  gridSuggest: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },

  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
});

export default JoinPodcastScreen;