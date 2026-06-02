// Root navigation param list
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  CreateAccount: undefined;
  VerifyCode: { email?: string } | undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  AddProfilePicture: undefined;
  Gallery: undefined;
  ProfilePictureAdded: undefined;
  ContactPermission: undefined;
  AddFriends: undefined;
  MainTabs: undefined;
  CreateRoom: undefined;
  RoomSetup: undefined;
  Room: { id?: string } | undefined;
  JoinPodcast: undefined;
  PodcastDetail: { id?: string } | undefined;
  PodcastHostProfile: undefined;
  ChatDetail: { id?: string; name?: string } | undefined;
  WebPlayer: undefined;
  ScreenShareInfo: undefined;
  EditProfile: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  News: undefined;
  Chats: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
