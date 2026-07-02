import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert, RefreshControl, Modal, ActivityIndicator, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { creatorsApi, CreatorContent } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

// Pull a YouTube video id out of a full URL (watch?v=, youtu.be/, embed/, shorts/).
function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Self-contained preview page with CUSTOM controls only (no native <video controls>).
// iOS silently promotes a controls-enabled <video> to its own full-screen
// AVPlayer view once it starts playing — that native player draws its own X,
// which sits on top of and swallows taps meant for our React Native Close
// button. Building our own minimal play/pause + scrubber avoids that takeover
// entirely, so our header Close button always stays reachable.
function buildPreviewHtml(item: CreatorContent): string {
  const isYouTube = item.source === 'YOUTUBE';
  const ytId = isYouTube && item.videoUrl ? extractYouTubeId(item.videoUrl) : null;
  if (isYouTube && ytId) {
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000}</style></head>
    <body><iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&playsinline=1&rel=0&modestbranding=1" style="width:100%;height:100%;border:0" allow="autoplay; encrypted-media" allowfullscreen></iframe></body></html>`;
  }

  const src = item.hlsUrl || item.videoUrl || '';
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{width:100%;height:100%;background:#000;overflow:hidden;font-family:-apple-system,Roboto,sans-serif}
    #stage{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
    #v{width:100%;height:100%;background:#000;object-fit:contain}
    #center{position:absolute;width:64px;height:64px;border-radius:32px;background:rgba(20,20,24,0.55);
      display:flex;align-items:center;justify-content:center;transition:opacity .15s}
    #center svg{width:28px;height:28px;fill:#fff;margin-left:2px}
    #bar{position:absolute;left:0;right:0;bottom:0;padding:10px 16px 16px;
      background:linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0));
      display:flex;align-items:center;gap:10px;transition:opacity .15s}
    #bar span{color:#fff;font-size:11px;min-width:36px;text-align:center;opacity:0.85}
    #track{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,0.25);position:relative}
    #fill{position:absolute;left:0;top:0;bottom:0;width:0%;border-radius:2px;background:linear-gradient(90deg,#EE3063,#4A51A1)}
    #knob{position:absolute;top:50%;width:11px;height:11px;border-radius:6px;background:#fff;transform:translate(-50%,-50%);left:0%}
    #spinner{position:absolute;width:34px;height:34px;border:3px solid rgba(255,255,255,0.25);border-top-color:#EE3063;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style></head>
  <body>
  <div id="stage">
    <video id="v" playsinline webkit-playsinline muted autoplay></video>
    <div id="spinner"></div>
    <div id="center" style="opacity:0">
      <svg id="playIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <div id="bar" style="opacity:0">
      <span id="cur">0:00</span>
      <div id="track"><div id="fill"></div><div id="knob"></div></div>
      <span id="dur">0:00</span>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js"></script>
  <script>
    var video = document.getElementById('v');
    var stage = document.getElementById('stage');
    var center = document.getElementById('center');
    var playIcon = document.getElementById('playIcon');
    var bar = document.getElementById('bar');
    var spinner = document.getElementById('spinner');
    var fill = document.getElementById('fill');
    var knob = document.getElementById('knob');
    var track = document.getElementById('track');
    var cur = document.getElementById('cur');
    var dur = document.getElementById('dur');
    var src = ${JSON.stringify(src)};

    function fmt(s){ s = Math.max(0, Math.floor(s||0)); var m = Math.floor(s/60); var r = s%60; return m+':'+(r<10?'0':'')+r; }
    function showUI(){ center.style.opacity = 1; bar.style.opacity = 1; }
    function ready(){ spinner.style.display = 'none'; showUI(); video.muted = false; video.play().catch(function(){}); }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src; video.addEventListener('loadedmetadata', ready);
    } else if (window.Hls && window.Hls.isSupported()) {
      var hls = new Hls(); hls.loadSource(src); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, ready);
    } else {
      video.src = src; video.addEventListener('loadedmetadata', ready);
    }

    video.addEventListener('play', function(){ playIcon.innerHTML = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'; });
    video.addEventListener('pause', function(){ playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>'; });
    video.addEventListener('timeupdate', function(){
      if (!video.duration) return;
      var pct = (video.currentTime / video.duration) * 100;
      fill.style.width = pct + '%'; knob.style.left = pct + '%';
      cur.textContent = fmt(video.currentTime); dur.textContent = fmt(video.duration);
    });

    stage.addEventListener('click', function(e){
      if (e.target === track || e.target === fill || e.target === knob) return;
      if (video.paused) { video.play(); } else { video.pause(); }
    });
    track.addEventListener('click', function(e){
      var r = track.getBoundingClientRect();
      var pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      if (video.duration) video.currentTime = pct * video.duration;
    });
  </script>
  </body></html>`;
}

const AdminReviewScreen = () => {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [previewItem, setPreviewItem] = useState<CreatorContent | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  const pendingQ = useQuery({
    queryKey: ['admin', 'content', 'pending'],
    queryFn: () => creatorsApi.adminPendingContent(1, 50),
  });

  const approve = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => creatorsApi.adminApproveContent(id, featured),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'content', 'pending'] }); Alert.alert('Approved', 'Content is now public.'); },
    onError: (e) => showApiError(e, 'Could not approve.'),
  });
  const reject = useMutation({
    mutationFn: (id: string) => creatorsApi.adminRejectContent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'content', 'pending'] }); },
    onError: (e) => showApiError(e, 'Could not reject.'),
  });

  const onReject = (c: CreatorContent) =>
    Alert.alert('Reject content', `Reject "${c.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => reject.mutate(c.id) },
    ]);

  const onApprove = (c: CreatorContent) =>
    Alert.alert('Approve content', `Approve "${c.title}"?`, [
      { text: 'Approve', onPress: () => approve.mutate({ id: c.id, featured: false }) },
      { text: 'Approve + Feature', onPress: () => approve.mutate({ id: c.id, featured: true }) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const openPreview = (c: CreatorContent) => {
    if (!c.videoUrl && !c.hlsUrl) {
      Alert.alert('Not ready', 'This video is still processing and has no playable URL yet.');
      return;
    }
    setPreviewLoading(true);
    setPreviewItem(c);
  };

  const items = pendingQ.data?.items || [];

  return (
    <ScreenContainer>
      <BrandHeader showBack onBack={() => navigation.goBack()}
        infoTitle="Content review"
        infoIntro="Review uploads from creators before they go public. Tap a video to preview it before deciding."
        infoPoints={[
          { icon: 'play-circle', title: 'Preview', text: 'Tap the thumbnail to watch before approving.' },
          { icon: 'checkmark-circle', title: 'Approve', text: 'Make the upload public — optionally feature it.' },
          { icon: 'close-circle', title: 'Reject', text: 'Reject content that breaks the rules.' },
        ]}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={pendingQ.isFetching} onRefresh={() => pendingQ.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <GradientText variant="h1" style={styles.title}>Review</GradientText>
            <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
              {items.length} item{items.length === 1 ? '' : 's'} awaiting review
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => openPreview(item)} activeOpacity={0.85} style={styles.thumbWrap}>
                {item.thumbnailUrl
                  ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
                  : <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}><Icon name="film" size={20} color={colors.textMuted} /></View>}
                <View style={styles.playOverlay}>
                  <View style={styles.playBtn}><Icon name="play" size={16} color="#fff" /></View>
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText bold numberOfLines={2}>{item.title}</AppText>
                <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {item.format} · {(item as any).category || ''}
                </AppText>
                {(item as any).creator?.displayName ? (
                  <AppText variant="tiny" color={colors.textMuted} style={{ marginTop: 2 }}>
                    by {(item as any).creator.displayName}
                  </AppText>
                ) : null}
                <View style={styles.statusPill}>
                  <AppText variant="tiny" bold color={colors.warning}>{item.uploadStatus}</AppText>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              <TouchableOpacity onPress={() => openPreview(item)} style={styles.previewBtn} activeOpacity={0.85}>
                <Icon name="play-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <AppText variant="small" bold color={colors.primary}>Preview</AppText>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <AppButton title="Approve" size="sm" fullWidth disabled={approve.isPending} onPress={() => onApprove(item)} />
              </View>
              <TouchableOpacity onPress={() => onReject(item)} style={styles.rejectBtn} activeOpacity={0.85}>
                <Icon name="close" size={16} color={colors.error} style={{ marginRight: 6 }} />
                <AppText variant="small" bold color={colors.error}>Reject</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !pendingQ.isLoading ? (
            <View style={styles.empty}>
              <Icon name="checkmark-done-circle-outline" size={42} color={colors.textMuted} />
              <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 8 }}>Nothing to review.</AppText>
            </View>
          ) : null
        }
      />

      {/* Preview modal — custom-controls player so our Close button can never
          be covered by a native fullscreen video takeover. */}
      <Modal visible={!!previewItem} animationType="slide" onRequestClose={() => setPreviewItem(null)} statusBarTranslucent>
        <View style={styles.previewRoot}>
          <StatusBar hidden barStyle="light-content" />
          <View style={styles.previewVideoWrap}>
            {previewItem && (
              <WebView
                key={previewItem.id}
                source={{ html: buildPreviewHtml(previewItem) }}
                originWhitelist={['*']}
                javaScriptEnabled domStorageEnabled
                allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo={false}
                onLoadEnd={() => setPreviewLoading(false)}
                style={{ flex: 1, backgroundColor: '#000' }}
              />
            )}
            {previewLoading && (
              <View style={styles.previewLoader} pointerEvents="none">
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            )}
            {/* Rendered ABOVE the WebView (separate layer, higher elevation) so it
                can never be swallowed by anything happening inside the video. */}
            <SafeAreaView edges={['top']} style={styles.previewTopBar} pointerEvents="box-none">
              <View style={styles.previewHeaderRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <AppText bold numberOfLines={1} color="#fff">{previewItem?.title}</AppText>
                  <AppText variant="tiny" color="rgba(255,255,255,0.65)">Preview</AppText>
                </View>
                <TouchableOpacity onPress={() => setPreviewItem(null)} style={styles.previewClose} hitSlop={14} activeOpacity={0.8}>
                  <Icon name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
          {previewItem && (
            <SafeAreaView edges={['bottom']} style={styles.previewActionsWrap}>
              <View style={styles.previewActions}>
                <TouchableOpacity
                  onPress={() => { const it = previewItem; setPreviewItem(null); if (it) onReject(it); }}
                  style={styles.rejectBtn} activeOpacity={0.85}
                >
                  <Icon name="close" size={16} color={colors.error} style={{ marginRight: 6 }} />
                  <AppText variant="small" bold color={colors.error}>Reject</AppText>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <AppButton title="Approve" size="sm" fullWidth onPress={() => { const it = previewItem; setPreviewItem(null); if (it) onApprove(it); }} />
                </View>
              </View>
            </SafeAreaView>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: layout.radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  thumbWrap: { position: 'relative' },
  thumb: { width: 100, height: 64, borderRadius: layout.radius.md, backgroundColor: colors.surfaceElevated },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: layout.radius.md },
  playBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(238,48,99,0.85)', alignItems: 'center', justifyContent: 'center' },
  statusPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,176,32,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 6 },
  previewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.primary, backgroundColor: 'rgba(238,48,99,0.1)' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.error, backgroundColor: 'rgba(239,68,68,0.1)' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  previewRoot: { flex: 1, backgroundColor: '#000' },
  previewVideoWrap: { flex: 1, backgroundColor: '#000', position: 'relative' },
  previewLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  previewTopBar: { position: 'absolute', top: 0, left: 0, right: 0, elevation: 20, zIndex: 20 },
  previewHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10 },
  previewClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(20,20,24,0.6)', alignItems: 'center', justifyContent: 'center' },
  previewActionsWrap: { backgroundColor: '#0a0a0a' },
  previewActions: { flexDirection: 'row', gap: 10, padding: spacing.md },
});

export default AdminReviewScreen;