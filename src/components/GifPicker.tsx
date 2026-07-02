import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';

const GIPHY_API_KEY = `IPtua98VbCA3yQOn0d2tfg4E5v59MbDb`;
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

type GifItem = { id: string; url: string; w: number; h: number };

type Props = {
  onSelect: (gifUrl: string) => void;
  onClose?: () => void;
};

const mapResults = (json: any): GifItem[] => {
  const data = Array.isArray(json?.data) ? json.data : [];
  return data
    .map((g: any) => {
      const img = g?.images?.fixed_height || g?.images?.original || null;
      if (!img?.url) return null;
      return { id: g.id, url: img.url, w: Number(img.width) || 200, h: Number(img.height) || 200 };
    })
    .filter(Boolean) as GifItem[];
};

const GifPicker: React.FC<Props> = ({ onSelect, onClose }) => {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keyMissing = !GIPHY_API_KEY || GIPHY_API_KEY === `IPtua98VbCA3yQOn0d2tfg4E5v59MbDb`;

  const fetchGifs = useCallback(async (query: string) => {
    if (keyMissing) return;
    setLoading(true);
    try {
      const endpoint = query.trim()
        ? `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query.trim())}&limit=24&rating=pg-13&bundle=fixed_height`
        : `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg-13&bundle=fixed_height`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setItems(mapResults(json));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [keyMissing]);

  // initial trending
  useEffect(() => { fetchGifs(''); }, [fetchGifs]);

  // debounced search
  const onChangeQuery = (text: string) => {
    setQ(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(text), 400);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            value={q}
            onChangeText={onChangeQuery}
            placeholder="Search GIFs…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {keyMissing ? (
        <View style={styles.center}>
          <Icon name="key-outline" size={28} color={colors.textMuted} />
          <AppText variant="tiny" color={colors.textSecondary} center style={{ marginTop: 8, paddingHorizontal: 16 }}>
            Add your Giphy API key in GifPicker.tsx to enable GIFs.
          </AppText>
        </View>
      ) : loading && items.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          numColumns={3}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 6 }}
          columnWrapperStyle={{ gap: 6 }}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gifCell} activeOpacity={0.8} onPress={() => onSelect(item.url)}>
              <Image source={{ uri: item.url }} style={styles.gif} resizeMode="cover" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <AppText variant="tiny" color={colors.textSecondary}>No GIFs found.</AppText>
            </View>
          }
        />
      )}
      <View style={styles.footer}>
        <AppText variant="tiny" color={colors.textMuted}>Powered by GIPHY</AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { height: 300, backgroundColor: colors.background, borderTopWidth: 0.5, borderTopColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border,
    borderRadius: 999, paddingHorizontal: 12, height: 38,
  },
  input: { flex: 1, color: colors.white, fontSize: 14, fontFamily: 'Outfit-Regular' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  gifCell: { flex: 1 / 3, aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surfaceElevated },
  gif: { width: '100%', height: '100%' },
  footer: { alignItems: 'center', paddingVertical: 4 },
});

export default GifPicker;