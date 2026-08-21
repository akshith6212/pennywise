import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  BUDGET_LAST_UPDATE,
  EMAIL_PARSE_BANKS_CACHE_KEY,
  EXPENSE_LAST_UPDATE,
  TAG_LAST_UPDATE,
} from '../utility/constants';
import {getDateJsIdFormat, getUnixTimestamp, JSONCopy, sleep} from '../utility/utility';
import {LocalDB} from './LocalDB';
import {
  BankConfig,
  BankEmailParsingEntry,
  Budget,
  Expense,
  VendorTag,
} from '../Types';

type DocumentData = {[field: string]: unknown};

const getUserCollection = (collectionName: string) => {
  const uid = auth().currentUser?.uid;
  if (!uid) {
    throw new Error('User not authenticated');
  }
  return firestore().collection('users').doc(uid).collection(collectionName);
};

const fireStoreDoc = {
  set: async (
    collectionName: string,
    key: string,
    val: DocumentData,
  ): Promise<void> => {
    try {
      await getUserCollection(collectionName).doc(key).set(val);
    } catch (e) {
      console.error('Error adding document:', e);
      throw e;
    }
  },

  get: async (
    collectionName: string,
    key: string,
  ): Promise<DocumentData | null> => {
    try {
      const snap = await getUserCollection(collectionName).doc(key).get();
      return snap.exists ? (snap.data() as DocumentData) : null;
    } catch (e) {
      console.error('Error getting document:', e);
      throw e;
    }
  },

  delete: async (collectionName: string, key: string): Promise<boolean> => {
    try {
      await getUserCollection(collectionName).doc(key).delete();
      return true;
    } catch (e) {
      console.error('Error deleting document:', e);
      return false;
    }
  },
};

export class ExpenseAPI {
  private static readonly EMAIL_PARSE_BANKS_DOC_ID = 'emailParseBanks';

  // ── Email Parse Bank Config ──────────────────────────────

  static getEmailParseBankList = async (): Promise<
    BankEmailParsingEntry[]
  > => {
    let parsedCache: {
      banks: BankEmailParsingEntry[];
      modifiedDate: number;
    } | null = null;

    try {
      const row = await LocalDB.getData<{key: string; value: string}>(
        'config',
        EMAIL_PARSE_BANKS_CACHE_KEY,
      );
      if (row?.value != null) {
        const raw = typeof row.value === 'string' ? row.value : String(row.value);
        const parsed = JSON.parse(raw) as {
          banks?: BankEmailParsingEntry[];
          modifiedDate?: number;
        };
        if (Array.isArray(parsed.banks)) {
          parsedCache = {
            banks: parsed.banks,
            modifiedDate:
              typeof parsed.modifiedDate === 'number'
                ? parsed.modifiedDate
                : 0,
          };
        }
      }
    } catch {
      // ignore corrupt cache
    }

    try {
      const remote = (await ExpenseAPI.getOneDoc(
        ExpenseAPI.EMAIL_PARSE_BANKS_DOC_ID,
        'config',
      )) as {
        banks?: BankEmailParsingEntry[];
        modifiedDate?: number;
      } | null;

      if (remote === null) {
        if (parsedCache) {
          return parsedCache.banks;
        }
        const empty: BankEmailParsingEntry[] = [];
        await LocalDB.addConfig([
          {
            key: EMAIL_PARSE_BANKS_CACHE_KEY,
            value: JSON.stringify({banks: empty, modifiedDate: 0}),
          },
        ]);
        return empty;
      }

      const remoteBanks = Array.isArray(remote.banks) ? remote.banks : [];
      const remoteModified =
        typeof remote.modifiedDate === 'number' ? remote.modifiedDate : 0;

      if (parsedCache && parsedCache.modifiedDate > remoteModified) {
        return parsedCache.banks;
      }

      await LocalDB.addConfig([
        {
          key: EMAIL_PARSE_BANKS_CACHE_KEY,
          value: JSON.stringify({
            banks: remoteBanks,
            modifiedDate: remoteModified,
          }),
        },
      ]);
      return remoteBanks;
    } catch (e) {
      if (parsedCache) {
        return parsedCache.banks;
      }
      return [];
    }
  };

