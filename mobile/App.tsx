import React, {useEffect, useState} from 'react';
import {Provider} from 'react-redux';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native';

import {store} from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import AlertComponent from './src/components/AlertComponent';
import SplashScreen from './src/components/SplashScreen';
import {LocalDB} from './src/api/LocalDB';

const AppInitializer: React.FC<{children: React.ReactNode}> = ({children}) => {
  useEffect(() => {
    LocalDB.initDB().catch(err =>
      console.error('Failed to initialize local database:', err),
    );
  }, []);

  return <>{children}</>;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <AppInitializer>
            <AppNavigator />
            <AlertComponent />
          </AppInitializer>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
