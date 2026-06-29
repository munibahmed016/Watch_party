import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, PermissionsAndroid } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import {
  AudioSession,
  LiveKitRoom,
  useLocalParticipant,
  useParticipants,
  VideoTrack,
  useTracks,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import { creatorsApi, LiveKitJoin } from '@/lib/api';
import { showApiError } from '@/hooks/useApiErrorAlert';

async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    return (
      res[PermissionsAndroid.PERMISSIONS.CAMERA] === 'granted' &&
      res[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === 'granted'
    );
  } catch {
    return false;
  }
}

const GoLiveScreen = () => {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [starting, setStarting] = useState(false);
  const [join, setJoin] = useState<LiveKitJoin | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await AudioSession.startAudioSession();
    })();
    return () => {
      AudioSession.stopAudioSession();
      mounted = false;
    };
  }, []);

  const startLive = async () => {
    if (title.trim().length < 2) return Alert.alert('Title required', 'Give your stream a title.');
    const ok = await ensurePermissions();
    if (!ok) return Alert.alert('Permission needed', 'Camera and microphone access are required to go live.');
    try {
      setStarting(true);
      const { session, livekit } = await creatorsApi.startLive({ title: title.trim() });
      setSessionId(session.id);
      setJoin(livekit);
    } catch (err) {
      showApiError(err, 'Could not start the live stream.');
    } finally {
      setStarting(false);
    }
  };

  const endLive = async () => {
    try {
      if (sessionId) {
        await creatorsApi.endLive(sessionId);
      } else {
        // No id in state (e.g. screen reopened) — end whatever is currently live
        await creatorsApi.endMyLive();
      }
    } catch {
      // Last resort: clear any stuck active session with the no-id endpoint
      try { await creatorsApi.endMyLive(); } catch { /* ignore */ }
    }
    setJoin(null);
    setSessionId(null);
    navigation.goBack();
  };

  // ---- Pre-live setup screen ----
  if (!join) {
    return (
      <ScreenContainer>
        <BrandHeader showBack onBack={() => navigation.goBack()}
          infoTitle="Go live"
          infoIntro="Start a live stream and your followers can join instantly."
          infoPoints={[
            { icon: 'radio', title: 'Live', text: 'Broadcast in real time to everyone watching.' },
            { icon: 'people', title: 'Audience', text: 'Followers get notified when you go live.' },
          ]}
        />
        <View style={{ padding: spacing.lg }}>
          <GradientText variant="h2" style={{ lineHeight: 32, paddingBottom: 2 }}>Start a live stream</GradientText>
          <AppText variant="small" color={colors.textSecondary} style={{ marginTop: 4, marginBottom: spacing.lg }}>
            Give your stream a title, then go live.
          </AppText>
          <TextInput
            value={title} onChangeText={setTitle}
            placeholder="What's your stream about?" placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TouchableOpacity activeOpacity={0.85} onPress={startLive} disabled={starting} style={styles.goBtn}>
            <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
            {starting ? <ActivityIndicator color={colors.white} /> : (
              <>
                <Icon name="radio" size={18} color={colors.white} style={{ marginRight: 8 }} />
                <AppText bold color={colors.white}>Go Live</AppText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // ---- Live broadcasting screen ----
  return (
    <LiveKitRoom
      serverUrl={join.url}
      token={join.token}
      connect
      video
      audio
      options={{ adaptiveStream: true }}>
      <Broadcaster title={title} onEnd={endLive} />
    </LiveKitRoom>
  );
};

// Inner component — has access to LiveKit room context
const Broadcaster: React.FC<{ title: string; onEnd: () => void }> = ({ title, onEnd }) => {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const viewers = Math.max(0, participants.length - 1); // minus self

  // Get the local camera track to render a self-preview
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const localCam = tracks.find((t) => t.participant?.isLocal);

  const confirmEnd = () => {
    Alert.alert('End live', 'Stop broadcasting?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: onEnd },
    ]);
  };

  return (
    <View style={styles.liveWrap}>
      {localCam ? (
        <VideoTrack trackRef={localCam} style={StyleSheet.absoluteFillObject as any} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.camPlaceholder]}>
          <ActivityIndicator color={colors.white} />
          <AppText variant="small" color={colors.white} style={{ marginTop: 10 }}>Starting camera…</AppText>
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
      </View>

      {/* title */}
      <View style={styles.titleBar}>
        <AppText bold color={colors.white} numberOfLines={1}>{title}</AppText>
      </View>

      {/* controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => localParticipant?.setCameraEnabled(!localParticipant.isCameraEnabled)} style={styles.ctrlBtn}>
          <Icon name="camera-reverse" size={22} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmEnd} style={styles.endBtn} activeOpacity={0.85}>
          <Icon name="stop" size={18} color={colors.white} style={{ marginRight: 6 }} />
          <AppText bold color={colors.white}>End</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => localParticipant?.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} style={styles.ctrlBtn}>
          <Icon name="mic" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border,
    borderRadius: layout.radius.md, paddingHorizontal: 14, height: 50, color: colors.white,
    fontFamily: 'Outfit-Regular', fontSize: 14, marginBottom: spacing.lg,
  },
  goBtn: { height: 52, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  liveWrap: { flex: 1, backgroundColor: '#000' },
  camPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  topBar: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF0000', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, marginRight: 5 },
  viewerPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  titleBar: { position: 'absolute', bottom: 110, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 12 },
  controls: { position: 'absolute', bottom: 36, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  ctrlBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  endBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF0000', paddingHorizontal: 28, height: 52, borderRadius: 26 },
});

export default GoLiveScreen;