import React from 'react';
import { View, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { creatorsApi, PublicUser } from '@/lib/api';

const FollowersScreen = () => {
  const navigation = useNavigation<any>();
  const q = useQuery({ queryKey: ['creator', 'followers'], queryFn: () => creatorsApi.myFollowers(1, 50) });
  const items = q.data?.items || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()} infoTitle="Followers" infoIntro="Everyone following your creator channel." />
      {q.isLoading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(i: PublicUser) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          ListHeaderComponent={
            <View>
              <GradientText variant="h1" style={styles.title}>Followers</GradientText>
              <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>{items.length} follower{items.length === 1 ? '' : 's'}</AppText>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.avatarUrl ? <Image source={{ uri: item.avatarUrl }} style={styles.avatar} /> : (
                <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}><Icon name="person" size={18} color={colors.textMuted} /></View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText bold numberOfLines={1}>{item.fullName || item.username}</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>@{item.username}</AppText>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Icon name="people-outline" size={42} color={colors.textMuted} /><AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>No followers yet.</AppText></View>}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { lineHeight: 40, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceElevated },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});

export default FollowersScreen;