import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getCalendarMatrix(year: number, monthIdx: number) {
  const first = new Date(year, monthIdx, 1);
  const startWeekday = first.getDay();
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
  const [participants, setParticipants] = useState(2);

  const cells = getCalendarMatrix(year, monthIdx);
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dateLabel = pickedDay ? `${String(pickedDay).padStart(2, '0')} ${MONTHS[monthIdx]} ${year}, 9 AM` : 'Select date and time';

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Set up your room"
        infoIntro="Pick when your watch party happens and how many friends can join."
        infoPoints={[
          { icon: 'calendar', title: 'Schedule', text: 'Choose a date and time so friends know when to show up.' },
          { icon: 'people', title: 'Participants', text: 'Set how many people can join — up to the room limit.' },
          { icon: 'arrow-forward-circle', title: 'Next', text: 'Continue to open your room and start watching together.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <GradientText variant="h1" style={styles.title}>Room Setup</GradientText>

        {/* Gradient poster placeholder (no dummy stock image) */}
        <View style={styles.posterWrap}>
          <LinearGradient colors={['#1C1C34', '#14142A']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.posterIcon}>
            <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            <Icon name="play" size={34} color={colors.white} />
          </View>
          <AppText variant="small" color={colors.textSecondary} style={{ marginTop: spacing.md }}>Your watch party</AppText>
        </View>

        <TouchableOpacity onPress={() => setShowCal(true)} activeOpacity={0.85} style={styles.field}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <AppText variant="small" color={pickedDay ? colors.white : colors.textSecondary}>{dateLabel}</AppText>
          </View>
          <Icon name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.field}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="people-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <AppText variant="small">{participants} Participants</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity onPress={() => setParticipants((p) => Math.max(2, p - 1))}><Icon name="remove-circle-outline" size={22} color={colors.white} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setParticipants((p) => Math.min(5, p + 1))}><Icon name="add-circle-outline" size={22} color={colors.primary} /></TouchableOpacity>
          </View>
        </View>

        <AppText variant="tiny" color={colors.textSecondary} center style={{ marginVertical: spacing.md }}>Participants Limit: 5</AppText>

        <AppButton title="Next" size="lg" fullWidth onPress={() => navigation.navigate('CreateRoom')} />
      </ScrollView>

      <Modal visible={showCal} transparent animationType="fade" onRequestClose={() => setShowCal(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowCal(false)}>
          <Pressable style={styles.calCard}>
            <View style={styles.calHead}>
              <AppText bold>{MONTHS[monthIdx]} {year}</AppText>
            </View>
            <View style={styles.weekRow}>
              {weekdays.map((d, i) => <AppText key={i} variant="tiny" color={colors.textSecondary} style={styles.weekCell}>{d}</AppText>)}
            </View>
            <View style={styles.daysGrid}>
              {cells.map((c, i) => {
                const selected = pickedDay === c;
                return (
                  <TouchableOpacity key={i} disabled={!c}
                    onPress={() => { if (c) { setPickedDay(c); setTimeout(() => setShowCal(false), 200); } }}
                    style={[styles.dayCell, selected && styles.dayCellSelected]}>
                    <AppText variant="small" color={selected ? colors.white : c ? colors.white : 'transparent'}>{c ?? ''}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.timeRow}>
              <AppText variant="small" color={colors.textSecondary}>Time</AppText>
              <AppText variant="small" bold>9:00 AM</AppText>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  posterWrap: { height: 200, borderRadius: layout.radius.lg, overflow: 'hidden', marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  posterIcon: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  field: { height: 54, borderRadius: layout.radius.pill, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  calCard: { width: '100%', backgroundColor: colors.bg3, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  weekRow: { flexDirection: 'row' },
  weekCell: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellSelected: { backgroundColor: colors.primary, borderRadius: 999 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
});

export default RoomSetupScreen;