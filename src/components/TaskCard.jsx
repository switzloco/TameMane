import React from 'react';
import { CheckCircle2, Circle, AlertCircle, Calendar, Trash2 } from 'lucide-react';
import { getRelativeTime, formatDate } from '../utils/dateHelpers';
import { SCHEDULE_E_CATEGORIES } from '../config/constants';

export default function TaskCard({ task, onToggleStatus, onDelete }) {
  const isCompleted = task.status === 'completed';

  const priorityColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };

  const categoryLabel = SCHEDULE_E_CATEGORIES[task.category]?.label || 'Uncategorized';

  return (
    <div className={`p-4 rounded-3xl border transition-all ${
      isCompleted 
        ? 'bg-slate-900/40 border-slate-800/80 opacity-60' 
        : 'bg-dark-card border-dark-border hover:border-slate-700'
    }`}>
      <div className="flex items-start justify-between gap-3">
        {/* Completion checkbox wrapper */}
        <button 
          onClick={() => onToggleStatus(task)}
          className="mt-0.5 text-slate-500 hover:text-blue-400 active:scale-90 transition-all flex-shrink-0"
        >
          {isCompleted ? (
            <CheckCircle2 className="text-emerald-400 fill-emerald-950" size={20} />
          ) : (
            <Circle size={20} />
          )}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold tracking-tight text-white ${isCompleted ? 'line-through text-slate-500' : ''}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Tags / Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border ${priorityColors[task.priority] || priorityColors.medium}`}>
              {task.priority}
            </span>
            
            <span className="px-2 py-0.5 text-[9px] font-semibold bg-slate-800 text-slate-300 rounded-full border border-slate-700">
              {categoryLabel}
            </span>

            {task.dueDate && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
                <Calendar size={10} />
                {getRelativeTime(task.dueDate)}
              </span>
            )}
          </div>
        </div>

        {/* Delete action */}
        <button
          onClick={() => onDelete(task.id)}
          className="text-slate-500 hover:text-red-400 p-1 rounded-xl active:scale-95 transition-all flex-shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
