import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { creatorsApi, CreatorEvent } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showApiError } from '@/hooks/useApiErrorAlert';

// Dependency-free date/time entry (no native datetimepicker).
const pad = (n: number) => String(n).padStart(2, '0');
const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toHM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const prettyDate = (s: string) => {
  try { return new Date(s + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
  catch { return s; }
};

const CreateEventScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const { user } = useAuth();

  // Edit mode if an event is passed
  const editing: CreatorEvent | undefined = route.params?.event;
  const isEdit = !!editing;

  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const dayAfter = new Date(Date.now() + 2 * 86400000);

  const initialWhen = editing ? new Date(editing.scheduledAt) : tomorrow;

  const [title, setTitle] = useState(editing?.title || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(editing?.thumbnailUrl || '');
  const [dateStr, setDateStr] = useState(toISODate(initialWhen));
  const [timeStr, setTimeStr] = useState(editing ? toHM(initialWhen) : '19:00');

  const buildWhen = () => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const when = buildWhen();
      if (isNaN(when.getTime())) throw new Error('Invalid date or time.');
      if (when.getTime() < Date.now()) throw new Error('Pick a future date and time.');
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        scheduledAt: when.toISOString(),
      };
      return isEdit
        ? creatorsApi.updateEvent(editing!.id, payload)
        : creatorsApi.createEvent(payload as any);
    },
    onSuccess: () => {
      if (user?.username) qc.invalidateQueries({ queryKey: ['creator', user.username, 'events'] });
      qc.invalidateQueries({ queryKey: ['events', 'upcoming'] });
      Alert.alert(
        isEdit ? 'Event updated! ✅' : 'Event scheduled! 🎉',
        `"${title.trim()}" — ${prettyDate(dateStr)} at ${timeStr}.${isEdit ? '' : ' Your followers have been notified.'}`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    },
    onError: (err: any) => {
      if (err?.message?.includes('future')) Alert.alert('Invalid time', 'Pick a future date and time.');
      else if (err?.message?.includes('Invalid')) Alert.alert('Invalid', 'Check the date and time format.');
      else showApiError(err, 'Could not save the event.');
    },
  });

  const onSubmit = () => {
    if (title.trim().length < 2) return Alert.alert('Title required', 'Please enter an event title.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
    if (!/^\d{2}:\d{2}$/.test(timeStr)) return Alert.alert('Invalid time', 'Use 24-hour HH:mm, e.g. 19:30.');
    saveMutation.mutate();
  };

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle={isEdit ? 'Edit event' : 'Schedule an event'}
        infoIntro="Plan a live session or premiere. Followers get notified."
        infoPoints={[
          { icon: 'calendar', title: 'Pick date & time', text: 'Choose when your event happens.' },
          { icon: 'image', title: 'Add a cover', text: 'Paste an image URL for the event banner.' },
          { icon: 'notifications', title: 'Followers notified', text: 'Everyone following you gets an alert.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <GradientText variant="h2" style={{ lineHeight: 32, paddingBottom: 2 }}>{isEdit ? 'Edit Event' : 'New Event'}</GradientText>

        <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Friday Night Watch Party" />
        <Field label="Description" value={description} onChange={setDescription} placeholder="What's it about?" multiline />
        <Field label="Cover image URL (optional)" value={thumbnailUrl} onChange={setThumbnailUrl} placeholder="https://…/poster.jpg" />

        {/* Date quick picks */}
        <AppText variant="small" color={colors.textSecondary} style={{ marginTop: spacing.md, marginBottom: 8 }}>Date</AppText>
        <View style={styles.quickRow}>
          <QuickChip label="Today" active={dateStr === toISODate(today)} onPress={() => setDateStr(toISODate(today))} />
          <QuickChip label="Tomorrow" active={dateStr === toISODate(tomorrow)} onPress={() => setDateStr(toISODate(tomorrow))} />
          <QuickChip label={prettyDate(toISODate(dayAfter))} active={dateStr === toISODate(dayAfter)} onPress={() => setDateStr(toISODate(dayAfter))} />
        </View>
        <TextInput value={dateStr} onChangeText={setDateStr} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
          autoCapitalize="none" style={styles.input} keyboardType="numbers-and-punctuation" />
        <AppText variant="tiny" color={colors.textMuted} style={{ marginTop: 4 }}>{prettyDate(dateStr)}</AppText>

        {/* Time */}
        <AppText variant="small" color={colors.textSecondary} style={{ marginTop: spacing.md, marginBottom: 8 }}>Time (24-hour)</AppText>
        <View style={styles.quickRow}>
          {['17:00', '18:00', '19:00', '20:00', '21:00'].map((t) => (
            <QuickChip key={t} label={t} active={timeStr === t} onPress={() => setTimeStr(t)} />
          ))}
        </View>
        <TextInput value={timeStr} onChangeText={setTimeStr} placeholder="HH:mm" placeholderTextColor={colors.textMuted}
          autoCapitalize="none" style={styles.input} keyboardType="numbers-and-punctuation" />

        <View style={styles.previewCard}>
          <Icon name="alarm" size={16} color={colors.primary} style={{ marginRight: 8 }} />
          <AppText variant="small" color={colors.textSecondary}>
            Scheduled for {prettyDate(dateStr)} · {timeStr}
          </AppText>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={onSubmit} disabled={saveMutation.isPending} style={styles.submitBtn}>
          <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          {saveMutation.isPending ? <ActivityIndicator color={colors.white} /> : (
            <>
              <Icon name={isEdit ? 'checkmark' : 'calendar'} size={16} color={colors.white} style={{ marginRight: 8 }} />
              <AppText bold color={colors.white}>{isEdit ? 'Save Changes' : 'Schedule Event'}</AppText>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const QuickChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85}
    style={[styles.chip, active && { borderColor: colors.primary, backgroundColor: 'rgba(238,48,99,0.15)' }]}>
    <AppText variant="tiny" bold color={active ? colors.primary : colors.textSecondary}>{label}</AppText>
  </TouchableOpacity>
);

const Field: React.FC<{ label: string; value: string; onChange: (s: string) => void; placeholder: string; multiline?: boolean }> =
  ({ label, value, onChange, placeholder, multiline }) => (
  <View style={{ marginTop: spacing.md }}>
    <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: 6 }}>{label}</AppText>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted}
      multiline={multiline} style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]} />
  </View>
);

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.md, paddingHorizontal: 14, height: 48, color: colors.white,
    fontFamily: 'Outfit-Regular', fontSize: 14,
  },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  previewCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(238,48,99,0.1)', borderWidth: 1, borderColor: 'rgba(238,48,99,0.3)',
    borderRadius: layout.radius.md, padding: spacing.md, marginTop: spacing.lg,
  },
  submitBtn: { height: 50, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
});

export default CreateEventScreen;