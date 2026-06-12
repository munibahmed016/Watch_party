import type { LinkingOptions } from '@react-navigation/native';
import { APP_SCHEME, APP_UNIVERSAL_URL } from './config';
import type { RootStackParamList } from '@/navigation/types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    `${APP_SCHEME}://`,
    `${APP_UNIVERSAL_URL}`,
  ],
  config: {
    screens: {
      Splash: 'splash',
      Onboarding: 'onboarding',
      Login: 'login',
      CreateAccount: 'create-account',
      VerifyCode: 'verify-code',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',

      MainTabs: {
        screens: {
          Home: 'home',
          Chats: 'chats',
          AddFriends: 'friends',
          Settings: 'settings',
        },
      },

      Room: 'room/:inviteToken?',
      RoomSetup: 'room-setup/:roomId',
      CreateRoom: 'create-room',
      ChatDetail: 'chats/:chatId',
      FriendRequests: 'friend-requests',
      EditProfile: 'edit-profile',
    },
  },
};
