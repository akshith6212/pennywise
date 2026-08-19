import React, {useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {StatusBar} from 'react-native';

import {AuthProvider, useAuth} from '../pages/login/AuthContext';
import LoginScreen from '../pages/login/LoginScreen';
import AppTabs from './AppTabs';
import {AuthStackParamList} from './types';
import {selectExpense} from '../store/expenseActions';
import {loadInitialAppData} from '../pages/dataValidations';
import {
  AppTheme,
  darkTheme,
  getNavigationTheme,
  lightTheme,
  ThemeContext,
} from '../styles/theme';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => (
  <AuthStack.Navigator screenOptions={{headerShown: false}}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

const RootNavigator: React.FC = () => {
  const {currentUser} = useAuth();
  const {isAppLoading} = useSelector(selectExpense);
  const hasLoadedData = useRef(false);

  useEffect(() => {
    if (currentUser && isAppLoading && !hasLoadedData.current) {
      hasLoadedData.current = true;
      loadInitialAppData();
    }
  }, [currentUser, isAppLoading]);

  useEffect(() => {
    if (!currentUser) {
      hasLoadedData.current = false;
    }
  }, [currentUser]);

  if (currentUser) {
    return <AppTabs />;
  }

  return <AuthNavigator />;
};

const AppNavigator: React.FC = () => {
  const {appConfig} = useSelector(selectExpense);
  const theme: AppTheme = appConfig.darkMode ? darkTheme : lightTheme;
  const navigationTheme = getNavigationTheme(theme);

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar
        barStyle={theme.statusBarStyle}
        backgroundColor={theme.bgPrimary}
      />
      <AuthProvider>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeContext.Provider>
  );
};

export default AppNavigator;
