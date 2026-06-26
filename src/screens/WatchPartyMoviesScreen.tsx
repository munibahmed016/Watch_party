import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { contentApi, roomsApi, ContentItem } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const CATEGORY_ICONS: Record<string, string> = {
  MOVIE: 'film',
  SHOW: 'tv',
  DOCUMENTARY: 'earth',
  SPORTS: 'football',
  MUSIC: 'musical-notes',
  NEWS: 'newspaper',
  KIDS: 'happy',
  COMEDY: 'happy-outline',
  DRAMA: 'theater-masks',
  ALL: 'grid',
};

const WatchPartyMoviesScreen = () => {
  const navigation = useNavigation<any>();
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Load all content + categories
  const contentQuery = useQuery({
    queryKey: ['watchparty-movies', activeCategory],
    queryFn: () => contentApi.list({
      category: activeCategory === 'ALL' ? undefined : activeCategory as any,
      limit: 60,
      adminOnly: true,  // sirf admin-uploaded content, creators ka nahi
    }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['content-categories'],
    queryFn: () => contentApi.categories(true),  // sirf admin content ki categories
  });

  const joinMutation = useMutation({
    mutationFn: (item: ContentItem) =>
      roomsApi.create({
        name: item.title,
        videoUrl: item.videoUrl,
        isPrivate: false,
      }),
    onSuccess: ({ room }) => navigation.navigate('Room', { roomId: room.id }),
    onError: (err) => showApiError(err, 'Could not start watch party.'),
  });

  const categories: string[] = ['ALL', ...(categoriesQuery.data?.categories?.map((c: { category: string; count: number }) => c.category) || [])];

  const filtered = useMemo(() => {
    const items: ContentItem[] = contentQuery.data?.items || [];
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q)
    );
  }, [contentQuery.data?.items, search]);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <GradientText variant="h3" style={{ lineHeight: 28, paddingBottom: 2 }}>
            WatchParty Movies
          </GradientText>
          <AppText variant="tiny" color={colors.textSecondary}>
            Official WatchParty content
          </AppText>
        </View>
        <View style={styles.wpBadge}>
          <AppText variant="tiny" bold color={colors.white}>WP</AppText>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Icon name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search movies, shows..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category tabs */}
      <View>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c}
          contentContainerStyle={styles.catRow}
          renderItem={({ item: cat }) => {
            const active = cat === activeCategory;
            const icon = CATEGORY_ICONS[cat] || 'grid';
            return (
              <TouchableOpacity
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.85}
                style={[styles.catChip, active && styles.catChipActive]}>
                {active ? (
                  <LinearGradient
                    colors={colors.buttonGradient as unknown as string[]}
                    start={colors.gradientStartPoint}
                    end={colors.gradientEndPoint}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                  />
                ) : null}
                <Icon name={icon} size={13} color={active ? colors.white : colors.textSecondary} style={{ marginRight: 5 }} />
                <AppText variant="tiny" bold color={active ? colors.white : colors.textSecondary}>
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </AppText>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Content grid */}
      {contentQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Icon name="film-outline" size={48} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 12 }}>
            {search ? 'No results found.' : 'No content yet.'}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={contentQuery.isFetching}
              onRefresh={() => contentQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => joinMutation.mutate(item)}>
              {/* Thumbnail */}
              <View style={styles.thumbWrap}>
                <Image
                  source={{
                    uri: item.thumbnailUrl ||
                      (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg` : undefined),
                  }}
                  style={styles.thumb}
                />
                {/* WP badge — official content */}
                <View style={styles.wpBadgeCard}>
                  <LinearGradient
                    colors={colors.buttonGradient as unknown as string[]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                  />
                  <AppText style={{ fontSize: 8, fontWeight: '800', color: '#fff' }}>WP</AppText>
                </View>
                {/* Play overlay */}
                <View style={styles.playOverlay}>
                  <View style={styles.playBtn}>
                    {joinMutation.isPending ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Icon name="play" size={18} color={colors.white} />
                    )}
                  </View>
                </View>
                {/* Featured badge */}
                {item.isFeatured && (
                  <View style={styles.featuredBadge}>
                    <Icon name="star" size={9} color="#FFD700" style={{ marginRight: 3 }} />
                    <AppText style={{ fontSize: 9, color: '#FFD700', fontWeight: '700' }}>FEATURED</AppText>
                  </View>
                )}
              </View>
              {/* Info */}
              <View style={{ padding: 8 }}>
                <AppText bold numberOfLines={2} style={{ fontSize: 13, lineHeight: 18 }}>
                  {item.title}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                  <AppText variant="tiny" color={colors.textSecondary}>
                    {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
                  </AppText>
                  {item.year && (
                    <AppText variant="tiny" color={colors.textMuted}>{item.year}</AppText>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Icon name="eye" size={11} color={colors.textMuted} style={{ marginRight: 3 }} />
                  <AppText variant="tiny" color={colors.textMuted}>{item.viewCount ?? 0} views</AppText>
                  {item.rating && (
                    <>
                      <Icon name="star" size={11} color="#FFD700" style={{ marginLeft: 8, marginRight: 3 }} />
                      <AppText variant="tiny" color={colors.textMuted}>{item.rating}</AppText>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  wpBadge: {
    width: 34, height: 34, borderRadius: 17, overflow: 'hidden',
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.md,
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14, fontFamily: 'Outfit-Regular' },
  catRow: { paddingLeft: spacing.md, paddingRight: spacing.xl, paddingBottom: spacing.sm },
  catChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginRight: 8, overflow: 'hidden',
  },
  catChipActive: { borderColor: colors.primary },
  row: { justifyContent: 'space-between', marginBottom: spacing.md },
  card: {
    width: '48.5%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: layout.radius.md,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: '100%', height: 160, backgroundColor: colors.surfaceElevated },
  wpBadgeCard: {
    position: 'absolute', top: 8, left: 8,
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(238,48,99,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  featuredBadge: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 999,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
});

export default WatchPartyMoviesScreen;