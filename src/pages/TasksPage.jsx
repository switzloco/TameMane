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
  const [editingTask, setEditingTask] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('repairs');
  const [dueDate, setDueDate] = useState('');
  const [blockedBy, setBlockedBy] = useState('');

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

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('repairs');
    setDueDate('');
    setBlockedBy('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setTitle(task.title || '');
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setCategory(task.category || 'repairs');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setBlockedBy(task.blockedBy && task.blockedBy.length > 0 ? task.blockedBy[0] : '');
    setShowAddModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    const taskData = {
      propertyId: activeProperty.id,
      title,
      description,
      status: editingTask ? editingTask.status : 'open',
      priority,
      category,
      blockedBy: blockedBy ? [blockedBy] : [],
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      notes: editingTask ? editingTask.notes : '',
      source: editingTask ? editingTask.source : 'manual',
    };
    if (editingTask) {
      taskData.id = editingTask.id;
    }
    await dbService.saveTask(taskData);
    setShowAddModal(false);
    loadTasks();
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'open') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  const otherTasks = tasks.filter(t => t.id !== editingTask?.id);

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Maintenance & Tasks</h2>
          <p className="text-xs text-slate-400 mt-0.5">{tasks.length} tasks recorded</p>
        </div>
        <button
          onClick={handleOpenAddModal}
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
              allTasks={tasks}
              onToggleStatus={handleToggleStatus}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          
          <div className="relative w-full max-w-md bg-dark-card border border-slate-700/60 rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                {editingTask ? 'Edit Task Details' : 'Add New Task'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="flex flex-col gap-3">
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

              {/* Prerequisite (Blocker) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Prerequisite (Blocker)</label>
                <select
                  value={blockedBy}
                  onChange={(e) => setBlockedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">None — Task is ready to start</option>
                  {otherTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
                  ))}
                </select>
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
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
