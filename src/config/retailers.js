export const DEFAULT_RETAILERS = [
  { id: 'amazon', name: 'Amazon', url: 'https://www.amazon.com/s?k=', active: true },
  { id: 'homedepot', name: 'Home Depot', url: 'https://www.homedepot.com/s/', active: true },
  { id: 'target', name: 'Target', url: 'https://www.target.com/s?searchTerm=', active: true },
  { id: 'costco', name: 'Costco', url: 'https://www.costco.com/CatalogSearch?keyword=', active: true },
];

export function getRetailers() {
  const saved = localStorage.getItem('tm_retailers');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved retailers settings:', e);
    }
  }
  return DEFAULT_RETAILERS;
}

export function saveRetailers(retailers) {
  localStorage.setItem('tm_retailers', JSON.stringify(retailers));
}
