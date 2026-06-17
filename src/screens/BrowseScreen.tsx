import React, { useState, useMemo, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TextInput, Image, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import BrandLogo from '@/components/BrandLogo';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { contentApi, ContentItem, ContentCategory } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

const CATEGORY_LABELS: Record<string, string> = {
  ALL: 'All', MOVIE: '🎬 Movies', COMEDY: '😂 Comedy', NEWS: '📺 News',
  CARTOON: '🧸 Cartoon', ANIME: '🌸 Anime', DRAMA: '🎭 Drama',
  SPORTS: '⚽ Sports', PODCAST: '🎙️ Podcast', TVSHOW: '📡 TV Shows',
};
const CATEGORY_ORDER: (ContentCategory | 'ALL')[] = ['ALL','MOVIE','COMEDY','NEWS','CARTOON','ANIME','DRAMA','SPORTS','PODCAST','TVSHOW'];
const NUM_COLUMNS = 3;
const PAGE_SIZE = 24;

const Thumb: React.FC<{ item: ContentItem; style: any }> = ({ item, style }) => {
  const sources = useMemo(() => {
    const list: string[] = [];
    if (item.thumbnailUrl) list.push(item.thumbnailUrl);
    if (item.videoId) {
      list.push(`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`);
      list.push(`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`);
    }
    return list;
  }, [item.thumbnailUrl, item.videoId]);
  const [idx, setIdx] = useState(0);
  const uri = sources[idx];
  if (!uri) return <View style={[style, { backgroundColor: colors.surfaceElevated }]} />;
  return <Image source={{ uri }} style={style} onError={() => { if (idx < sources.length - 1) setIdx(idx + 1); }} />;
};

const SkeletonCard: React.FC = () => (
  <View style={styles.card}>
    <View style={[styles.cardImg, styles.skeleton]} />
    <View style={[styles.skeletonLine, { width: '85%', marginTop: 6 }]} />
    <View style={[styles.skeletonLine, { width: '55%', marginTop: 4 }]} />
  </View>
);

const BrowseScreen = () => {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ContentCategory | 'ALL'>('ALL');

  const [debounced, setDebounced] = useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const categoriesQuery = useQuery({ queryKey: queryKeys.contentCategories, queryFn: () => contentApi.categories() });

  const countMap = useMemo(() => {
    const m: Record<string, number> = {};
    let total = 0;
    (categoriesQuery.data?.categories || []).forEach((c) => { m[c.category] = c.count; total += c.count; });
    m['ALL'] = total;
    return m;
  }, [categoriesQuery.data]);

  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.contentList(activeCategory, debounced),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => contentApi.list({
      category: activeCategory === 'ALL' ? undefined : activeCategory,
      search: debounced || undefined, page: pageParam as number, limit: PAGE_SIZE,
    }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const items: ContentItem[] = useMemo(() => (listQuery.data?.pages || []).flatMap((p) => p.items), [listQuery.data]);

  // content tap -> open Create Room with this content (user names it, then plays)
  const openCreate = useCallback((item: ContentItem) => {
    navigation.navigate('CreateRoom', {
      content: { title: item.title, videoUrl: item.videoUrl, videoId: item.videoId, thumbnailUrl: item.thumbnailUrl },
    });
  }, [navigation]);

  const onEndReached = useCallback(() => {
    if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) listQuery.fetchNextPage();
  }, [listQuery]);

  const renderCard = useCallback(({ item }: { item: ContentItem }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => openCreate(item)}>
      <View style={styles.cardImgWrap}>
        <Thumb item={item} style={styles.cardImg} />
        <View style={styles.playOverlay}><View style={styles.playCircle}><Icon name="play" size={14} color={colors.white} /></View></View>
      </View>
      <AppText variant="tiny" bold numberOfLines={2} style={styles.cardTitle}>{item.title}</AppText>
      {item.year && <AppText variant="tiny" color={colors.textMuted} numberOfLines={1}>{item.year}</AppText>}
    </TouchableOpacity>
  ), [openCreate]);

  const initialLoading = listQuery.isLoading && !listQuery.data;

  return (
    <ScreenContainer edges={['top']}>
      <View style={styles.head}>
        <TouchableOpacity style={styles.headBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}><Icon name="chevron-back" size={22} color={colors.white} /></TouchableOpacity>
        <BrandLogo size="sm" variant="small" />
        <TouchableOpacity style={styles.headBtn} onPress={() => navigation.navigate('HowItWorks')} activeOpacity={0.8}><Icon name="information-circle-outline" size={22} color={colors.white} /></TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={colors.textMuted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search movies, shows, news..." placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} style={styles.searchInput} returnKeyType="search" />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity>}
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {CATEGORY_ORDER.map((cat) => {
            const active = activeCategory === cat;
            const count = countMap[cat] || 0;
            const label = CATEGORY_LABELS[cat] || cat;
            if (cat !== 'ALL' && count === 0) return null;
            const displayLabel = count > 0 ? `${label}  ·  ${count}` : label;
            return (
              <TouchableOpacity key={cat} activeOpacity={0.85} onPress={() => setActiveCategory(cat)} style={[styles.pillTouch, active ? styles.pillActiveWrap : styles.pillInactive]}>
                {active && <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                <AppText variant="small" bold color={active ? colors.white : colors.textSecondary} numberOfLines={1}>{displayLabel}</AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {initialLoading ? (
        <View style={styles.gridPad}><View style={styles.skeletonGrid}>{Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}</View></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Icon name="film-outline" size={46} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 12 }}>{debounced ? `No results for "${debounced}"` : 'No content yet.'}</AppText>
        </View>
      ) : (
        <FlatList data={items} keyExtractor={(i) => i.id} numColumns={NUM_COLUMNS} renderItem={renderCard} columnWrapperStyle={styles.column} contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false} onEndReached={onEndReached} onEndReachedThreshold={0.5}
          ListFooterComponent={listQuery.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 120 }} />} />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.pill, paddingHorizontal: 16, height: 46 },
  searchInput: { flex: 1, color: colors.white, marginLeft: 8, fontFamily: 'Outfit-Regular', fontSize: 14 },
  pillRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, alignItems: 'center' },
  pillTouch: { marginRight: 10, paddingHorizontal: 20, paddingVertical: 11, borderRadius: layout.radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pillActiveWrap: {},
  pillInactive: { backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: colors.border },
  gridPad: { paddingHorizontal: spacing.lg },
  gridContent: { paddingHorizontal: spacing.lg },
  column: { justifyContent: 'space-between', marginBottom: spacing.md },
  card: { width: '31.5%' },
  cardImgWrap: { position: 'relative' },
  cardImg: { width: '100%', aspectRatio: 0.7, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(238,48,99,0.85)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { marginTop: 6 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  skeleton: { backgroundColor: colors.surfaceElevated },
  skeletonLine: { height: 9, borderRadius: 4, backgroundColor: colors.surfaceElevated },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});

export default BrowseScreen;