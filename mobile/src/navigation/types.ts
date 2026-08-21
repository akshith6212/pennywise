import {NavigatorScreenParams} from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
};

export type ProfileStackParamList = {
  SettingsMain: undefined;
  ManageTags: undefined;
  ManageVendorTags: undefined;
  ReloadData: undefined;
  AutoTagExpenses: undefined;
  ManageBanks: undefined;
  Configuration: undefined;
  NotificationSettings: undefined;
  BiometricSettings: undefined;
  ReminderSettings: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Stats: undefined;
  Budget: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};
