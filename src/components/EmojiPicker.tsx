import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Text } from 'react-native';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';

type Props = {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
};

const CATEGORIES: { key: string; icon: string; emojis: string[] }[] = [
  {
    key: 'Smileys',
    icon: '😀',
    emojis: ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','😗','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','🤪','😒','😓','😔','🙃','🫠','😬','🤥','😮‍💨','😤','😠','😡','🤬','🥺','😢','😭','😱','😨','😰','😳','🥵','🥶','😈','👿','🤡','💀','👻','👽','🤖'],
  },
  {
    key: 'Gestures',
    icon: '👍',
    emojis: ['👍','👎','👌','✌️','🤞','🤟','🤘','👏','🙌','👐','🤲','🙏','🤝','💪','👋','🤙','✊','👊','🫶','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','🔥','✨','⭐','🌟','💯','✅','❌','⚡','💥','💫'],
  },
  {
    key: 'Fun',
    icon: '🎉',
    emojis: ['🎉','🎊','🥳','🎈','🎁','🍿','🎬','📺','🎮','🎵','🎶','🕺','💃','😻','🐶','🐱','🦄','🌈','☀️','🌙','⚽','🏀','🍕','🍔','🍟','🌮','🍩','🍪','🍫','🍰','☕','🍺','🍻','🥂','🍷','😋','🤤'],
  },
];

const EmojiPicker: React.FC<Props> = ({ onSelect, onClose }) => {
  const [cat, setCat] = useState(0);
  const active = CATEGORIES[cat];

  return (
    <View style={styles.wrap}>
      <View style={styles.tabsRow}>
        {CATEGORIES.map((c, i) => (
          <TouchableOpacity key={c.key} onPress={() => setCat(i)} style={[styles.tab, cat === i && styles.tabOn]}>
            <Text style={{ fontSize: 18 }}>{c.icon}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <AppText variant="tiny" color={colors.textSecondary}>Close</AppText>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
        {active.emojis.map((e, idx) => (
          <TouchableOpacity key={`${active.key}-${idx}`} onPress={() => onSelect(e)} style={styles.cell} activeOpacity={0.6}>
            <Text style={styles.emoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { height: 240, backgroundColor: colors.background, borderTopWidth: 0.5, borderTopColor: colors.border },
  tabsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginRight: 4 },
  tabOn: { backgroundColor: 'rgba(238,48,99,0.18)' },
  closeBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  cell: { width: `${100 / 8}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
});

export default EmojiPicker;