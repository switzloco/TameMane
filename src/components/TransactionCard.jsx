import React, { useState } from 'react';
import { DollarSign, FileText, CheckCircle, AlertTriangle, Trash2, Receipt } from 'lucide-react';
import { SCHEDULE_E_CATEGORIES } from '../config/constants';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/dateHelpers';

export default function TransactionCard({ transaction, onDelete }) {
  const [showReceipt, setShowReceipt] = useState(false);
  const isExpense = transaction.type === 'expense';
  const category = SCHEDULE_E_CATEGORIES[transaction.scheduleECategory];
  const categoryLabel = category?.label || 'Uncategorized';
  const irsLine = category?.line ? `Line ${category.line}` : '';

  return (
    <div className="p-4 rounded-3xl bg-dark-card border border-dark-border hover:border-slate-700 transition-all flex items-start justify-between gap-3">
      {/* Icon Indicator */}
      <div className={`p-2.5 rounded-2xl border flex-shrink-0 ${
        isExpense 
          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      }`}>
        <DollarSign size={18} />
      </div>

      {/* Transaction Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-sm font-semibold tracking-tight text-white truncate">
            {transaction.vendor || 'Unknown Vendor'}
          </h4>
          <span className={`text-sm font-bold ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
          </span>
        </div>

        {transaction.description && (
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
            {transaction.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-[10px] text-slate-400">
            {formatDate(transaction.date)}
          </span>

          <span 
            className="px-2 py-0.5 text-[9px] font-semibold rounded-full border" 
            style={{ 
              backgroundColor: `${category?.color || '#374151'}15`, 
              borderColor: `${category?.color || '#374151'}30`,
              color: category?.color || '#9ca3af'
            }}
          >
            {categoryLabel} {irsLine && `(${irsLine})`}
          </span>

          {transaction.is_improvement && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full uppercase tracking-wider">
              CapEx / Improvement
            </span>
          )}

          {transaction.needsReview && (
            <span className="px-2 py-0.5 text-[9px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
              <AlertTriangle size={8} /> Needs Review
            </span>
          )}

          {transaction.receiptUrl && (
            <button
              type="button"
              onClick={() => setShowReceipt(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/20 transition-colors"
            >
              <Receipt size={10} /> Receipt
            </button>
          )}
        </div>
      </div>

      {/* Delete action */}
      <button
        onClick={() => onDelete(transaction.id)}
        className="text-slate-500 hover:text-red-400 p-1 rounded-xl active:scale-95 transition-all flex-shrink-0 align-middle self-center"
      >
        <Trash2 size={16} />
      </button>

      {/* Receipt Lightbox */}
      {showReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowReceipt(false)}
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <img
            src={transaction.receiptUrl}
            alt="Receipt"
            className="relative z-10 max-w-full max-h-[85vh] rounded-2xl border border-slate-700 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
