import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import {Expense} from '../Types';

const WIDGET_DATA_KEY = '@pennywise_widget_data';

export interface WidgetData {
  monthlySpent: number;
  monthLabel: string;
  updatedAt: number;
  transactionCount: number;
}

export class WidgetService {
  static calculateMonthlySpending(expenses: Expense[]): WidgetData {
    const now = dayjs();
    const currentMonth = now.month();
    const currentYear = now.year();

    const monthlyExpenses = expenses.filter(e => {
      const d = dayjs(new Date(e.date));
      return (
        d.month() === currentMonth &&
        d.year() === currentYear &&
        e.costType === 'debit'
      );
    });

    const total = monthlyExpenses.reduce((sum, e) => sum + e.cost, 0);

    return {
      monthlySpent: total,
      monthLabel: now.format('MMMM YYYY'),
      updatedAt: Date.now(),
      transactionCount: monthlyExpenses.length,
    };
  }

  static async saveWidgetData(data: WidgetData): Promise<void> {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
    WidgetService.notifyWidget();
  }

  static async getWidgetData(): Promise<WidgetData | null> {
    try {
      const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // fall through
    }
    return null;
  }

  static async updateWidgetFromExpenses(expenses: Expense[]): Promise<void> {
    const data = WidgetService.calculateMonthlySpending(expenses);
    await WidgetService.saveWidgetData(data);
  }

  static formatCurrency(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN', {maximumFractionDigits: 0});
  }

  private static notifyWidget(): void {
    // Uses react-native-android-widget when available to trigger a widget update.
    try {
      const {requestWidgetUpdate} = require('react-native-android-widget');
      requestWidgetUpdate({widgetName: 'PennywiseWidget'}).catch(() => {});
    } catch {
      // Widget library not installed yet — no-op
    }
  }
}
