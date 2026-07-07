import React from 'react';

export default function KPICard({ title, value, subtext, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
    amber: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
    green: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    rose: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400',
  };

  return (
    <div className={`p-4 rounded-3xl bg-gradient-to-br border glass-panel flex items-center justify-between ${colorMap[color] || colorMap.blue}`}>
      <div className="flex flex-col justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <span className="text-2xl font-bold mt-1 text-white">
          {value}
        </span>
        {subtext && (
          <span className="text-[10px] text-slate-400 mt-1">
            {subtext}
          </span>
        )}
      </div>
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
        <Icon size={24} />
      </div>
    </div>
  );
}
