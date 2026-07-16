import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Search, Package, MapPin, Loader2 } from 'lucide-react';
import { dbService } from '../services/dbService';
import InventoryCard from '../components/InventoryCard';

export default function InventoryPage({ activeProperty }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [category, setCategory] = useState('Other');
  const [status, setStatus] = useState('stored');

  const categories = ['Furniture', 'Appliances', 'Electronics', 'Boxes', 'Tools', 'Other'];
  const statuses = ['stored', 'in-transit', 'missing'];

  const loadInventory = useCallback(async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const inventoryItems = await dbService.getInventory(activeProperty.id);
      setItems(inventoryItems);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [activeProperty]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setStorageLocation('');
    setCategory('Other');
    setStatus('stored');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setName(item.name || '');
    setDescription(item.description || '');
    setStorageLocation(item.storageLocation || '');
    setCategory(item.category || 'Other');
    setStatus(item.status || 'stored');
    setShowAddModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      propertyId: activeProperty.id,
      name,
      description,
      storageLocation: storageLocation.trim() || 'General',
      category,
      status
    };

    if (editingItem) {
      payload.id = editingItem.id;
      payload.createdAt = editingItem.createdAt;
    }

    try {
      await dbService.saveInventoryItem(payload);
      setShowAddModal(false);
      loadInventory();
    } catch (err) {
      console.error('Error saving inventory item:', err);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await dbService.deleteInventoryItem(id);
      loadInventory();
    } catch (err) {
      console.error('Error deleting inventory item:', err);
    }
  };

  // Filter items by search query
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.storageLocation && item.storageLocation.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    });
  }, [items, searchQuery]);

  // Group items by storage location
  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      const loc = item.storageLocation || 'General';
      if (!groups[loc]) {
        groups[loc] = [];
      }
      groups[loc].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Stats computation
  const stats = useMemo(() => {
    const totalItems = items.length;
    const locations = new Set(items.map(item => item.storageLocation || 'General')).size;
    const inTransit = items.filter(item => item.status === 'in-transit').length;
    return { totalItems, locations, inTransit };
  }, [items]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-xs text-slate-400 mt-2">Loading inventory...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* KPI Stats Block */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-dark-card border border-dark-border rounded-3xl text-center">
          <div className="text-xs text-slate-400 font-medium">Total Items</div>
          <div className="text-xl font-bold text-white mt-1">{stats.totalItems}</div>
        </div>
        <div className="p-3 bg-dark-card border border-dark-border rounded-3xl text-center">
          <div className="text-xs text-slate-400 font-medium">Locations</div>
          <div className="text-xl font-bold text-blue-400 mt-1">{stats.locations}</div>
        </div>
        <div className="p-3 bg-dark-card border border-dark-border rounded-3xl text-center">
          <div className="text-xs text-slate-400 font-medium">In Transit</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{stats.inTransit}</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text"
            placeholder="Search stuff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-dark-border rounded-2xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
          />
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all text-sm font-semibold shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} />
          <span>Add Stuff</span>
        </button>
      </div>

      {/* Grouped Lists */}
      {Object.keys(groupedItems).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-dark-card border border-dark-border rounded-3xl border-dashed">
          <Package className="text-slate-600 mb-2" size={32} />
          <span className="text-sm font-medium text-slate-400">No items found</span>
          <span className="text-xs text-slate-500 text-center mt-1">
            Add items manually or tell the PM agent in chat to log objects for you.
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([location, group]) => (
            <div key={location} className="space-y-3">
              <div className="flex items-center gap-1.5 px-1">
                <MapPin size={14} className="text-blue-400" />
                <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  {location}
                </h3>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-bold ml-1">
                  {group.length}
                </span>
              </div>
              <div className="grid gap-3">
                {group.map(item => (
                  <InventoryCard 
                    key={item.id}
                    item={item}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
              <h3 className="text-sm font-bold text-white">
                {editingItem ? 'Edit Item' : 'Add Item to Inventory'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Item Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Dining Table, Tool Chest"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-2xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-700"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description / Notes</label>
                <textarea 
                  placeholder="e.g. solid wood, needs repairs, box number"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-dark-border rounded-2xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 resize-none"
                />
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Storage Location</label>
                <input 
                  type="text"
                  placeholder="e.g. Garage, Kitchen, Box 4"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-2xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-700"
                />
              </div>

              {/* Grid: Category and Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-dark-border rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-dark-border rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  >
                    {statuses.map(st => (
                      <option key={st} value={st}>{st.replace('-', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
