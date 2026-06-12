import React, { useState, useMemo } from 'react';
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
import { contentApi, roomsApi, ContentItem } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

const Thumb: React.FC<{ item: ContentItem; style: any }> = ({ item, style }) => {
  const sources = useMemo(() => {
    const l: string[] = [];
    if (item.thumbnailUrl) l.push(item.thumbnailUrl);
    if (item.videoId) {
      l.push(`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`);
      l.push(`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`);
    }
    return l;
  }, [item.thumbnailUrl, item.videoId]);
  const [i, setI] = useState(0);
  const uri = sources[i];
  if (!uri) return <View style={[style, { backgroundColor: colors.surfaceElevated }]} />;
  return <Image source={{ uri }} style={style} onError={() => { if (i < sources.length - 1) setI(i + 1); }} />;
};

const JoinPodcastScreen = () => {
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');

  // REAL podcast content from backend
  const podcastsQuery = useQuery({
    queryKey: queryKeys.contentList('PODCAST', ''),
    queryFn: () => contentApi.list({ category: 'PODCAST', limit: 40 }),
  });

  const all: ContentItem[] = podcastsQuery.data?.items || [];
  const live = all.slice(0, 6);     // featured as "live now"
  const more = all.slice(6);

  const joinByCodeMutation = useMutation({
    mutationFn: () => roomsApi.joinByCode(code.trim().toUpperCase()),
    onSuccess: ({ room }) => { setCode(''); navigation.navigate('Room', { roomId: room.id }); },
    onError: (err) => showApiError(err, 'Could not join room with that code.'),
  });

  const watchMutation = useMutation({
    mutationFn: (item: ContentItem) =>
      roomsApi.create({ name: item.title, videoUrl: item.videoUrl, isPrivate: false } as any),
    onSuccess: ({ room }: any) => navigation.navigate('Room', { roomId: room.id }),
    onError: (err) => showApiError(err, 'Could not start the podcast.'),
  });

  const onSubmitCode = () => {
    if (code.trim().length < 4) return Alert.alert('Invalid code', 'Please enter a valid room code.');
    joinByCodeMutation.mutate();
  };

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Join a podcast"
        infoIntro="Tune into live podcasts on WatchPartyLive or jump into a friend's room with a code."
        infoPoints={[
          { icon: 'mic', title: 'Live podcasts', text: 'Tap any podcast below to start watching it in a room instantly.' },
          { icon: 'key', title: 'Join by code', text: 'Got a room code from a friend? Enter it up top to join their session.' },
          { icon: 'people', title: 'Watch together', text: 'Invite friends into your room and react in real time as it plays.' },
        ]}
      />

      <FlatList
        data={more}
        keyExtractor={(i) => i.id}
        numColumns={3}
        columnWrapperStyle={{ paddingHorizontal: spacing.lg, justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 4, paddingHorizontal: spacing.lg }}>
              Live podcasts and shows — tap to watch together.
            </AppText>

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

            {podcastsQuery.isLoading && (
              <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            )}

            {/* Live now — horizontal */}
            {live.length > 0 && (
              <>
                <View style={styles.sectionHeadRow}>
                  <View style={styles.liveDotBig} />
                  <GradientText variant="h3" style={{ lineHeight: 28, paddingBottom: 2 }}>Live Now</GradientText>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
                  {live.map((p) => (
                    <TouchableOpacity key={p.id} style={styles.liveCard} activeOpacity={0.85} onPress={() => watchMutation.mutate(p)}>
                      <View style={styles.liveImgWrap}>
                        <Thumb item={p} style={styles.liveImg} />
                        <View style={styles.liveBadge}>
                          <View style={styles.liveDot} />
                          <AppText variant="tiny" bold style={{ fontSize: 9 }}>LIVE</AppText>
                        </View>
                        <View style={styles.playOverlay}>
                          <View style={styles.playCircle}><Icon name="play" size={16} color={colors.white} /></View>
                        </View>
                      </View>
                      <AppText variant="tiny" bold numberOfLines={2} style={{ width: 150, marginTop: 6 }}>{p.title}</AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {more.length > 0 && (
              <GradientText variant="h3" style={styles.allTitle}>All Podcasts</GradientText>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.gridCard} activeOpacity={0.85} onPress={() => watchMutation.mutate(item)}>
            <View style={styles.gridImgWrap}>
              <Thumb item={item} style={styles.gridImg} />
              <View style={styles.playOverlaySmall}>
                <View style={styles.playCircleSmall}><Icon name="play" size={12} color={colors.white} /></View>
              </View>
            </View>
            <AppText variant="tiny" bold numberOfLines={2} style={{ marginTop: 5 }}>{item.title}</AppText>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !podcastsQuery.isLoading ? (
            <View style={styles.center}>
              <Icon name="mic-outline" size={42} color={colors.textMuted} />
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }} center>
                No podcasts available yet.
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
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  liveDotBig: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF0000', marginRight: 8 },
  liveRow: { paddingLeft: spacing.lg, paddingRight: spacing.md },
  liveCard: { marginRight: spacing.md, width: 150 },
  liveImgWrap: { position: 'relative' },
  liveImg: { width: 150, height: 100, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated },
  liveBadge: {
    position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FF0000', marginRight: 3 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(238,48,99,0.85)', alignItems: 'center', justifyContent: 'center' },
  allTitle: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md, lineHeight: 28, paddingBottom: 2 },
  gridCard: { width: '31.5%', marginBottom: spacing.md },
  gridImgWrap: { position: 'relative' },
  gridImg: { width: '100%', aspectRatio: 1, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated },
  playOverlaySmall: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircleSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(238,48,99,0.85)', alignItems: 'center', justifyContent: 'center' },
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
});

export default JoinPodcastScreen;