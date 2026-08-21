import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../pages/home/HomeScreen';
import InsightsScreen from '../pages/insights/InsightsScreen';
import BudgetScreen from '../pages/budget/BudgetScreen';
import ProfileStack from './ProfileStack';
import {AppTabParamList} from './types';
import {useAppTheme} from '../styles/theme';

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_ICONS: Record<keyof AppTabParamList, string> = {
  Home: 'home',
  Stats: 'analytics',
  Budget: 'account-balance-wallet',
  Profile: 'person',
};

const AppTabs: React.FC = () => {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({color, size}) => (
          <Icon name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
        tabBarActiveTintColor: theme.accentBlue,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.bgCard,
          borderTopColor: theme.borderColor,
          borderTopWidth: 1,
          elevation: 8,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Stats"
        component={InsightsScreen}
        options={{tabBarLabel: 'Stats'}}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{tabBarLabel: 'Budget'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{tabBarLabel: 'Profile'}}
      />
    </Tab.Navigator>
  );
};

export default AppTabs;
