import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Image, ImageSourcePropType } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Icon from 'react-native-vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import AppText from '@/components/AppText';
import colors from '@/constants/colors';
import { notificationsApi } from '@/lib/api';

import HomeScreen from '@/screens/HomeScreen';
import NewsHotScreen from '@/screens/NewsHotScreen';
import ChatsScreen from '@/screens/ChatsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';

export type MainTabsParamList = {
  Home: undefined;
  News: undefined;
  Chat: undefined;
  Alerts: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

type TabSpec = {
  name: keyof MainTabsParamList;
  label: string;
  ionIcon?: string;
  pngIcon?: ImageSourcePropType;
};

const TABS: TabSpec[] = [
  { name: 'Home',     label: 'Home',      ionIcon: 'home' },
  { name: 'News',     label: 'New & Hot', pngIcon: require('@/assets/images/new.png') },
  { name: 'Chat',     label: 'Chat',      pngIcon: require('@/assets/images/chat.png') },
  { name: 'Alerts',   label: 'Alerts',    ionIcon: 'notifications' },
  { name: 'Settings', label: 'Settings',  pngIcon: require('@/assets/images/setting.png') },
];

// Gradient-filled Ionicon for active tab
const GradientIonicon: React.FC<{ name: string; size: number }> = ({ name, size }) => (
  <MaskedView maskElement={<Icon name={name} size={size} color="#000" />}>
    <LinearGradient
      colors={colors.buttonGradient as unknown as string[]}
      start={colors.gradientStartPoint}
      end={colors.gradientEndPoint}>
      <Icon name={name} size={size} color="transparent" style={{ opacity: 0 }} />
    </LinearGradient>
  </MaskedView>
);

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);

  // unread notifications badge
  const notifQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list({ limit: 1 }),
    refetchInterval: 30000, // poll every 30s for new alerts
  });
  const unread = notifQuery.data?.unreadCount || 0;

  return (
    <View style={[styles.barWrap, { paddingBottom: bottom }]} pointerEvents="box-none">
      <LinearGradient
        colors={colors.buttonGradient as unknown as string[]}
        start={colors.gradientStartPoint}
        end={colors.gradientEndPoint}
        style={styles.borderRing}>
        <View style={styles.bar}>
          {state.routes.map((route, index) => {
            const tabSpec = TABS.find((t) => t.name === route.name);
            if (!tabSpec) return null;

            const isFocused = state.index === index;
            const { options } = descriptors[route.key];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            };

            const tint = isFocused ? colors.primary : 'rgba(255,255,255,0.5)';
            const showBadge = tabSpec.name === 'Alerts' && unread > 0;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}>
                <View>
                  {tabSpec.pngIcon ? (
                    <Image source={tabSpec.pngIcon} style={[styles.pngIcon, { tintColor: tint }]} resizeMode="contain" />
                  ) : isFocused ? (
                    <GradientIonicon name={tabSpec.ionIcon!} size={23} />
                  ) : (
                    <Icon name={tabSpec.ionIcon!} size={23} color={tint} />
                  )}
                  {showBadge && (
                    <View style={styles.badge}>
                      <AppText variant="tiny" bold color={colors.white} style={{ fontSize: 9 }}>
                        {unread > 9 ? '9+' : unread}
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText
                  variant="tiny"
                  bold={isFocused}
                  style={[styles.tabLabel, { color: isFocused ? colors.white : 'rgba(255,255,255,0.5)' }]}
                  numberOfLines={1}>
                  {tabSpec.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
};

const MainTabsNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
      tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="News" component={NewsHotScreen} />
      <Tab.Screen name="Chat" component={ChatsScreen} />
      <Tab.Screen name="Alerts" component={NotificationsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  borderRing: {
    borderRadius: 999,
    padding: 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 10 },
    }),
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,42,0.92)',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pngIcon: {
    width: 23, height: 23,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 9,
  },
  badge: {
    position: 'absolute',
    top: -5, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: 'rgba(20,20,42,1)',
  },
});

export default MainTabsNavigator;