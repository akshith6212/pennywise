import SQLite from 'react-native-sqlite-storage';
import {LocalDB} from '../../src/api/LocalDB';
import {Expense, VendorTag, Budget, Config} from '../../src/Types';

const mockExecuteSql = jest.fn();
const mockTransaction = jest.fn();

const mockDb = {
  executeSql: mockExecuteSql,
  transaction: mockTransaction,
};

jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => Promise.resolve(mockDb)),
}));

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

describe('LocalDB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteSql.mockResolvedValue([{rows: {length: 0, item: jest.fn()}}]);
    mockTransaction.mockImplementation(cb => {
      const txObj = {executeSql: jest.fn()};
      cb(txObj);
      return Promise.resolve();
    });
    (LocalDB as any).db = null;
  });

  describe('initDB', () => {
    it('opens the database', async () => {
      await LocalDB.initDB();
      expect(SQLite.openDatabase).toHaveBeenCalledWith({
        name: 'Finance.db',
        location: 'default',
      });
    });

    it('creates all 4 tables', async () => {
      await LocalDB.initDB();
      const createTableCalls = mockExecuteSql.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('CREATE TABLE'),
      );
      expect(createTableCalls.length).toBe(4);
    });

    it('creates indexes on expense table', async () => {
      await LocalDB.initDB();
      const indexCalls = mockExecuteSql.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('CREATE INDEX'),
      );
      expect(indexCalls.length).toBe(2);
    });

    it('returns existing db on subsequent calls', async () => {
      const db1 = await LocalDB.initDB();
      const db2 = await LocalDB.initDB();
      expect(SQLite.openDatabase).toHaveBeenCalledTimes(1);
      expect(db1).toBe(db2);
    });
  });

  describe('addExpenseList', () => {
    it('inserts expenses via transaction', async () => {
      const txExecuteSql = jest.fn();
      mockTransaction.mockImplementation(cb => {
        cb({executeSql: txExecuteSql});
        return Promise.resolve();
      });

      await LocalDB.initDB();
      const expenses = [makeExpense(), makeExpense({mailId: 'mail-2', id: 'exp-2'})];
      await LocalDB.addExpenseList(expenses);

      expect(mockTransaction).toHaveBeenCalled();
      expect(txExecuteSql).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteExpense', () => {
    it('deletes by mailId', async () => {
      await LocalDB.initDB();
      await LocalDB.deleteExpense('mail-1');

      const deleteCalls = mockExecuteSql.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('DELETE FROM expense'),
      );
      expect(deleteCalls.length).toBe(1);
      expect(deleteCalls[0][1]).toEqual(['mail-1']);
    });
  });

  describe('addVendorTag', () => {
    it('inserts vendor tag', async () => {
      await LocalDB.initDB();
      const vt: VendorTag = {
        id: 'vt-1',
        vendor: 'Amazon',
        tag: 'Shopping',
        date: Date.now(),
      };
      await LocalDB.addVendorTag(vt);

      const insertCalls = mockExecuteSql.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('INSERT OR REPLACE INTO vendorTag'),
      );
      expect(insertCalls.length).toBe(1);
    });
  });

  describe('addConfig', () => {
    it('inserts config entries via transaction', async () => {
      const txExecuteSql = jest.fn();
      mockTransaction.mockImplementation(cb => {
        cb({executeSql: txExecuteSql});
        return Promise.resolve();
      });

      await LocalDB.initDB();
      const configs: Config[] = [
        {key: 'lastUpdate', value: Date.now()},
        {key: 'theme', value: 'dark'},
      ];
      await LocalDB.addConfig(configs);

      expect(txExecuteSql).toHaveBeenCalledTimes(2);
    });

    it('converts numeric values to strings', async () => {
      const txExecuteSql = jest.fn();
      mockTransaction.mockImplementation(cb => {
        cb({executeSql: txExecuteSql});
        return Promise.resolve();
      });

      await LocalDB.initDB();
      await LocalDB.addConfig([{key: 'count', value: 42}]);

      const params = txExecuteSql.mock.calls[0][1];
      expect(params[1]).toBe('42');
    });
  });

  describe('addBudgetList', () => {
    it('inserts budgets with serialized tagList', async () => {
      const txExecuteSql = jest.fn();
      mockTransaction.mockImplementation(cb => {
        cb({executeSql: txExecuteSql});
        return Promise.resolve();
      });

      await LocalDB.initDB();
      const budget: Budget = {
        id: 'b1',
        name: 'Food',
        amount: 5000,
        tagList: ['Food', 'Groceries'],
        modifiedDate: Date.now(),
      };
      await LocalDB.addBudgetList([budget]);

      expect(txExecuteSql).toHaveBeenCalledTimes(1);
      const params = txExecuteSql.mock.calls[0][1];
      expect(params[3]).toBe(JSON.stringify(['Food', 'Groceries']));
    });
  });

  describe('deleteBudget', () => {
    it('deletes by budget id', async () => {
      await LocalDB.initDB();
      await LocalDB.deleteBudget('b1');

      const deleteCalls = mockExecuteSql.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('DELETE FROM budget'),
      );
      expect(deleteCalls.length).toBe(1);
    });
  });

  describe('getData', () => {
    it('returns undefined when no rows found', async () => {
      mockExecuteSql.mockResolvedValue([{rows: {length: 0, item: jest.fn()}}]);
      await LocalDB.initDB();
      const result = await LocalDB.getData('config', 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('returns deserialized row when found', async () => {
      const mockRow = {key: 'theme', value: 'dark'};
      mockExecuteSql.mockResolvedValue([
        {rows: {length: 1, item: () => mockRow}},
      ]);
      await LocalDB.initDB();
      const result = await LocalDB.getData<{key: string; value: string}>(
        'config',
        'theme',
      );
      expect(result).toEqual(mockRow);
    });
  });

  describe('getAllData', () => {
    it('returns all rows from table', async () => {
      const rows = [
        {key: 'a', value: '1'},
        {key: 'b', value: '2'},
      ];
      mockExecuteSql.mockResolvedValue([
        {
          rows: {
            length: rows.length,
            item: (i: number) => rows[i],
          },
        },
      ]);
      await LocalDB.initDB();
      const result = await LocalDB.getAllData('config');
      expect(result).toHaveLength(2);
    });
  });

  describe('clearLocalDBData', () => {
    it('deletes all data from all 4 tables', async () => {
      await LocalDB.initDB();
      await LocalDB.clearLocalDBData();

      const deleteCalls = mockExecuteSql.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' && call[0].startsWith('DELETE FROM'),
      );
      expect(deleteCalls.length).toBe(4);
    });
  });
});
