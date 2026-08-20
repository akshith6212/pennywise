import {useEffect, useRef, useState} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {BiometricService} from '../services/BiometricService';

export const useAppLock = () => {
  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const hasCheckedInitial = useRef(false);

  useEffect(() => {
    const checkOnResume = async () => {
      const enabled = await BiometricService.isEnabled();
      if (!enabled) {
        setIsLocked(false);
        return;
      }

      const success = await BiometricService.authenticate();
      setIsLocked(!success);
    };

    if (!hasCheckedInitial.current) {
      hasCheckedInitial.current = true;
      BiometricService.isEnabled().then(enabled => {
        if (enabled) {
          BiometricService.authenticate().then(success => {
            setIsLocked(!success);
          });
        }
      });
    }

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          checkOnResume();
        }
        appState.current = nextState;
      },
    );

    return () => subscription.remove();
  }, []);

  const unlock = async (): Promise<boolean> => {
    const success = await BiometricService.authenticate();
    if (success) {
      setIsLocked(false);
    }
    return success;
  };

  return {isLocked, unlock};
};
