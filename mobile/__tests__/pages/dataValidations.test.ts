import dayjs from 'dayjs';
import {
  filterExpensesByDate,
  searchExpenses,
  groupExpenses,
  filterOptions,
  groupByOptions,
  DateRange,
} from '../../src/pages/dataValidations';
import {Expense} from '../../src/Types';

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'exp-1',
  mailId: 'mail-1',
  cost: 100,
  costType: 'debit',
  date: Date.now(),
  modifiedDate: Date.now(),
  user: 'testuser',
  type: 'UPI',
  vendor: 'Amazon',
  operation: 'create',
  tag: 'Shopping',
  ...overrides,
});

describe('filterExpensesByDate', () => {
  it('returns empty array for empty input', () => {
    expect(filterExpensesByDate([], '7d')).toEqual([]);
  });

  it('filters expenses within 1 day range', () => {
    const today = makeExpense({date: Date.now()});
    const oldExpense = makeExpense({
      id: 'old',
      date: dayjs().subtract(3, 'day').valueOf(),
    });
    const result = filterExpensesByDate([today, oldExpense], '1d');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(today);
  });

  it('filters expenses within 7 day range', () => {
    const recent = makeExpense({date: dayjs().subtract(3, 'day').valueOf()});
    const old = makeExpense({
      id: 'old',
      date: dayjs().subtract(10, 'day').valueOf(),
    });
    const result = filterExpensesByDate([recent, old], '7d');
    expect(result).toHaveLength(1);
  });

  it('includes expenses on the boundary date', () => {
    const onBoundary = makeExpense({
      date: dayjs().subtract(30, 'day').valueOf(),
    });
    const result = filterExpensesByDate([onBoundary], '30d');
    expect(result).toHaveLength(1);
  });

  it('handles all date range options', () => {
    const allTime = makeExpense({
      date: dayjs().subtract(1000, 'day').valueOf(),
    });

    for (const option of filterOptions) {
      const result = filterExpensesByDate([allTime], option.id);
      if (option.id === '1800d') {
        expect(result.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('searchExpenses', () => {
  const expenses = [
    makeExpense({vendor: 'Amazon India', cost: 500, tag: 'Shopping'}),
    makeExpense({
      id: 'exp-2',
      mailId: 'mail-2',
      vendor: 'Swiggy Food',
      cost: 250,
      tag: 'Food',
    }),
    makeExpense({
      id: 'exp-3',
      mailId: 'mail-3',
      vendor: 'Uber Trip',
      cost: 150,
      tag: undefined,
    }),
  ];

  it('returns all expenses for empty search term', () => {
    expect(searchExpenses(expenses, '')).toHaveLength(3);
    expect(searchExpenses(expenses, '   ')).toHaveLength(3);
  });

  it('searches by vendor name (case-insensitive)', () => {
    expect(searchExpenses(expenses, 'amazon')).toHaveLength(1);
    expect(searchExpenses(expenses, 'SWIGGY')).toHaveLength(1);
  });

  it('searches by cost value', () => {
    expect(searchExpenses(expenses, '500')).toHaveLength(1);
    expect(searchExpenses(expenses, '25')).toHaveLength(1);
  });

  it('searches by tag (case-insensitive)', () => {
    expect(searchExpenses(expenses, 'shopping')).toHaveLength(1);
    expect(searchExpenses(expenses, 'food')).toHaveLength(1);
  });

  it('handles expenses with no tag', () => {
    expect(searchExpenses(expenses, 'uber')).toHaveLength(1);
  });

  it('returns empty for no match', () => {
    expect(searchExpenses(expenses, 'zzzzz')).toHaveLength(0);
  });
});

describe('groupExpenses', () => {
  it('returns empty object for empty input', () => {
    expect(groupExpenses([], 'days')).toEqual({});
  });

  describe('group by days', () => {
    it('groups expenses by date', () => {
      const date1 = dayjs('2024-03-15').valueOf();
      const date2 = dayjs('2024-03-16').valueOf();
      const expenses = [
        makeExpense({date: date1}),
        makeExpense({id: 'e2', mailId: 'm2', date: date1}),
        makeExpense({id: 'e3', mailId: 'm3', date: date2}),
      ];
      const result = groupExpenses(expenses, 'days');
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['2024-03-15'].expenses).toHaveLength(2);
      expect(result['2024-03-16'].expenses).toHaveLength(1);
    });
  });

  describe('group by vendor', () => {
    it('groups expenses by vendor name (case-insensitive)', () => {
      const expenses = [
        makeExpense({vendor: 'Amazon'}),
        makeExpense({id: 'e2', mailId: 'm2', vendor: 'amazon'}),
        makeExpense({id: 'e3', mailId: 'm3', vendor: 'Swiggy'}),
      ];
      const result = groupExpenses(expenses, 'vendor');
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['amazon'].expenses).toHaveLength(2);
    });
  });

  describe('group by cost', () => {
    it('groups into correct cost ranges', () => {
      const expenses = [
        makeExpense({cost: 50}),
        makeExpense({id: 'e2', mailId: 'm2', cost: 100}),
        makeExpense({id: 'e3', mailId: 'm3', cost: 300}),
        makeExpense({id: 'e4', mailId: 'm4', cost: 800}),
        makeExpense({id: 'e5', mailId: 'm5', cost: 1500}),
      ];
      const result = groupExpenses(expenses, 'cost');

      expect(result['range_0_100'].expenses).toHaveLength(2);
      expect(result['range_0_100'].groupLabel).toBe('₹0 - ₹100');

      expect(result['range_100_500'].expenses).toHaveLength(1);
      expect(result['range_100_500'].groupLabel).toBe('₹100 - ₹500');

      expect(result['range_500_1000'].expenses).toHaveLength(1);
      expect(result['range_500_1000'].groupLabel).toBe('₹500 - ₹1000');

      expect(result['range_1000_plus'].expenses).toHaveLength(1);
      expect(result['range_1000_plus'].groupLabel).toBe('₹1000+');
    });

    it('places boundary values correctly (100 -> 0-100 range)', () => {
      const expenses = [makeExpense({cost: 100})];
      const result = groupExpenses(expenses, 'cost');
      expect(result['range_0_100'].expenses).toHaveLength(1);
    });

    it('places 500 in 100-500 range', () => {
      const expenses = [makeExpense({cost: 500})];
      const result = groupExpenses(expenses, 'cost');
      expect(result['range_100_500'].expenses).toHaveLength(1);
    });

    it('places 1000 in 500-1000 range', () => {
      const expenses = [makeExpense({cost: 1000})];
      const result = groupExpenses(expenses, 'cost');
      expect(result['range_500_1000'].expenses).toHaveLength(1);
    });
  });

  describe('group by tags', () => {
    it('groups by tag name', () => {
      const expenses = [
        makeExpense({tag: 'Food'}),
        makeExpense({id: 'e2', mailId: 'm2', tag: 'Food'}),
        makeExpense({id: 'e3', mailId: 'm3', tag: 'Travel'}),
      ];
      const result = groupExpenses(expenses, 'tags');
      expect(result['food'].expenses).toHaveLength(2);
      expect(result['travel'].expenses).toHaveLength(1);
    });

    it('groups untagged expenses under "untagged"', () => {
      const expenses = [
        makeExpense({tag: undefined}),
        makeExpense({id: 'e2', mailId: 'm2', tag: ''}),
      ];
      const result = groupExpenses(expenses, 'tags');
      expect(result['untagged']).toBeDefined();
      expect(result['untagged'].groupLabel).toBe('Untagged');
    });
  });

  describe('totalAmount calculation', () => {
    it('sums debit as negative and credit as positive', () => {
      const expenses = [
        makeExpense({cost: 200, costType: 'debit'}),
        makeExpense({
          id: 'e2',
          mailId: 'm2',
          cost: 100,
          costType: 'credit',
        }),
      ];
      const result = groupExpenses(expenses, 'vendor');
      const group = Object.values(result)[0];
      expect(group.totalAmount).toBe(-100);
    });
  });
});

describe('filterOptions', () => {
  it('has 10 date range options', () => {
    expect(filterOptions).toHaveLength(10);
  });

  it('each option has id and label', () => {
    filterOptions.forEach(opt => {
      expect(opt.id).toBeDefined();
      expect(opt.label).toBeDefined();
    });
  });
});

describe('groupByOptions', () => {
  it('has 4 group by options', () => {
    expect(groupByOptions).toHaveLength(4);
    expect(groupByOptions.map(o => o.id)).toEqual([
      'days',
      'vendor',
      'tags',
      'cost',
    ]);
  });
});
