import { PROPERTY_SEEDS, TASK_SEEDS, INVENTORY_SEEDS } from '../config/constants';
import { sortTasks } from '../utils/taskSorter';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

const KEYS = {
  PROPERTIES: 'tm_properties',
  TASKS: 'tm_tasks',
  TRANSACTIONS: 'tm_transactions',
  RENT_REDUCTIONS: 'tm_rent_reductions',
  INVENTORY: 'tm_inventory',
};

// Initialize localStorage with seeds if empty
const initDB = () => {
  if (!localStorage.getItem(KEYS.PROPERTIES)) {
    localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(PROPERTY_SEEDS));
  }
  if (!localStorage.getItem(KEYS.TASKS)) {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(TASK_SEEDS));
  }
  if (!localStorage.getItem(KEYS.TRANSACTIONS)) {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.RENT_REDUCTIONS)) {
    localStorage.setItem(KEYS.RENT_REDUCTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.INVENTORY)) {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(INVENTORY_SEEDS));
  }
};

initDB();

// Helper to get collection reference in Firestore for current user
const getUserCollection = (colName) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return collection(db, 'users', user.uid, colName);
};

export const dbService = {
  // --- SYNC & MIGRATION ---
  isCloudEnabled() {
    return !!auth.currentUser;
  },

  async migrateLocalToCloud(userId) {
    const migrationFlag = `tm_migrated_${userId}`;
    if (localStorage.getItem(migrationFlag) === 'true') {
      return; // Already migrated
    }

    try {
      console.log('Starting migration to Cloud Firestore for user:', userId);
      const localProps = JSON.parse(localStorage.getItem(KEYS.PROPERTIES) || '[]');
      const localTasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
      const localTxs = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
      const localReductions = JSON.parse(localStorage.getItem(KEYS.RENT_REDUCTIONS) || '[]');
      const localInventory = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');

      // Migrate Properties
      for (const prop of localProps) {
        const propRef = doc(db, 'users', userId, 'properties', prop.id);
        await setDoc(propRef, {
          ...prop,
          updatedAt: prop.updatedAt || new Date().toISOString()
        });
      }

      // Migrate Tasks
      for (const task of localTasks) {
        const taskRef = doc(db, 'users', userId, 'tasks', task.id);
        await setDoc(taskRef, {
          ...task,
          updatedAt: task.updatedAt || new Date().toISOString()
        });
      }

      // Migrate Transactions
      for (const tx of localTxs) {
        const txRef = doc(db, 'users', userId, 'transactions', tx.id);
        await setDoc(txRef, {
          ...tx,
          updatedAt: tx.updatedAt || new Date().toISOString()
        });
      }

      // Migrate Rent Reductions
      for (const reduction of localReductions) {
        const ref = doc(db, 'users', userId, 'rent_reductions', reduction.id);
        await setDoc(ref, {
          ...reduction,
          updatedAt: reduction.updatedAt || new Date().toISOString()
        });
      }

      // Migrate Inventory
      for (const item of localInventory) {
        const ref = doc(db, 'users', userId, 'inventory', item.id);
        await setDoc(ref, {
          ...item,
          updatedAt: item.updatedAt || new Date().toISOString()
        });
      }

      localStorage.setItem(migrationFlag, 'true');
      console.log('Migration to Cloud Firestore completed successfully!');
    } catch (err) {
      console.error('Failed to migrate local data to Firestore:', err);
    }
  },

  // --- PROPERTIES ---
  async getProperties() {
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('properties');
        const snapshot = await getDocs(colRef);
        const properties = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // If Firestore is completely empty for this user, seed it
        if (properties.length === 0) {
          console.log('Cloud properties empty. Seeding properties in Firestore...');
          for (const prop of PROPERTY_SEEDS) {
            await this.saveProperty(prop);
          }
          return PROPERTY_SEEDS;
        }
        return properties;
      } catch (err) {
        console.error('Error fetching properties from Firestore, falling back to local:', err);
      }
    }
    
    await delay();
    return JSON.parse(localStorage.getItem(KEYS.PROPERTIES) || '[]');
  },

  async saveProperty(property) {
    const id = property.id || `prop_${Date.now()}`;
    const savedProp = {
      ...property,
      id,
      createdAt: property.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('properties');
        const docRef = doc(colRef, id);
        await setDoc(docRef, savedProp);
        return savedProp;
      } catch (err) {
        console.error('Error saving property to Firestore, saving locally:', err);
      }
    }

    await delay();
    const properties = JSON.parse(localStorage.getItem(KEYS.PROPERTIES) || '[]');
    const index = properties.findIndex(p => p.id === id);
    if (index >= 0) {
      properties[index] = savedProp;
    } else {
      properties.push(savedProp);
    }
    localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(properties));
    return savedProp;
  },

  // --- TASKS ---
  async getTasks(propertyId = null) {
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('tasks');
        const snapshot = await getDocs(colRef);
        let tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Seed if empty
        if (tasks.length === 0) {
          console.log('Cloud tasks empty. Seeding tasks in Firestore...');
          for (const task of TASK_SEEDS) {
            await this.saveTask(task);
          }
          tasks = TASK_SEEDS;
        }

        const filtered = propertyId ? tasks.filter(t => t.propertyId === propertyId) : tasks;
        return sortTasks(filtered);
      } catch (err) {
        console.error('Error fetching tasks from Firestore, falling back to local:', err);
      }
    }

    await delay();
    const tasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    const filtered = propertyId ? tasks.filter(t => t.propertyId === propertyId) : tasks;
    return sortTasks(filtered);
  },

  async saveTask(task) {
    const id = task.id || `task_${Date.now()}`;
    
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('tasks');
        const docRef = doc(colRef, id);
        
        let existingTask = {};
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            existingTask = docSnap.data();
          }
        } catch (_) {}

        const savedTask = {
          ...existingTask,
          ...task,
          id,
          blockedBy: task.blockedBy || existingTask.blockedBy || [],
          createdAt: task.createdAt || existingTask.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, savedTask);
        return savedTask;
      } catch (err) {
        console.error('Error saving task to Firestore, saving locally:', err);
      }
    }

    await delay();
    const tasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    const index = tasks.findIndex(t => t.id === id);
    let savedTask;

    if (index >= 0) {
      savedTask = { 
        ...tasks[index], 
        ...task, 
        blockedBy: task.blockedBy || tasks[index].blockedBy || [],
        updatedAt: new Date().toISOString() 
      };
      tasks[index] = savedTask;
    } else {
      savedTask = {
        ...task,
        id,
        blockedBy: task.blockedBy || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      tasks.push(savedTask);
    }

    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    return savedTask;
  },

  async deleteTask(taskId) {
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('tasks');
        const docRef = doc(colRef, taskId);
        await deleteDoc(docRef);
        return true;
      } catch (err) {
        console.error('Error deleting task from Firestore, deleting locally:', err);
      }
    }

    await delay();
    const tasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    const filtered = tasks.filter(t => t.id !== taskId);
    localStorage.setItem(KEYS.TASKS, JSON.stringify(filtered));
    return true;
  },

  // --- TRANSACTIONS ---
  async getTransactions(propertyId = null) {
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('transactions');
        const snapshot = await getDocs(colRef);
        const transactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        if (propertyId) {
          return transactions.filter(t => t.propertyId === propertyId);
        }
        return transactions;
      } catch (err) {
        console.error('Error fetching transactions from Firestore, falling back to local:', err);
      }
    }

    await delay();
    const transactions = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    if (propertyId) {
      return transactions.filter(t => t.propertyId === propertyId);
    }
    return transactions;
  },

  async saveTransaction(transaction) {
    const id = transaction.id || `tx_${Date.now()}`;

    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('transactions');
        const docRef = doc(colRef, id);

        let existingTx = {};
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            existingTx = docSnap.data();
          }
        } catch (_) {}

        const savedTx = {
          ...existingTx,
          ...transaction,
          id,
          createdAt: transaction.createdAt || existingTx.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, savedTx);
        return savedTx;
      } catch (err) {
        console.error('Error saving transaction to Firestore, saving locally:', err);
      }
    }

    await delay();
    const transactions = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    const index = transactions.findIndex(t => t.id === id);
    let savedTx;

    if (index >= 0) {
      savedTx = { ...transactions[index], ...transaction, updatedAt: new Date().toISOString() };
      transactions[index] = savedTx;
    } else {
      savedTx = {
        ...transaction,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      transactions.push(savedTx);
    }

    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return savedTx;
  },

  async deleteTransaction(transactionId) {
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('transactions');
        const docRef = doc(colRef, transactionId);
        await deleteDoc(docRef);
        return true;
      } catch (err) {
        console.error('Error deleting transaction from Firestore, deleting locally:', err);
      }
    }

    await delay();
    const transactions = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    const filtered = transactions.filter(t => t.id !== transactionId);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
    return true;
  },

  // --- RENT REDUCTIONS ---
  async getRentReductions(propertyId = null) {
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('rent_reductions');
        const snapshot = await getDocs(colRef);
        const reductions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        if (propertyId) {
          return reductions.filter(r => r.propertyId === propertyId);
        }
        return reductions;
      } catch (err) {
        console.error('Error fetching rent reductions from Firestore, falling back to local:', err);
      }
    }

    await delay();
    const reductions = JSON.parse(localStorage.getItem(KEYS.RENT_REDUCTIONS) || '[]');
    if (propertyId) {
      return reductions.filter(r => r.propertyId === propertyId);
    }
    return reductions;
  },

  async saveRentReduction(reduction) {
    const id = reduction.id || `rr_${Date.now()}`;

    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('rent_reductions');
        const docRef = doc(colRef, id);

        let existingReduction = {};
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            existingReduction = docSnap.data();
          }
        } catch (_) {}

        const savedReduction = {
          ...existingReduction,
          ...reduction,
          id,
          createdAt: reduction.createdAt || existingReduction.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, savedReduction);
        return savedReduction;
      } catch (err) {
        console.error('Error saving rent reduction to Firestore, saving locally:', err);
      }
    }

    await delay();
    const reductions = JSON.parse(localStorage.getItem(KEYS.RENT_REDUCTIONS) || '[]');
    const index = reductions.findIndex(r => r.id === id);
    let savedReduction;

    if (index >= 0) {
      savedReduction = { ...reductions[index], ...reduction, updatedAt: new Date().toISOString() };
      reductions[index] = savedReduction;
    } else {
      savedReduction = {
        ...reduction,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      reductions.push(savedReduction);
    }

    localStorage.setItem(KEYS.RENT_REDUCTIONS, JSON.stringify(reductions));
    return savedReduction;
  },

  async deleteRentReduction(reductionId) {
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('rent_reductions');
        const docRef = doc(colRef, reductionId);
        await deleteDoc(docRef);
        return true;
      } catch (err) {
        console.error('Error deleting rent reduction from Firestore, deleting locally:', err);
      }
    }

    await delay();
    const reductions = JSON.parse(localStorage.getItem(KEYS.RENT_REDUCTIONS) || '[]');
    const filtered = reductions.filter(r => r.id !== reductionId);
    localStorage.setItem(KEYS.RENT_REDUCTIONS, JSON.stringify(filtered));
    return true;
  },

  // --- INVENTORY ---
  async getInventory(propertyId = null) {
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('inventory');
        const snapshot = await getDocs(colRef);
        let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Seed if empty
        if (items.length === 0) {
          console.log('Cloud inventory empty. Seeding inventory in Firestore...');
          for (const item of INVENTORY_SEEDS) {
            await this.saveInventoryItem(item);
          }
          items = INVENTORY_SEEDS;
        }

        if (propertyId) {
          return items.filter(item => item.propertyId === propertyId);
        }
        return items;
      } catch (err) {
        console.error('Error fetching inventory from Firestore, falling back to local:', err);
      }
    }

    await delay();
    const items = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
    if (propertyId) {
      return items.filter(item => item.propertyId === propertyId);
    }
    return items;
  },

  async saveInventoryItem(item) {
    const id = item.id || `inv_${Date.now()}`;

    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('inventory');
        const docRef = doc(colRef, id);

        let existingItem = {};
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            existingItem = docSnap.data();
          }
        } catch (_) {}

        const savedItem = {
          ...existingItem,
          ...item,
          id,
          createdAt: item.createdAt || existingItem.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, savedItem);
        return savedItem;
      } catch (err) {
        console.error('Error saving inventory item to Firestore, saving locally:', err);
      }
    }

    await delay();
    const items = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
    const index = items.findIndex(t => t.id === id);
    let savedItem;

    if (index >= 0) {
      savedItem = { 
        ...items[index], 
        ...item, 
        updatedAt: new Date().toISOString() 
      };
      items[index] = savedItem;
    } else {
      savedItem = {
        ...item,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      items.push(savedItem);
    }

    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
    return savedItem;
  },

  async deleteInventoryItem(itemId) {
    if (this.isCloudEnabled()) {
      try {
        const colRef = getUserCollection('inventory');
        const docRef = doc(colRef, itemId);
        await deleteDoc(docRef);
        return true;
      } catch (err) {
        console.error('Error deleting inventory item from Firestore, deleting locally:', err);
      }
    }

    await delay();
    const items = JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '[]');
    const filtered = items.filter(t => t.id !== itemId);
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(filtered));
    return true;
  }
};
