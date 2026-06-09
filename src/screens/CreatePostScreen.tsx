import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert,
  ActivityIndicator, Platform, KeyboardAvoidingView, Modal, Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { postsApi, PostKind, PostVisibility } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

const CreatePostScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();

  const initialKind: PostKind = route.params?.kind === 'EVENT' ? 'EVENT' : 'NEWS';
  const [kind, setKind] = useState<PostKind>(initialKind);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [eventAt, setEventAt] = useState<Date | null>(null);
  const [eventEndAt, setEventEndAt] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [rsvpLimit, setRsvpLimit] = useState<string>('');
  const [datePicker, setDatePicker] = useState<null | 'start' | 'end'>(null);
  const [pickerDraft, setPickerDraft] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000));

  const createMutation = useMutation({
    mutationFn: () =>
      postsApi.create({
        kind,
        title: title.trim(),
        body: body.trim() || null,
        coverUrl: coverUrl.trim() || null,
        visibility,
        eventAt: kind === 'EVENT' && eventAt ? eventAt.toISOString() : null,
        eventEndAt: kind === 'EVENT' && eventEndAt ? eventEndAt.toISOString() : null,
        location: kind === 'EVENT' && location.trim() ? location.trim() : null,
        rsvpLimit: kind === 'EVENT' && rsvpLimit.trim() ? Math.max(1, parseInt(rsvpLimit, 10) || 0) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.posts });
      Alert.alert('Posted!', `Your ${kind === 'EVENT' ? 'event' : 'news'} is live.`);
      navigation.goBack();
    },
    onError: (err) => showApiError(err, 'Could not create post.'),
  });

  const handleSubmit = () => {
    if (title.trim().length < 2) return Alert.alert('Title too short', 'Please enter at least 2 characters.');
    if (kind === 'EVENT' && !eventAt) return Alert.alert('Date required', 'Events need a date and time.');
    if (kind === 'EVENT' && eventEndAt && eventAt && eventEndAt <= eventAt) return Alert.alert('Invalid end time', 'End time must be after start time.');
    createMutation.mutate();
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle={kind === 'EVENT' ? 'Creating an event' : 'Posting news'}
        infoIntro="Share what's happening with the community — news drops or upcoming watch parties."
        infoPoints={[
          { icon: 'newspaper', title: 'News', text: 'Quick updates and announcements that appear in the New & Hot feed.' },
          { icon: 'calendar', title: 'Events', text: 'Schedule a watch party with date, time and RSVP limit.' },
          { icon: 'eye', title: 'Visibility', text: 'Choose who sees it: everyone, just friends, or only you.' },
        ]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <GradientText variant="h1" style={styles.title}>
            {kind === 'EVENT' ? 'Create Event' : 'Post News'}
          </GradientText>

          {/* Segmented control */}
          <View style={styles.segment}>
            <SegmentBtn active={kind === 'NEWS'} label="News" icon="newspaper" onPress={() => setKind('NEWS')} />
            <SegmentBtn active={kind === 'EVENT'} label="Event" icon="calendar" onPress={() => setKind('EVENT')} />
          </View>

          <Label text="Cover image (optional)" />
          {coverUrl ? (
            <View style={styles.coverPreview}>
              <Image source={{ uri: coverUrl }} style={styles.coverImg} />
              <TouchableOpacity onPress={() => setCoverUrl('')} style={styles.removeBtn}>
                <Icon name="close" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.input}>
              <Icon name="image-outline" size={18} color={colors.textMuted} />
              <TextInput value={coverUrl} onChangeText={setCoverUrl} placeholder="Paste image URL"
                placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} style={styles.inputText} />
            </View>
          )}

          <Label text={kind === 'EVENT' ? 'Event title' : 'Headline'} required />
          <View style={styles.input}>
            <TextInput value={title} onChangeText={setTitle}
              placeholder={kind === 'EVENT' ? 'e.g. The Matrix Watch Party' : 'e.g. New episode out now'}
              placeholderTextColor={colors.textMuted} maxLength={140} style={styles.inputText} />
          </View>
          <AppText variant="tiny" color={colors.textMuted} style={{ marginTop: 4 }}>{title.length}/140</AppText>

          <Label text="Description" />
          <View style={[styles.input, styles.textArea]}>
            <TextInput value={body} onChangeText={setBody} placeholder="Tell people more..."
              placeholderTextColor={colors.textMuted} multiline maxLength={4000}
              style={[styles.inputText, { textAlignVertical: 'top', minHeight: 100 }]} />
          </View>

          {kind === 'EVENT' && (
            <>
              <Label text="When" required />
              <TouchableOpacity style={styles.input} onPress={() => { setPickerDraft(eventAt || new Date(Date.now() + 60 * 60 * 1000)); setDatePicker('start'); }}>
                <Icon name="calendar-outline" size={18} color={colors.textMuted} />
                <AppText style={{ marginLeft: 10 }} color={eventAt ? colors.white : colors.textMuted}>
                  {eventAt ? formatDate(eventAt) : 'Pick a date and time'}
                </AppText>
              </TouchableOpacity>

              <Label text="Ends at (optional)" />
              <TouchableOpacity style={styles.input} onPress={() => { setPickerDraft(eventEndAt || (eventAt ? new Date(eventAt.getTime() + 60 * 60 * 1000) : new Date(Date.now() + 2 * 60 * 60 * 1000))); setDatePicker('end'); }}>
                <Icon name="time-outline" size={18} color={colors.textMuted} />
                <AppText style={{ marginLeft: 10 }} color={eventEndAt ? colors.white : colors.textMuted}>
                  {eventEndAt ? formatDate(eventEndAt) : 'Pick an end time'}
                </AppText>
                {eventEndAt && (
                  <TouchableOpacity onPress={() => setEventEndAt(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 'auto' }}>
                    <Icon name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <Label text="Location" />
              <View style={styles.input}>
                <Icon name="location-outline" size={18} color={colors.textMuted} />
                <TextInput value={location} onChangeText={setLocation} placeholder="Online or city name"
                  placeholderTextColor={colors.textMuted} maxLength={200} style={styles.inputText} />
              </View>

              <Label text="Max attendees (optional)" />
              <View style={styles.input}>
                <Icon name="people-outline" size={18} color={colors.textMuted} />
                <TextInput value={rsvpLimit} onChangeText={(v) => setRsvpLimit(v.replace(/[^0-9]/g, ''))}
                  placeholder="Leave empty for unlimited" placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad" maxLength={5} style={styles.inputText} />
              </View>
            </>
          )}

          <Label text="Who can see this" />
          <View style={styles.visRow}>
            {(['PUBLIC', 'FRIENDS', 'PRIVATE'] as PostVisibility[]).map((v) => (
              <TouchableOpacity key={v} onPress={() => setVisibility(v)}
                style={[styles.visChip, visibility === v && styles.visChipActive]} activeOpacity={0.85}>
                {visibility === v && (
                  <LinearGradient colors={colors.buttonGradient as unknown as string[]}
                    start={colors.gradientStartPoint} end={colors.gradientEndPoint}
                    style={StyleSheet.absoluteFillObject} pointerEvents="none" />
                )}
                <AppText variant="small" bold={visibility === v} color={visibility === v ? colors.white : colors.textSecondary}>
                  {v === 'PUBLIC' ? 'Everyone' : v === 'FRIENDS' ? 'Friends' : 'Only me'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <AppButton
              title={createMutation.isPending ? 'Posting…' : kind === 'EVENT' ? 'Publish Event' : 'Post News'}
              size="lg"
              fullWidth
              onPress={handleSubmit}
              disabled={createMutation.isPending || title.trim().length < 2}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={datePicker !== null}
        title={datePicker === 'start' ? 'Pick start date & time' : 'Pick end date & time'}
        value={pickerDraft}
        onChange={setPickerDraft}
        onCancel={() => setDatePicker(null)}
        onConfirm={() => {
          if (datePicker === 'start') setEventAt(pickerDraft);
          else if (datePicker === 'end') setEventEndAt(pickerDraft);
          setDatePicker(null);
        }}
      />
    </ScreenContainer>
  );
};

const Label: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => (
  <View style={styles.labelRow}>
    <AppText variant="small" bold color={colors.textSecondary}>{text}</AppText>
    {required && <AppText variant="small" bold color={colors.primary} style={{ marginLeft: 4 }}>*</AppText>}
  </View>
);

const SegmentBtn: React.FC<{ active: boolean; label: string; icon: string; onPress: () => void }> = ({ active, label, icon, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.segBtnWrap}>
    <View style={[styles.segBtn, !active && styles.segBtnInactive]}>
      {active && (
        <LinearGradient colors={colors.buttonGradient as unknown as string[]}
          start={colors.gradientStartPoint} end={colors.gradientEndPoint}
          style={StyleSheet.absoluteFillObject} pointerEvents="none" />
      )}
      <Icon name={icon} size={16} color={active ? colors.white : colors.textSecondary} />
      <AppText bold color={active ? colors.white : colors.textSecondary} style={{ marginLeft: 8 }}>{label}</AppText>
    </View>
  </TouchableOpacity>
);

const DatePickerModal: React.FC<{
  visible: boolean; title: string; value: Date;
  onChange: (d: Date) => void; onCancel: () => void; onConfirm: () => void;
}> = ({ visible, title, value, onChange, onCancel, onConfirm }) => {
  const adjust = (unit: 'day' | 'hour' | 'minute', delta: number) => {
    const d = new Date(value);
    if (unit === 'day') d.setDate(d.getDate() + delta);
    if (unit === 'hour') d.setHours(d.getHours() + delta);
    if (unit === 'minute') d.setMinutes(d.getMinutes() + delta * 15);
    onChange(d);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.modalCard}>
          <AppText variant="h3" bold center style={{ marginBottom: spacing.md }}>{title}</AppText>
          <View style={styles.dateDisplay}>
            <AppText variant="h3" bold center>
              {value.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </AppText>
            <GradientText variant="h2" center style={{ marginTop: 4, lineHeight: 30, paddingBottom: 2 }}>
              {value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </GradientText>
          </View>
          <Stepper label="Day" onMinus={() => adjust('day', -1)} onPlus={() => adjust('day', +1)} />
          <Stepper label="Hour" onMinus={() => adjust('hour', -1)} onPlus={() => adjust('hour', +1)} />
          <Stepper label="15-min" onMinus={() => adjust('minute', -1)} onPlus={() => adjust('minute', +1)} />
          <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: 10 }}>
            <TouchableOpacity onPress={onCancel} style={[styles.modalBtn, styles.modalBtnGhost]}>
              <AppText bold color={colors.textSecondary}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={styles.modalBtnConfirm} activeOpacity={0.85}>
              <LinearGradient colors={colors.buttonGradient as unknown as string[]}
                start={colors.gradientStartPoint} end={colors.gradientEndPoint}
                style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <AppText bold color={colors.white}>Confirm</AppText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const Stepper: React.FC<{ label: string; onMinus: () => void; onPlus: () => void }> = ({ label, onMinus, onPlus }) => (
  <View style={styles.stepperRow}>
    <AppText variant="small" color={colors.textSecondary} style={{ width: 80 }}>{label}</AppText>
    <TouchableOpacity onPress={onMinus} style={styles.stepperBtn}><Icon name="remove" size={18} color={colors.white} /></TouchableOpacity>
    <View style={{ width: 40 }} />
    <TouchableOpacity onPress={onPlus} style={styles.stepperBtn}><Icon name="add" size={18} color={colors.white} /></TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl * 2 },
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.md },
  segment: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  segBtnWrap: { flex: 1 },
  segBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 999, overflow: 'hidden',
  },
  segBtnInactive: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.border },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: 6 },
  input: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.md, paddingHorizontal: 14, paddingVertical: 12,
  },
  inputText: { flex: 1, color: colors.white, fontFamily: 'Outfit-Regular', fontSize: 14, marginLeft: 10 },
  textArea: { alignItems: 'flex-start' },
  coverPreview: { width: '100%', height: 180, borderRadius: layout.radius.md, overflow: 'hidden', position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  visRow: { flexDirection: 'row', gap: 8 },
  visChip: {
    flex: 1, paddingVertical: 11, borderRadius: 999, alignItems: 'center', overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border,
  },
  visChipActive: { borderColor: 'transparent' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  modalCard: { backgroundColor: colors.bg3, borderRadius: layout.radius.lg, padding: spacing.lg, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: colors.border },
  dateDisplay: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.md },
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  modalBtnGhost: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.border },
  modalBtnConfirm: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center', overflow: 'hidden' },
});

export default CreatePostScreen;