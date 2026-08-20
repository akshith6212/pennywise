import firestore from '@react-native-firebase/firestore';
import {ExpenseAPI} from '../../src/api/ExpenseAPI';
import {LocalDB} from '../../src/api/LocalDB';
import {Expense, Budget, BankConfig} from '../../src/Types';

jest.mock('../../src/api/LocalDB', () => ({
  LocalDB: {
    initDB: jest.fn(() => Promise.resolve()),
    addExpenseList: jest.fn(() => Promise.resolve()),
    addConfig: jest.fn(() => Promise.resolve()),
    addVendorTag: jest.fn(() => Promise.resolve()),
    addBudgetList: jest.fn(() => Promise.resolve()),
    deleteExpense: jest.fn(() => Promise.resolve()),
    deleteBudget: jest.fn(() => Promise.resolve()),
    getData: jest.fn(() => Promise.resolve(null)),
    getAllData: jest.fn(() => Promise.resolve([])),
    clearLocalDBData: jest.fn(() => Promise.resolve()),
  },
}));

const mockSet = jest.fn(() => Promise.resolve());
const mockGet = jest.fn(() =>
  Promise.resolve({exists: false, data: () => null}),
);
const mockDelete = jest.fn(() => Promise.resolve());
const mockDoc = jest.fn(() => ({set: mockSet, get: mockGet, delete: mockDelete}));
const mockWhere = jest.fn(() => ({
  get: jest.fn(() => Promise.resolve({empty: true, docs: []})),
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
  where: mockWhere,
}));

jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: mockCollection,
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

