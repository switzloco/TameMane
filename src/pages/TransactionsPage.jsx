import React, { useState, useEffect } from 'react';
import { Plus, X, Receipt, DollarSign, TrendingDown } from 'lucide-react';
import TransactionCard from '../components/TransactionCard';
import { dbService } from '../services/dbService';
import { SCHEDULE_E_CATEGORIES } from '../config/constants';
import { formatCurrency } from '../utils/formatCurrency';

export default function TransactionsPage({ activeProperty }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [vendor, setVendor] = useState('');
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('repairs');
  const [isImprovement, setIsImprovement] = useState(false);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const loadTransactions = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const propertyTx = await dbService.getTransactions(activeProperty.id);
      setTransactions(propertyTx);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [activeProperty]);

  const handleDeleteTx = async (txId) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await dbService.deleteTransaction(txId);
      loadTransactions();
    }
  };

  const handleAddTx = async (e) => {
    e.preventDefault();
    const newTx = {
      propertyId: activeProperty.id,
      type,
      vendor,
      amount: Number(amount),
      date,
      scheduleECategory: category,
      is_improvement: isImprovement,
      description,
      paymentMethod,
      parsedByGemini: false,
    };
    await dbService.saveTransaction(newTx);
    setShowAddModal(false);
    
    // Reset Form
    setVendor('');
    setType('expense');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('repairs');
    setIsImprovement(false);
    setDescription('');
    setPaymentMethod('credit_card');
    
    loadTransactions();
  };

  const filteredTx = transactions.filter(tx => {
    if (filter === 'expense') return tx.type === 'expense';
    if (filter === 'income') return tx.type === 'income';
    return true;
  });

  const totals = filteredTx.reduce((sum, tx) => {
    return sum + (tx.type === 'expense' ? -Number(tx.amount) : Number(tx.amount));
  }, 0);

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Ledger & Taxes</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Balance: <span className={`font-semibold ${totals >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(totals)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2.5 rounded-2xl bg-blue-600 active:scale-95 transition-all text-white flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
        >
          <Plus size={18} />
          <span className="text-xs font-semibold pr-1">Add Line</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 bg-slate-900 border border-dark-border p-1 rounded-2xl">
        {['all', 'expense', 'income'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${
              filter === f 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredTx.length === 0 ? (
        <div className="p-10 rounded-3xl bg-dark-card border border-dark-border text-center flex flex-col items-center justify-center">
          <Receipt className="text-slate-600 mb-2" size={32} />
          <span className="text-sm font-semibold text-slate-300">No transactions recorded</span>
          <span className="text-xs text-slate-500 mt-1">There are no matching entries. Add one manually or scan a receipt.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredTx.map((tx) => (
            <TransactionCard 
              key={tx.id} 
              transaction={tx}
              onDelete={handleDeleteTx}
            />
          ))}
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          
          <div className="relative w-full max-w-md bg-dark-card border border-slate-700/60 rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Add Line Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTx} className="flex flex-col gap-3">
              {/* Type Switcher */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Type</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-2xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => { setType('expense'); setCategory('repairs'); }}
                    className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                      type === 'expense' 
                        ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400 shadow-md' 
                        : 'text-slate-400 border border-transparent hover:text-slate-200'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType('income'); setCategory('rental_income'); }}
                    className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                      type === 'income' 
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-md' 
                        : 'text-slate-400 border border-transparent hover:text-slate-200'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              {/* Vendor */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  {type === 'expense' ? 'Vendor / Store' : 'Source / Payee'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={type === 'expense' ? 'e.g. Ace Hardware' : 'e.g. Rent Payment'}
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Amount ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Date</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Tax Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(SCHEDULE_E_CATEGORIES)
                    .filter(([_, cat]) => type === 'expense' ? !cat.isIncome : cat.isIncome)
                    .map(([key, cat]) => (
                      <option key={key} value={key}>
                        {cat.label} {cat.line ? `(Line ${cat.line})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* CapEx Toggle (Only for expenses) */}
              {type === 'expense' && (
                <div className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-2xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-200">CapEx / Improvement</span>
                    <span className="text-[9px] text-slate-400">Adds value or extends life (depreciate instead of deduct)</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={isImprovement}
                    onChange={(e) => setIsImprovement(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Memo</label>
                <input 
                  type="text" 
                  placeholder="Additional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Payment Method */}
              {type === 'expense' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="credit_card">Credit Card</option>
                    <option value="debit">Debit Card</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                    <option value="venmo">Venmo</option>
                    <option value="zelle">Zelle</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 mt-2 text-sm font-semibold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg active:scale-95 transition-all"
              >
                Log Transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
