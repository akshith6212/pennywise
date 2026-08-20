import AsyncStorage from '@react-native-async-storage/async-storage';
import {WidgetService} from '../../src/services/WidgetService';
import {Expense} from '../../src/Types';
import dayjs from 'dayjs';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const makeExpense = (
  cost: number,
  costType: 'debit' | 'credit',
  date: Date,
): Expense => ({
  id: `exp-${Math.random()}`,
  mailId: `mail-${Math.random()}`,
  cost,
  costType,
  date: date.getTime(),
  modifiedDate: Date.now(),
  user: 'test',
  type: 'UPI',
  vendor: 'Test Vendor',
  operation: 'add',
});

describe('WidgetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('calculateMonthlySpending', () => {
    it('sums only current month debit expenses', () => {
      const now = new Date();
      const expenses = [
        makeExpense(500, 'debit', now),
        makeExpense(300, 'debit', now),
        makeExpense(200, 'credit', now),
      ];

      const data = WidgetService.calculateMonthlySpending(expenses);
      expect(data.monthlySpent).toBe(800);
      expect(data.transactionCount).toBe(2);
    });

    it('excludes expenses from other months', () => {
      const now = new Date();
      const lastMonth = dayjs(now).subtract(1, 'month').toDate();
      const expenses = [
        makeExpense(500, 'debit', now),
        makeExpense(300, 'debit', lastMonth),
      ];

      const data = WidgetService.calculateMonthlySpending(expenses);
      expect(data.monthlySpent).toBe(500);
      expect(data.transactionCount).toBe(1);
    });

    it('returns zero when no expenses', () => {
      const data = WidgetService.calculateMonthlySpending([]);
      expect(data.monthlySpent).toBe(0);
      expect(data.transactionCount).toBe(0);
    });

    it('sets correct month label', () => {
      const data = WidgetService.calculateMonthlySpending([]);
      expect(data.monthLabel).toBe(dayjs().format('MMMM YYYY'));
    });
  });

  describe('saveWidgetData', () => {
    it('persists data to AsyncStorage', async () => {
      const data = {
        monthlySpent: 1500,
        monthLabel: 'August 2026',
        updatedAt: Date.now(),
        transactionCount: 5,
      };

      await WidgetService.saveWidgetData(data);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@pennywise_widget_data',
        JSON.stringify(data),
      );
    });
  });

  describe('getWidgetData', () => {
    it('returns null when nothing stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const data = await WidgetService.getWidgetData();
      expect(data).toBeNull();
    });

    it('returns parsed data when stored', async () => {
      const stored = {monthlySpent: 1500, monthLabel: 'Aug 2026', updatedAt: 0, transactionCount: 3};
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stored));
      const data = await WidgetService.getWidgetData();
      expect(data?.monthlySpent).toBe(1500);
    });
  });

  describe('formatCurrency', () => {
    it('formats with rupee symbol', () => {
      expect(WidgetService.formatCurrency(1500)).toMatch(/₹/);
    });
  });
});
