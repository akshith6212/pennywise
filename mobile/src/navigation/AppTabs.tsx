import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../pages/home/HomeScreen';
import InsightsScreen from '../pages/insights/InsightsScreen';
import BudgetScreen from '../pages/budget/BudgetScreen';
import ProfileStack from './ProfileStack';
import {
  AppTabParamList,
  BudgetStackParamList,
  HomeStackParamList,
  StatsStackParamList,
} from './types';
import {useAppTheme} from '../styles/theme';

const Tab = createBottomTabNavigator<AppTabParamList>();

const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const StatsStackNav = createNativeStackNavigator<StatsStackParamList>();
const BudgetStackNav = createNativeStackNavigator<BudgetStackParamList>();

const HomeStack: React.FC = () => (
  <HomeStackNav.Navigator screenOptions={{headerShown: false}}>
    <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
  </HomeStackNav.Navigator>
);

const StatsStack: React.FC = () => (
  <StatsStackNav.Navigator screenOptions={{headerShown: false}}>
    <StatsStackNav.Screen name="InsightsMain" component={InsightsScreen} />
  </StatsStackNav.Navigator>
);

const BudgetStack: React.FC = () => (
  <BudgetStackNav.Navigator screenOptions={{headerShown: false}}>
    <BudgetStackNav.Screen name="BudgetMain" component={BudgetScreen} />
  </BudgetStackNav.Navigator>
);

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
        component={HomeStack}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Stats"
        component={StatsStack}
        options={{tabBarLabel: 'Stats'}}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetStack}
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
