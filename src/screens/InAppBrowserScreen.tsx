import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

const InAppBrowserScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialUrl: string = route.params?.url || 'https://m.youtube.com';
  const title: string = route.params?.title || 'Browser';

  const webRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [addressInput, setAddressInput] = useState(initialUrl);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const reload = () => webRef.current?.reload();
  const goBack = () => webRef.current?.goBack();
  const goForward = () => webRef.current?.goForward();

  const submitAddress = () => {
    let url = addressInput.trim();
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    webRef.current?.injectJavaScript(`window.location.href = "${url}"; true;`);
  };

  const startParty = () => {
    navigation.replace('Room', { sourceUrl: currentUrl, sourceName: title });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Icon name="close" size={20} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.addressBox}>
            <Icon name="lock-closed" size={12} color={colors.success} style={{ marginRight: 6 }} />
            <TextInput
              value={addressInput}
              onChangeText={setAddressInput}
              onSubmitEditing={submitAddress}
              style={styles.address}
              selectTextOnFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity onPress={reload} style={styles.iconBtn}>
            <Icon name="refresh" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.webWrap}>
        <WebView
          ref={webRef}
          source={{ uri: initialUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={navState => {
            setCurrentUrl(navState.url);
            setAddressInput(navState.url);
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
          }}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          style={{ flex: 1, backgroundColor: '#000' }}
        />
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </View>

      {/* Bottom nav bar with start party CTA */}
      <SafeAreaView edges={['bottom']} style={styles.bottomWrap}>
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={goBack} disabled={!canGoBack} style={styles.navBtn}>
            <Icon
              name="chevron-back"
              size={22}
              color={canGoBack ? colors.white : 'rgba(255,255,255,0.3)'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={goForward} disabled={!canGoForward} style={styles.navBtn}>
            <Icon
              name="chevron-forward"
              size={22}
              color={canGoForward ? colors.white : 'rgba(255,255,255,0.3)'}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={startParty} activeOpacity={0.9} style={styles.partyBtn}>
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.partyBtnInner}>
              <Icon name="people" size={16} color={colors.white} style={{ marginRight: 6 }} />
              <AppText variant="small" bold>
                Watch Party
              </AppText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrap: { backgroundColor: '#0F0918' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: layout.radius.pill,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.sm,
    height: 36,
  },
  address: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'SchibstedGrotesk', android: 'SchibstedGrotesk' }),
    paddingVertical: 0,
  },
  webWrap: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomWrap: { backgroundColor: '#0F0918' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyBtn: {
    flex: 1,
    marginLeft: spacing.sm,
    borderRadius: layout.radius.pill,
    overflow: 'hidden',
  },
  partyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
});

export default InAppBrowserScreen;
