import React from 'react';
import { Package, MapPin, Trash2, Edit2, Archive } from 'lucide-react';

export default function InventoryCard({ item, onEdit, onDelete }) {
  const categoryIcons = {
    Furniture: Archive,
    Appliances: Package,
    Electronics: Package,
    Boxes: Package,
    Tools: Package,
    Other: Package
  };

  const IconComponent = categoryIcons[item.category] || Package;

  const statusColors = {
    stored: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'in-transit': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    missing: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  const statusColor = statusColors[item.status] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  const handleCardClick = (e) => {
    // Prevent edit modal if text selection is active
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      return;
    }
    onEdit(item);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="p-4 rounded-3xl border bg-dark-card border-dark-border hover:border-slate-700 hover:bg-slate-800/20 transition-all cursor-pointer flex flex-col justify-between gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Category Icon */}
        <div className="p-2 rounded-2xl bg-slate-800 text-blue-400 flex-shrink-0">
          <IconComponent size={20} />
        </div>

        {/* Item Details */}
        <div className="flex-1 min-w-0 select-text">
          <h4 className="text-sm font-semibold tracking-tight text-white truncate">
            {item.name}
          </h4>
          {item.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
                onDelete(item.id);
              }
            }}
            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-all"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Metadata Badges */}
      <div className="flex flex-wrap gap-2 items-center mt-1">
        {item.storageLocation && (
          <span className="flex items-center gap-1 text-[10px] font-semibold bg-slate-800 border border-slate-700/60 text-slate-300 px-2.5 py-0.5 rounded-full">
            <MapPin size={10} className="text-blue-400" />
            {item.storageLocation}
          </span>
        )}

        {item.category && (
          <span className="text-[10px] font-semibold bg-slate-800/50 border border-slate-700/40 text-slate-400 px-2 py-0.5 rounded-full">
            {item.category}
          </span>
        )}

        {item.status && (
          <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full capitalize ${statusColor}`}>
            {item.status.replace('-', ' ')}
          </span>
        )}
      </div>
    </div>
  );
}
