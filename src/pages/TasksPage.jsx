import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, X, ListFilter, ClipboardCheck, Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import { dbService } from '../services/dbService';
import { SCHEDULE_E_CATEGORIES } from '../config/constants';
import { sortTasks } from '../utils/taskSorter';
import { notifyTaskCompleted } from '../services/notificationService';
import { describeTaskImage } from '../services/pmAgent';
import { resizeImage } from '../utils/imageHelpers';

export default function TasksPage({ activeProperty }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); // 'all' | 'open' | 'completed'
  const [sortBy, setSortBy] = useState('smart'); // 'smart' | 'priority' | 'dueDate' | 'created'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('repairs');
  const [dueDate, setDueDate] = useState('');
  const [blockedBy, setBlockedBy] = useState('');
  const [status, setStatus] = useState('open');
  const [notes, setNotes] = useState('');
  const [taskImages, setTaskImages] = useState([]);

  const fileInputRef = useRef(null);

  const loadTasks = useCallback(async () => {
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
  }, [activeProperty]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggleStatus = async (task) => {
    const isNowCompleted = task.status !== 'completed';
    const updatedTask = {
      ...task,
      status: isNowCompleted ? 'completed' : 'open',
      completedDate: isNowCompleted ? new Date().toISOString() : null
    };
    await dbService.saveTask(updatedTask);

    if (isNowCompleted && activeProperty) {
      try {
        const allTasks = await dbService.getTasks(activeProperty.id);
        const nowUnblocked = allTasks.filter(t => {
          if (t.status === 'completed') return false;
          if (!t.blockedBy || !t.blockedBy.includes(task.id)) return false;
          const remainingBlockers = t.blockedBy.filter(bid => {
            if (bid === task.id) return false;
            const blocker = allTasks.find(bt => bt.id === bid);
            return blocker && blocker.status !== 'completed';
          });
          return remainingBlockers.length === 0;
        });
        await notifyTaskCompleted(updatedTask, nowUnblocked);
      } catch (err) {
        console.error('Failed to notify task completion:', err);
      }
    }

    loadTasks();
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await dbService.deleteTask(taskId);
      loadTasks();
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    for (const file of files) {
      const tempId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Add loading state immediately
      setTaskImages(prev => [...prev, { id: tempId, url: '', loading: true, description: null }]);

      // Read image
      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalBase64 = reader.result;
        try {
          // 1. Generate full-res description via Vision API
          const desc = await describeTaskImage(originalBase64, `${title || 'Task'}: ${description || ''}`);

          // 2. Resize image to compact thumbnail for saving in Firestore/Localstorage
          const thumbnail = await resizeImage(originalBase64, 160, 160);

          // 3. Update taskImages entry
          setTaskImages(prev =>
            prev.map(img =>
              img.id === tempId
                ? { id: tempId, url: thumbnail, description: desc, loading: false }
                : img
            )
          );
        } catch (error) {
          console.error('Error processing task image:', error);
          setTaskImages(prev => prev.filter(img => img.id !== tempId));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (imgId) => {
    setTaskImages(prev => prev.filter(img => img.id !== imgId));
  };

  const handleCaptureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
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
    setStatus('open');
    setNotes('');
    setTaskImages([]);
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
    setStatus(task.status || 'open');
    setNotes(task.notes || task.researchNotes || '');
    setTaskImages(task.images || []);
    setShowAddModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    const taskData = {
      propertyId: activeProperty.id,
      title,
      description,
      status: status,
      priority,
      category,
      blockedBy: blockedBy ? [blockedBy] : [],
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      notes: notes,
      source: editingTask ? editingTask.source : 'manual',
      images: taskImages.filter(img => !img.loading).map(img => ({
        id: img.id,
        url: img.url,
        description: img.description
      })),
      imageDescriptions: taskImages.filter(img => !img.loading && img.description).map(img => img.description)
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

  const sortedTasks = useMemo(() => {
    let list = [...filteredTasks];
    if (sortBy === 'smart') {
      return sortTasks(list);
    }
    
    // For other sort options, separate completed and uncompleted tasks
    // to always keep completed tasks at the bottom
    const completed = list.filter(t => t.status === 'completed');
    const uncompleted = list.filter(t => t.status !== 'completed');

    if (sortBy === 'priority') {
      const getPriorityWeight = (p) => {
        switch (p?.toLowerCase()) {
          case 'critical': return 4;
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 0;
        }
      };
      uncompleted.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
    } else if (sortBy === 'dueDate') {
      uncompleted.sort((a, b) => {
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    } else if (sortBy === 'created') {
      uncompleted.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
    }

    return [...uncompleted, ...completed];
  }, [filteredTasks, sortBy]);

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

      {/* Sort Options */}
      <div className="flex items-center justify-between px-1.5 py-0.5">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ListFilter size={13} className="text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sort By</span>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-xs bg-slate-900 border border-dark-border text-slate-300 rounded-2xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
        >
          <option value="smart">Smart Sort (Dependencies)</option>
          <option value="priority">Priority (High → Low)</option>
          <option value="dueDate">Due Date (Soonest first)</option>
          <option value="created">Date Created (Oldest first)</option>
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="p-10 rounded-3xl bg-dark-card border border-dark-border text-center flex flex-col items-center justify-center">
          <ClipboardCheck className="text-slate-600 mb-2" size={32} />
          <span className="text-sm font-semibold text-slate-300">No tasks found</span>
          <span className="text-xs text-slate-500 mt-1">There are no {filter} tasks for this property.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sortedTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              allTasks={tasks}
              activeProperty={activeProperty}
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

              {/* Status Selector (Only shown when editing or optionally always, we show it always now for control) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Task Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="open">Open (Active)</option>
                  <option value="completed">Completed</option>
                  <option value="deferred">Deferred / Paused</option>
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
              {/* Image Attachments */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Photos / Visual Evidence</label>
                
                {/* Hidden input */}
                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Trigger Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureClick}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 font-semibold text-xs active:scale-98 transition-all"
                  >
                    <Camera size={14} className="text-blue-400" />
                    Snap Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 font-semibold text-xs active:scale-98 transition-all"
                  >
                    <Upload size={14} className="text-purple-400" />
                    Upload Image
                  </button>
                </div>

                {/* Preview strip */}
                {taskImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1 mt-1 scrollbar-thin">
                    {taskImages.map((img) => (
                      <div key={img.id} className="relative flex-shrink-0 w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden group">
                        {img.loading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                            <Loader2 size={16} className="text-blue-500 animate-spin" />
                          </div>
                        ) : (
                          <>
                            <img src={img.url} alt="Attached" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(img.id)}
                              className="absolute top-1 right-1 p-1 rounded-lg bg-black/70 hover:bg-red-600 text-white hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={10} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Notes / Research</label>
                <textarea 
                  rows="3"
                  placeholder="e.g. Supplier contact info, dimensions, or research notes."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm focus:border-blue-500 focus:outline-none transition-colors resize-none"
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
