import React, {useEffect, useState} from 'react';
import {Provider} from 'react-redux';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native';

import {store} from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import AlertComponent from './src/components/AlertComponent';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import SplashScreen from './src/components/SplashScreen';
import LockScreen from './src/components/LockScreen';
import {LocalDB} from './src/api/LocalDB';
import {useAppLock} from './src/hooks/useAppLock';

const AppInitializer: React.FC<{children: React.ReactNode}> = ({children}) => {
  useEffect(() => {
    LocalDB.initDB().catch(err =>
      console.error('Failed to initialize local database:', err),
    );
  }, []);

  return <>{children}</>;
};

const AppWithLock: React.FC = () => {
  const {isLocked, unlock} = useAppLock();

  if (isLocked) {
    return <LockScreen onUnlock={unlock} />;
  }

  return (
    <AppInitializer>
      <AppNavigator />
      <AlertComponent />
    </AppInitializer>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <Provider store={store}>
            <AppWithLock />
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
