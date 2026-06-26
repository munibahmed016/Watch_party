import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  AudioSession,
  LiveKitRoom,
  useParticipants,
  useTracks,
  VideoTrack,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import { creatorsApi, LiveKitJoin } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

const LiveViewerScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const sessionId: string = route.params?.sessionId;
  const titleParam: string = route.params?.title || 'Live';

  const [join, setJoin] = useState<LiveKitJoin | null>(null);
  const [title, setTitle] = useState(titleParam);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);

  // Start audio session for playback
  useEffect(() => {
    (async () => { await AudioSession.startAudioSession(); })();
    return () => { AudioSession.stopAudioSession(); };
  }, []);

  // Join the live session → get viewer token
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!sessionId) { setLoading(false); setEnded(true); return; }
      try {
        const { session, livekit } = await creatorsApi.joinLive(sessionId);
        if (!mounted) return;
        setTitle(session?.title || titleParam);
        setJoin(livekit);
      } catch (err) {
        if (!mounted) return;
        showApiError(err, 'Could not join the live stream.');
        setEnded(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [sessionId]);

  const leave = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Loading
  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText variant="small" color={colors.white} style={{ marginTop: 12 }}>Joining live…</AppText>
      </View>
    );
  }

  // Ended / could not join
  if (ended || !join) {
    return (
      <View style={[styles.root, styles.center]}>
        <Icon name="radio-outline" size={56} color={colors.textMuted} />
        <AppText bold color={colors.white} style={{ marginTop: 16, fontSize: 18 }}>Stream ended</AppText>
        <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: 6, paddingHorizontal: 40 }}>
          This live stream is no longer available.
        </AppText>
        <TouchableOpacity onPress={leave} style={styles.backPill} activeOpacity={0.85}>
          <AppText bold color={colors.white}>Go back</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  // Live — connect as viewer (NO publish: video/audio false)
  return (
    <LiveKitRoom
      serverUrl={join.url}
      token={join.token}
      connect
      video={false}
      audio={false}
      options={{ adaptiveStream: true }}>
      <Viewer title={title} onLeave={leave} onEnded={() => setEnded(true)} />
    </LiveKitRoom>
  );
};

// Inner — renders the creator's remote camera + audio
const Viewer: React.FC<{ title: string; onLeave: () => void; onEnded: () => void }> = ({ title, onLeave, onEnded }) => {
  const participants = useParticipants();
  // viewers = everyone except the creator (publisher)
  const viewers = Math.max(0, participants.length - 1);

  // All camera tracks; pick the remote one (the creator)
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const remoteCam = tracks.find((t) => !t.participant?.isLocal);

  // If creator leaves (no remote participant publishing), show ended
  const hasPublisher = participants.some((p) => !p.isLocal);
  useEffect(() => {
    if (!hasPublisher) {
      const t = setTimeout(() => { if (!hasPublisher) onEnded(); }, 4000);
      return () => clearTimeout(t);
    }
  }, [hasPublisher, onEnded]);

  return (
    <View style={styles.liveWrap}>
      {remoteCam ? (
        <VideoTrack trackRef={remoteCam} style={StyleSheet.absoluteFillObject as any} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.camPlaceholder]}>
          <ActivityIndicator color={colors.white} />
          <AppText variant="small" color={colors.white} style={{ marginTop: 10 }}>Connecting to stream…</AppText>
        </View>
      )}

      {/* top bar */}
      <View style={styles.topBar}>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <AppText variant="tiny" bold color={colors.white}>LIVE</AppText>
        </View>
        <View style={styles.viewerPill}>
          <Icon name="eye" size={13} color={colors.white} style={{ marginRight: 4 }} />
          <AppText variant="tiny" bold color={colors.white}>{viewers}</AppText>
        </View>
        <TouchableOpacity onPress={onLeave} style={styles.closeBtn}>
          <Icon name="close" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* title */}
      <View style={styles.titleBar}>
        <AppText bold color={colors.white} numberOfLines={1}>{title}</AppText>
        <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 2 }}>You're watching live</AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  liveWrap: { flex: 1, backgroundColor: '#000' },
  camPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF0000', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, marginRight: 5 },
  viewerPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  titleBar: { position: 'absolute', bottom: 40, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 12 },
  backPill: { marginTop: 24, paddingHorizontal: 32, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});

export default LiveViewerScreen;