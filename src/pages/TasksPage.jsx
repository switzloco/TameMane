import React, { useState, useEffect } from 'react';
import { Plus, X, ListFilter, ClipboardCheck, Calendar } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import { dbService } from '../services/dbService';
import { SCHEDULE_E_CATEGORIES } from '../config/constants';

export default function TasksPage({ activeProperty }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); // 'all' | 'open' | 'completed'
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('repairs');
  const [dueDate, setDueDate] = useState('');

  const loadTasks = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const propertyTasks = await dbService.getTasks(activeProperty.id);
      setTasks(propertyTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [activeProperty]);

  const handleToggleStatus = async (task) => {
    const updatedTask = {
      ...task,
      status: task.status === 'completed' ? 'open' : 'completed',
      completedDate: task.status === 'completed' ? null : new Date().toISOString()
    };
    await dbService.saveTask(updatedTask);
    loadTasks();
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await dbService.deleteTask(taskId);
      loadTasks();
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    const newTask = {
      propertyId: activeProperty.id,
      title,
      description,
      status: 'open',
      priority,
      category,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      notes: '',
      source: 'manual',
    };
    await dbService.saveTask(newTask);
    setShowAddModal(false);
    // Reset Form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('repairs');
    setDueDate('');
    loadTasks();
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'open') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Maintenance & Tasks</h2>
          <p className="text-xs text-slate-400 mt-0.5">{tasks.length} tasks recorded</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2.5 rounded-2xl bg-blue-600 active:scale-95 transition-all text-white flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
        >
          <Plus size={18} />
          <span className="text-xs font-semibold pr-1">Add Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 bg-slate-900 border border-dark-border p-1 rounded-2xl">
        {['all', 'open', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${
              filter === f 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-10 rounded-3xl bg-dark-card border border-dark-border text-center flex flex-col items-center justify-center">
          <ClipboardCheck className="text-slate-600 mb-2" size={32} />
          <span className="text-sm font-semibold text-slate-300">No tasks found</span>
          <span className="text-xs text-slate-500 mt-1">There are no {filter} tasks for this property.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          
          <div className="relative w-full max-w-md bg-dark-card border border-slate-700/60 rounded-3xl p-5 shadow-2xl z-10 animate-slide-up">
            <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Add New Task</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Task Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Fix bathroom ventilation fan"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea 
                  rows="2"
                  placeholder="e.g. Drips water when running, looks like build-up in ducts."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {Object.entries(SCHEDULE_E_CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Due Date</label>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 text-sm font-semibold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg active:scale-95 transition-all"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
