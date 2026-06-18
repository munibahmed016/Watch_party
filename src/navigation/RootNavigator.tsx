import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CreatorEvent } from '@/lib/api';
import SplashScreen from '@/screens/SplashScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import LoginScreen from '@/screens/LoginScreen';
import CreateAccountScreen from '@/screens/CreateAccountScreen';
import VerifyCodeScreen from '@/screens/VerifyCodeScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import AddProfilePictureScreen from '@/screens/AddProfilePictureScreen';
import ProfilePictureAddedScreen from '@/screens/ProfilePictureAddedScreen';
import ContactPermissionScreen from '@/screens/ContactPermissionScreen';
import AddFriendsScreen from '@/screens/AddFriendsScreen';
import FriendRequestsScreen from '@/screens/FriendRequestsScreen';
import MainTabsNavigator from '@/navigation/MainTabs';
import EditProfileScreen from '@/screens/EditProfileScreen';
import CreateRoomScreen from '@/screens/CreateRoomScreen';
import RoomScreen from '@/screens/RoomScreen';
import JoinPodcastScreen from '@/screens/JoinPodcastScreen';
import PodcastDetailScreen from '@/screens/PodcastDetailScreen';
import PodcastHostProfileScreen from '@/screens/PodcastHostProfileScreen';
import ChatDetailScreen from '@/screens/ChatDetailScreen';
import VideoPickerScreen from '@/screens/VideoPickerScreen';
import CreatePostScreen from '@/screens/CreatePostScreen';
import BrowseScreen from '@/screens/BrowseScreen';
import HowItWorksScreen from '@/screens/HowItWorksScreen';
import AdminNavigator from '@/navigation/AdminNavigator';
import PlansScreen from '@/screens/PlansScreen';
import BecomeCreatorScreen from '@/screens/BecomeCreatorScreen';
import CreatorUploadScreen from '@/screens/CreatorUploadScreen';
import CreatorDashboardScreen from '@/screens/CreatorDashboardScreen';
import MyProfileScreen from '@/screens/MyProfileScreen';
import GoLiveScreen from '@/screens/GoLiveScreen';
import CreateEventScreen from '@/screens/CreateEventScreen';
import EventsScreen from '@/screens/EventsScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import EventDetailScreen from '@/screens/EventDetailScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  CreateAccount: undefined;
  VerifyCode: { email: string; type?: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' };
  ForgotPassword: undefined;
  ResetPassword: { email: string; code: string };
  AddProfilePicture: undefined;
  ProfilePictureAdded: undefined;
  ContactPermission: undefined;
  AddFriends: { fromOnboarding?: boolean } | undefined;
  FriendRequests: undefined;
  MainTabs: { screen?: 'Home' | 'News' | 'Chat' | 'Settings' } | undefined;
  EditProfile: undefined;
  CreateRoom: { presetVideoUrl?: string; presetTitle?: string } | undefined;
  Room: { roomId: string };
  JoinPodcast: undefined;
  PodcastDetail: { tmdbId?: number; archiveId?: string; curatedId?: string };
  PodcastHostProfile: { username: string };
  Plans: undefined;
  BecomeCreator: undefined;
  CreatorUpload: undefined;
  CreatorDashboard: undefined;
  MyProfile: undefined;
  ChatDetail: { chatId: string; name?: string; avatar?: string };
  VideoPicker: { source?: 'youtube' | 'vimeo' } | undefined;
  CreatePost: { kind?: 'NEWS' | 'EVENT' } | undefined;
  Browse: undefined;
  HowItWorks: undefined;
  Admin: undefined;
  GoLive: undefined;
  CreateEvent: undefined;
Events: undefined;
Notifications: undefined;
EventDetail: { event?: CreatorEvent; eventId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      {/* Auth */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

      {/* Profile setup */}
      <Stack.Screen name="AddProfilePicture" component={AddProfilePictureScreen} />
      <Stack.Screen name="ProfilePictureAdded" component={ProfilePictureAddedScreen} />
      <Stack.Screen name="ContactPermission" component={ContactPermissionScreen} />

      {/* Friends */}
      <Stack.Screen name="AddFriends" component={AddFriendsScreen} />
      <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />

      {/* Main */}
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} />

      {/* Profile */}
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="PodcastHostProfile" component={PodcastHostProfileScreen} />

      {/* Rooms */}
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
      <Stack.Screen name="Room" component={RoomScreen} />
      <Stack.Screen name="Browse" component={BrowseScreen} />
      <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
      <Stack.Screen name="VideoPicker" component={VideoPickerScreen} />

      {/* Podcasts */}
      <Stack.Screen name="JoinPodcast" component={JoinPodcastScreen} />
      <Stack.Screen name="PodcastDetail" component={PodcastDetailScreen} />
      <Stack.Screen name="GoLive" component={GoLiveScreen} />


      <Stack.Screen name="Plans" component={PlansScreen} />
      <Stack.Screen name="BecomeCreator" component={BecomeCreatorScreen} />
      <Stack.Screen name="CreatorUpload" component={CreatorUploadScreen} />
      <Stack.Screen name="CreatorDashboard" component={CreatorDashboardScreen} />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
<Stack.Screen name="Events" component={EventsScreen} />
<Stack.Screen name="Notifications" component={NotificationsScreen} />

      {/* Chats */}
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />

      {/* Posts (news & events) */}
      <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ animation: 'slide_from_bottom' }} />

      {/* Admin (hidden — only reachable from Settings when isAdmin) */}
      <Stack.Screen name="Admin" component={AdminNavigator} />
    </Stack.Navigator>
  );
};

export default RootNavigator;