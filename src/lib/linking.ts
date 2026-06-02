// src/lib/linking.ts
// Deep linking config for React Navigation.
//
// Supports:
//   - watchpartylive://room/<inviteToken>     — direct room invite
//   - watchpartylive://room/code/<code>       — public room by code
//   - watchpartylive://chats/<chatId>         — open a DM
//   - watchpartylive://friend-requests        — incoming friend requests
//   - https://watchpartylive.app/room/<token> — universal link (iOS associated domains / Android App Links)
//
// Make sure your native config matches:
//   iOS: add scheme to Info.plist (CFBundleURLTypes)
//        + Associated Domains capability "applinks:watchpartylive.app"
//   Android: add intent-filter to AndroidManifest with android:scheme + android:host
//   (See FRONTEND_README.md for the exact snippets)

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
