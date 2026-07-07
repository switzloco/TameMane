export const SCHEDULE_E_CATEGORIES = {
  advertising: { label: 'Advertising', line: 5, color: '#f87171' },
  auto_and_travel: { label: 'Auto & Travel', line: 6, color: '#fb923c' },
  cleaning_and_maintenance: { label: 'Cleaning & Maintenance', line: 7, color: '#fbbf24' },
  commissions: { label: 'Commissions', line: 8, color: '#34d399' },
  insurance: { label: 'Insurance', line: 9, color: '#22d3ee' },
  legal_and_professional: { label: 'Legal & Professional', line: 10, color: '#60a5fa' },
  management_fees: { label: 'Management Fees', line: 11, color: '#818cf8' },
  mortgage_interest: { label: 'Mortgage Interest', line: 12, color: '#a78bfa' },
  other_interest: { label: 'Other Interest', line: 13, color: '#c084fc' },
  repairs: { label: 'Repairs', line: 14, color: '#f472b6' },
  supplies: { label: 'Supplies', line: 15, color: '#fb7185' },
  taxes: { label: 'Taxes', line: 16, color: '#9ca3af' },
  utilities: { label: 'Utilities', line: 17, color: '#fbbf24' },
  depreciation: { label: 'Depreciation & CapEx', line: 18, color: '#a78bfa' },
  other: { label: 'Other Expenses', line: 19, color: '#e5e7eb' },
  rental_income: { label: 'Rental Income', line: 3, isIncome: true, color: '#34d399' },
};

export const PROPERTY_SEEDS = [
  {
    id: '3060_quinto',
    name: '3060 Quinto Way',
    address: {
      street: '3060 Quinto Way',
      city: 'Someplace',
      state: 'CA',
      zip: '90210'
    },
    status: 'active',
    monthlyRent: 4800,
    createdAt: new Date().toISOString()
  },
  {
    id: '137_union',
    name: '137 Union',
    address: {
      street: '137 Union St',
      city: 'Someplace',
      state: 'CA',
      zip: '90210'
    },
    status: 'vacant',
    monthlyRent: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: '6816_amberly',
    name: '6816 Amberly',
    address: {
      street: '6816 Amberly Rd',
      city: 'Detroit',
      state: 'MI',
      zip: '48201'
    },
    status: 'active',
    monthlyRent: 1550,
    createdAt: new Date().toISOString()
  }
];

export const TASK_SEEDS = [
  {
    id: 'seed_task_1',
    propertyId: '137_union',
    title: 'Clean out property',
    description: 'Empty out remaining furniture and deep clean rooms.',
    status: 'open',
    priority: 'high',
    category: 'cleaning_and_maintenance',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: '',
    source: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed_task_2',
    propertyId: '137_union',
    title: 'Empty remaining items',
    description: 'Rent dumpster and clear out junk in garage.',
    status: 'open',
    priority: 'high',
    category: 'cleaning_and_maintenance',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    notes: '',
    source: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed_task_3',
    propertyId: '137_union',
    title: 'Fix up outstanding issues',
    description: 'Repair back patio door screen, replace broken bulbs, paint scuffs.',
    status: 'open',
    priority: 'medium',
    category: 'repairs',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: '',
    source: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed_task_4',
    propertyId: '137_union',
    title: 'Find renters',
    description: 'Post listings on Zillow, schedule open house.',
    status: 'open',
    priority: 'medium',
    category: 'advertising',
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    notes: '',
    source: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
