import {NavigatorScreenParams} from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
};

export type StatsStackParamList = {
  InsightsMain: undefined;
};

export type BudgetStackParamList = {
  BudgetMain: undefined;
  EditBudget: {budgetId?: string} | undefined;
};

export type ProfileStackParamList = {
  SettingsMain: undefined;
  ManageTags: undefined;
  ManageVendorTags: undefined;
  ReloadData: undefined;
  AutoTagExpenses: undefined;
  ManageBanks: undefined;
  Configuration: undefined;
};

export type AppTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Stats: NavigatorScreenParams<StatsStackParamList>;
  Budget: NavigatorScreenParams<BudgetStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};