  static updateEmailParseBankList = async (
    banks: BankEmailParsingEntry[],
  ): Promise<boolean> => {
    try {
      const modifiedDate = Date.now();
      const payload = {banks, modifiedDate};
      await ExpenseAPI.setOneDoc(
        ExpenseAPI.EMAIL_PARSE_BANKS_DOC_ID,
        payload,
        'config',
      );
      await LocalDB.addConfig([
        {
          key: EMAIL_PARSE_BANKS_CACHE_KEY,
          value: JSON.stringify({banks, modifiedDate}),
        },
      ]);
      return true;
    } catch (e) {
      console.error('Error updating email parse bank list:', e);
      return false;
    }
  };

  // ── Generic Firestore helpers ────────────────────────────

  static setOneDoc = async (
    key: string,
    val: unknown,
    collectionName = 'config',
  ): Promise<void> => {
    await fireStoreDoc.set(collectionName, key, val as DocumentData);
  };

  static getOneDoc = async (
    key: string,
    collectionName = 'config',
  ): Promise<DocumentData | null> => {
    return fireStoreDoc.get(collectionName, key);
  };

  static deleteOneDoc = async (
    key: string,
    collectionName = 'config',
  ): Promise<boolean> => {
    return fireStoreDoc.delete(collectionName, key);
  };

  // ── Expense CRUD ─────────────────────────────────────────

  static addExpense = async (
    _expense: Expense,
    operation = 'update',
  ): Promise<Expense> => {
    try {
      const expense = JSONCopy(_expense) as Expense;
      const key =
        getDateJsIdFormat(new Date(expense.date)) +
        ' ' +
        expense.vendor.slice(0, 10);

      expense.modifiedDate = Date.now();
      expense.cost = Number(expense.cost.toFixed(2));
      expense.operation = operation;

      const {id, ...expenseWithoutId} = expense;
      await getUserCollection('expense')
        .doc(key)
        .set(expenseWithoutId as DocumentData);

      expense.id = key;
      await LocalDB.addExpenseList([expense]);

      return expense;
    } catch (e) {
      console.error('Error adding expense:', e);
      return _expense;
    }
  };

  static deleteExpense = async (expense: Expense): Promise<boolean> => {
    try {
      await getUserCollection('expense').doc(expense.id).delete();

      if (expense.mailId) {
        await LocalDB.deleteExpense(expense.mailId);
      }

      return true;
    } catch (e) {
      console.error('Error deleting expense:', e);
      return false;
    }
  };

