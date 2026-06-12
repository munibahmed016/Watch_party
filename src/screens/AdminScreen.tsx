// src/screens/AdminScreen.tsx
// In-app admin panel — ONLY reachable when user.isAdmin === true.
// Add content, view/delete content, view/verify/delete users, see stats.

import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
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

type Tab = 'stats' | 'content' | 'users';
const CATEGORIES = ['MOVIE', 'COMEDY', 'NEWS', 'CARTOON', 'ANIME', 'DRAMA', 'SPORTS', 'PODCAST', 'TVSHOW'];

const AdminScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('stats');

  // form
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('MOVIE');
  const [userSearch, setUserSearch] = useState('');

  const statsQuery = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => adminApi.stats() });
  const contentQuery = useQuery({ queryKey: ['admin', 'content'], queryFn: () => contentApi.list({ limit: 50 }) });
  const usersQuery = useQuery({ queryKey: ['admin', 'users', userSearch], queryFn: () => adminApi.listUsers(userSearch) });

  const addContent = useMutation({
    mutationFn: () => adminApi.createContent({ title: title.trim(), videoUrl: url.trim(), category }),
    onSuccess: () => {
      setTitle(''); setUrl('');
      qc.invalidateQueries({ queryKey: ['admin', 'content'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      Alert.alert('Added', 'Content added successfully.');
    },
    onError: (e) => showApiError(e, 'Could not add content.'),
  });

  const delContent = useMutation({
    mutationFn: (id: string) => adminApi.deleteContent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'content'] }); qc.invalidateQueries({ queryKey: ['admin', 'stats'] }); },
    onError: (e) => showApiError(e, 'Could not delete.'),
  });

  const verifyUser = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => adminApi.updateUser(id, { isVerified: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (e) => showApiError(e, 'Could not update.'),
  });
  const delUser = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); qc.invalidateQueries({ queryKey: ['admin', 'stats'] }); },
    onError: (e) => showApiError(e, 'Could not delete user.'),
  });

  const stats = statsQuery.data;
  const content = contentQuery.data?.items || [];
  const users = usersQuery.data?.users || [];

  const confirmDelContent = (id: string, t: string) =>
    Alert.alert('Delete content', t, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => delContent.mutate(id) }]);
  const confirmDelUser = (id: string, name: string) =>
    Alert.alert('Delete user', name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => delUser.mutate(id) }]);

  return (
    <ScreenContainer>
      <BrandHeader
        showBack
        onBack={() => navigation.goBack()}
        infoTitle="Admin panel"
        infoIntro="Master control — manage content, users and view stats."
        infoPoints={[
          { icon: 'add-circle', title: 'Add content', text: 'Paste a YouTube URL, pick a category, add it to the library.' },
          { icon: 'people', title: 'Manage users', text: 'Verify, or remove users from the platform.' },
          { icon: 'stats-chart', title: 'Stats', text: 'See totals across users, rooms, posts and content.' },
        ]}
      />
      <GradientText variant="h1" style={styles.pageTitle}>Admin</GradientText>

      <View style={styles.tabs}>
        {(['stats', 'content', 'users'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]} activeOpacity={0.85}>
            {tab === t && <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
            <AppText variant="small" bold color={tab === t ? colors.white : colors.textSecondary}>
              {t === 'stats' ? 'Stats' : t === 'content' ? 'Content' : 'Users'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* STATS */}
      {tab === 'stats' && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={statsQuery.isFetching} onRefresh={() => statsQuery.refetch()} tintColor={colors.primary} />}>
          {statsQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <View style={styles.statGrid}>
                {[['Users', stats?.users], ['Verified', stats?.verifiedUsers], ['Rooms', stats?.rooms], ['Posts', stats?.posts], ['Content', stats?.content]].map(([l, n]) => (
                  <View key={l as string} style={styles.statBox}>
                    <GradientText variant="h2" center style={{ lineHeight: 30, paddingBottom: 2 }}>{String(n ?? 0)}</GradientText>
                    <AppText variant="tiny" color={colors.textSecondary} center>{l as string}</AppText>
                  </View>
                ))}
              </View>
              <AppText variant="h3" bold style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>By Category</AppText>
              <View style={styles.statGrid}>
                {(stats?.contentByCategory || []).map((c: any) => (
                  <View key={c.category} style={styles.statBox}>
                    <AppText variant="h3" bold center>{c.count}</AppText>
                    <AppText variant="tiny" color={colors.textSecondary} center>{c.category}</AppText>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* CONTENT */}
      {tab === 'content' && (
        <FlatList
          data={content}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={contentQuery.isFetching} onRefresh={() => contentQuery.refetch()} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.card}>
              <AppText bold style={{ marginBottom: spacing.sm }}>Add Content</AppText>
              <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.textMuted} style={styles.input} />
              <TextInput value={url} onChangeText={setUrl} placeholder="YouTube URL or video id" placeholderTextColor={colors.textMuted} autoCapitalize="none" style={styles.input} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.catPill, category === c && styles.catPillActive]}>
                    {category === c && <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />}
                    <AppText variant="tiny" bold color={category === c ? colors.white : colors.textSecondary}>{c}</AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <AppButton title={addContent.isPending ? 'Adding…' : '+ Add Content'} size="md" fullWidth onPress={() => {
                if (!title.trim() || !url.trim()) return Alert.alert('Missing', 'Title and URL required.');
                addContent.mutate();
              }} disabled={addContent.isPending} />
            </View>
          }
          renderItem={({ item }: { item: ContentItem }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="small" bold numberOfLines={1}>{item.title}</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>{item.category} · {item.viewCount || 0} views</AppText>
              </View>
              <TouchableOpacity onPress={() => confirmDelContent(item.id, item.title)} style={styles.delBtn}>
                <Icon name="trash-outline" size={18} color="#E5484D" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* USERS */}
      {tab === 'users' && (
        <FlatList
          data={users}
          keyExtractor={(i: any) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={usersQuery.isFetching} onRefresh={() => usersQuery.refetch()} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <TextInput value={userSearch} onChangeText={setUserSearch} placeholder="Search users" placeholderTextColor={colors.textMuted}
                style={{ flex: 1, color: colors.white, marginLeft: 8, fontFamily: 'Outfit-Regular' }} autoCapitalize="none" />
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="small" bold numberOfLines={1}>
                  {item.fullName || item.username}
                  {item.isAdmin ? '  👑' : ''}{item.isVerified ? '  ✓' : ''}
                </AppText>
                <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1}>{item.email}</AppText>
              </View>
              <TouchableOpacity onPress={() => verifyUser.mutate({ id: item.id, val: !item.isVerified })} style={styles.smBtn}>
                <AppText variant="tiny" bold color={colors.primary}>{item.isVerified ? 'Unverify' : 'Verify'}</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelUser(item.id, item.fullName || item.username)} style={styles.delBtn}>
                <Icon name="trash-outline" size={18} color="#E5484D" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={usersQuery.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 20 }}>No users.</AppText>}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageTitle: { paddingHorizontal: spacing.lg, marginBottom: spacing.md, lineHeight: 40, paddingBottom: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: 8, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border },
  tabActive: { borderColor: 'transparent' },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.white, fontFamily: 'Outfit-Regular', fontSize: 14, marginBottom: spacing.sm },
  catPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginRight: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border },
  catPillActive: { borderColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm },
  smBtn: { paddingHorizontal: 10, paddingVertical: 6, marginLeft: 6, borderRadius: 999, backgroundColor: 'rgba(238,48,99,0.12)' },
  delBtn: { padding: 8, marginLeft: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '30%', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.md, alignItems: 'center', flexGrow: 1 },
});

export default AdminScreen;