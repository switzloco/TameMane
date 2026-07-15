import React, { useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, Calendar, Trash2, Edit2, Lock, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { getRelativeTime, formatDate } from '../utils/dateHelpers';
import { SCHEDULE_E_CATEGORIES } from '../config/constants';
import { researchTask } from '../services/pmAgent';
import { dbService } from '../services/dbService';
import { notifyResearchReady } from '../services/notificationService';

export default function TaskCard({ task, allTasks = [], activeProperty, onToggleStatus, onEdit, onDelete }) {
  const isCompleted = task.status === 'completed';

  // Find any active blockers
  const activeBlockers = (task.blockedBy || [])
    .map(blockerId => allTasks.find(t => t.id === blockerId))
    .filter(t => t && t.status !== 'completed');
  const isBlocked = isCompleted ? false : activeBlockers.length > 0;

  const [researching, setResearching] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [researchNotes, setResearchNotes] = useState(task.researchNotes || null);

  const priorityColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };

  const categoryLabel = SCHEDULE_E_CATEGORIES[task.category]?.label || 'Uncategorized';

  const handleResearch = async () => {
    if (researchNotes) {
      setShowResearch(!showResearch);
      return;
    }
    setResearching(true);
    try {
      const propertyContext = { activeProperty };
      const findings = await researchTask(task, propertyContext);
      setResearchNotes(findings);
      setShowResearch(true);
      await dbService.saveTask({ ...task, researchNotes: findings, notes: findings });
      await notifyResearchReady(task, findings);
    } catch (err) {
      console.error('Research failed:', err);
    } finally {
      setResearching(false);
    }
  };

  const handleCardClick = (e) => {
    // If the user has highlighted/selected text, do not trigger the edit modal
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      return;
    }
    onEdit(task);
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`p-4 rounded-3xl border transition-all cursor-pointer ${
        isCompleted 
          ? 'bg-slate-900/40 border-slate-800/80 opacity-60' 
          : isBlocked
            ? 'bg-dark-card border-slate-800/60 border-dashed opacity-85'
            : 'bg-dark-card border-dark-border hover:border-slate-700 hover:bg-slate-800/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Completion checkbox wrapper */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task);
          }}
          className="mt-0.5 text-slate-500 hover:text-blue-400 active:scale-90 transition-all flex-shrink-0"
        >
          {isCompleted ? (
            <CheckCircle2 className="text-emerald-400 fill-emerald-950" size={20} />
          ) : isBlocked ? (
            <Lock className="text-amber-500/60" size={20} />
          ) : (
            <Circle size={20} />
          )}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0 select-text">
          <h4 className={`text-sm font-semibold tracking-tight text-white ${isCompleted ? 'line-through text-slate-500' : ''} ${isBlocked ? 'text-slate-300' : ''}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Attached Image Thumbnails */}
          {task.images && task.images.length > 0 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto py-0.5 scrollbar-none">
              {task.images.map((img) => (
                <div key={img.id} className="w-9 h-9 rounded-lg overflow-hidden border border-slate-800/80 flex-shrink-0 bg-slate-900">
                  <img src={img.url} alt="Task photo" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Dependency indicator */}
          {isBlocked && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full w-fit">
              <Lock size={10} />
              Blocked by: {activeBlockers.map(b => b.title).join(', ')}
            </div>
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

          {/* Research notes block */}
          {researchNotes && showResearch && (
            <div className="mt-3 p-3 bg-slate-800/50 border border-purple-500/20 rounded-2xl text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              <div className="flex items-center gap-1.5 mb-2 text-purple-400 font-semibold text-[10px] uppercase tracking-wider">
                <Sparkles size={10} />
                Research Notes
              </div>
              {researchNotes}
            </div>
          )}
          {researchNotes && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowResearch(!showResearch);
              }}
              className="flex items-center gap-1 mt-2 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showResearch ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {showResearch ? 'Hide research' : 'Show research'}
            </button>
          )}
        </div>

        {/* Action Panel */}
        <div className="flex flex-col gap-2 flex-shrink-0 items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleResearch();
            }}
            disabled={researching}
            className="text-slate-500 hover:text-purple-400 p-1 rounded-xl active:scale-95 transition-all disabled:opacity-50"
            title="Research this task"
          >
            {researching ? <Loader2 size={15} className="animate-spin text-purple-400" /> : <Sparkles size={15} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="text-slate-500 hover:text-blue-400 p-1 rounded-xl active:scale-95 transition-all"
            title="Edit Task"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="text-slate-500 hover:text-red-400 p-1 rounded-xl active:scale-95 transition-all"
            title="Delete Task"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
