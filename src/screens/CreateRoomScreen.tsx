import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView,
  Platform, Switch, ActivityIndicator, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import GradientText from '@/components/GradientText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { roomsApi } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

type Provider = 'YOUTUBE' | 'VIMEO';
const HOMEPAGES: Record<Provider, string> = { YOUTUBE: 'https://m.youtube.com', VIMEO: 'https://vimeo.com' };

// room name max 60 chars (backend rule)
function clampName(s: string): string {
  const t = (s || '').trim();
  if (!t) return `Watch Party ${new Date().toLocaleDateString()}`;
  return t.length > 55 ? t.slice(0, 55).trim() + '…' : t;
}

type PickedContent = { title?: string; videoUrl?: string | null; videoId?: string | null; thumbnailUrl?: string | null; };

const CreateRoomScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const content: PickedContent | undefined = route.params?.content;

  const [name, setName] = useState(content?.title ? clampName(content.title) : '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingProvider, setPendingProvider] = useState<Provider | 'CONTENT' | null>(null);

  const buildBody = (videoUrl?: string | null) => {
    const body: any = { name: clampName(name), isPrivate };
    if (isPrivate && password.trim()) body.password = password.trim();
    const vu = (videoUrl || '').trim();
    if (vu) body.videoUrl = vu;
    return body;
  };

  const createMutation = useMutation({
    mutationFn: (videoUrl?: string | null) => roomsApi.create(buildBody(videoUrl)),
    onSuccess: (res: any) => {
      const room = res?.room || res?.data?.room || res?.data || res;
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      setPendingProvider(null);
      if (room?.id) navigation.replace('Room', { roomId: room.id });
      else showApiError(new Error('Room created but no id returned'), 'Could not create room.');
    },
    onError: (err) => { setPendingProvider(null); showApiError(err, 'Could not create room.'); },
  });

  const startWithContent = () => {
    if (createMutation.isPending) return;
    if (isPrivate && !password.trim()) { showApiError(new Error('Set a password for the private room.')); return; }
    setPendingProvider('CONTENT');
    createMutation.mutate(content?.videoUrl || null);
  };

  const pickProvider = (provider: Provider) => {
    if (createMutation.isPending) return;
    if (isPrivate && !password.trim()) { showApiError(new Error('Set a password for the private room.')); return; }
    setPendingProvider(provider);
    createMutation.mutate(HOMEPAGES[provider]);
  };

  return (
    <ScreenContainer>
      <BrandHeader
        infoTitle="Creating a room"
        infoIntro="Name your room, then start watching. Friends can join with a link or code."
        infoPoints={[
          { icon: 'create', title: 'Name it', text: 'Give your room a name so friends know what they are joining.' },
          { icon: 'lock-closed', title: 'Private rooms', text: 'Turn on private + set a password to control who joins.' },
          { icon: 'play', title: 'Start watching', text: 'Tap Start Watching — the room opens with your video ready.' },
        ]}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <GradientText variant="h1" center style={styles.title}>Create Room</GradientText>
          <AppText variant="small" color={colors.textSecondary} center style={styles.sub}>
            {content?.title ? 'Name your room and start watching.' : 'Name your room, then pick where to watch.'}
          </AppText>

          {content?.videoId ? (
            <View style={styles.posterWrap}>
              <Image source={{ uri: content.thumbnailUrl || `https://img.youtube.com/vi/${content.videoId}/hqdefault.jpg` }} style={styles.poster} />
              <View style={styles.posterOverlay}><View style={styles.posterPlayCircle}><Icon name="play" size={26} color="#fff" /></View></View>
            </View>
          ) : (
            <View style={styles.ringsWrap}>
              <View style={styles.ring1}><View style={styles.ring2}><View style={styles.ring3}>
                <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
                <Icon name="play" size={42} color={colors.white} />
              </View></View></View>
            </View>
          )}

          <View style={styles.form}>
            <AppInput value={name} onChangeText={setName} placeholder="Room name (e.g. Friday Movie Night)" containerStyle={{ marginBottom: spacing.md }} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <AppText bold>Private room</AppText>
                <AppText variant="tiny" color={colors.textSecondary}>Only people with the password can join.</AppText>
              </View>
              <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.primary }} thumbColor={colors.white} />
            </View>

            {isPrivate && <AppInput value={password} onChangeText={setPassword} placeholder="Room password" containerStyle={{ marginBottom: spacing.md }} />}

            {content?.videoId ? (
              <TouchableOpacity onPress={startWithContent} disabled={createMutation.isPending} activeOpacity={0.85} style={{ marginTop: spacing.md }}>
                <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={styles.startBtn}>
                  {createMutation.isPending ? <ActivityIndicator color="#fff" /> : (<><Icon name="play" size={18} color="#fff" /><AppText bold color="#fff" style={{ marginLeft: 8 }}>Start Watching</AppText></>)}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <GradientText variant="h3" style={styles.sectionTitle}>Connect a Video</GradientText>
                <View style={styles.providerGrid}>
                  <ProviderTile label="YouTube" icon="youtube-play" color="#FF0000" onPress={() => pickProvider('YOUTUBE')} loading={pendingProvider === 'YOUTUBE'} disabled={createMutation.isPending} />
                  <ProviderTile label="Vimeo" icon="vimeo" color="#1AB7EA" onPress={() => pickProvider('VIMEO')} loading={pendingProvider === 'VIMEO'} disabled={createMutation.isPending} />
                </View>
                <AppText variant="tiny" color={colors.textMuted} center style={{ marginTop: spacing.md }}>Netflix / Disney+ / HBO are not supported due to DRM.</AppText>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const ProviderTile: React.FC<{ label: string; icon: string; color: string; onPress: () => void; loading: boolean; disabled: boolean; }> = ({ label, icon, color, onPress, loading, disabled }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.providerTile, disabled && !loading && { opacity: 0.4 }]} activeOpacity={0.85}>
    <View style={[styles.providerIcon, { backgroundColor: color }]}>{loading ? <ActivityIndicator color="#fff" /> : <FAIcon name={icon} size={36} color={colors.white} />}</View>
    <AppText variant="small" bold center style={{ marginTop: 10 }}>{label}</AppText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  title: { lineHeight: 40, paddingBottom: 4, marginTop: spacing.sm },
  sub: { paddingHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.xs },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.md, lineHeight: 28, paddingBottom: 3 },
  ringsWrap: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  ring1: { width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(238,48,99,0.05)', alignItems: 'center', justifyContent: 'center' },
  ring2: { width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(238,48,99,0.1)', alignItems: 'center', justifyContent: 'center' },
  ring3: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  posterWrap: { marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: 16, overflow: 'hidden', height: 200, backgroundColor: colors.surfaceElevated },
  poster: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  posterOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  posterPlayCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(238,48,99,0.9)', alignItems: 'center', justifyContent: 'center' },
  form: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  startBtn: { height: 54, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  providerGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.xl },
  providerTile: { alignItems: 'center' },
  providerIcon: { width: 96, height: 96, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
});

export default CreateRoomScreen;