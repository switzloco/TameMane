import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, AlertCircle, Trash2, MessageSquare, Calendar, DollarSign, FileText, Check, X } from 'lucide-react';
import { RENT_REDUCTION_REASONS } from '../config/constants';
import { dbService } from '../services/dbService';
import { formatCurrency } from '../utils/formatCurrency';

export default function RentReductionPage({ activeProperty, setActiveTab, setChatInitialPrompt }) {
  const [reductions, setReductions] = useState([]);
  const [month, setMonth] = useState('');
  const [reason, setReason] = useState('repair_issue');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  // Photo capture states
  const [image, setImage] = useState(null);
  const [base64, setBase64] = useState(null);
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);

  // Generate current & past 3 months for selection
  const monthOptions = [];
  const currentDate = new Date();
  for (let i = -1; i < 4; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const value = d.toISOString().substring(0, 7); // "YYYY-MM"
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  useEffect(() => {
    // Set default month to current month
    if (monthOptions.length > 0) {
      setMonth(monthOptions[1].value); // Index 1 is current month, index 0 is next month
    }
  }, []);

  useEffect(() => {
    loadReductions();
  }, [activeProperty]);

  const loadReductions = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const data = await dbService.getRentReductions(activeProperty.id);
      // Sort by month (newest first), then by creation
      data.sort((a, b) => b.month.localeCompare(a.month) || b.createdAt.localeCompare(a.createdAt));
      setReductions(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load deductions history.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureClick = (captureEnvironment = true) => {
    if (fileInputRef.current) {
      if (captureEnvironment) {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const handleResetPhoto = () => {
    setImage(null);
    setBase64(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid deduction amount.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a short explanation for the landlord.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        propertyId: activeProperty.id,
        month,
        reason,
        deductionAmount: Number(amount),
        description: description.trim(),
        photoUrl: base64 || null,
        status: 'submitted'
      };

      const saved = await dbService.saveRentReduction(payload);
      setSuccess('Deduction request saved successfully.');
      
      // Reset form
      setAmount('');
      setDescription('');
      setImage(null);
      setBase64(null);
      
      // Reload history
      loadReductions();
    } catch (err) {
      console.error(err);
      setError('Failed to submit rent reduction request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this adjustment?')) return;
    try {
      await dbService.deleteRentReduction(id);
      loadReductions();
    } catch (err) {
      console.error(err);
      alert('Failed to delete reduction.');
    }
  };

  const handleDraftMessage = (reduction) => {
    const reasonLabel = RENT_REDUCTION_REASONS[reduction.reason]?.label || 'Adjustment';
    const monthName = new Date(reduction.month + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const prompt = `Draft an email and text message to my landlord explaining that I am adjusting my rent payment for ${monthName}. 
Deduction Amount: ${formatCurrency(reduction.deductionAmount)}
Reason for reduction: ${reasonLabel}
Details: ${reduction.description}
${reduction.photoUrl ? 'Please mention that I have attached a photo of the receipt/invoice to support this request.' : ''}`;
    
    setChatInitialPrompt(prompt);
    setActiveTab('chat');
  };

  return (
    <div className="flex flex-col gap-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Rent Adjustments</h2>
        <p className="text-xs text-slate-400 mt-0.5">Submit rent reduction reasons, bills, or outages to your landlord</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-2 text-xs">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-start gap-2 text-xs">
          <Check size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Submission Form Card */}
      <form onSubmit={handleSubmit} className="p-5 rounded-3xl bg-dark-card border border-slate-700/60 flex flex-col gap-4 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Request Rent Adjustment
        </h3>

        {/* Rent Month & Amount side-by-side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Calendar size={12} className="text-blue-400" /> Rent Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <DollarSign size={12} className="text-blue-400" /> Deduction ($)
            </label>
            <input 
              type="number" 
              step="0.01"
              required 
              placeholder="e.g. 150.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Reason Category Chips */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400">Reason Category</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(RENT_REDUCTION_REASONS).map(([key, cat]) => {
              const isSelected = reason === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setReason(key)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl text-left border transition-all truncate flex items-center justify-between ${
                    isSelected 
                      ? 'bg-slate-200 border-white text-dark-bg font-semibold' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Memo Explanation */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400">Memo / Explanation</label>
          <textarea 
            rows={3}
            required
            placeholder="e.g. Paid $150 out of pocket to repair garbage disposal. Plumber invoice attached. Deducting from current month rent."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors resize-none placeholder-slate-500 leading-relaxed"
          />
        </div>

        {/* Optional Photo Attachment */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400">Supporting Receipt / Photo (Optional)</label>
          
          {!image ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCaptureClick(true)}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors font-medium text-xs"
              >
                <Camera size={14} className="text-blue-400" />
                Snap Photo
              </button>
              <button
                type="button"
                onClick={() => handleCaptureClick(false)}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors font-medium text-xs"
              >
                <Upload size={14} className="text-indigo-400" />
                Upload File
              </button>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 h-28 flex items-center justify-center">
              <img src={image} alt="Deduction Evidence" className="h-full object-contain" />
              <button
                type="button"
                onClick={handleResetPhoto}
                className="absolute top-2 right-2 p-1.5 bg-slate-950/80 hover:bg-red-600/90 text-white rounded-full transition-all"
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 mt-1 text-sm font-semibold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Save Rent Adjustment'}
        </button>
      </form>

      {/* History Checklist */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Adjustment History
        </h3>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reductions.length === 0 ? (
          <div className="p-8 rounded-3xl bg-dark-card border border-slate-800 text-center flex flex-col items-center gap-2">
            <FileText className="text-slate-600" size={32} />
            <span className="text-xs font-semibold text-slate-400">No rent adjustments logged</span>
            <span className="text-[10px] text-slate-500 max-w-[200px]">Any deductions or maintenance bills you file will show up here.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reductions.map((reduction) => {
              const monthLabel = new Date(reduction.month + '-15').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              const reasonObj = RENT_REDUCTION_REASONS[reduction.reason] || RENT_REDUCTION_REASONS.other;
              return (
                <div 
                  key={reduction.id}
                  className="p-4 rounded-3xl bg-dark-card border border-slate-800 flex flex-col gap-3 relative hover:border-slate-700/60 transition-colors animate-slide-up"
                >
                  {/* Header: Month, Category Chip, Price */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-white tracking-wide">{monthLabel}</span>
                      <span 
                        className="px-2 py-0.5 text-[9px] font-bold rounded-full w-fit uppercase tracking-wider"
                        style={{ backgroundColor: `${reasonObj.color}15`, color: reasonObj.color, border: `1px solid ${reasonObj.color}25` }}
                      >
                        {reasonObj.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-rose-400">
                        -{formatCurrency(reduction.deductionAmount)}
                      </span>
                      <button
                        onClick={() => handleDelete(reduction.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 active:scale-95 transition-all rounded-lg"
                        title="Delete adjustment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Memo description */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-2.5 rounded-2xl border border-slate-900/50">
                    {reduction.description}
                  </p>

                  {/* Attachment Preview thumbnail & Action buttons */}
                  <div className="flex justify-between items-center gap-2 mt-1">
                    {reduction.photoUrl ? (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(reduction.photoUrl)}
                        className="h-10 w-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center hover:opacity-80 transition-all flex-shrink-0"
                      >
                        <img src={reduction.photoUrl} alt="Receipt thumbnail" className="h-full object-cover" />
                      </button>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic">No photo attached</div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDraftMessage(reduction)}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5 active:scale-95 ml-auto"
                    >
                      <MessageSquare size={12} />
                      Draft Landlord Message
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800 text-white rounded-full"
            aria-label="Close lightbox"
          >
            <X size={20} />
          </button>
          <img src={lightboxImage} alt="Receipt Fullscreen" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
