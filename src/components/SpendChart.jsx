import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { SCHEDULE_E_CATEGORIES } from '../config/constants';
import { formatCurrency } from '../utils/formatCurrency';

export default function SpendChart({ transactions }) {
  // Aggregate transactions by Schedule E category
  const categoryTotals = {};
  
  // Initialize with zeros for active categories
  Object.keys(SCHEDULE_E_CATEGORIES).forEach(cat => {
    if (!SCHEDULE_E_CATEGORIES[cat].isIncome) {
      categoryTotals[cat] = 0;
    }
  });

  // Sum amounts
  transactions.forEach(tx => {
    if (tx.type === 'expense' && categoryTotals[tx.scheduleECategory] !== undefined) {
      categoryTotals[tx.scheduleECategory] += Number(tx.amount || 0);
    }
  });

  // Convert to array and filter out zero spend categories, sort descending
  const chartData = Object.keys(categoryTotals)
    .map(key => ({
      name: SCHEDULE_E_CATEGORIES[key].label,
      value: categoryTotals[key],
      color: SCHEDULE_E_CATEGORIES[key].color,
      slug: key
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalExpense = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-dark-card border border-dark-border text-center">
        <span className="text-sm text-slate-400">No expenses recorded yet.</span>
        <span className="text-xs text-slate-500 mt-1">Add transactions or scan a receipt to see your breakdown.</span>
      </div>
    );
  }

  // Tooltip custom renderer
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl">
          <p className="text-xs font-semibold text-slate-200">{payload[0].payload.name}</p>
          <p className="text-sm font-bold text-blue-400 mt-0.5">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {((payload[0].value / totalExpense) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 rounded-3xl bg-dark-card border border-dark-border flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400">
          Spend Breakdown
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          Total: <span className="text-white font-bold">{formatCurrency(totalExpense)}</span>
        </span>
      </div>

      {/* Chart container */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData.slice(0, 5)} // Top 5 categories for visual space
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.slice(0, 5).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* List breakdown of all categories */}
      <div className="flex flex-col gap-2.5 mt-2">
        {chartData.map((item) => {
          const percentage = ((item.value / totalExpense) * 100).toFixed(0);
          return (
            <div key={item.name} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="text-slate-400">
                  {formatCurrency(item.value)} <span className="text-slate-500 font-normal">({percentage}%)</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${percentage}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
