export interface Expense {
  id: string;
  tag?: string;
  mailId: string;
  cost: number;
  costType: 'credit' | 'debit';
  date: number;
  modifiedDate: number;
  user: string;
  type: string;
  vendor: string;
  operation: string;
}

export interface VendorTag {
  id: string;
  vendor: string;
  tag: string;
  date: number;
}

export interface Alert {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface BankConfig {
  enableUpi: boolean;
  creditCards: string[];
}

export interface BankEmailParsingEntry {
  id: string;
  displayName: string;
  matchStrings: string[];
}

export interface Config {
  key: string;
  value: string | number;
}

export interface AppConfig {
  darkMode: boolean;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  tagList: string[];
  modifiedDate: number;
  operation?: string;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface MonthYear {
  month: number;
  year: number;
  label: string;
  value: string;
}
