import React, { useState } from 'react';
import { Check, Edit2, AlertCircle } from 'lucide-react';
import { SCHEDULE_E_CATEGORIES } from '../config/constants';
import { formatCurrency } from '../utils/formatCurrency';

export default function ReceiptReviewCard({ parsedData, onSave, onCancel }) {
  const [vendor, setVendor] = useState(parsedData.vendor || '');
  const [amount, setAmount] = useState(parsedData.amount || 0);
  const [date, setDate] = useState(parsedData.date || new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(parsedData.scheduleECategory || 'other');
  const [isImprovement, setIsImprovement] = useState(parsedData.is_improvement || false);
  const [description, setDescription] = useState(parsedData.description || '');
  const [paymentMethod, setPaymentMethod] = useState(parsedData.paymentMethod || 'credit_card');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      vendor,
      amount: Number(amount),
      date,
      scheduleECategory: category,
      is_improvement: isImprovement,
      description,
      paymentMethod,
      parsedByGemini: true,
      geminiConfidence: parsedData.confidence || 1.0,
      needsReview: parsedData.needsReview || false,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-3xl bg-dark-card border border-slate-700/60 flex flex-col gap-4 animate-slide-up">
      <div className="flex items-center justify-between border-b border-dark-border pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Edit2 size={14} className="text-blue-400" />
          Review Parsed Receipt
        </h3>
        {parsedData.confidence && (
          <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-semibold">
            {Math.round(parsedData.confidence * 100)}% Confidence
          </span>
        )}
      </div>

      {parsedData.needsReview && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-start gap-2 text-xs">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Review Needed:</span> {parsedData.reviewReason || 'Some receipt fields were unclear.'}
          </div>
        </div>
      )}

      {/* Vendor */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400">Vendor</label>
        <input 
          type="text" 
          required 
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Amount and Date (side by side) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400">Total Amount ($)</label>
          <input 
            type="number" 
            step="0.01"
            required 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400">Transaction Date</label>
          <input 
            type="date" 
            required 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Schedule E Category */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400">Schedule E Tax Category</label>
        <select 
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors appearance-none"
        >
          {Object.entries(SCHEDULE_E_CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>
              {cat.label} {cat.line ? `(Line ${cat.line})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Improvement vs Repair (Toggle Button) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400">IRS Deduction Class</label>
        <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={() => setIsImprovement(false)}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              !isImprovement 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Immediate Repair (Deduction)
          </button>
          <button
            type="button"
            onClick={() => setIsImprovement(true)}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              isImprovement 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CapEx Improvement (Depreciate)
          </button>
        </div>
        <p className="text-[10px] text-slate-500 leading-normal px-1">
          {isImprovement 
            ? 'CapEx: Betterment/restoration. Added value, prolongs asset life. Subject to multi-year depreciation.'
            : 'OpEx: General repairs to maintain property state. Deductible 100% in the current tax year.'
          }
        </p>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400">Memo / Details</label>
        <input 
          type="text" 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Toilet replacement parts"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Payment Method */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400">Payment Method</label>
        <div className="flex flex-wrap gap-1.5">
          {['credit_card', 'debit', 'cash', 'zelle', 'venmo'].map(method => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                paymentMethod === method 
                  ? 'bg-slate-200 border-white text-dark-bg font-semibold' 
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              {method.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Submit / Cancel Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-2 border-t border-dark-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="py-3 text-sm font-semibold rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          Discard
        </button>
        <button
          type="submit"
          className="py-3 text-sm font-semibold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Check size={16} />
          Save Expense
        </button>
      </div>
    </form>
  );
}
