import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, MediaType } from 'react-native-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { creatorsApi, CreatorContentFormat, CreatorContent } from '@/lib/api';
import { uploadVideoFile } from '@/lib/uploadVideo';
import { showApiError } from '@/hooks/useApiErrorAlert';

const FORMATS: { key: CreatorContentFormat; label: string; icon: string }[] = [
  { key: 'FULL', label: 'Movie / Video', icon: 'film' },
  { key: 'CLIP', label: 'Clip', icon: 'cut' },
  { key: 'REEL', label: 'Reel', icon: 'phone-portrait' },
  { key: 'PODCAST', label: 'Podcast', icon: 'mic' },
];
const CATEGORIES = ['MOVIE', 'PODCAST', 'COMEDY', 'NEWS', 'SPORTS', 'DRAMA', 'ANIME', 'CARTOON', 'TVSHOW'];

type Mode = 'file' | 'url';

const CreatorUploadScreen = () => {
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<CreatorContentFormat>('FULL');
  const [category, setCategory] = useState('MOVIE');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const myContentQuery = useQuery({ queryKey: ['creator', 'my-content'], queryFn: () => creatorsApi.myContent() });

  const urlMutation = useMutation({
    mutationFn: () => creatorsApi.createFromUrl({ title: title.trim(), description: description.trim() || undefined, url: url.trim(), format, category }),
    onSuccess: () => { afterUpload(); },
    onError: (err) => showApiError(err, 'Could not upload. The video may be copyrighted.'),
  });

  const afterUpload = () => {
    qc.invalidateQueries({ queryKey: ['creator', 'my-content'] });
    setTitle(''); setDescription(''); setUrl(''); setPickedFile(null); setProgress(0);
    Alert.alert('Uploading', 'Your content is being processed. Pull to refresh or tap a draft to check its status.');
  };

  // ---- File picker (Android-safe) ----
  const pickFile = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'video' as MediaType,
        selectionLimit: 1,
        includeExtra: true,
        assetRepresentationMode: 'current',
      });
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Picker error', res.errorMessage || 'Could not open the gallery.');
        return;
      }
      const asset = res.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Could not read video', 'This video could not be read. Try a different video, or use the "Paste URL" option.');
        return;
      }
      const name = asset.fileName || `video_${Date.now()}.mp4`;
      const type = asset.type || 'video/mp4';
      setPickedFile({ uri: asset.uri, name, type });
      if (!title) setTitle(name.replace(/\.[^.]+$/, ''));
    } catch (e: any) {
      Alert.alert('Picker error', e?.message || 'Could not pick a video.');
    }
  };

  // ---- File upload via our backend (FormData + progress) ----
  const doFileUpload = async () => {
    if (title.trim().length < 2) return Alert.alert('Title required', 'Please enter a title.');
    if (!pickedFile) return Alert.alert('No file', 'Please choose a video first.');
    try {
      setUploading(true);
      setProgress(0);
      await uploadVideoFile(
        pickedFile,
        { title: title.trim(), description: description.trim() || undefined, format, category },
        (pct) => setProgress(pct),
      );
      afterUpload();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Something went wrong. Try again or use the URL option.');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = () => {
    if (mode === 'url') {
      if (title.trim().length < 2) return Alert.alert('Title required', 'Please enter a title.');
      if (!/^https?:\/\//i.test(url.trim())) return Alert.alert('URL required', 'Please paste a valid video URL.');
      urlMutation.mutate();
    } else {
      doFileUpload();
    }
  };

  // ---- tap a draft/processing item -> sync status from Bunny ----
  const refreshItem = async (item: CreatorContent) => {
    try {
      setSyncingId(item.id);
      await creatorsApi.syncStatus(item.id);
      await qc.invalidateQueries({ queryKey: ['creator', 'my-content'] });
    } catch (e: any) {
      showApiError(e, 'Could not refresh status.');
    } finally {
      setSyncingId(null);
    }
  };

  // ---- delete an upload ----
  const deleteItem = (item: CreatorContent) => {
    Alert.alert('Delete', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await creatorsApi.deleteContent(item.id);
            qc.invalidateQueries({ queryKey: ['creator', 'my-content'] });
          } catch (e: any) {
            showApiError(e, 'Could not delete.');
          }
        },
      },
    ]);
  };

  const busy = uploading || urlMutation.isPending;
  const myContent = myContentQuery.data?.items || [];

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Upload Content"
        infoIntro="Add a movie, podcast, clip or reel — choose a file from your device or paste a video link."
        infoPoints={[
          { icon: 'folder-open', title: 'Choose file', text: 'Pick a video from your gallery — we host and stream it.' },
          { icon: 'link', title: 'By URL', text: 'Or paste a public, copyright-free video link.' },
          { icon: 'shield-checkmark', title: 'Review', text: 'New uploads are reviewed before going public.' },
        ]}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <GradientText variant="h2" style={{ lineHeight: 32, paddingBottom: 2 }}>New Upload</GradientText>

        <View style={styles.modeRow}>
          <ModeBtn active={mode === 'file'} icon="folder-open" label="Choose File" onPress={() => setMode('file')} />
          <ModeBtn active={mode === 'url'} icon="link" label="Paste URL" onPress={() => setMode('url')} />
        </View>

        {mode === 'file' ? (
          <TouchableOpacity onPress={pickFile} activeOpacity={0.85} style={styles.dropZone} disabled={uploading}>
            <Icon name={pickedFile ? 'checkmark-circle' : 'cloud-upload-outline'} size={32} color={pickedFile ? colors.success : colors.primary} />
            <AppText variant="small" bold style={{ marginTop: 8 }} numberOfLines={1}>
              {pickedFile ? pickedFile.name : 'Tap to choose a video'}
            </AppText>
            <AppText variant="tiny" color={colors.textMuted} style={{ marginTop: 2 }}>
              {pickedFile ? 'Tap to change' : 'MP4, MOV, etc.'}
            </AppText>
          </TouchableOpacity>
        ) : (
          <Field label="Video URL" value={url} onChange={setUrl} placeholder="https://..." />
        )}

        <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. My First Episode" />
        <Field label="Description" value={description} onChange={setDescription} placeholder="What's it about?" multiline />

        <AppText variant="small" color={colors.textSecondary} style={{ marginTop: spacing.md, marginBottom: 8 }}>Type</AppText>
        <View style={styles.formatRow}>
          {FORMATS.map((f) => {
            const active = f.key === format;
            return (
              <TouchableOpacity key={f.key} onPress={() => setFormat(f.key)} activeOpacity={0.85}
                style={[styles.formatChip, active && { borderColor: colors.primary, backgroundColor: 'rgba(238,48,99,0.15)' }]}>
                <Icon name={f.icon} size={18} color={active ? colors.primary : colors.textMuted} />
                <AppText variant="tiny" bold color={active ? colors.primary : colors.textSecondary} style={{ marginTop: 4 }}>{f.label}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <AppText variant="small" color={colors.textSecondary} style={{ marginTop: spacing.md, marginBottom: 8 }}>Category</AppText>
        <View style={styles.catWrap}>
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <TouchableOpacity key={c} onPress={() => setCategory(c)} activeOpacity={0.85}
                style={[styles.catChip, active && { borderColor: colors.primary, backgroundColor: 'rgba(238,48,99,0.15)' }]}>
                <AppText variant="tiny" bold color={active ? colors.primary : colors.textSecondary}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* upload progress */}
        {uploading && mode === 'file' && (
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 6 }}>
              Uploading… {progress}%
            </AppText>
          </View>
        )}

        <TouchableOpacity activeOpacity={0.85} onPress={onSubmit} disabled={busy} style={styles.submitBtn}>
          <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          {busy ? <ActivityIndicator color={colors.white} /> : <AppText bold color={colors.white}>{mode === 'file' ? 'Upload Video' : 'Upload from URL'}</AppText>}
        </TouchableOpacity>

        {/* my uploads */}
        <View style={styles.uploadsHead}>
          <GradientText variant="h3" style={{ lineHeight: 28, paddingBottom: 2 }}>My Uploads</GradientText>
          <TouchableOpacity onPress={() => myContentQuery.refetch()} style={styles.refreshBtn} activeOpacity={0.8}>
            <Icon name="refresh" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <AppText variant="tiny" bold color={colors.primary}>Refresh</AppText>
          </TouchableOpacity>
        </View>

        {myContent.length === 0 ? (
          <AppText variant="small" color={colors.textMuted} style={{ paddingVertical: spacing.md }}>
            No uploads yet. Your uploads will appear here.
          </AppText>
        ) : myContent.map((c) => {
          const canSync = c.uploadStatus === 'DRAFT' || c.uploadStatus === 'PROCESSING';
          return (
            <View key={c.id} style={styles.uploadRow}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                activeOpacity={canSync ? 0.7 : 1}
                onPress={() => canSync && refreshItem(c)}>
                <Icon name={c.format === 'CLIP' ? 'cut' : c.format === 'REEL' ? 'phone-portrait' : c.format === 'PODCAST' ? 'mic' : 'film'} size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <AppText variant="small" bold numberOfLines={1}>{c.title}</AppText>
                  <AppText variant="tiny" color={colors.textMuted}>
                    {c.format}{canSync ? ' · tap to refresh' : ''}
                  </AppText>
                </View>
              </TouchableOpacity>
              {syncingId === c.id
                ? <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: 8 }} />
                : <StatusPill status={c.uploadStatus} />}
              <TouchableOpacity onPress={() => deleteItem(c)} style={styles.delBtn} activeOpacity={0.7}>
                <Icon name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
};

const ModeBtn: React.FC<{ active: boolean; icon: string; label: string; onPress: () => void }> = ({ active, icon, label, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85}
    style={[styles.modeBtn, active && { borderColor: colors.primary, backgroundColor: 'rgba(238,48,99,0.15)' }]}>
    <Icon name={icon} size={16} color={active ? colors.primary : colors.textMuted} style={{ marginRight: 6 }} />
    <AppText variant="small" bold color={active ? colors.primary : colors.textSecondary}>{label}</AppText>
  </TouchableOpacity>
);

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const color = status === 'APPROVED' ? colors.success : status === 'REJECTED' ? colors.error : colors.warning;
  const label = status === 'PENDING_REVIEW' ? 'IN REVIEW' : status;
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22` }]}>
      <AppText variant="tiny" bold color={color}>{label}</AppText>
    </View>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (s: string) => void; placeholder: string; multiline?: boolean }> =
  ({ label, value, onChange, placeholder, multiline }) => (
  <View style={{ marginTop: spacing.md }}>
    <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: 6 }}>{label}</AppText>
    <TextInput
      value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted}
      autoCapitalize={label === 'Video URL' ? 'none' : 'sentences'} autoCorrect={label !== 'Video URL'}
      multiline={multiline} style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
    />
  </View>
);

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.md, paddingHorizontal: 14, height: 48, color: colors.white,
    fontFamily: 'Outfit-Regular', fontSize: 14,
  },
  modeRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: layout.radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  dropZone: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, marginTop: spacing.md, borderRadius: layout.radius.lg, borderWidth: 1.5, borderColor: colors.border2, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.04)' },
  formatRow: { flexDirection: 'row', gap: 8 },
  formatChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: layout.radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  progressWrap: { marginTop: spacing.lg },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  submitBtn: { height: 50, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  uploadsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  delBtn: { padding: 6, marginLeft: 8 },
});

export default CreatorUploadScreen;