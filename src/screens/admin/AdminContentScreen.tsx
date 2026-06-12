import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ScrollView, RefreshControl } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { adminApi, contentApi, ContentItem } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const CATS = ['MOVIE', 'COMEDY', 'NEWS', 'CARTOON', 'ANIME', 'DRAMA', 'SPORTS', 'PODCAST', 'TVSHOW'];

const AdminContentScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [cat, setCat] = useState('MOVIE');
  const [featured, setFeatured] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string | null>(null); // null = all

  // pull a big batch, sort + filter client-side (alphabetical)
  const listQ = useQuery({ queryKey: ['admin', 'content'], queryFn: () => contentApi.list({ limit: 500 }) });

  const add = useMutation({
    mutationFn: () => adminApi.createContent({ title: title.trim(), videoUrl: url.trim(), category: cat, isFeatured: featured }),
    onSuccess: () => { setTitle(''); setUrl(''); setFeatured(false); qc.invalidateQueries({ queryKey: ['admin', 'content'] }); Alert.alert('Added', 'Content added.'); },
    onError: (e) => showApiError(e, 'Could not add.'),
  });
  const toggleFeature = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => adminApi.updateContent(id, { isFeatured: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'content'] }),
    onError: (e) => showApiError(e, 'Could not update.'),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminApi.deleteContent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'content'] }),
    onError: (e) => showApiError(e, 'Could not delete.'),
  });

  // filter + alphabetical sort
  const items = useMemo(() => {
    let list = listQ.data?.items || [];
    if (filterCat) list = list.filter((i) => i.category === filterCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }, [listQ.data, filterCat, search]);

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Content management"
        infoIntro="Add, feature and remove content. Search and filter by category."
        infoPoints={[
          { icon: 'add-circle', title: 'Add', text: 'Paste a YouTube link, choose a category.' },
          { icon: 'search', title: 'Search & filter', text: 'Find content by name or category, sorted A–Z.' },
          { icon: 'trash', title: 'Remove', text: 'Delete content you no longer want.' },
        ]}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={() => listQ.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <GradientText variant="h1" style={styles.title}>Content</GradientText>

            {/* Add form */}
            <View style={styles.card}>
              <AppText bold style={{ marginBottom: spacing.sm }}>Add New</AppText>
              <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.textMuted} style={styles.input} />
              <TextInput value={url} onChangeText={setUrl} placeholder="YouTube URL or video id" placeholderTextColor={colors.textMuted} autoCapitalize="none" style={styles.input} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                {CATS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setCat(c)} style={[styles.pill, cat === c && styles.pillOn]}>
                    {cat === c && <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                    <AppText variant="tiny" bold color={cat === c ? colors.white : colors.textSecondary}>{c}</AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setFeatured(!featured)} style={styles.checkRow}>
                <Icon name={featured ? 'checkbox' : 'square-outline'} size={20} color={featured ? colors.primary : colors.textSecondary} />
                <AppText variant="small" style={{ marginLeft: 8 }}>Featured</AppText>
              </TouchableOpacity>
              <AppButton title={add.isPending ? 'Adding…' : '+ Add Content'} size="md" fullWidth disabled={add.isPending}
                onPress={() => { if (!title.trim() || !url.trim()) return Alert.alert('Missing', 'Title and URL required.'); add.mutate(); }} />
            </View>

            {/* SEARCH */}
            <View style={styles.searchBox}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search content by name" placeholderTextColor={colors.textMuted} style={styles.searchInput} autoCapitalize="none" />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={16} color={colors.textSecondary} /></TouchableOpacity>
              )}
            </View>

            {/* CATEGORY FILTER */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <TouchableOpacity onPress={() => setFilterCat(null)} style={[styles.pill, !filterCat && styles.pillOn]}>
                {!filterCat && <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                <AppText variant="tiny" bold color={!filterCat ? colors.white : colors.textSecondary}>ALL</AppText>
              </TouchableOpacity>
              {CATS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setFilterCat(c)} style={[styles.pill, filterCat === c && styles.pillOn]}>
                  {filterCat === c && <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                  <AppText variant="tiny" bold color={filterCat === c ? colors.white : colors.textSecondary}>{c}</AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <AppText variant="tiny" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              {items.length} items · sorted A–Z{filterCat ? ` · ${filterCat}` : ''}
            </AppText>
          </View>
        }
        renderItem={({ item }: { item: ContentItem }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText variant="small" bold numberOfLines={1}>{item.title}</AppText>
              <AppText variant="tiny" color={colors.textSecondary}>{item.category} · {item.viewCount || 0} views</AppText>
            </View>
            <TouchableOpacity onPress={() => toggleFeature.mutate({ id: item.id, val: !item.isFeatured })} style={styles.iconBtn}>
              <Icon name={item.isFeatured ? 'star' : 'star-outline'} size={18} color={item.isFeatured ? '#F4C20D' : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Delete', item.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => del.mutate(item.id) }])} style={styles.iconBtn}>
              <Icon name="trash-outline" size={18} color="#E5484D" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 20 }}>No content found.</AppText>}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.lg, padding: spacing.md, marginBottom: spacing.md },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.white, fontFamily: 'Outfit-Regular', fontSize: 14, marginBottom: spacing.sm },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginRight: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border },
  pillOn: { borderColor: 'transparent' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, height: 44, marginBottom: spacing.md, gap: 8 },
  searchInput: { flex: 1, color: colors.white, fontFamily: 'Outfit-Regular' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm },
  iconBtn: { padding: 8, marginLeft: 4 },
});

export default AdminContentScreen;