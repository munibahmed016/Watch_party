import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';

// ---------- Animated bar chart ----------
export const BarChart: React.FC<{
  data: { label: string; value: number }[];
  height?: number;
}> = ({ data, height = 140 }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.barRow, { height: height + 28 }]}>
        {data.map((d, i) => (
          <Bar key={i} label={d.label} value={d.value} max={max} height={height} delay={i * 40} />
        ))}
      </View>
    </ScrollView>
  );
};

const Bar: React.FC<{ label: string; value: number; max: number; height: number; delay: number }> = ({ label, value, max, height, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const target = Math.max(2, (value / max) * height);
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration: 600, delay, useNativeDriver: false }).start();
  }, [anim, target, delay]);
  return (
    <View style={styles.barCol}>
      <AppText variant="tiny" color={colors.textSecondary} style={{ marginBottom: 4 }}>{value}</AppText>
      <Animated.View style={[styles.bar, { height: anim }]}>
        <LinearGradient
          colors={colors.buttonGradient as unknown as string[]}
          start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <AppText variant="tiny" color={colors.textMuted} style={{ marginTop: 6 }} numberOfLines={1}>{label}</AppText>
    </View>
  );
};

// ---------- Donut / distribution (stacked horizontal bar) ----------
const SEG_COLORS = ['#EE3063', '#4A51A1', '#7B61FF', '#FF8A3D', '#22C55E', '#3DA5FF', '#F4C20D'];

export const Distribution: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  return (
    <View>
      <View style={styles.stack}>
        {data.map((d, i) => {
          const w = (d.value / total) * 100;
          if (w <= 0) return null;
          return <View key={i} style={{ width: `${w}%`, backgroundColor: SEG_COLORS[i % SEG_COLORS.length] }} />;
        })}
      </View>
      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: SEG_COLORS[i % SEG_COLORS.length] }]} />
            <AppText variant="tiny" color={colors.textSecondary}>{d.label} ({d.value})</AppText>
          </View>
        ))}
      </View>
    </View>
  );
};

// ---------- Stat card ----------
export const StatCard: React.FC<{ value: string | number; label: string; icon?: React.ReactNode; accent?: boolean }> = ({ value, label, accent }) => (
  <View style={[styles.statCard, accent && styles.statCardAccent]}>
    {accent && (
      <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
    )}
    <AppText variant="h2" bold color={colors.white}>{String(value)}</AppText>
    <AppText variant="tiny" color={accent ? 'rgba(255,255,255,0.85)' : colors.textSecondary} style={{ marginTop: 2 }}>{label}</AppText>
  </View>
);

const styles = StyleSheet.create({
  barRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.sm },
  barCol: { alignItems: 'center', width: 40, justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.primary },
  stack: { flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 5 },
  statCard: { flex: 1, minWidth: '30%', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, overflow: 'hidden' },
  statCardAccent: { borderColor: 'transparent' },
});