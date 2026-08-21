import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ProfileStackParamList} from './types';
import SettingsScreen from '../pages/setting/SettingsScreen';
import ManageTagsScreen from '../pages/setting/setting-views/ManageTagsScreen';
import ManageVendorTagsScreen from '../pages/setting/setting-views/ManageVendorTagsScreen';
import ReloadDataScreen from '../pages/setting/setting-views/ReloadDataScreen';
import AutoTagExpensesScreen from '../pages/setting/setting-views/AutoTagExpensesScreen';
import ManageBanksScreen from '../pages/setting/setting-views/ManageBanksScreen';
import ConfigurationScreen from '../pages/setting/setting-views/ConfigurationScreen';
import NotificationSettingsScreen from '../pages/setting/setting-views/NotificationSettingsScreen';
import BiometricSettingsScreen from '../pages/setting/setting-views/BiometricSettingsScreen';
import ReminderSettingsScreen from '../pages/setting/setting-views/ReminderSettingsScreen';
import {useAppTheme} from '../styles/theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileStack: React.FC = () => {
  const theme = useAppTheme();

  const screenOptions = {
    headerStyle: {backgroundColor: theme.bgCard},
    headerTintColor: theme.textPrimary,
    headerShadowVisible: false,
    contentStyle: {backgroundColor: theme.bgPrimary},
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ManageTags"
        component={ManageTagsScreen}
        options={{title: 'Tags'}}
      />
      <Stack.Screen
        name="ManageVendorTags"
        component={ManageVendorTagsScreen}
        options={{title: 'Vendor Tags'}}
      />
      <Stack.Screen
        name="ReloadData"
        component={ReloadDataScreen}
        options={{title: 'Reload Data'}}
      />
      <Stack.Screen
        name="AutoTagExpenses"
        component={AutoTagExpensesScreen}
        options={{title: 'Auto-Tag Expenses'}}
      />
      <Stack.Screen
        name="ManageBanks"
        component={ManageBanksScreen}
        options={{title: 'Banks'}}
      />
      <Stack.Screen
        name="Configuration"
        component={ConfigurationScreen}
        options={{title: 'Configuration'}}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{title: 'Notifications'}}
      />
      <Stack.Screen
        name="BiometricSettings"
        component={BiometricSettingsScreen}
        options={{title: 'App Lock'}}
      />
      <Stack.Screen
        name="ReminderSettings"
        component={ReminderSettingsScreen}
        options={{title: 'Daily Reminder'}}
      />
    </Stack.Navigator>
  );
};

export default ProfileStack;
