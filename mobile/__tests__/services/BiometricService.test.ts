import AsyncStorage from '@react-native-async-storage/async-storage';
import {BiometricService} from '../../src/services/BiometricService';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('BiometricService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('isEnabled', () => {
    it('returns false when not set', async () => {
      const result = await BiometricService.isEnabled();
      expect(result).toBe(false);
    });

    it('returns true when stored as true', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('true');
      const result = await BiometricService.isEnabled();
      expect(result).toBe(true);
    });

    it('returns false when stored as false', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('false');
      const result = await BiometricService.isEnabled();
      expect(result).toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('stores value in AsyncStorage', async () => {
      await BiometricService.setEnabled(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@pennywise_biometric_enabled',
        'true',
      );
    });
  });

  describe('checkCapability', () => {
    it('returns sensor info from react-native-biometrics', async () => {
      const result = await BiometricService.checkCapability();
      expect(result.available).toBe(true);
      expect(result.biometryType).toBe('Fingerprint');
    });
  });

  describe('authenticate', () => {
    it('returns success from simplePrompt', async () => {
      const result = await BiometricService.authenticate('Test');
      expect(result).toBe(true);
    });
  });
});
