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
import { creatorsApi } from '@/lib/api';

const ContentLikesScreen = () => {
  const navigation = useNavigation<any>();
  const q = useQuery({ queryKey: ['creator', 'likes'], queryFn: () => creatorsApi.myContentLikes(1, 50) });
  const items = q.data?.items || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()} infoTitle="Likes" infoIntro="Every like across all your content, most recent first." />
      {q.isLoading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          ListHeaderComponent={
            <View>
              <GradientText variant="h1" style={styles.title}>Likes</GradientText>
              <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>{items.length} like{items.length === 1 ? '' : 's'}</AppText>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.content.thumbnailUrl ? <Image source={{ uri: item.content.thumbnailUrl }} style={styles.thumb} /> : (
                <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}><Icon name="film" size={16} color={colors.textMuted} /></View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="small" numberOfLines={1}><AppText variant="small" bold>{item.user.fullName || item.user.username}</AppText> liked</AppText>
                <AppText variant="tiny" color={colors.textSecondary} numberOfLines={1}>{item.content.title}</AppText>
              </View>
              <Icon name="heart" size={16} color={colors.primary} />
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Icon name="heart-outline" size={42} color={colors.textMuted} /><AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>No likes yet.</AppText></View>}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { lineHeight: 40, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  thumb: { width: 44, height: 44, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});

export default ContentLikesScreen;