describe('ExpenseAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({exists: false, data: () => null});
  });

  describe('addExpense', () => {
    it('writes to Firestore and LocalDB', async () => {
      const expense = makeExpense();
      const result = await ExpenseAPI.addExpense(expense);

      expect(mockCollection).toHaveBeenCalledWith('expense');
      expect(mockSet).toHaveBeenCalled();
      expect(LocalDB.addExpenseList).toHaveBeenCalled();
      expect(result.id).toBeDefined();
    });

    it('rounds cost to 2 decimal places', async () => {
      const expense = makeExpense({cost: 99.999});
      await ExpenseAPI.addExpense(expense);

      const setArg = mockSet.mock.calls[0][0];
      expect(setArg.cost).toBe(100.0);
    });
  });

  describe('deleteExpense', () => {
    it('deletes from Firestore', async () => {
      const expense = makeExpense();
      const result = await ExpenseAPI.deleteExpense(expense);

      expect(mockCollection).toHaveBeenCalledWith('expense');
      expect(mockDelete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('deletes from LocalDB when mailId exists', async () => {
      const expense = makeExpense({mailId: 'test-mail'});
      await ExpenseAPI.deleteExpense(expense);

      expect(LocalDB.deleteExpense).toHaveBeenCalledWith('test-mail');
    });
  });

  describe('getExpenseList (incremental sync)', () => {
    it('reads from Firestore with lastUpdate filter', async () => {
      (LocalDB.getData as jest.Mock).mockResolvedValue(null);
      mockWhere.mockReturnValue({
        get: jest.fn(() => Promise.resolve({empty: true, docs: []})),
      });
      (LocalDB.getAllData as jest.Mock).mockResolvedValue([]);

      await ExpenseAPI.getExpenseList();

      expect(mockCollection).toHaveBeenCalledWith('expense');
      expect(mockWhere).toHaveBeenCalledWith(
        'modifiedDate',
        '>=',
        expect.any(Number),
      );
    });

    it('merges remote data into LocalDB', async () => {
      const remoteExpense = {
        id: 'doc-1',
        data: () => makeExpense({mailId: 'mail-remote'}),
      };
      mockWhere.mockReturnValue({
        get: jest.fn(() =>
          Promise.resolve({
            empty: false,
            docs: [remoteExpense],
          }),
        ),
      });
      (LocalDB.getAllData as jest.Mock).mockResolvedValue([]);

      await ExpenseAPI.getExpenseList();

      expect(LocalDB.addExpenseList).toHaveBeenCalled();
    });

    it('uses override date when provided', async () => {
      const overrideDate = 1000000;
      mockWhere.mockReturnValue({
        get: jest.fn(() => Promise.resolve({empty: true, docs: []})),
      });
      (LocalDB.getAllData as jest.Mock).mockResolvedValue([]);

      await ExpenseAPI.getExpenseList(overrideDate);

      expect(mockWhere).toHaveBeenCalledWith(
        'modifiedDate',
        '>=',
        overrideDate,
      );
    });

    it('filters out deleted expenses from result', async () => {
      mockWhere.mockReturnValue({
        get: jest.fn(() => Promise.resolve({empty: true, docs: []})),
      });
      (LocalDB.getAllData as jest.Mock).mockResolvedValue([
        makeExpense({operation: 'create'}),
        makeExpense({id: 'e2', mailId: 'm2', operation: 'delete'}),
      ]);

      const result = await ExpenseAPI.getExpenseList();

      expect(result).toHaveLength(1);
      expect(result[0].operation).toBe('create');
    });
  });

  describe('getTagList', () => {
    it('returns tags from config document', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({tagList: ['Food', 'Travel']}),
      });

      const tags = await ExpenseAPI.getTagList();

      expect(mockCollection).toHaveBeenCalledWith('config');
      expect(tags).toEqual(['Food', 'Travel']);
    });

    it('returns empty array when no tags document', async () => {
      mockGet.mockResolvedValue({exists: false, data: () => null});
      const tags = await ExpenseAPI.getTagList();
      expect(tags).toEqual([]);
    });
  });

  describe('getBankConfig', () => {
    it('returns default config when not found', async () => {
      mockGet.mockResolvedValue({exists: false, data: () => null});
      const config = await ExpenseAPI.getBankConfig();
      expect(config).toEqual({enableUpi: false, creditCards: []});
    });

    it('returns config from Firestore', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({enableUpi: true, creditCards: ['1234', '5678']}),
      });
      const config = await ExpenseAPI.getBankConfig();
      expect(config.enableUpi).toBe(true);
      expect(config.creditCards).toEqual(['1234', '5678']);
    });
  });

  describe('updateBankConfig', () => {
    it('writes config to Firestore', async () => {
      const config: BankConfig = {enableUpi: true, creditCards: ['1234']};
      const result = await ExpenseAPI.updateBankConfig(config);

      expect(mockSet).toHaveBeenCalledWith(config);
      expect(result).toBe(true);
    });
  });

  describe('getDarkModeConfig', () => {
    it('returns false when not found', async () => {
      mockGet.mockResolvedValue({exists: false, data: () => null});
      const result = await ExpenseAPI.getDarkModeConfig();
      expect(result).toBe(false);
    });

    it('returns stored value', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({value: true}),
      });
      const result = await ExpenseAPI.getDarkModeConfig();
      expect(result).toBe(true);
    });
  });

  describe('updateDarkMode', () => {
    it('writes dark mode value', async () => {
      const result = await ExpenseAPI.updateDarkMode(true);
      expect(mockSet).toHaveBeenCalledWith({value: true});
      expect(result).toBe(true);
    });
  });

  describe('Budget CRUD', () => {
    it('addBudget writes to Firestore and LocalDB', async () => {
      const budget: Budget = {
        id: '',
        name: 'Food',
        amount: 5000,
        tagList: ['Food'],
        modifiedDate: Date.now(),
        operation: 'create',
      };
      const result = await ExpenseAPI.addBudget(budget);

      expect(mockCollection).toHaveBeenCalledWith('budget');
      expect(mockSet).toHaveBeenCalled();
      expect(LocalDB.addBudgetList).toHaveBeenCalled();
      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('updateBudget writes to Firestore and LocalDB', async () => {
      const budget: Budget = {
        id: 'budget-1',
        name: 'Food',
        amount: 10000,
        tagList: ['Food'],
        modifiedDate: Date.now(),
      };
      const result = await ExpenseAPI.updateBudget(budget);

      expect(mockSet).toHaveBeenCalled();
      expect(LocalDB.addBudgetList).toHaveBeenCalled();
      expect(result.amount).toBe(10000);
    });

    it('deleteBudget removes from Firestore and LocalDB', async () => {
      const budget: Budget = {
        id: 'budget-1',
        name: 'Food',
        amount: 5000,
        tagList: ['Food'],
        modifiedDate: Date.now(),
      };
      const result = await ExpenseAPI.deleteBudget(budget);

      expect(mockDelete).toHaveBeenCalled();
      expect(LocalDB.deleteBudget).toHaveBeenCalledWith('budget-1');
      expect(result).toBe(true);
    });
  });
});
