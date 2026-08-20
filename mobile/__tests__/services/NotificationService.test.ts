import AsyncStorage from '@react-native-async-storage/async-storage';
import {NotificationService} from '../../src/services/NotificationService';
import {Budget, BudgetProgress} from '../../src/Types';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const makeBudget = (id: string, name: string, amount: number): Budget => ({
  id,
  name,
  amount,
  tagList: ['All'],
  modifiedDate: Date.now(),
});

const makeProgress = (
  budget: Budget,
  percentage: number,
): BudgetProgress => ({
  budget,
  spent: (budget.amount * percentage) / 100,
  remaining: Math.max(0, budget.amount - (budget.amount * percentage) / 100),
  percentage,
});

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('getPrefs', () => {
    it('returns defaults when nothing stored', async () => {
      const prefs = await NotificationService.getPrefs();
      expect(prefs.enabled).toBe(true);
      expect(prefs.perBudget).toEqual({});
    });

    it('returns stored prefs', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({enabled: false, perBudget: {b1: false}}),
      );
      const prefs = await NotificationService.getPrefs();
      expect(prefs.enabled).toBe(false);
      expect(prefs.perBudget.b1).toBe(false);
    });
  });

  describe('toggleGlobal', () => {
    it('saves updated enabled state', async () => {
      await NotificationService.toggleGlobal(false);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@pennywise_notification_prefs',
        expect.stringContaining('"enabled":false'),
      );
    });
  });

  describe('toggleBudget', () => {
    it('saves per-budget preference', async () => {
      await NotificationService.toggleBudget('budget-1', false);
      const saved = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1],
      );
      expect(saved.perBudget['budget-1']).toBe(false);
    });
  });

  describe('checkBudgetThresholds', () => {
    it('returns empty when notifications disabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({enabled: false, perBudget: {}}),
      );
      const budget = makeBudget('b1', 'Food', 10000);
      const progress = [makeProgress(budget, 90)];
      const alerts = await NotificationService.checkBudgetThresholds(progress);
      expect(alerts).toEqual([]);
    });

    it('detects 85% threshold', async () => {
      const budget = makeBudget('b1', 'Food', 10000);
      const progress = [makeProgress(budget, 87)];
      const alerts = await NotificationService.checkBudgetThresholds(progress);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].level).toBe('85');
    });

    it('detects 100% threshold', async () => {
      const budget = makeBudget('b1', 'Food', 10000);
      const progress = [makeProgress(budget, 105)];
      const alerts = await NotificationService.checkBudgetThresholds(progress);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].level).toBe('100');
    });

    it('does not re-alert once already warned', async () => {
      mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
        if (key === '@pennywise_notified_budgets') {
          return JSON.stringify({b1: {warned85: true, warned100: false}});
        }
        return JSON.stringify({enabled: true, perBudget: {}});
      });

      const budget = makeBudget('b1', 'Food', 10000);
      const progress = [makeProgress(budget, 90)];
      const alerts = await NotificationService.checkBudgetThresholds(progress);
      expect(alerts).toHaveLength(0);
    });

    it('skips budget when per-budget disabled', async () => {
      mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
        if (key === '@pennywise_notification_prefs') {
          return JSON.stringify({enabled: true, perBudget: {b1: false}});
        }
        return null;
      });

      const budget = makeBudget('b1', 'Food', 10000);
      const progress = [makeProgress(budget, 90)];
      const alerts = await NotificationService.checkBudgetThresholds(progress);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('buildNotificationMessage', () => {
    it('builds warning message for 85%', () => {
      const budget = makeBudget('b1', 'Food', 10000);
      const msg = NotificationService.buildNotificationMessage(budget, '85');
      expect(msg.title).toBe('Budget Warning');
      expect(msg.body).toContain('85%');
      expect(msg.body).toContain('Food');
    });

    it('builds exceeded message for 100%', () => {
      const budget = makeBudget('b1', 'Food', 10000);
      const msg = NotificationService.buildNotificationMessage(budget, '100');
      expect(msg.title).toBe('Budget Exceeded!');
      expect(msg.body).toContain('exceeded');
    });
  });

  describe('resetMonthlyState', () => {
    it('removes notified budgets key', async () => {
      await NotificationService.resetMonthlyState();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@pennywise_notified_budgets',
      );
    });
  });
});
