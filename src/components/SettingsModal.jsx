import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, RotateCcw } from 'lucide-react';
import { getRetailers, saveRetailers, DEFAULT_RETAILERS } from '../config/retailers';

export default function SettingsModal({ isOpen, onClose }) {
  const [retailers, setRetailers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRetailers(getRetailers());
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (id) => {
    const updated = retailers.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setRetailers(updated);
    saveRetailers(updated);
  };

  const handleUrlChange = (id, newUrl) => {
    const updated = retailers.map(r => r.id === id ? { ...r, url: newUrl } : r);
    setRetailers(updated);
    saveRetailers(updated);
  };

  const handleAddRetailer = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) {
      setError('Please fill in both fields.');
      return;
    }
    if (!newUrl.includes('http://') && !newUrl.includes('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    const id = `custom_${Date.now()}`;
    const updated = [...retailers, { id, name: newName.trim(), url: newUrl.trim(), active: true }];
    setRetailers(updated);
    saveRetailers(updated);
    setNewName('');
    setNewUrl('');
    setError('');
  };

  const handleDelete = (id) => {
    const updated = retailers.filter(r => r.id !== id);
    setRetailers(updated);
    saveRetailers(updated);
  };

  const handleReset = () => {
    if (confirm('Reset all retailers to defaults?')) {
      setRetailers(DEFAULT_RETAILERS);
      saveRetailers(DEFAULT_RETAILERS);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-dark-card border border-slate-700/60 rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-slide-up flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-border pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Retail Search Links</h4>
            <button 
              onClick={handleReset} 
              className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-slate-300 font-semibold"
              title="Reset to defaults"
            >
              <RotateCcw size={10} />
              Reset defaults
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            Configure the stores search links generated during task research. Use a placeholder query or leave search term URL open at the end (e.g. <code>https://example.com/search?q=</code>).
          </p>

          {/* List of Retailers */}
          <div className="flex flex-col gap-2.5 max-h-[30vh] overflow-y-auto pr-1">
            {retailers.map((retailer) => (
              <div 
                key={retailer.id} 
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{retailer.name}</span>
                  <div className="flex items-center gap-2">
                    {/* Toggle Switch */}
                    <button 
                      onClick={() => handleToggle(retailer.id)}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        retailer.active ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 transform ${
                        retailer.active ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                    {/* Delete button (only for custom ones) */}
                    {retailer.id.startsWith('custom_') && (
                      <button 
                        onClick={() => handleDelete(retailer.id)}
                        className="text-slate-500 hover:text-red-400 p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <input 
                  type="text" 
                  value={retailer.url} 
                  onChange={(e) => handleUrlChange(retailer.id, e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700/60 rounded-xl text-[10px] text-slate-300 focus:border-blue-500/50 focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* Add Custom Retailer */}
          <form onSubmit={handleAddRetailer} className="border-t border-dark-border pt-4 flex flex-col gap-2.5">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Add Custom Store</h5>
            {error && <span className="text-[10px] text-red-400 font-semibold">{error}</span>}
            <div className="grid grid-cols-3 gap-2">
              <input 
                type="text" 
                placeholder="Name" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-blue-500/50 focus:outline-none"
              />
              <input 
                type="text" 
                placeholder="Search URL" 
                value={newUrl} 
                onChange={(e) => setNewUrl(e.target.value)}
                className="col-span-2 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <button 
              type="submit" 
              className="py-2 text-xs font-semibold rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              Add Store
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