  static getExpenseList = async (
    overrideLastDate: number | undefined = undefined,
  ): Promise<Expense[]> => {
    try {
      let lastUpdatedDate = getUnixTimestamp('2020-01-01');

      const configData = await LocalDB.getData<{key: string; value: number}>(
        'config',
        EXPENSE_LAST_UPDATE,
      );
      if (configData) {
        lastUpdatedDate = Number(configData.value);
      }
      if (overrideLastDate !== undefined) {
        lastUpdatedDate = overrideLastDate;
      }

      const querySnapshot = await getUserCollection('expense')
        .where('modifiedDate', '>=', lastUpdatedDate)
        .get();

      if (!querySnapshot.empty) {
        const fireDocList: Expense[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[];
        await LocalDB.addExpenseList(fireDocList);
      }

      await LocalDB.addConfig([
        {key: EXPENSE_LAST_UPDATE, value: Date.now() - 3600000},
      ]);

      let indexDocList = await LocalDB.getAllData<Expense>('expense');
      indexDocList = indexDocList.filter(item => item.operation !== 'delete');
      return indexDocList;
    } catch (e) {
      console.error('Error fetching expense list:', e);
      return [];
    }
  };

  // ── Tags ─────────────────────────────────────────────────

  static getTagList = async (): Promise<string[]> => {
    try {
      const tagObject = await ExpenseAPI.getOneDoc('tags', 'config');
      return (tagObject?.tagList as string[]) || [];
    } catch (e) {
      console.error('Error getting tag list:', e);
      return [];
    }
  };

  static updateTagList = async (tags: string[]): Promise<void> => {
    try {
      await ExpenseAPI.setOneDoc('tags', {tagList: tags}, 'config');
    } catch (e) {
      console.error('Error updating tag list:', e);
    }
  };

  // ── Bank Config ──────────────────────────────────────────

  static getBankConfig = async (): Promise<BankConfig> => {
    try {
      const bankConfig = await ExpenseAPI.getOneDoc('bankConfig', 'config');

      if (!bankConfig) {
        return {enableUpi: false, creditCards: []};
      }

      return {
        enableUpi: (bankConfig.enableUpi as boolean) ?? false,
        creditCards: (bankConfig.creditCards as string[]) ?? [],
      };
    } catch (e) {
      console.error('Error getting bank config:', e);
      return {enableUpi: false, creditCards: []};
    }
  };

  static updateBankConfig = async (config: BankConfig): Promise<boolean> => {
    try {
      await ExpenseAPI.setOneDoc('bankConfig', config, 'config');
      return true;
    } catch (e) {
      console.error('Error updating bank config:', e);
      return false;
    }
  };

  // ── Dark Mode ────────────────────────────────────────────

  static getDarkModeConfig = async (): Promise<boolean> => {
    try {
      const darkModeConfig = await ExpenseAPI.getOneDoc('darkMode', 'config');
      if (!darkModeConfig) {
        return false;
      }
      return darkModeConfig.value as boolean;
    } catch (e) {
      console.error('Error getting dark mode config:', e);
      return false;
    }
  };

  static updateDarkMode = async (val: boolean): Promise<boolean> => {
    try {
      await ExpenseAPI.setOneDoc('darkMode', {value: val}, 'config');
      return true;
    } catch (e) {
      console.error('Error updating dark mode config:', e);
      return false;
    }
  };

  // ── Vendor Tags ──────────────────────────────────────────

  static getVendorTagList = async (): Promise<VendorTag[]> => {
    try {
      let lastUpdatedDate = getUnixTimestamp('2020-01-01');

      const configData = await LocalDB.getData<{key: string; value: number}>(
        'config',
        TAG_LAST_UPDATE,
      );
      if (configData) {
        lastUpdatedDate = Number(configData.value);
      }

      const querySnapshot = await getUserCollection('vendorTag')
        .where('date', '>', lastUpdatedDate)
        .get();

      if (!querySnapshot.empty) {
        const fireDocList: VendorTag[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as VendorTag[];

        for (const vt of fireDocList) {
          await LocalDB.addVendorTag(vt);
        }
      }

      await LocalDB.addConfig([
        {key: TAG_LAST_UPDATE, value: Date.now() - 3600000},
      ]);

      return await LocalDB.getAllData<VendorTag>('vendorTag');
    } catch (e) {
      console.error('Error getting vendor tag list:', e);
      return [];
    }
  };

  static updateVendorTag = async (vendorTag: VendorTag): Promise<boolean> => {
    try {
      const {id, ...vendorTagWithoutId} = vendorTag;
      vendorTagWithoutId.date = Date.now();

      await getUserCollection('vendorTag')
        .doc(id)
        .set(vendorTagWithoutId);

      return true;
    } catch (e) {
      console.error('Error updating vendorTag:', e);
      return false;
    }
  };

  static deleteVendorTag = async (vendorTagId: string): Promise<boolean> => {
    try {
      await getUserCollection('vendorTag').doc(vendorTagId).delete();
      return true;
    } catch (e) {
      console.error('Error deleting vendorTag:', e);
      return false;
    }
  };

  // ── Auto-Tag ─────────────────────────────────────────────

  static autoTagPastExpenses = async (
    startDate: number,
  ): Promise<number> => {
    try {
      const vendorTags = await LocalDB.getAllData<VendorTag>('vendorTag');
      const vendorTagMap = new Map(
        vendorTags.map(vt => [vt.vendor.toLowerCase(), vt.tag]),
      );

      if (vendorTagMap.size === 0) {
        return 0;
      }

      const querySnapshot = await getUserCollection('expense')
        .where('modifiedDate', '>=', startDate)
        .get();

      const expensesToUpdate: Expense[] = [];

      querySnapshot.forEach(doc => {
        const expense = {id: doc.id, ...doc.data()} as Expense;

        if (expense.tag) {
          return;
        }

        const vendorLower = expense.vendor.toLowerCase();
        if (vendorTagMap.has(vendorLower)) {
          const newTag = vendorTagMap.get(vendorLower);
          if (newTag) {
            expensesToUpdate.push({
              ...expense,
              tag: newTag,
              modifiedDate: Date.now(),
            });
          }
        }
      });

      if (expensesToUpdate.length > 0) {
        const batchSize = 500;

        for (let i = 0; i < expensesToUpdate.length; i += batchSize) {
          const batch = expensesToUpdate.slice(i, i + batchSize);

          const updatePromises = batch.map(async expense => {
            const {id, ...expenseWithoutId} = expense;
            if (id) {
              await getUserCollection('expense')
                .doc(id)
                .set(expenseWithoutId);
            }
          });

          await Promise.all(updatePromises);
          await LocalDB.addExpenseList(batch);

          if (i + batchSize < expensesToUpdate.length) {
            await sleep(1500);
          }
        }
      }

      return expensesToUpdate.length;
    } catch (e) {
      console.error('Error during auto-tagging process:', e);
      return 0;
    }
  };

  // ── Budget CRUD ──────────────────────────────────────────

  static addBudget = async (
    _budget: Budget,
    operation = 'update',
  ): Promise<Budget> => {
    try {
      const budget = JSONCopy(_budget) as Budget;
      const key =
        budget.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

      budget.modifiedDate = Date.now();
      budget.operation = operation;

      const {id, ...budgetWithoutId} = budget;
      await getUserCollection('budget')
        .doc(key)
        .set(budgetWithoutId as DocumentData);

      budget.id = key;
      await LocalDB.addBudgetList([budget]);

      return budget;
    } catch (e) {
      console.error('Error adding budget:', e, _budget);
      return _budget;
    }
  };

  static updateBudget = async (_budget: Budget): Promise<Budget> => {
    try {
      const budget = JSONCopy(_budget) as Budget;
      budget.modifiedDate = Date.now();
      budget.operation = 'update';

      const {id, ...budgetWithoutId} = budget;
      await getUserCollection('budget')
        .doc(budget.id)
        .set(budgetWithoutId as DocumentData);

      await LocalDB.addBudgetList([budget]);

      return budget;
    } catch (e) {
      console.error('Error updating budget:', e, _budget);
      return _budget;
    }
  };

  static deleteBudget = async (budget: Budget): Promise<boolean> => {
    try {
      await getUserCollection('budget').doc(budget.id).delete();
      await LocalDB.deleteBudget(budget.id);
      return true;
    } catch (e) {
      console.error('Error deleting budget:', e);
      return false;
    }
  };

  static getBudgetList = async (
    overrideLastDate: number | undefined = undefined,
  ): Promise<Budget[]> => {
    try {
      let lastUpdatedDate = getUnixTimestamp('2020-01-01');

      const configData = await LocalDB.getData<{key: string; value: number}>(
        'config',
        BUDGET_LAST_UPDATE,
      );
      if (configData) {
        lastUpdatedDate = Number(configData.value);
      }
      if (overrideLastDate !== undefined) {
        lastUpdatedDate = overrideLastDate;
      }

      const querySnapshot = await getUserCollection('budget')
        .where('modifiedDate', '>=', lastUpdatedDate)
        .get();

      if (!querySnapshot.empty) {
        const fireDocList: Budget[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Budget[];
        await LocalDB.addBudgetList(fireDocList);
      }

      await LocalDB.addConfig([
        {key: BUDGET_LAST_UPDATE, value: Date.now() - 3600000},
      ]);

      let indexDocList = await LocalDB.getAllData<Budget>('budget');
      indexDocList = indexDocList.filter(item => item.operation !== 'delete');
      return indexDocList;
    } catch (e) {
      console.error('Error fetching budget list:', e);
      return [];
    }
  };

  // ── Process Data (placeholder for migrations) ────────────

  static processData = async (): Promise<void> => {
    // Reserved for one-off data processing / migrations
  };
}
