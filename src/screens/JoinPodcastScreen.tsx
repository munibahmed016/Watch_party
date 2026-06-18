import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
import { creatorsApi, roomsApi, Creator, LiveSession } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

// Avatar with graceful fallback
const Avatar: React.FC<{ uri?: string | null; style: any }> = ({ uri, style }) => {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[style, { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
        <Icon name="person" size={22} color={colors.textMuted} />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} onError={() => setFailed(true)} />;
};

const JoinPodcastScreen = () => {
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');

  // Live sessions (the "Live on WatchPartyLive" row)
  const liveQuery = useQuery({
    queryKey: ['creators', 'live-sessions'],
    queryFn: () => creatorsApi.liveSessions(20),
  });

  // All approved creators (grid)
  const creatorsQuery = useQuery({
    queryKey: ['creators', 'list'],
    queryFn: () => creatorsApi.list({ limit: 40 }),
  });

  const liveSessions: LiveSession[] = liveQuery.data?.items || [];
  const creators: Creator[] = creatorsQuery.data?.items || [];

  const joinByCodeMutation = useMutation({
    mutationFn: () => roomsApi.joinByCode(code.trim().toUpperCase()),
    onSuccess: ({ room }) => { setCode(''); navigation.navigate('Room', { roomId: room.id }); },
    onError: (err) => showApiError(err, 'Could not join room with that code.'),
  });

  const onSubmitCode = () => {
    if (code.trim().length < 4) return Alert.alert('Invalid code', 'Please enter a valid room code.');
    joinByCodeMutation.mutate();
  };

  // Tap a creator -> their profile
  const openCreator = (username: string) => navigation.navigate('PodcastHostProfile', { username });

  const loading = liveQuery.isLoading || creatorsQuery.isLoading;

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Join a podcast"
        infoIntro="Discover creators live on WatchPartyLive, explore their channels, or jump into a friend's room with a code."
        infoPoints={[
          { icon: 'radio', title: 'Live now', text: 'Tap a creator who is live to join their stream instantly.' },
          { icon: 'people', title: 'Discover creators', text: 'Browse every creator and open their channel, videos and schedule.' },
          { icon: 'key', title: 'Join by code', text: 'Got a room code from a friend? Enter it up top to join their session.' },
        ]}
      />

      <FlatList
        data={creators}
        keyExtractor={(c) => c.id}
        numColumns={4}
        columnWrapperStyle={{ paddingHorizontal: spacing.lg, justifyContent: 'flex-start', gap: 12 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Join by code */}
            <View style={styles.codeWrap}>
              <View style={styles.codeBox}>
                <Icon name="key-outline" size={18} color={colors.textMuted} />
                <TextInput
                  value={code} onChangeText={setCode}
                  placeholder="Enter room code" placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters" autoCorrect={false} maxLength={8}
                  style={styles.codeInput} onSubmitEditing={onSubmitCode} returnKeyType="go"
                />
              </View>
              <TouchableOpacity onPress={onSubmitCode} disabled={joinByCodeMutation.isPending} activeOpacity={0.85} style={styles.codeBtn}>
                <LinearGradient colors={colors.buttonGradient as unknown as string[]}
                  start={colors.gradientStartPoint} end={colors.gradientEndPoint}
                  style={StyleSheet.absoluteFillObject} pointerEvents="none" />
                {joinByCodeMutation.isPending
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <AppText variant="small" bold color={colors.white}>Join</AppText>}
              </TouchableOpacity>
            </View>

            {/* Upcoming Events button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Events')}
              style={styles.eventsBtn}>
              <Icon name="calendar" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <AppText bold color={colors.primary}>Upcoming Events</AppText>
              <Icon name="chevron-forward" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {loading && (
              <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            )}

            {/* Live on WatchPartyLive — horizontal */}
            {liveSessions.length > 0 && (
              <>
                <View style={styles.sectionHeadRow}>
                  <View style={styles.liveDotBig} />
                  <GradientText variant="h3" style={{ lineHeight: 28, paddingBottom: 2 }}>Live on WatchPartyLive</GradientText>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
                  {liveSessions.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.liveAvatarCard}
                      activeOpacity={0.85}
                      onPress={() => s.creator?.username && openCreator(s.creator.username)}>
                      <View style={styles.liveAvatarWrap}>
                        <Avatar uri={s.creator?.avatarUrl} style={styles.liveAvatar} />
                        <View style={styles.liveRing} pointerEvents="none" />
                        <View style={styles.liveBadge}>
                          <View style={styles.liveDot} />
                          <AppText variant="tiny" bold style={{ fontSize: 9 }}>LIVE</AppText>
                        </View>
                      </View>
                      <AppText variant="tiny" bold numberOfLines={1} style={{ width: 72, marginTop: 6, textAlign: 'center' }}>
                        {s.creator?.username || s.title}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <GradientText variant="h3" style={styles.allTitle}>Best Suggestion For You</GradientText>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.gridCard} activeOpacity={0.85} onPress={() => openCreator(item.username)}>
            <View style={styles.gridAvatarWrap}>
              <Avatar uri={item.avatarUrl} style={styles.gridAvatar} />
              {item.isLive && (
                <View style={styles.gridLiveBadge}>
                  <View style={styles.liveDot} />
                  <AppText variant="tiny" bold style={{ fontSize: 8 }}>LIVE</AppText>
                </View>
              )}
            </View>
            <AppText variant="tiny" bold numberOfLines={1} style={{ marginTop: 5, width: 72, textAlign: 'center' }}>
              {item.username}
            </AppText>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.center}>
              <Icon name="people-outline" size={42} color={colors.textMuted} />
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }} center>
                No creators yet. Be the first to go live!
              </AppText>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  codeWrap: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: 10, paddingHorizontal: spacing.lg },
  codeBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    borderRadius: 999, paddingHorizontal: 14, height: 46,
  },
  codeInput: { flex: 1, color: colors.white, fontFamily: 'Outfit-Regular', fontSize: 14, marginLeft: 8, letterSpacing: 2 },
  codeBtn: {
    height: 46, paddingHorizontal: 24, borderRadius: 999, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  eventsBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(238,48,99,0.12)', borderWidth: 1, borderColor: colors.primary,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16,
    marginHorizontal: spacing.lg, marginTop: spacing.md,
  },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  liveDotBig: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF0000', marginRight: 8 },
  liveRow: { paddingLeft: spacing.lg, paddingRight: spacing.md, paddingVertical: 4 },

  liveAvatarCard: { marginRight: spacing.lg, alignItems: 'center', width: 72 },
  liveAvatarWrap: { position: 'relative', width: 64, height: 64 },
  liveAvatar: { width: 64, height: 64, borderRadius: 32 },
  liveRing: {
    ...StyleSheet.absoluteFillObject, borderRadius: 32,
    borderWidth: 2, borderColor: colors.primary,
  },
  liveBadge: {
    position: 'absolute', bottom: -2, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FF0000', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    left: 0, right: 0, justifyContent: 'center', marginHorizontal: 14,
  },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.white, marginRight: 3 },

  allTitle: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md, lineHeight: 28, paddingBottom: 2 },

  gridCard: { alignItems: 'center', marginBottom: spacing.lg, width: 72 },
  gridAvatarWrap: { position: 'relative', width: 64, height: 64 },
  gridAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.border2 },
  gridLiveBadge: {
    position: 'absolute', bottom: -2, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FF0000', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4,
    left: 8, right: 8, justifyContent: 'center',
  },
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
});

export default JoinPodcastScreen;