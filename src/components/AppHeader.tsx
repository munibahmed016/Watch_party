import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AppText from './AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';

type Props = {
  showBack?: boolean;
  showInfo?: boolean;
  showLogo?: boolean;
  title?: string;
  rightElement?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onBack?: () => void;
};

const AppHeader: React.FC<Props> = ({
  showBack = true,
  showInfo = true,
  showLogo = true,
  title,
  rightElement,
  style,
  onBack,
}) => {
  const navigation = useNavigation<any>();
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.side}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="chevron-back" size={20} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.center}>
        {showLogo ? (
          <View style={styles.logoRow}>
            <LinearGradient
              colors={colors.buttonGradient as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoMark}>
              <AppText variant="small" bold>
                W
              </AppText>
            </LinearGradient>
            <View style={{ marginLeft: spacing.xs }}>
              <AppText variant="small" bold style={{ lineHeight: 14 }}>
                WatchParty
              </AppText>
              <AppText variant="tiny" color={colors.textSecondary} style={{ lineHeight: 12 }}>
                Live
              </AppText>
            </View>
          </View>
        ) : title ? (
          <AppText variant="h3" bold>
            {title}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        {rightElement
          ? rightElement
          : showInfo && (
              <TouchableOpacity
                style={styles.iconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="information-circle-outline" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  side: {
    width: 40,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: layout.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppHeader;
