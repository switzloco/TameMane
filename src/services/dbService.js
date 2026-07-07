import { PROPERTY_SEEDS, TASK_SEEDS } from '../config/constants';

// Simulated delay helper to make loading states feel realistic (like Firestore)
const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

const KEYS = {
  PROPERTIES: 'tm_properties',
  TASKS: 'tm_tasks',
  TRANSACTIONS: 'tm_transactions',
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
};

initDB();

export const dbService = {
  // --- PROPERTIES ---
  async getProperties() {
    await delay();
    return JSON.parse(localStorage.getItem(KEYS.PROPERTIES) || '[]');
  },

  async saveProperty(property) {
    await delay();
    const properties = JSON.parse(localStorage.getItem(KEYS.PROPERTIES) || '[]');
    const index = properties.findIndex(p => p.id === property.id);
    
    if (index >= 0) {
      properties[index] = { ...properties[index], ...property, updatedAt: new Date().toISOString() };
    } else {
      const newProp = {
        ...property,
        id: property.id || `prop_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      properties.push(newProp);
      property = newProp;
    }
    
    localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(properties));
    return property;
  },

  // --- TASKS ---
  async getTasks(propertyId = null) {
    await delay();
    const tasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    if (propertyId) {
      return tasks.filter(t => t.propertyId === propertyId);
    }
    return tasks;
  },

  async saveTask(task) {
    await delay();
    const tasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    const index = tasks.findIndex(t => t.id === task.id);
    let savedTask;

    if (index >= 0) {
      savedTask = { ...tasks[index], ...task, updatedAt: new Date().toISOString() };
      tasks[index] = savedTask;
    } else {
      savedTask = {
        ...task,
        id: task.id || `task_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      tasks.push(savedTask);
    }

    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    return savedTask;
  },

  async deleteTask(taskId) {
    await delay();
    const tasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    const filtered = tasks.filter(t => t.id !== taskId);
    localStorage.setItem(KEYS.TASKS, JSON.stringify(filtered));
    return true;
  },

  // --- TRANSACTIONS ---
  async getTransactions(propertyId = null) {
    await delay();
    const transactions = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    if (propertyId) {
      return transactions.filter(t => t.propertyId === propertyId);
    }
    return transactions;
  },

  async saveTransaction(transaction) {
    await delay();
    const transactions = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    const index = transactions.findIndex(t => t.id === transaction.id);
    let savedTx;

    if (index >= 0) {
      savedTx = { ...transactions[index], ...transaction, updatedAt: new Date().toISOString() };
      transactions[index] = savedTx;
    } else {
      savedTx = {
        ...transaction,
        id: transaction.id || `tx_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      transactions.push(savedTx);
    }

    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return savedTx;
  },

  async deleteTransaction(transactionId) {
    await delay();
    const transactions = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    const filtered = transactions.filter(t => t.id !== transactionId);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
    return true;
  }
};
