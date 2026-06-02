import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Image,
  TouchableOpacity,
  Share,
  Alert,
  Clipboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import AppText from './AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
// import layout from '@/constants/layout';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  thumbnail: string;
  link: string;
};

type Channel = {
  id: string;
  label: string;
  icon: React.ReactNode;
  bg: string;
  onPress: (link: string, title: string) => void;
};

const shareGeneric = async (link: string, title: string) => {
  try {
    await Share.share({ message: `Join my WatchParty for "${title}" — ${link}` });
  } catch {}
};

const copyLink = async (link: string) => {
  try {
    Clipboard.setString(link);
    Alert.alert('Copied', 'Link copied to clipboard');
  } catch {}
};

const ShareSheetModal: React.FC<Props> = ({ visible, onClose, title, thumbnail, link }) => {
  const channels: Channel[] = [
    {
      id: 'watchparty',
      label: 'WatchPartyLive',
      bg: colors.primary,
      icon: <AppText bold style={{ fontSize: 16 }}>W</AppText>,
      onPress: shareGeneric,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      bg: '#25D366',
      icon: <FAIcon name="whatsapp" size={24} color={colors.white} />,
      onPress: shareGeneric,
    },
    {
      id: 'message',
      label: 'Message',
      bg: '#3478F6',
      icon: <Icon name="chatbubble" size={22} color={colors.white} />,
      onPress: shareGeneric,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      bg: '#E1306C',
      icon: <FAIcon name="instagram" size={22} color={colors.white} />,
      onPress: shareGeneric,
    },
    {
      id: 'messenger',
      label: 'Messenger',
      bg: '#0084FF',
      icon: <FAIcon name="facebook-messenger" size={22} color={colors.white} />,
      onPress: shareGeneric,
    },
    {
      id: 'snapchat',
      label: 'Snapchat',
      bg: '#FFFC00',
      icon: <FAIcon name="snapchat-ghost" size={22} color="#000" />,
      onPress: shareGeneric,
    },
    {
      id: 'copy',
      label: 'Copy Link',
      bg: '#5856D6',
      icon: <Icon name="link" size={22} color={colors.white} />,
      onPress: (l: string) => copyLink(l),
    },
    {
      id: 'more',
      label: 'More Options',
      bg: '#8E8E93',
      icon: <Icon name="ellipsis-horizontal" size={22} color={colors.white} />,
      onPress: shareGeneric,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <LinearGradient
            colors={[colors.primary, '#4A51A1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}>
            <Image source={{ uri: thumbnail }} style={styles.thumb} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <AppText variant="h3" bold numberOfLines={1}>
                {title}
              </AppText>
              <AppText variant="tiny" color={colors.textSecondary}>
                {link}
              </AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={18} color={colors.white} />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.grid}>
            {channels.map(c => (
              <TouchableOpacity
                key={c.id}
                style={styles.channel}
                onPress={() => c.onPress(link, title)}
                activeOpacity={0.7}>
                <View style={[styles.channelIcon, { backgroundColor: c.bg }]}>
                  {c.icon}
                </View>
                <AppText variant="tiny" color={colors.textSecondary} style={{ marginTop: 4 }}>
                  {c.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A0E2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  channel: {
    width: '25%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  channelIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ShareSheetModal;
