// src/screens/VideoPickerScreen.tsx
// In-app YouTube/Vimeo browser. Matches previous WebPlayerScreen approach.

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
import GradientButton from '@/components/GradientButton';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import { roomsApi } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { showApiError } from '@/hooks/useApiErrorAlert';

type Provider = 'YOUTUBE' | 'VIMEO' | 'PHONE';

const HOMEPAGES: Record<Provider, string> = {
  YOUTUBE: 'https://www.youtube.com',
  VIMEO: 'https://vimeo.com',
  PHONE: '',
};

const PROVIDER_NAMES: Record<Provider, string> = {
  YOUTUBE: 'YouTube',
  VIMEO: 'Vimeo',
  PHONE: 'Custom URL',
};

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
    mutationFn: (videoUrl: string) =>
      roomsApi.create({
        name: roomName,
        isPrivate: false,
        videoUrl,
      }),
    onSuccess: ({ room }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      navigation.replace('Room', { roomId: room.id });
    },
    onError: (err) => showApiError(err, 'Could not create room.'),
  });

  const onNavStateChange = (navState: WebViewNavigation) => {
    setCurrentUrl(navState.url);
    setCanGoBack(navState.canGoBack);
    setIsLoading(navState.loading);
  };

  const startWatchParty = () => {
    createMutation.mutate(currentUrl);
  };

  const handlePhoneSubmit = () => {
    if (!phoneUrl.trim()) {
      return showApiError(new Error('Paste a direct video URL.'));
    }
    createMutation.mutate(phoneUrl.trim());
  };

  // === PHONE / CUSTOM URL VIEW ===
  if (provider === 'PHONE') {
    return (
      <ScreenContainer>
        <AppHeader title="Custom URL" showLogo={false} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.phoneBody}>
            <AppText variant="small" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
              Paste a direct video URL (.mp4 or supported HTML5 video).
            </AppText>
            <AppInput
              value={phoneUrl}
              onChangeText={setPhoneUrl}
              placeholder="https://example.com/movie.mp4"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={{ marginBottom: spacing.lg }}
            />
            <GradientButton
              title={createMutation.isPending ? 'Creating...' : 'Create Room'}
              size="lg"
              onPress={handlePhoneSubmit}
              disabled={createMutation.isPending}
            />
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  // === YOUTUBE / VIMEO FULL-SCREEN BROWSER ===
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}>
          <Icon name="close" size={22} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <AppText bold>{PROVIDER_NAMES[provider]}</AppText>
          {isLoading && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
          )}
        </View>

        <TouchableOpacity
          onPress={() => (canGoBack ? webviewRef.current?.goBack() : webviewRef.current?.reload())}
          style={styles.iconBtn}>
          <Icon name={canGoBack ? 'chevron-back' : 'refresh'} size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* WebView — full screen */}
      <WebView
        ref={webviewRef}
        source={{ uri: HOMEPAGES[provider] }}
        onNavigationStateChange={onNavStateChange}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={styles.webview}
      />

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={startWatchParty}
          disabled={createMutation.isPending}
          activeOpacity={0.85}
          style={{ flex: 1 }}>
          <LinearGradient
            colors={colors.buttonGradient as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtn}>
            {createMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name="people" size={18} color={colors.white} />
                <AppText bold style={{ marginLeft: 8 }}>
                  Start Watch Party
                </AppText>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#1a0e1f',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  iconBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  titleWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  webview: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1a0e1f',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  startBtn: {
    height: 50, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  phoneBody: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
  },
});

export default VideoPickerScreen;