import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import AppText from './AppText';
import colors from '@/constants/colors';
import spacing from '@/constants/spacing';

const ICONS: Record<string, string> = {
  Home: 'home',
  News: 'flame',
  Chats: 'chatbubble-ellipses',
  Settings: 'settings',
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            (options.tabBarLabel as string) ?? options.title ?? route.name;
          const iconName = ICONS[route.name] || 'ellipse';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.item}
              activeOpacity={0.85}>
              <Icon
                name={focused ? iconName : (`${iconName}-outline` as string)}
                size={22}
                color={focused ? colors.primary : colors.textSecondary}
              />
              <AppText
                variant="tiny"
                color={focused ? colors.primary : colors.textSecondary}
                style={{ marginTop: 2 }}>
                {label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
});

export default CustomTabBar;
