import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Wallet, TrendingUp, Receipt, PieChart, Plus, Trash2, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Menu, X, ExternalLink, DollarSign, Database, AlertCircle
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';

import { db } from './services/firebase';
import { Account, Transaction, StockHolding, Category, GroundingSource } from './types';
import { CATEGORIES, INITIAL_ACCOUNTS, INITIAL_STOCKS, INITIAL_TRANSACTIONS } from './constants';
import { fetchCurrentStockPrices, generateFinancialAdvice } from './services/geminiService';

// --- Helper Components ---
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 ${className}`}>
    {children}
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  children, variant = 'primary', className = '', ...props 
}) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-transparent',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  };
  return (
    <button className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions' | 'stocks' | 'reports'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Data State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [loading, setLoading] = useState(true);

  // AI & Advice State
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [updatingStocks, setUpdatingStocks] = useState(false);
  const [stockSources, setStockSources] = useState<GroundingSource[]>([]);

  // Derived State
  const totalBalance = useMemo(() => accounts.reduce((acc, curr) => acc + curr.balance, 0), [accounts]);
  const stockPortfolioValue = useMemo(() => stocks.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0), [stocks]);
  const netWorth = totalBalance + stockPortfolioValue;

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Unknown Account';

  // --- Firebase Subscriptions / Local Init ---

  useEffect(() => {
    if (!db) {
      // Fallback to Demo Mode if DB is not configured
      setIsDemoMode(true);
      setAccounts(INITIAL_ACCOUNTS);
      setTransactions(INITIAL_TRANSACTIONS);
      setStocks(INITIAL_STOCKS);
      setLoading(false);
      return;
    }

    // 1. Listen to Accounts
    const unsubAccounts = onSnapshot(collection(db, "accounts"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      setAccounts(data);
    });

    // 2. Listen to Transactions (Ordered by date)
    const qTransactions = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    });

    // 3. Listen to Stocks
    const unsubStocks = onSnapshot(collection(db, "stocks"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ symbol: doc.id, ...doc.data() } as StockHolding));
      setStocks(data);
      setLoading(false);
    });

    return () => {
      unsubAccounts();
      unsubTransactions();
      unsubStocks();
    };
  }, []);

  // --- Actions ---

  const addAccount = async () => {
    const name = prompt("Account Name:");
    const balance = Number(prompt("Initial Balance:", "0"));
    if (name && !isNaN(balance)) {
      if (isDemoMode) {
         setAccounts([...accounts, { id: Math.random().toString(), name, balance, type: 'Bank', currency: 'TWD' }]);
         return;
      }
      if (db) {
        await addDoc(collection(db, "accounts"), {
            name,
            balance,
            type: 'Bank',
            currency: 'TWD'
        });
      }
    }
  };

  const deleteAccount = async (id: string) => {
    if (confirm("Delete this account?")) {
      if (isDemoMode) {
          setAccounts(accounts.filter(a => a.id !== id));
          return;
      }
      if(db) await deleteDoc(doc(db, "accounts", id));
    }
  };

  const addStock = async () => {
    const symbol = prompt("Stock Symbol (e.g., 2330.TW):");
    const qty = Number(prompt("Quantity:", "0"));
    const cost = Number(prompt("Average Cost:", "0"));
    if(symbol && qty && cost) {
      if (isDemoMode) {
          setStocks([...stocks, { symbol, name: symbol, quantity: qty, averageCost: cost, currentPrice: cost, lastUpdated: new Date().toISOString() }]);
          return;
      }
      if (db) {
        await addDoc(collection(db, "stocks"), { 
            symbol, 
            name: symbol, 
            quantity: qty, 
            averageCost: cost, 
            currentPrice: cost,
            lastUpdated: new Date().toISOString()
        });
      }
    }
  };

  const deleteStock = async (id: string) => {
    if(confirm("Remove this holding?")) {
        if (isDemoMode) {
            setStocks(stocks.filter(s => s.symbol !== id));
            return;
        }
        if (db) await deleteDoc(doc(db, "stocks", id));
    }
  };

  const handleUpdateStocks = async () => {
    setUpdatingStocks(true);
    setStockSources([]);
    try {
      const symbols = stocks.map(s => s.symbol);
      const { prices, sources } = await fetchCurrentStockPrices(symbols);
      
      if (prices.length > 0) {
        if (isDemoMode) {
             const newStocks = stocks.map(s => {
                 const p = prices.find(x => x.symbol === s.symbol);
                 return p ? { ...s, currentPrice: p.price, lastUpdated: new Date().toISOString() } : s;
             });
             setStocks(newStocks);
        } else if (db) {
            for (const stock of stocks) {
                const update = prices.find(p => p.symbol.toLowerCase() === stock.symbol.toLowerCase() || p.symbol.includes(stock.symbol));
                if (update) {
                    try {
                        await updateDoc(doc(db, "stocks", stock.symbol), {
                            currentPrice: update.price,
                            lastUpdated: new Date().toISOString()
                        });
                    } catch(e) { console.log("Update failed (likely due to demo/ID mismatch)"); }
                }
            }
        }
      }
      setStockSources(sources);
    } catch (err) {
      alert("Failed to update stock prices via AI. " + (isDemoMode ? "(Check Console for Details)" : ""));
    } finally {
      setUpdatingStocks(false);
    }
  };

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    try {
        const summary = `Total Net Worth: ${netWorth}. Cash: ${totalBalance}. Stocks: ${stockPortfolioValue}. Top expense: ${transactions.find(t=>t.type==='Expense')?.category || 'None'}.`;
        const result = await generateFinancialAdvice(summary);
        setAdvice(result);
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingAdvice(false);
    }
  };

  // --- Transaction Logic ---
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'Expense', date: new Date().toISOString().split('T')[0] });

  const handleSaveTransaction = async () => {
    if (newTx.amount && newTx.accountId && newTx.category) {
        const amount = Number(newTx.amount);
        const txData = {
            id: Math.random().toString(), // Temp ID for demo
            accountId: newTx.accountId,
            amount: amount,
            type: newTx.type!,
            category: newTx.category,
            date: newTx.date || new Date().toISOString(),
            description: newTx.description || '',
        };

        if (isDemoMode) {
            setTransactions([txData as Transaction, ...transactions]);
            // Update Balance locally
            const accIndex = accounts.findIndex(a => a.id === newTx.accountId);
            if(accIndex >= 0) {
                const newAccs = [...accounts];
                newAccs[accIndex].balance += (newTx.type === 'Income' ? amount : -amount);
                setAccounts(newAccs);
            }
        } else if (db) {
             await addDoc(collection(db, "transactions"), { ...txData, id: undefined }); // Firestore auto-id
             // Note: Balance update in Firestore should use a Transaction/Batch ideally, keeping it simple here
             const account = accounts.find(a => a.id === newTx.accountId);
             if (account) {
                 const newBalance = account.balance + (newTx.type === 'Income' ? amount : -amount);
                 await updateDoc(doc(db, "accounts", account.id), { balance: newBalance });
             }
        }

        setTxModalOpen(false);
        setNewTx({ type: 'Expense', date: new Date().toISOString().split('T')[0] });
    }
  };

  const deleteTransaction = async (t: Transaction) => {
      if(confirm('Delete transaction? Balance will be reverted.')) {
        if (isDemoMode) {
             setTransactions(transactions.filter(tr => tr.id !== t.id));
             // Revert
             const accIndex = accounts.findIndex(a => a.id === t.accountId);
             if(accIndex >= 0) {
                 const newAccs = [...accounts];
                 newAccs[accIndex].balance -= (t.type === 'Income' ? t.amount : -t.amount);
                 setAccounts(newAccs);
             }
             return;
        }

        if (db) {
            await deleteDoc(doc(db, "transactions", t.id));
            const account = accounts.find(a => a.id === t.accountId);
            if (account) {
                const revertedBalance = account.balance - (t.type === 'Income' ? t.amount : -t.amount);
                await updateDoc(doc(db, "accounts", account.id), { balance: revertedBalance });
            }
        }
      }
  };

  // --- Render Functions ---

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none">
          <h3 className="text-emerald-100 font-medium text-sm">Net Worth</h3>
          <div className="mt-2 text-3xl font-bold">NT$ {netWorth.toLocaleString()}</div>
          <div className="mt-4 flex items-center text-emerald-100 text-sm gap-1">
             {isDemoMode ? 
                <><AlertCircle size={16} /> <span>Demo Mode (Local Data)</span></> : 
                (loading ? <span className="animate-pulse">Loading...</span> : <><TrendingUp size={16} /> <span>Live from Firebase</span></>)
             }
          </div>
        </Card>
        <Card>
          <h3 className="text-slate-500 font-medium text-sm">Cash Balance</h3>
          <div className="mt-2 text-2xl font-bold text-slate-800">NT$ {totalBalance.toLocaleString()}</div>
        </Card>
        <Card>
          <h3 className="text-slate-500 font-medium text-sm">Stock Portfolio</h3>
          <div className="mt-2 text-2xl font-bold text-slate-800">NT$ {stockPortfolioValue.toLocaleString()}</div>
        </Card>
      </div>

       <Card className="bg-indigo-50 border-indigo-100">
         <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2 text-indigo-800 font-semibold">
                <TrendingUp size={20} />
                <h3>AI Financial Insight</h3>
            </div>
            <Button variant="ghost" className="text-indigo-600 bg-white hover:bg-indigo-100 text-xs py-1 h-8" onClick={handleGetAdvice} disabled={loadingAdvice}>
                {loadingAdvice ? 'Analyzing...' : 'Refresh Advice'}
            </Button>
         </div>
         <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {advice || "Click 'Refresh Advice' for AI analysis."}
         </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800">Recent Transactions</h3>
            <button onClick={() => setActiveTab('transactions')} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View All</button>
          </div>
          <div className="space-y-4">
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {t.type === 'Income' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{t.category}</div>
                    <div className="text-xs text-slate-500">{t.description} • {t.date}</div>
                  </div>
                </div>
                <div className={`font-semibold ${t.type === 'Income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {t.type === 'Income' ? '+' : '-'} NT${t.amount.toLocaleString()}
                </div>
              </div>
            ))}
            {transactions.length === 0 && <div className="text-center text-slate-400 py-4">No transactions recorded.</div>}
          </div>
        </Card>
         <Card className="flex flex-col">
            <h3 className="font-semibold text-slate-800 mb-4">Expense Structure</h3>
            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                        <Pie
                            data={Object.entries(transactions.filter(t => t.type === 'Expense').reduce((acc, t) => {
                                acc[t.category] = (acc[t.category] || 0) + t.amount;
                                return acc;
                            }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                             {[...Array(10)].map((_, index) => (
                                <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                            ))}
                        </Pie>
                        <ReTooltip />
                    </RePieChart>
                </ResponsiveContainer>
            </div>
        </Card>
      </div>
    </div>
  );

  const renderAccounts = () => (
     <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">My Accounts</h2>
            <Button onClick={addAccount}>
                <Plus size={18} /> Add Account
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(acc => (
                <Card key={acc.id} className="hover:shadow-md transition-shadow relative group">
                    <div className="flex justify-between items-start">
                        <div className="bg-slate-100 p-3 rounded-xl text-slate-600">
                            <Wallet size={24} />
                        </div>
                         <button 
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteAccount(acc.id)}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    <div className="mt-4">
                        <div className="text-sm text-slate-500">{acc.type}</div>
                        <div className="text-xl font-bold text-slate-800">{acc.name}</div>
                        <div className="mt-2 text-2xl font-bold text-emerald-600">NT$ {acc.balance.toLocaleString()}</div>
                    </div>
                </Card>
            ))}
        </div>
    </div>
  );

  const renderStocks = () => (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Investment Portfolio</h2>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={handleUpdateStocks} disabled={updatingStocks}>
                    <RefreshCw size={18} className={updatingStocks ? 'animate-spin' : ''} />
                    {updatingStocks ? 'Updating...' : 'Update Prices (AI)'}
                </Button>
                <Button onClick={async () => {
                     await addStock();
                }}>
                    <Plus size={18} /> Add Holding
                </Button>
            </div>
        </div>
        
        {stockSources.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
             Sources: {stockSources.map(s => s.title).join(", ")}
          </div>
        )}

        <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="p-4 text-slate-600">Symbol</th>
                            <th className="p-4 text-right text-slate-600">Qty</th>
                            <th className="p-4 text-right text-slate-600">Price</th>
                            <th className="p-4 text-right text-slate-600">Value</th>
                            <th className="p-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stocks.map((stock, idx) => {
                            const marketValue = stock.quantity * stock.currentPrice;
                            return (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-800">{stock.symbol}</td> 
                                    <td className="p-4 text-right text-slate-600">{stock.quantity}</td>
                                    <td className="p-4 text-right font-medium text-slate-800">{stock.currentPrice}</td>
                                    <td className="p-4 text-right font-medium text-slate-800">{marketValue.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <button className="text-slate-400 hover:text-red-500" onClick={() => deleteStock(stock.symbol)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
      </div>
  );

  const renderTransactions = () => (
     <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Transactions</h2>
            <Button onClick={() => setTxModalOpen(true)}>
                <Plus size={18} /> Add Record
            </Button>
        </div>
        <Card className="overflow-hidden p-0">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="p-4 text-slate-600">Date</th>
                            <th className="p-4 text-slate-600">Category</th>
                            <th className="p-4 text-slate-600">Account</th>
                            <th className="p-4 text-right text-slate-600">Amount</th>
                            <th className="p-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-600">{t.date}</td>
                                <td className="p-4">{t.category}</td>
                                <td className="p-4 text-slate-600">{getAccountName(t.accountId)}</td>
                                <td className={`p-4 text-right font-medium ${t.type === 'Income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                    {t.type === 'Income' ? '+' : '-'} {t.amount.toLocaleString()}
                                </td>
                                <td className="p-4 text-center">
                                    <button className="text-slate-400 hover:text-red-500" onClick={() => deleteTransaction(t)}>
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
        {/* Reuse the Modal from previous code, passing handlers */}
        <Modal isOpen={txModalOpen} onClose={() => setTxModalOpen(false)} title="Add Transaction">
            <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                    {['Expense', 'Income'].map(type => (
                        <button
                            key={type}
                            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${newTx.type === type ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setNewTx({ ...newTx, type: type as any })}
                        >
                            {type}
                        </button>
                    ))}
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
                    <select 
                        className="w-full border border-slate-300 rounded-lg p-2.5"
                        value={newTx.accountId || ''}
                        onChange={e => setNewTx({...newTx, accountId: e.target.value})}
                    >
                        <option value="">Select Account</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (NT${a.balance})</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                    <input type="number" className="w-full border border-slate-300 rounded-lg p-2.5" value={newTx.amount || ''} onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})} placeholder="Amount" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                     <select className="w-full border border-slate-300 rounded-lg p-2.5" value={newTx.category || ''} onChange={e => setNewTx({...newTx, category: e.target.value})}>
                        <option value="">Category</option>
                        {CATEGORIES.filter(c => c.type === newTx.type).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <Button className="w-full" onClick={handleSaveTransaction}>Save Record</Button>
            </div>
        </Modal>
     </div>
  );
  
  const renderReports = () => {
    const incomeData = transactions.filter(t => t.type === 'Income');
    const expenseData = transactions.filter(t => t.type === 'Expense');
    const summaryData = [
        { name: 'Income', value: incomeData.reduce((sum, t) => sum + t.amount, 0) },
        { name: 'Expense', value: expenseData.reduce((sum, t) => sum + t.amount, 0) },
    ];
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Financial Reports</h2>
            <Card>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ReTooltip />
                        <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                    </ResponsiveContainer>
                 </div>
            </Card>
        </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <Database className="text-emerald-500" size={20} />
            <span className="font-bold text-xl">WealthFlow</span>
        </div>
        <nav className="p-4 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'accounts', icon: Wallet, label: 'Accounts' },
            { id: 'transactions', icon: Receipt, label: 'Transactions' },
            { id: 'stocks', icon: TrendingUp, label: 'Investments' },
            { id: 'reports', icon: PieChart, label: 'Reports' },
          ].map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${activeTab === item.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto h-screen">
        <header className="bg-white border-b border-slate-100 sticky top-0 z-10 px-6 py-4 flex items-center justify-between lg:justify-end">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-500"><Menu size={24} /></button>
            <div className="font-medium text-slate-800 flex items-center gap-2">
                {isDemoMode && <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-bold">DEMO MODE</span>}
                {db ? "Connected to Firebase" : "Local Data Only"}
            </div>
        </header>
        <div className="p-6 max-w-7xl mx-auto">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'accounts' && renderAccounts()}
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'stocks' && renderStocks()}
            {activeTab === 'reports' && renderReports()}
        </div>
      </main>
    </div>
  );
}