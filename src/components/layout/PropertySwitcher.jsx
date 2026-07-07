import React, { useState } from 'react';
import { Home, ChevronDown } from 'lucide-react';

export default function PropertySwitcher({ properties, activeProperty, setActiveProperty }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelect = (property) => {
    setActiveProperty(property);
    setIsOpen(false);
  };

  if (!activeProperty) return null;

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full bg-slate-800 border border-slate-700 text-slate-200 active:scale-95 transition-all"
      >
        <Home size={14} className="text-blue-400" />
        <span className="max-w-[120px] truncate">{activeProperty.name}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay to close on tap outside */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-dark-card border border-dark-border shadow-xl z-50 overflow-hidden py-1">
            {properties.map((prop) => (
              <button
                key={prop.id}
                onClick={() => handleSelect(prop)}
                className={`flex w-full items-center px-4 py-2.5 text-sm text-left transition-colors ${
                  prop.id === activeProperty.id
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex flex-col">
                  <span>{prop.name}</span>
                  {prop.monthlyRent > 0 ? (
                    <span className={`text-[10px] ${prop.id === activeProperty.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      ${prop.monthlyRent}/mo
                    </span>
                  ) : (
                    <span className={`text-[10px] ${prop.id === activeProperty.id ? 'text-blue-200' : 'text-amber-400 font-medium'}`}>
                      Vacant / Preparing
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
