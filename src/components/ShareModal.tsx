// src/components/ShareModal.tsx
//
// FIXES:
//   - "More Options" no longer cut off (proper width allocation, full label visible)
//   - 4-column grid with consistent spacing
//   - WhatsApp / Instagram / Snapchat / Messenger deep links with copy-to-clipboard fallback
//   - Native iOS share sheet for "More Options"
//   - Tap outside to dismiss

import React from 'react';
import {
  View, StyleSheet, Modal, Pressable, Image, TouchableOpacity, Share, Linking, Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import LinearGradient from 'react-native-linear-gradient';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Icon from 'react-native-vector-icons/Ionicons';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';

export type ShareModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  thumbnailUrl?: string;
  shareUrl: string;
  shareText?: string;
};

const ShareModal: React.FC<ShareModalProps> = ({
  visible, onClose, title, subtitle, thumbnailUrl, shareUrl, shareText,
}) => {
  const message = shareText || `Join my watch party on WatchPartyLive: ${shareUrl}`;

  const openExternal = async (urlScheme: string, label: string) => {
    try {
      const can = await Linking.canOpenURL(urlScheme);
      if (can) {
        await Linking.openURL(urlScheme);
      } else {
        Alert.alert(
          `${label} not installed`,
          `Could not open ${label}. Link copied to clipboard.`,
        );
        Clipboard.setString(shareUrl);
      }
    } catch {
      Clipboard.setString(shareUrl);
    }
    onClose();
  };

  const actions: Array<{
    key: string;
    label: string;
    onPress: () => void;
    icon: React.ReactNode;
  }> = [
    {
      key: 'wp',
      label: 'WatchParty',
      onPress: () => {
        Clipboard.setString(shareUrl);
        Alert.alert('Link copied', 'Share it with your friends.');
        onClose();
      },
      icon: (
        <LinearGradient
          colors={colors.buttonGradient as unknown as string[]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.iconCircle}>
          <AppText bold style={{ color: '#fff', fontSize: 20 }}>W</AppText>
        </LinearGradient>
      ),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      onPress: () => openExternal(`whatsapp://send?text=${encodeURIComponent(message)}`, 'WhatsApp'),
      icon: <View style={[styles.iconCircle, { backgroundColor: '#25D366' }]}><FAIcon name="whatsapp" size={22} color="#fff" /></View>,
    },
    {
      key: 'message',
      label: 'Message',
      onPress: () => openExternal(`sms:&body=${encodeURIComponent(message)}`, 'Messages'),
      icon: <View style={[styles.iconCircle, { backgroundColor: '#5BC236' }]}><Icon name="chatbubble" size={22} color="#fff" /></View>,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      onPress: () => openExternal(`instagram://share?text=${encodeURIComponent(message)}`, 'Instagram'),
      icon: (
        <LinearGradient
          colors={['#F58529', '#DD2A7B', '#8134AF']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.iconCircle}>
          <FAIcon name="instagram" size={22} color="#fff" />
        </LinearGradient>
      ),
    },
    {
      key: 'messenger',
      label: 'Messenger',
      onPress: () => openExternal(`fb-messenger://share?link=${encodeURIComponent(shareUrl)}`, 'Messenger'),
      icon: <View style={[styles.iconCircle, { backgroundColor: '#0084FF' }]}><FAIcon name="facebook-messenger" size={22} color="#fff" /></View>,
    },
    {
      key: 'snapchat',
      label: 'Snapchat',
      onPress: () => openExternal(`snapchat://`, 'Snapchat'),
      icon: <View style={[styles.iconCircle, { backgroundColor: '#FFFC00' }]}><FAIcon name="snapchat-ghost" size={22} color="#000" /></View>,
    },
    {
      key: 'copy',
      label: 'Copy Link',
      onPress: () => {
        Clipboard.setString(shareUrl);
        Alert.alert('Copied!', 'Link copied to clipboard.');
        onClose();
      },
      icon: <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.18)' }]}><Icon name="link" size={22} color="#fff" /></View>,
    },
    {
      key: 'more',
      label: 'More',
      onPress: async () => {
        try {
          await Share.share({ message, url: shareUrl });
        } catch {
          /* user cancelled */
        }
        onClose();
      },
      icon: <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.22)' }]}><Icon name="ellipsis-horizontal" size={22} color="#fff" /></View>,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => undefined} style={{ flex: 0 }}>
          <LinearGradient
            colors={['#EE3063', '#A13367']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.sheet}>

            {/* Header */}
            <View style={styles.header}>
              {thumbnailUrl ? (
                <Image source={{ uri: thumbnailUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="h3" bold numberOfLines={1}>{title}</AppText>
                <AppText variant="tiny" color={colors.white} style={{ opacity: 0.85 }} numberOfLines={1}>
                  {subtitle}
                </AppText>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Icon name="close" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Action grid */}
            <View style={styles.grid}>
              {actions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  onPress={a.onPress}
                  style={styles.gridItem}
                  activeOpacity={0.85}>
                  {a.icon}
                  <AppText
                    variant="tiny"
                    bold
                    center
                    numberOfLines={1}
                    style={{ marginTop: 6, width: '100%' }}>
                    {a.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    paddingHorizontal: 6,
  },
  thumb: { width: 60, height: 60, borderRadius: 10 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: spacing.lg,
    marginHorizontal: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  gridItem: {
    width: '25%',          // 4 columns
    alignItems: 'center',
    paddingHorizontal: 4,  // breathing room inside each cell
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 54, height: 54, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default ShareModal;