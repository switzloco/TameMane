import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Camera, 
  MessageSquare, 
  DollarSign,
  FileText,
  Settings
} from 'lucide-react';
import PropertySwitcher from './PropertySwitcher';
import SyncStatus from '../sync/SyncStatus';
import SettingsModal from '../SettingsModal';

export default function AppShell({ 
  children, 
  activeTab, 
  setActiveTab, 
  properties, 
  activeProperty, 
  setActiveProperty 
}) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const isRenter = activeProperty?.userRole === 'renter';
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'receipts', label: isRenter ? 'Adjustments' : 'Receipts', icon: isRenter ? FileText : Camera },
    { id: 'chat', label: 'PM Chat', icon: MessageSquare },
    { id: 'ledger', label: 'Ledger', icon: DollarSign },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-dark-bg text-dark-text select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-dark-border glass-panel">
        <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
          TameMane
        </h1>
        <div className="flex items-center gap-2">
          <SyncStatus />
          <PropertySwitcher 
            properties={properties} 
            activeProperty={activeProperty} 
            setActiveProperty={setActiveProperty} 
          />
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl active:scale-95 transition-all flex items-center justify-center"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 overflow-y-auto px-4 py-4 animate-slide-up">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-dark-border glass-panel pb-safe">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center w-16 h-12 transition-all rounded-lg ${
                  isActive 
                    ? 'text-blue-400 scale-105 font-medium' 
                    : 'text-dark-muted hover:text-dark-text'
                }`}
              >
                <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className="text-[10px] mt-1 tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />
    </div>
  );
}
