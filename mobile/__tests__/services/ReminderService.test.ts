import AsyncStorage from '@react-native-async-storage/async-storage';
import {ReminderService} from '../../src/services/ReminderService';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('ReminderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('getPrefs', () => {
    it('returns defaults when nothing stored', async () => {
      const prefs = await ReminderService.getPrefs();
      expect(prefs.enabled).toBe(false);
      expect(prefs.hour).toBe(21);
      expect(prefs.minute).toBe(0);
    });

    it('returns stored prefs', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({enabled: true, hour: 20, minute: 30}),
      );
      const prefs = await ReminderService.getPrefs();
      expect(prefs.enabled).toBe(true);
      expect(prefs.hour).toBe(20);
      expect(prefs.minute).toBe(30);
    });
  });

  describe('savePrefs', () => {
    it('persists to AsyncStorage', async () => {
      await ReminderService.savePrefs({enabled: true, hour: 9, minute: 0});
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@pennywise_reminder_prefs',
        expect.stringContaining('"enabled":true'),
      );
    });
  });

  describe('formatTime', () => {
    it('formats AM times', () => {
      expect(ReminderService.formatTime(9, 0)).toBe('9:00 AM');
      expect(ReminderService.formatTime(0, 0)).toBe('12:00 AM');
      expect(ReminderService.formatTime(11, 30)).toBe('11:30 AM');
    });

    it('formats PM times', () => {
      expect(ReminderService.formatTime(12, 0)).toBe('12:00 PM');
      expect(ReminderService.formatTime(21, 0)).toBe('9:00 PM');
      expect(ReminderService.formatTime(13, 15)).toBe('1:15 PM');
    });
  });

  describe('cancelReminder', () => {
    it('calls notifee cancelNotification', async () => {
      await ReminderService.cancelReminder();
      const notifee = require('@notifee/react-native').default;
      expect(notifee.cancelNotification).toHaveBeenCalledWith(
        'daily-expense-reminder',
      );
    });
  });
});
