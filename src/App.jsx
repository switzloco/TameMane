import React, { useState, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import TransactionsPage from './pages/TransactionsPage';
import ReceiptCapturePage from './pages/ReceiptCapturePage';
import ChatPage from './pages/ChatPage';
import { dbService } from './services/dbService';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [properties, setProperties] = useState([]);
  const [activeProperty, setActiveProperty] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [authTrigger, setAuthTrigger] = useState(0);

  // Listen to auth state changes to reload data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthTrigger(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadProperties() {
      try {
        const props = await dbService.getProperties();
        setProperties(props);
        if (props.length > 0) {
          // Default to Quinto Way or first prop
          const defaultProp = props.find(p => p.id === '3060_quinto') || props[0];
          setActiveProperty(defaultProp);
        } else {
          setActiveProperty(null);
        }
      } catch (err) {
        console.error('Error loading properties:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProperties();
  }, [authTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render correct page based on bottom nav selection
  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage activeProperty={activeProperty} setActiveTab={setActiveTab} />;
      case 'tasks':
        return <TasksPage activeProperty={activeProperty} />;
      case 'receipts':
        return <ReceiptCapturePage activeProperty={activeProperty} setActiveTab={setActiveTab} />;
      case 'chat':
        return <ChatPage activeProperty={activeProperty} />;
      case 'ledger':
        return <TransactionsPage activeProperty={activeProperty} />;
      default:
        return <DashboardPage activeProperty={activeProperty} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      properties={properties}
      activeProperty={activeProperty}
      setActiveProperty={setActiveProperty}
    >
      {renderPage()}
    </AppShell>
  );
}
