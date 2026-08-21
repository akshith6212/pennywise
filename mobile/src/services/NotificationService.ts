import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Budget, BudgetProgress} from '../Types';

const NOTIFICATION_PREFS_KEY = '@pennywise_notification_prefs';
const NOTIFIED_BUDGETS_KEY = '@pennywise_notified_budgets';

export interface NotificationPrefs {
  enabled: boolean;
  perBudget: Record<string, boolean>;
}

interface NotifiedState {
  [budgetId: string]: {
    warned85: boolean;
    warned100: boolean;
  };
}

const defaultPrefs: NotificationPrefs = {
  enabled: true,
  perBudget: {},
};

export class NotificationService {
  static async getPrefs(): Promise<NotificationPrefs> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // fall through
    }
    return {...defaultPrefs};
  }

  static async savePrefs(prefs: NotificationPrefs): Promise<void> {
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  }

  static async toggleGlobal(enabled: boolean): Promise<void> {
    const prefs = await NotificationService.getPrefs();
    prefs.enabled = enabled;
    await NotificationService.savePrefs(prefs);
  }

  static async toggleBudget(
    budgetId: string,
    enabled: boolean,
  ): Promise<void> {
    const prefs = await NotificationService.getPrefs();
    prefs.perBudget[budgetId] = enabled;
    await NotificationService.savePrefs(prefs);
  }

  static async isBudgetEnabled(budgetId: string): Promise<boolean> {
    const prefs = await NotificationService.getPrefs();
    if (!prefs.enabled) {
      return false;
    }
    return prefs.perBudget[budgetId] !== false;
  }

  private static async getNotifiedState(): Promise<NotifiedState> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFIED_BUDGETS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // fall through
    }
    return {};
  }

  private static async saveNotifiedState(state: NotifiedState): Promise<void> {
    await AsyncStorage.setItem(NOTIFIED_BUDGETS_KEY, JSON.stringify(state));
  }

  static async resetMonthlyState(): Promise<void> {
    await AsyncStorage.removeItem(NOTIFIED_BUDGETS_KEY);
  }

  static async checkBudgetThresholds(
    progressList: BudgetProgress[],
  ): Promise<Array<{budget: Budget; level: '85' | '100'}>> {
    const prefs = await NotificationService.getPrefs();
    if (!prefs.enabled) {
      return [];
    }

    const notifiedState = await NotificationService.getNotifiedState();
    const newAlerts: Array<{budget: Budget; level: '85' | '100'}> = [];

    for (const progress of progressList) {
      const budgetId = progress.budget.id;

      if (prefs.perBudget[budgetId] === false) {
        continue;
      }

      const state = notifiedState[budgetId] || {
        warned85: false,
        warned100: false,
      };

      if (progress.percentage >= 100 && !state.warned100) {
        newAlerts.push({budget: progress.budget, level: '100'});
        state.warned100 = true;
        state.warned85 = true;
      } else if (
        progress.percentage >= 85 &&
        progress.percentage < 100 &&
        !state.warned85
      ) {
        newAlerts.push({budget: progress.budget, level: '85'});
        state.warned85 = true;
      }

      notifiedState[budgetId] = state;
    }

    if (newAlerts.length > 0) {
      await NotificationService.saveNotifiedState(notifiedState);
    }

    return newAlerts;
  }

  static async showLocalNotification(
    title: string,
    body: string,
  ): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    // Uses @notifee/react-native when available.
    // Fallback: log to console so the alert system can surface it.
    try {
      const notifee = require('@notifee/react-native').default;
      const channelId = await notifee.createChannel({
        id: 'budget-alerts',
        name: 'Budget Alerts',
        importance: 4, // HIGH
      });

      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_notification',
          pressAction: {id: 'default'},
        },
      });
    } catch {
      console.log(`[Notification] ${title}: ${body}`);
    }
  }

  static buildNotificationMessage(
    budget: Budget,
    level: '85' | '100',
  ): {title: string; body: string} {
    if (level === '100') {
      return {
        title: 'Budget Exceeded!',
        body: `"${budget.name}" has exceeded its limit of ₹${budget.amount.toLocaleString('en-IN')}.`,
      };
    }
    return {
      title: 'Budget Warning',
      body: `"${budget.name}" has reached 85% of its ₹${budget.amount.toLocaleString('en-IN')} limit.`,
    };
  }
}
