import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';

const WebPlayerScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const url: string | undefined = route.params?.url || route.params?.videoUrl;
  const title: string = route.params?.title || 'Now Playing';
  const [loading, setLoading] = useState(true);
  const webRef = useRef<WebView>(null);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.top}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Icon name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <AppText bold numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{title}</AppText>
        <TouchableOpacity onPress={() => webRef.current?.reload()} style={styles.iconBtn}>
          <Icon name="refresh" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {url ? (
        <View style={{ flex: 1 }}>
          <WebView
            ref={webRef}
            source={{ uri: url }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1, backgroundColor: '#000' }}
          />
          {loading && <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>}
        </View>
      ) : (
        <View style={styles.empty}>
          <Icon name="play-circle-outline" size={56} color={colors.textMuted} />
          <AppText variant="small" color={colors.textSecondary} center style={{ marginTop: spacing.md }}>
            No video to play.{'\n'}Pick something from Browse or a room.
          </AppText>
          <TouchableOpacity onPress={() => navigation.navigate('Browse')} style={{ marginTop: spacing.lg }}>
            <AppText bold color={colors.primary}>Go to Browse</AppText>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});

export default WebPlayerScreen;