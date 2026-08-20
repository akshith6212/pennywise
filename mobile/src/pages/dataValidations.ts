import {Expense} from '../Types';
import dayjs from 'dayjs';
import {getDateMonth, sortByKey} from '../utility/utility';
import {ExpenseAPI} from '../api/ExpenseAPI';
import {
  setBudgetList,
  setExpenseState,
  setTagList,
} from '../store/expenseActions';
import {WidgetService} from '../services/WidgetService';

export type DateRange =
  | '1d'
  | '7d'
  | '14d'
  | '30d'
  | '60d'
  | '90d'
  | '180d'
  | '366d'
  | '732d'
  | '1800d';

export type GroupByOption = 'days' | 'vendor' | 'cost' | 'tags';

export type SortByOption = 'cost' | 'count' | 'date' | null;

export type CalculationOption = 'average' | 'median';

export const loadInitialAppData = () => {
  console.log('Load Initial AppData');

  void ExpenseAPI.processData();

  const vendorTagApi = ExpenseAPI.getVendorTagList();
  const expenseApi = ExpenseAPI.getExpenseList();
  const budgetApi = ExpenseAPI.getBudgetList();
  const tagListApi = ExpenseAPI.getTagList();
  const darkModeApi = ExpenseAPI.getDarkModeConfig();

  Promise.all([vendorTagApi, expenseApi, budgetApi, tagListApi, darkModeApi])
    .then(res => {
      const vendorTagResult = res[0];
      const expenseResult = res[1];
      const budgetResult = res[2];
      const tagList = res[3];
      const darkMode = res[4];
      const expenseList = sortByKey(expenseResult, 'date');

      setExpenseState(expenseList, vendorTagResult, darkMode);
      setBudgetList(budgetResult);
      setTagList(tagList);
      WidgetService.updateWidgetFromExpenses(expenseList).catch(() => {});
    })
    .catch(err => console.error('Error loading initial app data:', err));
};

export const filterOptions: {id: DateRange; label: string}[] = [
  {id: '1d', label: '1 Day'},
  {id: '7d', label: '7 Days'},
  {id: '14d', label: '2 Weeks'},
  {id: '30d', label: '1 Month'},
  {id: '60d', label: '2 Month'},
  {id: '90d', label: '3 Month'},
  {id: '180d', label: '6 Month'},
  {id: '366d', label: '1 year'},
  {id: '732d', label: '2 year'},
  {id: '1800d', label: 'All Time'},
];

export const groupByOptions: {id: GroupByOption; label: string}[] = [
  {id: 'days', label: 'Days'},
  {id: 'vendor', label: 'Vendor'},
  {id: 'tags', label: 'Tags'},
  {id: 'cost', label: 'Cost'},
];

export const sortByOptions: {id: SortByOption; label: string}[] = [
  {id: 'cost', label: 'Total Cost'},
  {id: 'count', label: 'Expenses Count'},
];

export const calculationOptions: {id: CalculationOption; label: string}[] = [
  {id: 'average', label: 'Average'},
  {id: 'median', label: 'Median'},
];

export interface GroupedExpenses {
  [groupKey: string]: {
    groupLabel: string;
    expenses: Expense[];
    totalAmount: number;
  };
}

export const filterExpensesByDate = (
  expenses: Expense[],
  selectedRange: DateRange,
): Expense[] => {
  if (expenses.length === 0) {
    return [];
  }

  const now = dayjs();
  let startDate: dayjs.Dayjs;

  const daysMap: Record<DateRange, number> = {
    '1d': 1,
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '60d': 60,
    '90d': 90,
    '180d': 180,
    '366d': 366,
    '732d': 732,
    '1800d': 1800,
  };

  startDate = now.subtract(daysMap[selectedRange] ?? 7, 'day');

  return expenses.filter(expense => {
    const expenseDate = dayjs(new Date(expense.date));
    return (
      expenseDate.isAfter(startDate) || expenseDate.isSame(startDate, 'day')
    );
  });
};

export const searchExpenses = (
  expenses: Expense[],
  searchTerm: string,
): Expense[] => {
  if (searchTerm.trim() === '') {
    return expenses;
  }

  const searchTermLower = searchTerm.toLowerCase();
  return expenses.filter(expense => {
    return (
      expense.vendor.toLowerCase().includes(searchTermLower) ||
      expense.cost.toString().includes(searchTermLower) ||
      (expense.tag && expense.tag.toLowerCase().includes(searchTermLower))
    );
  });
};

export const groupExpenses = (
  expenses: Expense[],
  selectedGroupBy: GroupByOption,
): GroupedExpenses => {
  if (expenses.length === 0) {
    return {};
  }

  const grouped: GroupedExpenses = {};

  expenses.forEach(expense => {
    let groupKey: string;
    let groupLabel: string;

    switch (selectedGroupBy) {
      case 'days':
        groupKey = dayjs(new Date(expense.date)).format('YYYY-MM-DD');
        groupLabel = getDateMonth(expense.date);
        break;

      case 'vendor':
        groupKey = expense.vendor.toLowerCase();
        groupLabel = expense.vendor;
        break;

      case 'cost': {
        const cost = Number(expense.cost);
        if (cost <= 100) {
          groupKey = 'range_0_100';
          groupLabel = '₹0 - ₹100';
        } else if (cost <= 500) {
          groupKey = 'range_100_500';
          groupLabel = '₹100 - ₹500';
        } else if (cost <= 1000) {
          groupKey = 'range_500_1000';
          groupLabel = '₹500 - ₹1000';
        } else {
          groupKey = 'range_1000_plus';
          groupLabel = '₹1000+';
        }
        break;
      }

      case 'tags':
        groupKey = expense.tag ? expense.tag.toLowerCase() : 'untagged';
        groupLabel = expense.tag ? expense.tag : 'Untagged';
        break;

      default:
        groupKey = dayjs(new Date(expense.date)).format('YYYY-MM-DD');
        groupLabel = getDateMonth(expense.date);
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        groupLabel,
        expenses: [],
        totalAmount: 0,
      };
    }

    grouped[groupKey].expenses.push(expense);
    grouped[groupKey].totalAmount +=
      expense.costType === 'debit'
        ? -Number(expense.cost)
        : Number(expense.cost);
  });

  return grouped;
};
