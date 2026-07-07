import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { parseReceipt } from '../services/visionAgent';
import { dbService } from '../services/dbService';
import ReceiptReviewCard from '../components/ReceiptReviewCard';

export default function ReceiptCapturePage({ activeProperty, setActiveTab }) {
  const [image, setImage] = useState(null);
  const [base64, setBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setParsedData(null);

    // Render Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleParseReceipt = async () => {
    if (!base64) return;
    setLoading(true);
    setError(null);
    try {
      const data = await parseReceipt(base64, activeProperty.id, activeProperty.name);
      setParsedData(data);
    } catch (err) {
      console.error(err);
      setError('Gemini was unable to read the receipt. Please try another photo or enter manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReceipt = async (transactionData) => {
    try {
      const fullTransaction = {
        ...transactionData,
        propertyId: activeProperty.id,
        // In Phase 1 local-first, we store the receipt image in the transaction locally
        receiptUrl: base64, 
      };
      await dbService.saveTransaction(fullTransaction);
      
      // Clean up states and route to Ledger
      setImage(null);
      setBase64(null);
      setParsedData(null);
      setActiveTab('ledger');
    } catch (err) {
      console.error(err);
      setError('Failed to save transaction.');
    }
  };

  const handleReset = () => {
    setImage(null);
    setBase64(null);
    setParsedData(null);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Receipt Scan</h2>
        <p className="text-xs text-slate-400 mt-0.5">Parse tax details instantly using Gemini 2.5 Pro</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-2 text-xs">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden File Input (supports camera capture on mobile) */}
      <input 
        type="file" 
        accept="image/*"
        capture="environment" // Forces rear-camera on iOS/Android
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* State Machine UI */}
      {!image && !loading && !parsedData && (
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleCaptureClick}
            className="flex flex-col items-center justify-center gap-3 p-12 rounded-3xl bg-slate-900 border-2 border-dashed border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 text-blue-400">
              <Camera size={32} />
            </div>
            <span className="text-sm font-semibold">Snap Receipt Photo</span>
            <span className="text-xs text-slate-500">Opens phone camera directly</span>
          </button>

          <button
            onClick={() => {
              if (fileInputRef.current) {
                // Temporarily disable capture parameter to allow library select
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
                // Restore capture for next time
                setTimeout(() => fileInputRef.current.setAttribute('capture', 'environment'), 1000);
              }
            }}
            className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-dark-card border border-dark-border text-slate-300 font-semibold text-sm active:scale-98 transition-all"
          >
            <Upload size={16} />
            Upload from Photo Library
          </button>
        </div>
      )}

      {/* Preview / Process State */}
      {image && !parsedData && (
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[3/4] w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
            <img src={image} alt="Receipt Preview" className="w-full h-full object-contain" />
            
            {loading && (
              <div className="absolute inset-0 bg-dark-bg/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-4">
                <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl animate-bounce">
                  <Sparkles size={24} />
                </div>
                <h4 className="text-sm font-bold text-white tracking-wide">Gemini 2.5 Pro Parsing...</h4>
                <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                  Extracting vendor, amount, Schedule E line, and CapEx classification.
                </p>
                <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-blue-500 rounded-full w-2/3 animate-[pulse_1.5s_infinite]"></div>
                </div>
              </div>
            )}
          </div>

          {!loading && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReset}
                className="py-3 text-sm font-semibold bg-slate-800 text-slate-300 border border-slate-700 rounded-2xl active:scale-95 transition-all"
              >
                Retake
              </button>
              <button
                onClick={handleParseReceipt}
                className="py-3 text-sm font-semibold bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                Scan Expense
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Fields State */}
      {parsedData && !loading && (
        <ReceiptReviewCard 
          parsedData={parsedData}
          onSave={handleSaveReceipt}
          onCancel={handleReset}
        />
      )}
    </div>
  );
}
