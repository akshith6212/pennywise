import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@pennywise_biometric_enabled';

export interface BiometricCapability {
  available: boolean;
  biometryType: 'Fingerprint' | 'FaceID' | 'Iris' | 'None';
}

export class BiometricService {
  static async isEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  }

  static async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
  }

  static async checkCapability(): Promise<BiometricCapability> {
    if (Platform.OS !== 'android') {
      return {available: false, biometryType: 'None'};
    }

    try {
      const ReactNativeBiometrics =
        require('react-native-biometrics').default;
      const rnBiometrics = new ReactNativeBiometrics();
      const {available, biometryType} = await rnBiometrics.isSensorAvailable();
      return {
        available,
        biometryType: (biometryType as BiometricCapability['biometryType']) || 'None',
      };
    } catch {
      return {available: false, biometryType: 'None'};
    }
  }

  static async authenticate(
    promptMessage = 'Unlock Pennywise',
  ): Promise<boolean> {
    try {
      const ReactNativeBiometrics =
        require('react-native-biometrics').default;
      const rnBiometrics = new ReactNativeBiometrics();
      const {success} = await rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Cancel',
      });
      return success;
    } catch {
      return false;
    }
  }
}
