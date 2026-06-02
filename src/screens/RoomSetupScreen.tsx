import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import AppText from '@/components/AppText';
import GradientButton from '@/components/GradientButton';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

const POSTER = {
  uri: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=70',
};

// Simple in-house calendar
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getCalendarMatrix(year: number, monthIdx: number) {
  const first = new Date(year, monthIdx, 1);
  const startWeekday = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const RoomSetupScreen = () => {
  const navigation = useNavigation<any>();
  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [monthIdx] = useState(today.getMonth());
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const [showCal, setShowCal] = useState(false);
  const [participants] = useState(2);

  const cells = getCalendarMatrix(year, monthIdx);
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const dateLabel = pickedDay
    ? `${String(pickedDay).padStart(2, '0')} ${MONTHS[monthIdx]} ${year}, 9 AM`
    : 'Select date and time';

  return (
    <ScreenContainer>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={styles.posterWrap}>
          <Image source={POSTER} style={styles.poster} />
        </View>

        {/* Date selector */}
        <TouchableOpacity
          onPress={() => setShowCal(true)}
          activeOpacity={0.85}
          style={styles.field}>
          <AppText variant="small" color={pickedDay ? colors.white : colors.textSecondary}>
            {dateLabel}
          </AppText>
          <Icon name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Participants */}
        <View style={styles.field}>
          <AppText variant="small">{participants} Participants</AppText>
          <Icon name="add" size={18} color={colors.white} />
        </View>

        <AppText
          variant="tiny"
          color={colors.textSecondary}
          center
          style={{ marginVertical: spacing.md }}>
          Participants Limit: 5
        </AppText>

        <GradientButton
          title="Next"
          size="lg"
          onPress={() => navigation.navigate('Room')}
        />
      </ScrollView>

      <Modal
        visible={showCal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCal(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowCal(false)}>
          <Pressable style={styles.calCard}>
            <View style={styles.calHead}>
              <AppText bold color="#000">
                {MONTHS[monthIdx]} {year}
              </AppText>
              <Icon name="chevron-down" size={16} color="#000" />
            </View>
            <View style={styles.weekRow}>
              {weekdays.map((d, i) => (
                <AppText
                  key={i}
                  variant="tiny"
                  color="#999"
                  style={styles.weekCell}>
                  {d}
                </AppText>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {cells.map((c, i) => {
                const selected = pickedDay === c;
                return (
                  <TouchableOpacity
                    key={i}
                    disabled={!c}
                    onPress={() => {
                      if (c) {
                        setPickedDay(c);
                        setTimeout(() => setShowCal(false), 200);
                      }
                    }}
                    style={[styles.dayCell, selected && styles.dayCellSelected]}>
                    <AppText
                      variant="small"
                      color={selected ? colors.white : c ? '#000' : 'transparent'}>
                      {c ?? ''}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.timeRow}>
              <AppText variant="small" color="#000">
                Time
              </AppText>
              <AppText variant="small" bold color="#000">
                9:31
              </AppText>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  posterWrap: {
    height: 240,
    borderRadius: layout.radius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  poster: { width: '100%', height: '100%' },
  field: {
    height: 52,
    borderRadius: layout.radius.pill,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalBg: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  calCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
  },
  calHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  weekRow: { flexDirection: 'row' },
  weekCell: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: Platform.OS === 'ios' ? 999 : 999,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: spacing.sm,
  },
});

export default RoomSetupScreen;
