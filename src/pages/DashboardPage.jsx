import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  TrendingUp, 
  DollarSign,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import KPICard from '../components/KPICard';
import SpendChart from '../components/SpendChart';
import { dbService } from '../services/dbService';
import { formatCurrency } from '../utils/formatCurrency';

export default function DashboardPage({ activeProperty, setActiveTab }) {
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!activeProperty) return;
      setLoading(true);
      try {
        const [propertyTasks, propertyTx] = await Promise.all([
          dbService.getTasks(activeProperty.id),
          dbService.getTransactions(activeProperty.id),
        ]);
        setTasks(propertyTasks);
        setTransactions(propertyTx);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeProperty]);

  // Compute stats
  const openTasks = tasks.filter(t => t.status !== 'completed');
  const criticalTasks = openTasks.filter(t => t.priority === 'critical' || t.priority === 'high');
  
  // MTD and YTD calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const expenses = transactions.filter(tx => tx.type === 'expense');
  
  const mtdSpend = expenses
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const ytdSpend = expenses
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === currentYear;
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Welcome / Context */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Overview</h2>
        <p className="text-xs text-slate-400 mt-0.5">Real-time status for {activeProperty.name}</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard 
          title="MTD Expenses"
          value={formatCurrency(mtdSpend)}
          subtext="This month"
          icon={TrendingUp}
          color="rose"
        />
        <KPICard 
          title="Open Tasks"
          value={openTasks.length}
          subtext={`${criticalTasks.length} urgent`}
          icon={CheckSquare}
          color={criticalTasks.length > 0 ? 'amber' : 'blue'}
        />
        <KPICard 
          title="YTD Expenses"
          value={formatCurrency(ytdSpend)}
          subtext="Calendar year"
          icon={DollarSign}
          color="rose"
        />
        <KPICard 
          title="Income Collected"
          value={activeProperty.monthlyRent > 0 ? formatCurrency(activeProperty.monthlyRent) : '$0.00'}
          subtext={activeProperty.status === 'vacant' ? 'Vacant' : 'Target rent'}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Recharts Chart */}
      <SpendChart transactions={transactions} />

      {/* Urgent Tasks Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Urgent Tasks ({openTasks.length})
          </h3>
          <button 
            onClick={() => setActiveTab('tasks')}
            className="text-xs text-blue-400 font-semibold flex items-center gap-1 active:scale-95 transition-all"
          >
            Manage <ArrowRight size={12} />
          </button>
        </div>

        {openTasks.length === 0 ? (
          <div className="p-5 rounded-3xl bg-dark-card border border-dark-border text-center flex flex-col items-center justify-center">
            <ClipboardList className="text-slate-600 mb-1" size={24} />
            <span className="text-xs text-slate-400 font-medium">All caught up!</span>
            <span className="text-[10px] text-slate-500 mt-0.5">No open maintenance issues for this property.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {openTasks.slice(0, 3).map((task) => (
              <div 
                key={task.id}
                onClick={() => setActiveTab('tasks')}
                className="p-3 bg-dark-card border border-dark-border rounded-2xl flex items-center justify-between cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">{task.title}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{task.description || 'No description'}</span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border uppercase ${
                  task.priority === 'critical' || task.priority === 'high'
                    ? 'text-red-400 border-red-500/20 bg-red-500/10'
                    : 'text-slate-400 border-slate-700 bg-slate-800'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
