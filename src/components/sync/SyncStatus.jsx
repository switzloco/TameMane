import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import SyncModal from './SyncModal';

export default function SyncStatus({ onSyncStateChange }) {
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (onSyncStateChange) {
        onSyncStateChange(currentUser);
      }
    });
    return () => unsubscribe();
  }, [onSyncStateChange]);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          user
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/50 hover:border-emerald-500/50'
            : 'bg-dark-muted/10 border-dark-border text-dark-muted hover:bg-dark-muted/20 hover:text-dark-text'
        }`}
      >
        {user ? (
          <>
            <Cloud size={14} className="animate-pulse text-emerald-400" />
            <span className="hidden sm:inline">Synced</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </>
        ) : (
          <>
            <CloudOff size={14} />
            <span className="hidden sm:inline">Sync Cloud</span>
          </>
        )}
      </button>

      {isModalOpen && (
        <SyncModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          currentUser={user}
        />
      )}
    </>
  );
}
