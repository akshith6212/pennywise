import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_PREFS_KEY = '@pennywise_reminder_prefs';

export interface ReminderPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
}

const defaultPrefs: ReminderPrefs = {
  enabled: false,
  hour: 21,
  minute: 0,
};

export class ReminderService {
  static async getPrefs(): Promise<ReminderPrefs> {
    try {
      const raw = await AsyncStorage.getItem(REMINDER_PREFS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // fall through
    }
    return {...defaultPrefs};
  }

  static async savePrefs(prefs: ReminderPrefs): Promise<void> {
    await AsyncStorage.setItem(REMINDER_PREFS_KEY, JSON.stringify(prefs));
    if (prefs.enabled) {
      await ReminderService.scheduleReminder(prefs);
    } else {
      await ReminderService.cancelReminder();
    }
  }

  static async scheduleReminder(prefs: ReminderPrefs): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const notifee = require('@notifee/react-native').default;
      const {TriggerType, RepeatFrequency} = require('@notifee/react-native');

      const channelId = await notifee.createChannel({
        id: 'expense-reminder',
        name: 'Expense Reminders',
        importance: 3, // DEFAULT
      });

      const now = new Date();
      const trigger = new Date();
      trigger.setHours(prefs.hour, prefs.minute, 0, 0);

      if (trigger.getTime() <= now.getTime()) {
        trigger.setDate(trigger.getDate() + 1);
      }

      await notifee.createTriggerNotification(
        {
          id: 'daily-expense-reminder',
          title: 'Add your expenses',
          body: 'Tap to quickly add today\'s expenses to Pennywise.',
          android: {
            channelId,
            smallIcon: 'ic_notification',
            pressAction: {
              id: 'add-expense',
              launchActivity: 'default',
            },
            actions: [
              {
                title: 'Add Expense',
                pressAction: {id: 'add-expense'},
              },
            ],
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: trigger.getTime(),
          repeatFrequency: RepeatFrequency.DAILY,
        },
      );
    } catch {
      console.log('[ReminderService] Notifee not available');
    }
  }

  static async cancelReminder(): Promise<void> {
    try {
      const notifee = require('@notifee/react-native').default;
      await notifee.cancelNotification('daily-expense-reminder');
    } catch {
      // no-op
    }
  }

  static formatTime(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = String(minute).padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  }
}
