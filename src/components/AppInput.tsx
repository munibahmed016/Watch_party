import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';
import layout from '@/constants/layout';
import typography from '@/constants/typography';

type Props = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
};

const AppInput: React.FC<Props> = ({
  containerStyle,
  isPassword = false,
  style,
  ...rest
}) => {
  const [hidden, setHidden] = useState(isPassword);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <TextInput
        {...rest}
        secureTextEntry={hidden}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
      />
      {isPassword && (
        <TouchableOpacity
          onPress={() => setHidden(h => !h)}
          style={styles.eye}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: 52,
    backgroundColor: colors.inputBackground,
    borderRadius: layout.radius.pill,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body,
    fontFamily: typography.fontFamilyBody,
    paddingVertical: 0,
  },
  eye: {
    paddingLeft: spacing.sm,
  },
});

export default AppInput;
