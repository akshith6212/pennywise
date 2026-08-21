import {Expense} from '../../Types';
import {filterOptions} from '../dataValidations';
import {getCurrentDate} from '../../utility/utility';

interface FormattedExpense {
  Date: string;
  Time: string;
  Vendor: string;
  Amount: number;
  Type: string;
  PaymentMode: string;
  Tag: string;
  User: string;
}

const validateExpenses = (expenses: Expense[]): boolean => {
  if (!expenses || expenses.length === 0) {
    console.warn('No expense data to export');
    return false;
  }
  return true;
};

const formatExpenses = (expenses: Expense[]): FormattedExpense[] => {
  return expenses.map(expense => ({
    Date: new Date(expense.date).toLocaleDateString(),
    Time: new Date(expense.date).toLocaleTimeString(),
    Vendor: expense.vendor,
    Amount: expense.cost,
    Type: expense.costType,
    PaymentMode: expense.type,
    Tag: expense.tag || 'Untagged',
    User: expense.user,
  }));
};

const generateFilename = (timeRange: string, fileType: string): string => {
  const rangeLabel =
    filterOptions.find(opt => opt.id === timeRange)?.label || timeRange;
  const dateStr = getCurrentDate('YYYYMMDD_HHmmss');
  return `Pennywise_${rangeLabel}_range_${dateStr}.${fileType}`
    .replace(' ', '')
    .toLowerCase();
};

const jsonToCsv = (data: FormattedExpense[]): string => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers
      .map(header => {
        const val = String((row as Record<string, unknown>)[header] ?? '');
        return val.includes(',') || val.includes('"')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
};

export const exportAsCSV = (
  expenses: Expense[],
  timeRange: string,
): void => {
  if (!validateExpenses(expenses)) return;

  try {
    const formatted = formatExpenses(expenses);
    const csv = jsonToCsv(formatted);
    const filename = generateFilename(timeRange, 'csv');

    // In RN, we'd use react-native-fs + react-native-share here.
    // For now, log the data and filename — full file-system integration
    // requires native module setup (react-native-fs, react-native-share).
    console.log(
      `CSV export ready: ${filename}, ${expenses.length} rows, ${csv.length} bytes`,
    );
  } catch (error) {
    console.error('Error exporting expenses as CSV:', error);
  }
};

export {FormattedExpense, formatExpenses, generateFilename, jsonToCsv};
