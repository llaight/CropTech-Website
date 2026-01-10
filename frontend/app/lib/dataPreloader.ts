/**
 * Data Preloader Utility
 * Prefetches inventory, deliveries, and fields data when user logs in
 * to reduce loading time when navigating to those pages
 */

const API_BASE = 'http://localhost:5001/api';

export interface PreloadedData {
  inventory: any[];
  deliveries: any[];
  fields: any[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'preloaded_data_cache';

/**
 * Prefetch inventory, deliveries, and fields data in the background
 */
export async function prefetchUserData(token: string): Promise<void> {
  try {
    console.log('Prefetching user data...');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // Fetch inventory, deliveries, and fields in parallel
    const [inventoryRes, deliveriesRes, fieldsRes] = await Promise.all([
      fetch(`${API_BASE}/inventory`, { headers }).catch(err => {
        console.warn('Inventory prefetch failed:', err);
        return null;
      }),
      fetch(`${API_BASE}/deliveries`, { headers }).catch(err => {
        console.warn('Deliveries prefetch failed:', err);
        return null;
      }),
      fetch(`${API_BASE}/fields`, { headers }).catch(err => {
        console.warn('Fields prefetch failed:', err);
        return null;
      }),
    ]);

    const inventory = inventoryRes?.ok 
      ? await inventoryRes.json().then(data => {
          console.log('Inventory response:', data);
          return data.items || [];
        }).catch(err => {
          console.error('Error parsing inventory:', err);
          return [];
        })
      : [];

    const deliveries = deliveriesRes?.ok
      ? await deliveriesRes.json().then(data => {
          console.log('Deliveries response:', data);
          return data.deliveries || [];
        }).catch(err => {
          console.error('Error parsing deliveries:', err);
          return [];
        })
      : [];

    const fields = fieldsRes?.ok
      ? await fieldsRes.json().then(data => {
          console.log('Fields response:', data);
          return data.fields || [];
        }).catch(err => {
          console.error('Error parsing fields:', err);
          return [];
        })
      : [];

    // Cache the data with timestamp
    const cacheData: PreloadedData = {
      inventory,
      deliveries,
      fields,
      timestamp: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log(`Prefetched ${inventory.length} inventory items, ${deliveries.length} deliveries, and ${fields.length} fields`);
    console.log('Cache stored:', cacheData);
  } catch (error) {
    console.error('Error prefetching data:', error);
  }
}

/**
 * Get cached preloaded data if it's still fresh
 */
export function getCachedData(): PreloadedData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: PreloadedData = JSON.parse(cached);
    const age = Date.now() - data.timestamp;

    // Return data if it's fresh (within cache duration)
    if (age < CACHE_DURATION) {
      console.log(`Using cached data (${Math.round(age / 1000)}s old)`);
      return data;
    }

    // Data is stale, remove it
    console.log('Cached data is stale, removing');
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.error('Error reading cached data:', error);
    return null;
  }
}

/**
 * Clear cached preloaded data
 */
export function clearCachedData(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Check if cached data exists and is fresh
 */
export function hasFreshCache(): boolean {
  return getCachedData() !== null;
}
