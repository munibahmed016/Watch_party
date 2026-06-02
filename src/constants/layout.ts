import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

const layout = {
  width,
  height,
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999,
  },
};

export default layout;
