import { Account, Transaction, StockHolding, Category } from './types';

export const INITIAL_ACCOUNTS: Account[] = [
  { id: '1', name: '中國信託 (CTBC) Main', type: 'Bank', balance: 150000, currency: 'TWD' },
  { id: '2', name: '國泰世華 (Cathay)', type: 'Bank', balance: 45000, currency: 'TWD' },
  { id: '3', name: 'Wallet Cash', type: 'Cash', balance: 3200, currency: 'TWD' },
];

export const INITIAL_STOCKS: StockHolding[] = [
  { symbol: '2330.TW', name: 'TSMC', quantity: 1000, averageCost: 500, currentPrice: 980, lastUpdated: new Date().toISOString() },
  { symbol: '0050.TW', name: 'Yuanta Taiwan 50', quantity: 2000, averageCost: 120, currentPrice: 185, lastUpdated: new Date().toISOString() },
  { symbol: 'AAPL', name: 'Apple Inc.', quantity: 10, averageCost: 150, currentPrice: 220, lastUpdated: new Date().toISOString() },
  { symbol: 'NVDA', name: 'NVIDIA', quantity: 5, averageCost: 400, currentPrice: 900, lastUpdated: new Date().toISOString() },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', accountId: '1', amount: 50000, type: 'Income', category: 'Salary', date: '2023-10-05', description: 'October Salary' },
  { id: 't2', accountId: '2', amount: 2500, type: 'Expense', category: 'Food', date: '2023-10-06', description: 'Dinner with friends' },
  { id: 't3', accountId: '1', amount: 1200, type: 'Expense', category: 'Transport', date: '2023-10-07', description: 'High Speed Rail' },
  { id: 't4', accountId: '3', amount: 300, type: 'Expense', category: 'Entertainment', date: '2023-10-08', description: 'Movie ticket' },
  { id: 't5', accountId: '1', amount: 15000, type: 'Expense', category: 'Rent', date: '2023-10-01', description: 'Monthly Rent' },
];

export const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Salary', type: 'Income' },
  { id: 'c2', name: 'Investment', type: 'Income' },
  { id: 'c3', name: 'Bonus', type: 'Income' },
  { id: 'c4', name: 'Food', type: 'Expense' },
  { id: 'c5', name: 'Transport', type: 'Expense' },
  { id: 'c6', name: 'Housing', type: 'Expense' },
  { id: 'c7', name: 'Entertainment', type: 'Expense' },
  { id: 'c8', name: 'Shopping', type: 'Expense' },
  { id: 'c9', name: 'Utilities', type: 'Expense' },
];