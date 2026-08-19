import SQLite, {
  SQLiteDatabase,
  ResultSet,
} from 'react-native-sqlite-storage';
import {Budget, Config, Expense, VendorTag} from '../Types';

SQLite.enablePromise(true);

const DB_NAME = 'Finance.db';
const DB_VERSION = '1.0';
const DB_DISPLAY_NAME = 'Pennywise Finance Database';

type TableName = 'expense' | 'vendorTag' | 'config' | 'budget';

export class LocalDB {
  private static db: SQLiteDatabase | null = null;

  static initDB = async (): Promise<SQLiteDatabase> => {
    if (LocalDB.db) {
      return LocalDB.db;
    }

    const db = await SQLite.openDatabase({
      name: DB_NAME,
      location: 'default',
    });

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS expense (
        mailId TEXT PRIMARY KEY,
        id TEXT,
        tag TEXT,
        cost REAL NOT NULL,
        costType TEXT NOT NULL,
        date INTEGER NOT NULL,
        modifiedDate INTEGER,
        user TEXT,
        type TEXT,
        vendor TEXT NOT NULL,
        operation TEXT
      )
    `);

    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_expense_vendor ON expense(vendor)
    `);

    await db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_expense_date ON expense(date)
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS vendorTag (
        vendor TEXT PRIMARY KEY,
        id TEXT,
        tag TEXT NOT NULL,
        date INTEGER
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS budget (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        tagList TEXT NOT NULL,
        modifiedDate INTEGER,
        operation TEXT
      )
    `);

    LocalDB.db = db;
    return db;
  };

  private static getDB = async (): Promise<SQLiteDatabase> => {
    if (!LocalDB.db) {
      return LocalDB.initDB();
    }
    return LocalDB.db;
  };

  // ── Expense operations ───────────────────────────────────

  static addExpenseList = async (expenseList: Expense[]): Promise<void> => {
    const db = await LocalDB.getDB();

    await db.transaction(tx => {
      for (const expense of expenseList) {
        tx.executeSql(
          `INSERT OR REPLACE INTO expense
            (mailId, id, tag, cost, costType, date, modifiedDate, user, type, vendor, operation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            expense.mailId,
            expense.id,
            expense.tag ?? null,
            expense.cost,
            expense.costType,
            expense.date,
            expense.modifiedDate,
            expense.user,
            expense.type,
            expense.vendor,
            expense.operation,
          ],
        );
      }
    });
  };

  static deleteExpense = async (mailId: string): Promise<void> => {
    const db = await LocalDB.getDB();
    await db.executeSql('DELETE FROM expense WHERE mailId = ?', [mailId]);
  };

  // ── VendorTag operations ─────────────────────────────────

  static addVendorTag = async (vendorTag: VendorTag): Promise<void> => {
    const db = await LocalDB.getDB();
    await db.executeSql(
      `INSERT OR REPLACE INTO vendorTag (vendor, id, tag, date)
       VALUES (?, ?, ?, ?)`,
      [vendorTag.vendor, vendorTag.id, vendorTag.tag, vendorTag.date],
    );
  };

  // ── Config operations ────────────────────────────────────

  static addConfig = async (configList: Config[]): Promise<void> => {
    const db = await LocalDB.getDB();

    await db.transaction(tx => {
      for (const config of configList) {
        const value =
          typeof config.value === 'number'
            ? config.value.toString()
            : config.value;
        tx.executeSql(
          'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
          [config.key, value],
        );
      }
    });
  };

  // ── Budget operations ────────────────────────────────────

  static addBudgetList = async (budgetList: Budget[]): Promise<void> => {
    const db = await LocalDB.getDB();

    await db.transaction(tx => {
      for (const budget of budgetList) {
        tx.executeSql(
          `INSERT OR REPLACE INTO budget
            (id, name, amount, tagList, modifiedDate, operation)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            budget.id,
            budget.name,
            budget.amount,
            JSON.stringify(budget.tagList),
            budget.modifiedDate,
            budget.operation ?? null,
          ],
        );
      }
    });
  };

  static deleteBudget = async (budgetId: string): Promise<void> => {
    const db = await LocalDB.getDB();
    await db.executeSql('DELETE FROM budget WHERE id = ?', [budgetId]);
  };

  // ── Generic read operations ──────────────────────────────

  static getData = async <T>(
    tableName: TableName,
    keyValue: string,
  ): Promise<T | undefined> => {
    const db = await LocalDB.getDB();

    const keyColumn = LocalDB.getKeyColumn(tableName);
    const [results] = await db.executeSql(
      `SELECT * FROM ${tableName} WHERE ${keyColumn} = ?`,
      [keyValue],
    );

    if (results.rows.length === 0) {
      return undefined;
    }

    return LocalDB.deserializeRow(tableName, results.rows.item(0)) as T;
  };

  static getAllData = async <T>(tableName: TableName): Promise<T[]> => {
    const db = await LocalDB.getDB();
    const [results] = await db.executeSql(`SELECT * FROM ${tableName}`);

    const items: T[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      items.push(
        LocalDB.deserializeRow(tableName, results.rows.item(i)) as T,
      );
    }
    return items;
  };

  // ── Database management ──────────────────────────────────

  static clearLocalDBData = async (): Promise<void> => {
    const db = await LocalDB.getDB();

    await db.executeSql('DELETE FROM expense');
    await db.executeSql('DELETE FROM vendorTag');
    await db.executeSql('DELETE FROM config');
    await db.executeSql('DELETE FROM budget');
  };

  // ── Private helpers ──────────────────────────────────────

  private static getKeyColumn(tableName: TableName): string {
    switch (tableName) {
      case 'expense':
        return 'mailId';
      case 'vendorTag':
        return 'vendor';
      case 'config':
        return 'key';
      case 'budget':
        return 'id';
    }
  }

  private static deserializeRow(
    tableName: TableName,
    row: Record<string, any>,
  ): Record<string, any> {
    if (tableName === 'budget' && typeof row.tagList === 'string') {
      return {
        ...row,
        tagList: JSON.parse(row.tagList),
      };
    }

    if (tableName === 'config') {
      const numVal = Number(row.value);
      if (!isNaN(numVal) && row.value !== null && row.value !== '') {
        return {...row, value: numVal};
      }
    }

    return row;
  }
}
