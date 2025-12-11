export type AccountType = 'Bank' | 'Cash' | 'Investment' | 'CreditCard';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
}

export type TransactionType = 'Income' | 'Expense';

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO date string
  description: string;
}

export interface StockHolding {
  symbol: string; // e.g., "2330.TW", "AAPL"
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  lastUpdated?: string;
}

export interface StockUpdateResult {
  symbol: string;
  price: number;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}