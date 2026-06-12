import React, { useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/AppText';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import GradientText from '@/components/GradientText';
import ScreenContainer from '@/components/ScreenContainer';
import BrandHeader from '@/components/BrandHeader';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { roomsApi } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

type Provider = 'YOUTUBE' | 'VIMEO' | 'PHONE';
const HOMEPAGES: Record<Provider, string> = { YOUTUBE: 'https://www.youtube.com', VIMEO: 'https://vimeo.com', PHONE: '' };
const PROVIDER_NAMES: Record<Provider, string> = { YOUTUBE: 'YouTube', VIMEO: 'Vimeo', PHONE: 'Custom URL' };

const VideoPickerScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const provider: Provider = (route.params?.provider as Provider) || 'YOUTUBE';
  const roomName: string = route.params?.roomName || `Watch Party ${new Date().toLocaleDateString()}`;

  const [currentUrl, setCurrentUrl] = useState(HOMEPAGES[provider]);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneUrl, setPhoneUrl] = useState('');
  const webviewRef = useRef<WebView>(null);

  const createMutation = useMutation({
    mutationFn: (videoUrl: string) => roomsApi.create({ name: roomName, isPrivate: false, videoUrl }),
    onSuccess: ({ room }) => { queryClient.invalidateQueries({ queryKey: queryKeys.rooms }); navigation.replace('Room', { roomId: room.id }); },
    onError: (err) => showApiError(err, 'Could not create room.'),
  });

  const onNavStateChange = (s: WebViewNavigation) => { setCurrentUrl(s.url); setCanGoBack(s.canGoBack); setIsLoading(s.loading); };
  const startWatchParty = () => createMutation.mutate(currentUrl);
  const handlePhoneSubmit = () => { if (!phoneUrl.trim()) return showApiError(new Error('Paste a direct video URL.')); createMutation.mutate(phoneUrl.trim()); };

  if (provider === 'PHONE') {
    return (
      <ScreenContainer>
        <BrandHeader
          infoTitle="Custom video URL"
          infoIntro="Paste a direct link to any supported video and watch it together."
          infoPoints={[
            { icon: 'link', title: 'Direct links', text: 'Use a .mp4 or supported HTML5 video URL.' },
            { icon: 'people', title: 'Watch together', text: 'A room is created instantly and friends can join.' },
            { icon: 'alert-circle', title: 'No DRM', text: 'Netflix/Disney+ links won\'t play due to protection.' },
          ]}
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.phoneBody}>
            <GradientText variant="h1" style={styles.title}>Custom URL</GradientText>
            <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
              Paste a direct video URL (.mp4 or supported HTML5 video).
            </AppText>
            <AppInput value={phoneUrl} onChangeText={setPhoneUrl} placeholder="https://example.com/movie.mp4"
              autoCapitalize="none" autoCorrect={false} containerStyle={{ marginBottom: spacing.lg }} />
            <AppButton title={createMutation.isPending ? 'Creating…' : 'Create Room'} size="lg" fullWidth
              onPress={handlePhoneSubmit} disabled={createMutation.isPending} />
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><Icon name="close" size={22} color={colors.white} /></TouchableOpacity>
        <View style={styles.titleWrap}>
          <AppText bold>{PROVIDER_NAMES[provider]}</AppText>
          {isLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
        </View>
        <TouchableOpacity onPress={() => (canGoBack ? webviewRef.current?.goBack() : webviewRef.current?.reload())} style={styles.iconBtn}>
          <Icon name={canGoBack ? 'chevron-back' : 'refresh'} size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
      <WebView ref={webviewRef} source={{ uri: HOMEPAGES[provider] }} onNavigationStateChange={onNavStateChange}
        originWhitelist={['*']} javaScriptEnabled domStorageEnabled allowsFullscreenVideo allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false} style={styles.webview} />
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={startWatchParty} disabled={createMutation.isPending} activeOpacity={0.85} style={{ flex: 1 }}>
          <LinearGradient colors={colors.buttonGradient as unknown as string[]} start={colors.gradientStartPoint} end={colors.gradientEndPoint} style={styles.startBtn}>
            {createMutation.isPending ? <ActivityIndicator color={colors.white} /> : (
              <>
                <Icon name="people" size={18} color={colors.white} />
                <AppText bold color={colors.white} style={{ marginLeft: 8 }}>Start Watch Party</AppText>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bg2, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  webview: { flex: 1 },
  bottomBar: { flexDirection: 'row', padding: 12, backgroundColor: colors.bg2, borderTopWidth: 0.5, borderTopColor: colors.border },
  startBtn: { height: 50, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  phoneBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { lineHeight: 40, paddingBottom: 4, marginBottom: spacing.sm },
});

export default VideoPickerScreen;