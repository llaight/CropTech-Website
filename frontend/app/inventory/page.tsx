"use client";

import { useState, useEffect } from "react";
import { getCachedData } from "../lib/dataPreloader";
import { formatLongDate } from "../lib/utils";

// Define interfaces
interface InventoryItem {
  id: number;
  name: string;
  price: number;
  
  // Detailed sack counts
  sacks_of_grains_25kg: number;
  sacks_of_grains_50kg: number;
  sacks_of_rice_25kg: number;
  sacks_of_rice_50kg: number;
  
  // Totals
  total_sacks_of_grains: number;
  total_sacks_of_rice: number;
  total_weight_grains_kg: number;
  total_weight_rice_kg: number;
  
  // Condition categories
  grains_condition: string;
  grains_condition_other: string;
  grains_display_condition: string;
  rice_condition: string;
  rice_condition_other: string;
  rice_display_condition: string;
  
  // Remarks
  remarks: string;
  
  user_id: number;
  created_at: string;
}

interface EditableInventoryItem extends Omit<InventoryItem, 
  'total_sacks_of_grains' | 'total_sacks_of_rice' | 
  'total_weight_grains_kg' | 'total_weight_rice_kg' |
  'grains_display_condition' | 'rice_display_condition'> {
  // These will be calculated
}

// Delivery item interface
interface DeliveryLineItem {
  variety: string;
  sack_size_kg: 25 | 50;
  sacks: number;
  price?: number; // Price per kg
}

// Delivery record interface
interface DeliveryRecord {
  id: number;
  delivery_date: string; // ISO date string
  delivery_time: string; // HH:MM:SS format
  recipient: string;
  destination: string;
  method: 'delivery' | 'pick-up';
  status: 'to be delivered' | 'delivered' | 'cancelled' | 'returned';
  items: DeliveryLineItem[];
  total_quantity_kg: number; // total: sum of (sacks * sack_size_kg) for all items
  notes: string;
  created_at: string;
}

// Condition options - SEPARATE FOR GRAINS AND RICE
const GRAINS_CONDITION_OPTIONS = [
  { value: "to sell", label: "To Sell" },
  { value: "to plant", label: "To Plant" },
  { value: "to dispose", label: "To Dispose" },
  { value: "others", label: "Others" },
];

const RICE_CONDITION_OPTIONS = [
  { value: "to sell", label: "To Sell" },
  { value: "to dispose", label: "To Dispose" },
  { value: "others", label: "Others" },
];

// Default sample data - will be used only if no data in localStorage
const DEFAULT_SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: 1,
    name: "NSIC RC 220 SR (Japonica 1)",
    price: 32.17,
    
    // Detailed sack counts
    sacks_of_grains_25kg: 500,
    sacks_of_grains_50kg: 741,
    sacks_of_rice_25kg: 300,
    sacks_of_rice_50kg: 320,
    
    // Calculated totals
    total_sacks_of_grains: 1241,
    total_sacks_of_rice: 620,
    total_weight_grains_kg: (500 * 25) + (741 * 50),
    total_weight_rice_kg: (300 * 25) + (320 * 50),
    
    // Condition categories
    grains_condition: "to sell",
    grains_condition_other: "",
    grains_display_condition: "to sell",
    rice_condition: "to sell",
    rice_condition_other: "",
    rice_display_condition: "to sell",
    
    // Remarks
    remarks: "Harvested last month. Good quality.",
    
    user_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "NSIC RC 148 (MABANGO 2)",
    price: 22.0,
    
    // Detailed sack counts
    sacks_of_grains_25kg: 350,
    sacks_of_grains_50kg: 500,
    sacks_of_rice_25kg: 200,
    sacks_of_rice_50kg: 225,
    
    // Calculated totals
    total_sacks_of_grains: 850,
    total_sacks_of_rice: 425,
    total_weight_grains_kg: (350 * 25) + (500 * 50),
    total_weight_rice_kg: (200 * 25) + (225 * 50),
    
    // Condition categories
    grains_condition: "others",
    grains_condition_other: "For milling",
    grains_display_condition: "For milling",
    rice_condition: "to sell",
    rice_condition_other: "",
    rice_display_condition: "to sell",
    
    // Remarks
    remarks: "Aromatic variety. High market demand.",
    
    user_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "NSIC RC 122 (ANGELICA)",
    price: 40.15,
    
    // Detailed sack counts
    sacks_of_grains_25kg: 1000,
    sacks_of_grains_50kg: 1100,
    sacks_of_rice_25kg: 550,
    sacks_of_rice_50kg: 500,
    
    // Calculated totals
    total_sacks_of_grains: 2100,
    total_sacks_of_rice: 1050,
    total_weight_grains_kg: (1000 * 25) + (1100 * 50),
    total_weight_rice_kg: (550 * 25) + (500 * 50),
    
    // Condition categories
    grains_condition: "to plant",
    grains_condition_other: "",
    grains_display_condition: "to plant",
    rice_condition: "others",
    rice_condition_other: "For storage",
    rice_display_condition: "For storage",
    
    // Remarks
    remarks: "Disease resistant. Store in cool dry place.",
    
    user_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: "NSIC RC 160 (MALAGKIT)",
    price: 35.50,
    
    // Detailed sack counts
    sacks_of_grains_25kg: 800,
    sacks_of_grains_50kg: 600,
    sacks_of_rice_25kg: 400,
    sacks_of_rice_50kg: 300,
    
    // Calculated totals
    total_sacks_of_grains: 1400,
    total_sacks_of_rice: 700,
    total_weight_grains_kg: (800 * 25) + (600 * 50),
    total_weight_rice_kg: (400 * 25) + (300 * 50),
    
    // Condition categories
    grains_condition: "to sell",
    grains_condition_other: "",
    grains_display_condition: "to sell",
    rice_condition: "to dispose",
    rice_condition_other: "",
    rice_display_condition: "to dispose",
    
    // Remarks
    remarks: "Glutinous rice variety. For special occasions.",
    
    user_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    name: "NSIC RC 300 (HIGHLAND)",
    price: 28.75,
    
    // Detailed sack counts
    sacks_of_grains_25kg: 600,
    sacks_of_grains_50kg: 400,
    sacks_of_rice_25kg: 350,
    sacks_of_rice_50kg: 250,
    
    // Calculated totals
    total_sacks_of_grains: 1000,
    total_sacks_of_rice: 600,
    total_weight_grains_kg: (600 * 25) + (400 * 50),
    total_weight_rice_kg: (350 * 25) + (250 * 50),
    
    // Condition categories
    grains_condition: "to plant",
    grains_condition_other: "",
    grains_display_condition: "to plant",
    rice_condition: "to sell",
    rice_condition_other: "",
    rice_display_condition: "to sell",
    
    // Remarks
    remarks: "Highland variety. Suitable for elevated areas.",
    
    user_id: 1,
    created_at: new Date().toISOString(),
  },
];

// Local storage keys
const STORAGE_KEYS = {
  INVENTORY: 'rice_inventory_data',
  LAST_SYNC: 'rice_inventory_last_sync',
  DELIVERIES: 'rice_deliveries_data',
  DELIVERIES_LAST_SYNC: 'rice_deliveries_last_sync'
};

export default function InventoryPage() {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<EditableInventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [user, setUser] = useState<{ id?: number; name?: string; token?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    name: "",
    price: 0,
    
    // Detailed sack counts
    sacks_of_grains_25kg: 0,
    sacks_of_grains_50kg: 0,
    sacks_of_rice_25kg: 0,
    sacks_of_rice_50kg: 0,
    
    // Condition categories
    grains_condition: "to sell",
    grains_condition_other: "",
    rice_condition: "to sell",
    rice_condition_other: "",
    
    // Remarks
    remarks: "",
  });
  
  const [isSaving, setIsSaving] = useState(false);

  // Deliveries state
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [deliveryTab, setDeliveryTab] = useState<'upcoming' | 'completed' | 'returned_cancelled'>('upcoming');
  const [activeTab, setActiveTab] = useState<'inventory' | 'deliveries'>('inventory');
  const [deliveriesLoaded, setDeliveriesLoaded] = useState(false);
  // Helper function to get current local date in YYYY-MM-DD format
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to get current local time in HH:MM format
  const getLocalTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [newDelivery, setNewDelivery] = useState<{
    delivery_date: string;
    delivery_time: string;
    recipient: string;
    destination: string;
    method: 'delivery' | 'pick-up';
    status: 'to be delivered' | 'delivered' | 'cancelled' | 'returned';
    items: DeliveryLineItem[];
    notes: string;
  }>({
    delivery_date: getLocalDate(),
    delivery_time: getLocalTime(),
    recipient: '',
    destination: '',
    method: 'delivery',
    status: 'to be delivered',
    items: [{ variety: '', sack_size_kg: 50, sacks: 1 }],
    notes: '',
  });

  // Load data from localStorage on initial render
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load user from localStorage
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed);
        }
        
        // Try to load preloaded cached data first (from login prefetch)
        const cachedData = getCachedData();
        let inventoryLoaded = false;
        let deliveriesLoaded_local = false;
      
      if (cachedData) {
        // Use preloaded inventory data if available
        if (cachedData.inventory && Array.isArray(cachedData.inventory) && cachedData.inventory.length > 0) {
          const validatedData = cachedData.inventory.map((item: any) => {
            const total_sacks_of_grains = item.sacks_of_grains_25kg + item.sacks_of_grains_50kg;
            const total_sacks_of_rice = item.sacks_of_rice_25kg + item.sacks_of_rice_50kg;
            const total_weight_grains_kg = (item.sacks_of_grains_25kg * 25) + (item.sacks_of_grains_50kg * 50);
            const total_weight_rice_kg = (item.sacks_of_rice_25kg * 25) + (item.sacks_of_rice_50kg * 50);
            
            const grains_display_condition = item.grains_condition === "others" && item.grains_condition_other 
              ? item.grains_condition_other 
              : item.grains_condition;
            
            const rice_display_condition = item.rice_condition === "others" && item.rice_condition_other 
              ? item.rice_condition_other 
              : item.rice_condition;
            
            return {
              ...item,
              total_sacks_of_grains,
              total_sacks_of_rice,
              total_weight_grains_kg,
              total_weight_rice_kg,
              grains_display_condition,
              rice_display_condition,
            };
          });
          const deduplicatedData = deduplicateItems(validatedData);
          setInventoryData(deduplicatedData);
          console.log("✅ Loaded inventory from preloaded cache:", deduplicatedData.length, "items");
          inventoryLoaded = true;
        }
        
        // Use preloaded deliveries data if available
        if (cachedData.deliveries && Array.isArray(cachedData.deliveries)) {
          setDeliveries(cachedData.deliveries);
          console.log("Loaded deliveries from preloaded cache:", cachedData.deliveries.length, "items");
          deliveriesLoaded_local = true;
          setDeliveriesLoaded(true); // Mark as loaded in state
        }
      }
      
      // Fallback to localStorage or backend if no cached data
      if (!inventoryLoaded) {
        // First try loading from backend if user is logged in
        const token = localStorage.getItem('token') || (raw && JSON.parse(raw)?.token);
        if (token) {
          const backendData = await loadInventoryFromBackend();
          if (backendData && backendData.length > 0) {
            const deduplicatedData = deduplicateItems(backendData);
            setInventoryData(deduplicatedData);
            inventoryLoaded = true;
          }
        }
        
        // If backend load failed or no token, try localStorage
        if (!inventoryLoaded) {
          const savedInventory = localStorage.getItem(STORAGE_KEYS.INVENTORY);
          
          if (savedInventory) {
            // Parse and validate the saved data
            const parsedData = JSON.parse(savedInventory);
            
            // Validate that it's an array and has the basic structure
            if (Array.isArray(parsedData) && parsedData.length > 0) {
              // Ensure all items have required fields
              const validatedData = parsedData.map((item: any) => {
                // Calculate totals if they don't exist
                const total_sacks_of_grains = item.sacks_of_grains_25kg + item.sacks_of_grains_50kg;
                const total_sacks_of_rice = item.sacks_of_rice_25kg + item.sacks_of_rice_50kg;
                const total_weight_grains_kg = (item.sacks_of_grains_25kg * 25) + (item.sacks_of_grains_50kg * 50);
                const total_weight_rice_kg = (item.sacks_of_rice_25kg * 25) + (item.sacks_of_rice_50kg * 50);
                
                const grains_display_condition = item.grains_condition === "others" && item.grains_condition_other 
                  ? item.grains_condition_other 
                  : item.grains_condition;
                
                const rice_display_condition = item.rice_condition === "others" && item.rice_condition_other 
                  ? item.rice_condition_other 
                  : item.rice_condition;
                
                return {
                  ...item,
                  total_sacks_of_grains,
                  total_sacks_of_rice,
                  total_weight_grains_kg,
                  total_weight_rice_kg,
                  grains_display_condition,
                  rice_display_condition,
                };
              });
              
              const deduplicatedData = deduplicateItems(validatedData);
              setInventoryData(deduplicatedData);
              console.log("Loaded inventory from localStorage:", deduplicatedData.length, "items");
            } else {
              // If saved data is invalid, start with empty array
              setInventoryData([]);
            }
          } else {
            // No saved data, start with empty array
            setInventoryData([]);
          }
        }
      }
      
      // Fallback: Load deliveries from localStorage if not already loaded from cache
      if (!deliveriesLoaded_local) {
        try {
          const savedDeliveries = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
          if (savedDeliveries) {
            const parsed = JSON.parse(savedDeliveries) as DeliveryRecord[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDeliveries(parsed);
              setDeliveriesLoaded(true);
              console.log("Loaded deliveries from localStorage:", parsed.length, "items");
            }
          }
        } catch (e) {
          console.error('Error loading deliveries from localStorage:', e);
        }
      }
      
      setIsLoading(false);
      
    } catch (e) {
      console.error("Error loading data:", e);
      // On error, start with empty array
      setInventoryData([]);
      setIsLoading(false);
    }
    };
    
    loadData();
  }, []);

  // Load deliveries from backend only when user navigates to deliveries tab
  // Skip if already loaded from cache or localStorage
  useEffect(() => {
    console.log('DeliveriesTab useEffect - activeTab:', activeTab, 'deliveriesLoaded:', deliveriesLoaded, 'hasUserToken:', !!user?.token, 'deliveriesCount:', deliveries.length);
    
    if (activeTab === 'deliveries' && !deliveriesLoaded && user?.token) {
      console.log('Condition met - proceeding with delivery load/auto-complete');
      // Check if we have data - if not, fetch from backend
      if (deliveries.length === 0) {
        console.log('No deliveries in state - fetching from backend');
        loadDeliveriesFromBackend().then(() => {
          setDeliveriesLoaded(true);
        });
      } else {
        // Data from cache - run auto-complete immediately
        console.log('Running auto-complete on cached deliveries:', deliveries.length);
        autoCompleteDueDeliveries(deliveries);
        setDeliveriesLoaded(true);
      }
    } else if (activeTab === 'deliveries' && deliveries.length > 0 && deliveriesLoaded) {
      // Already loaded, but run auto-complete on tab switch
      console.log('Tab switched to deliveries with loaded data, running auto-complete');
      autoCompleteDueDeliveries(deliveries);
    }
  }, [activeTab, user?.token, deliveriesLoaded]);

  // Helper function to save data to localStorage
  const saveToLocalStorage = (data: InventoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      console.log("Saved inventory to localStorage:", data.length, "items");
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  };

  // Helper to save delivery to backend
  const saveDeliveryToBackend = async (delivery: {
    delivery_date: string;
    recipient: string;
    destination: string;
    method: 'delivery' | 'pick-up';
    status: 'to be delivered' | 'delivered' | 'cancelled' | 'returned';
    items: DeliveryLineItem[];
    notes: string;
  }): Promise<boolean> => {
    try {
      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to save deliveries.');
        return false;
      }

      const res = await fetch('http://localhost:5001/api/deliveries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(delivery),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error saving delivery: ${error.message}`);
        return false;
      }

      console.log('Delivery saved to backend successfully');
      return true;
    } catch (e) {
      console.error('Error saving delivery to backend:', e);
      alert('Error saving delivery. Please try again.');
      return false;
    }
  };

  // Helper function to deduplicate inventory items by ID
  const deduplicateItems = (items: InventoryItem[]): InventoryItem[] => {
    const seen = new Set<number>();
    return items.filter(item => {
      if (seen.has(item.id)) {
        console.warn(`Duplicate inventory item ID detected: ${item.id}, removing duplicate`);
        return false;
      }
      seen.add(item.id);
      return true;
    });
  };

  // Helper to load inventory from backend
  const loadInventoryFromBackend = async () => {
    try {
      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping inventory load');
        return [];
      }

      const res = await fetch('http://localhost:5001/api/inventory', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error('Error loading inventory');
        return [];
      }

      const data = await res.json();
      if (data.inventory && Array.isArray(data.inventory)) {
        console.log('Loaded inventory from backend:', data.inventory.length, 'items');
        return data.inventory;
      }
      return [];
    } catch (e) {
      console.error('Error loading inventory from backend:', e);
      return [];
    }
  };

  // Helper to load deliveries from backend
  const loadDeliveriesFromBackend = async () => {
    try {
      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping delivery load');
        return;
      }

      const res = await fetch('http://localhost:5001/api/deliveries', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error('Error loading deliveries');
        return;
      }

      const data = await res.json();
      if (data.deliveries && Array.isArray(data.deliveries)) {
        console.log('Loaded deliveries from backend:', data.deliveries.length, 'items');
        // Set deliveries first
        setDeliveries(data.deliveries);
        // Then run auto-complete
        console.log('Running auto-complete check on', data.deliveries.length, 'deliveries');
        await autoCompleteDueDeliveries(data.deliveries);
      }
    } catch (e) {
      console.error('Error loading deliveries from backend:', e);
    }
  };

  // Helper: update a delivery's status in backend
  // Helper: subtract inventory when delivery is created
  const subtractInventoryForDelivery = (delivery: {
    items: DeliveryLineItem[];
  }) => {
    const updatedInventory = inventoryData.map(inventoryItem => {
      const deliveryItem = delivery.items.find(d => d.variety === inventoryItem.name);
      
      if (!deliveryItem) return inventoryItem;
      
      // Calculate total kg being delivered
      const totalKgDelivered = deliveryItem.sacks * deliveryItem.sack_size_kg;
      
      let remaining = totalKgDelivered;
      let new50KgSacks = inventoryItem.sacks_of_rice_50kg;
      let new25KgSacks = inventoryItem.sacks_of_rice_25kg;
      
      // Subtract from the same sack size as the delivery first
      if (deliveryItem.sack_size_kg === 50) {
        // Subtract from 50kg sacks first
        const sacksFrom50 = Math.min(new50KgSacks, deliveryItem.sacks);
        new50KgSacks -= sacksFrom50;
        remaining -= sacksFrom50 * 50;
        
        // If more needed, subtract from 25kg sacks
        if (remaining > 0) {
          const sacksFrom25 = Math.min(new25KgSacks, Math.ceil(remaining / 25));
          new25KgSacks -= sacksFrom25;
        }
      } else { // deliveryItem.sack_size_kg === 25
        // Subtract from 25kg sacks first
        const sacksFrom25 = Math.min(new25KgSacks, deliveryItem.sacks);
        new25KgSacks -= sacksFrom25;
        remaining -= sacksFrom25 * 25;
        
        // If more needed, subtract from 50kg sacks
        if (remaining > 0) {
          const sacksFrom50 = Math.min(new50KgSacks, Math.ceil(remaining / 50));
          new50KgSacks -= sacksFrom50;
        }
      }
      
      // Calculate new totals
      const total_sacks_of_rice = new50KgSacks + new25KgSacks;
      const total_weight_rice_kg = (new25KgSacks * 25) + (new50KgSacks * 50);
      
      return {
        ...inventoryItem,
        sacks_of_rice_50kg: new50KgSacks,
        sacks_of_rice_25kg: new25KgSacks,
        total_sacks_of_rice,
        total_weight_rice_kg,
      };
    });
    
    const deduplicatedData = deduplicateItems(updatedInventory);
    setInventoryData(deduplicatedData);
  };

  // Helper: add back inventory when delivery is cancelled or returned
  const restoreInventoryForDelivery = (delivery: DeliveryRecord) => {
    const updatedInventory = inventoryData.map(inventoryItem => {
      const deliveryItem = delivery.items.find(d => d.variety === inventoryItem.name);
      
      if (!deliveryItem) return inventoryItem;
      
      // Add back the same sack size that was delivered
      let new50KgSacks = inventoryItem.sacks_of_rice_50kg;
      let new25KgSacks = inventoryItem.sacks_of_rice_25kg;
      
      if (deliveryItem.sack_size_kg === 50) {
        // Add back 50kg sacks
        new50KgSacks += deliveryItem.sacks;
      } else { // deliveryItem.sack_size_kg === 25
        // Add back 25kg sacks
        new25KgSacks += deliveryItem.sacks;
      }
      
      // Calculate new totals
      const total_sacks_of_rice = new50KgSacks + new25KgSacks;
      const total_weight_rice_kg = (new25KgSacks * 25) + (new50KgSacks * 50);
      
      return {
        ...inventoryItem,
        sacks_of_rice_50kg: new50KgSacks,
        sacks_of_rice_25kg: new25KgSacks,
        total_sacks_of_rice,
        total_weight_rice_kg,
      };
    });
    
    const deduplicatedData = deduplicateItems(updatedInventory);
    setInventoryData(deduplicatedData);
  };

  const updateDeliveryStatus = async (deliveryId: number, status: 'to be delivered' | 'delivered' | 'cancelled' | 'returned') => {
    try {
      const token = user?.token || localStorage.getItem('token');
      if (!token) return false;

      // Get the delivery to find out its current status and items
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (!delivery) return false;

      // If changing to cancelled or returned, restore inventory
      if ((status === 'cancelled' || status === 'returned') && delivery.status === 'to be delivered') {
        restoreInventoryForDelivery(delivery);
      }

      const res = await fetch(`http://localhost:5001/api/deliveries/${deliveryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        console.error('Failed to update delivery status');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error updating delivery status:', err);
      return false;
    }
  };

  // Auto-complete: mark due deliveries as delivered
  const autoCompleteDueDeliveries = async (list: DeliveryRecord[]) => {
    // Use local date instead of UTC to avoid timezone issues
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
    
    console.log('Auto-complete check - Today:', today, 'Current time:', currentTime);
    
    const toComplete = list.filter(d => {
      if (d.status !== 'to be delivered') return false;
      
      const deliveryDate = d.delivery_date.slice(0, 10);
      const deliveryTime = (d.delivery_time || '09:00:00').slice(0, 8); // Get HH:MM:SS format
      
      const isDue = deliveryDate < today || (deliveryDate === today && deliveryTime <= currentTime);
      
      if (isDue) {
        console.log('Found due delivery:', d.id, 'Date:', deliveryDate, 'Time:', deliveryTime, 'Recipient:', d.recipient);
      }
      
      return isDue;
    });
    
    console.log('Deliveries due for completion:', toComplete.length);
    
    if (toComplete.length === 0) return;
    try {
      await Promise.all(toComplete.map(d => updateDeliveryStatus(d.id, 'delivered')));
      // Reload to reflect changes after updates
      const token = user?.token || localStorage.getItem('token');
      if (token) {
        const res = await fetch('http://localhost:5001/api/deliveries', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const refreshed = await res.json();
          if (refreshed.deliveries && Array.isArray(refreshed.deliveries)) {
            console.log('Refreshed deliveries after auto-complete');
            setDeliveries(refreshed.deliveries);
          }
        }
      }
    } catch (e) {
      console.error('Auto-complete deliveries failed:', e);
    }
  };

  // Calculate total price for a delivery
  const calculateDeliveryPrice = (delivery: DeliveryRecord): number => {
    return delivery.items.reduce((total, item) => {
      const inventoryItem = inventoryData.find(inv => inv.name === item.variety);
      const pricePerKg = inventoryItem?.price || 0;
      const totalKg = item.sacks * item.sack_size_kg;
      return total + (pricePerKg * totalKg);
    }, 0);
  };

  // Format price with thousands separator and 2 decimal places
  const formatPrice = (price: number): string => {
    return price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Update localStorage whenever inventoryData changes
  useEffect(() => {
    if (!isLoading) {
      saveToLocalStorage(inventoryData);
    }
  }, [inventoryData, isLoading]);

  // Periodically check and auto-complete due deliveries
  useEffect(() => {
    if (activeTab !== 'deliveries' || deliveries.length === 0) return;

    const interval = setInterval(() => {
      autoCompleteDueDeliveries(deliveries);
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [deliveries, activeTab]);

  const handleInventoryClick = (item: InventoryItem) => {
    // Convert to editable format
    const editableItem: EditableInventoryItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      sacks_of_grains_25kg: item.sacks_of_grains_25kg,
      sacks_of_grains_50kg: item.sacks_of_grains_50kg,
      sacks_of_rice_25kg: item.sacks_of_rice_25kg,
      sacks_of_rice_50kg: item.sacks_of_rice_50kg,
      grains_condition: item.grains_condition,
      grains_condition_other: item.grains_condition_other,
      rice_condition: item.rice_condition,
      rice_condition_other: item.rice_condition_other,
      remarks: item.remarks,
      user_id: item.user_id,
      created_at: item.created_at,
    };
    setSelectedInventory(editableItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInventory(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setNewItem({
      name: "",
      price: 0,
      
      // Detailed sack counts
      sacks_of_grains_25kg: 0,
      sacks_of_grains_50kg: 0,
      sacks_of_rice_25kg: 0,
      sacks_of_rice_50kg: 0,
      
      // Condition categories
      grains_condition: "to sell",
      grains_condition_other: "",
      rice_condition: "to sell",
      rice_condition_other: "",
      
      // Remarks
      remarks: "",
    });
  };

  const handleCloseDeliveryModal = () => {
    setIsDeliveryModalOpen(false);
    setNewDelivery({
      delivery_date: getLocalDate(),
      delivery_time: getLocalTime(),
      recipient: '',
      destination: '',
      method: 'delivery',
      status: 'to be delivered',
      items: [{ variety: '', sack_size_kg: 50, sacks: 1 }],
      notes: '',
    });
  };

  const handleSaveInventory = async () => {
    if (!selectedInventory) return;

    setIsSaving(true);
    try {
      // Calculate totals and display conditions
      const total_sacks_of_grains = selectedInventory.sacks_of_grains_25kg + selectedInventory.sacks_of_grains_50kg;
      const total_sacks_of_rice = selectedInventory.sacks_of_rice_25kg + selectedInventory.sacks_of_rice_50kg;
      const total_weight_grains_kg = (selectedInventory.sacks_of_grains_25kg * 25) + (selectedInventory.sacks_of_grains_50kg * 50);
      const total_weight_rice_kg = (selectedInventory.sacks_of_rice_25kg * 25) + (selectedInventory.sacks_of_rice_50kg * 50);
      
      const grains_display_condition = selectedInventory.grains_condition === "others" && selectedInventory.grains_condition_other 
        ? selectedInventory.grains_condition_other 
        : selectedInventory.grains_condition;
      
      const rice_display_condition = selectedInventory.rice_condition === "others" && selectedInventory.rice_condition_other 
        ? selectedInventory.rice_condition_other 
        : selectedInventory.rice_condition;
      
      // Create updated inventory item
      const updatedItem: InventoryItem = {
        ...selectedInventory,
        total_sacks_of_grains,
        total_sacks_of_rice,
        total_weight_grains_kg,
        total_weight_rice_kg,
        grains_display_condition,
        rice_display_condition,
      };
      
      // Save to backend first
      await saveToBackend(updatedItem);
      
      // If successful, update local state
      const updatedInventory = inventoryData.map(item => 
        item.id === selectedInventory.id 
          ? updatedItem
          : item
      );
      const deduplicatedData = deduplicateItems(updatedInventory);
      setInventoryData(deduplicatedData);
      
      setIsModalOpen(false);
      alert("Inventory updated successfully!");
      
    } catch (error: any) {
      console.error("Error updating inventory:", error);
      alert(`Error updating inventory: ${error.message || 'Please try again'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInventory = async () => {
    if (!selectedInventory) return;

    if (!confirm("Are you sure you want to delete this rice variety?")) return;

    try {
      // Delete from backend first
      await deleteFromBackend(selectedInventory.id);
      
      // If successful, update local state
      const updatedInventory = inventoryData.filter(item => item.id !== selectedInventory.id);
      const deduplicatedData = deduplicateItems(updatedInventory);
      setInventoryData(deduplicatedData);
      
      setIsModalOpen(false);
      alert("Rice variety deleted successfully!");
      
    } catch (error: any) {
      console.error("Error deleting inventory:", error);
      alert(`Error deleting rice variety: ${error.message || 'Please try again'}`);
    }
  };

  const handleAddInventory = async () => {
    if (!newItem.name) {
      alert("Please enter a name for the rice variety");
      return;
    }

    setIsSaving(true);
    try {
      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to add inventory items.');
        return;
      }

      // Create the item on backend first
      const response = await fetch('http://localhost:5001/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newItem.name,
          price_per_unit: newItem.price,
          sacks_of_grains_25kg: newItem.sacks_of_grains_25kg,
          sacks_of_grains_50kg: newItem.sacks_of_grains_50kg,
          sacks_of_rice_25kg: newItem.sacks_of_rice_25kg,
          sacks_of_rice_50kg: newItem.sacks_of_rice_50kg,
          grains_condition: newItem.grains_condition,
          grains_condition_other: newItem.grains_condition_other,
          rice_condition: newItem.rice_condition,
          rice_condition_other: newItem.rice_condition_other,
          remarks: newItem.remarks,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add inventory item');
      }

      const result = await response.json();
      
      // Calculate totals
      const total_sacks_of_grains = newItem.sacks_of_grains_25kg + newItem.sacks_of_grains_50kg;
      const total_sacks_of_rice = newItem.sacks_of_rice_25kg + newItem.sacks_of_rice_50kg;
      const total_weight_grains_kg = (newItem.sacks_of_grains_25kg * 25) + (newItem.sacks_of_grains_50kg * 50);
      const total_weight_rice_kg = (newItem.sacks_of_rice_25kg * 25) + (newItem.sacks_of_rice_50kg * 50);
      
      // Determine display conditions
      const grains_display_condition = newItem.grains_condition === "others" && newItem.grains_condition_other 
        ? newItem.grains_condition_other 
        : newItem.grains_condition;
      
      const rice_display_condition = newItem.rice_condition === "others" && newItem.rice_condition_other 
        ? newItem.rice_condition_other 
        : newItem.rice_condition;
      
      // Create new inventory item with ID from backend (result.item.id)
      const newInventoryItem: InventoryItem = {
        id: result.item.id,
        name: newItem.name,
        price: newItem.price,
        
        // Detailed sack counts
        sacks_of_grains_25kg: newItem.sacks_of_grains_25kg,
        sacks_of_grains_50kg: newItem.sacks_of_grains_50kg,
        sacks_of_rice_25kg: newItem.sacks_of_rice_25kg,
        sacks_of_rice_50kg: newItem.sacks_of_rice_50kg,
        
        // Totals
        total_sacks_of_grains,
        total_sacks_of_rice,
        total_weight_grains_kg,
        total_weight_rice_kg,
        
        // Condition categories
        grains_condition: newItem.grains_condition,
        grains_condition_other: newItem.grains_condition_other,
        grains_display_condition,
        rice_condition: newItem.rice_condition,
        rice_condition_other: newItem.rice_condition_other,
        rice_display_condition,
        
        // Remarks
        remarks: newItem.remarks,
        
        user_id: user?.id || 1,
        created_at: new Date().toISOString(),
      };
      
      // Add to local state
      const updatedInventory = [...inventoryData, newInventoryItem];
      const deduplicatedData = deduplicateItems(updatedInventory);
      setInventoryData(deduplicatedData);
      
      handleCloseAddModal();
      alert("Rice variety added successfully!");
      
    } catch (error: any) {
      console.error("Error adding inventory:", error);
      alert(`Error adding rice variety: ${error.message || 'Please try again'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Save or update inventory item to backend
  const saveToBackend = async (item: InventoryItem): Promise<void> => {
    try {
      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, skipping backend save');
        return;
      }

      // Check if this is an update or create by checking if item exists in backend
      const isUpdate = inventoryData.some(inv => inv.id === item.id);
      
      const url = isUpdate 
        ? `http://localhost:5001/api/inventory/${item.id}`
        : 'http://localhost:5001/api/inventory';
      
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: item.name,
          price_per_unit: item.price,
          sacks_of_grains_25kg: item.sacks_of_grains_25kg,
          sacks_of_grains_50kg: item.sacks_of_grains_50kg,
          sacks_of_rice_25kg: item.sacks_of_rice_25kg,
          sacks_of_rice_50kg: item.sacks_of_rice_50kg,
          grains_condition: item.grains_condition,
          grains_condition_other: item.grains_condition_other,
          rice_condition: item.rice_condition,
          rice_condition_other: item.rice_condition_other,
          remarks: item.remarks,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save inventory');
      }

      console.log('Successfully saved to backend');
    } catch (error) {
      console.error('Error saving to backend:', error);
      throw error;
    }
  };

  // Delete inventory item from backend
  const deleteFromBackend = async (itemId: number): Promise<void> => {
    try {
      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        throw new Error('You must be logged in to delete inventory items');
      }

      const response = await fetch(`http://localhost:5001/api/inventory/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete inventory item');
      }

      console.log('Successfully deleted from backend');
    } catch (error) {
      console.error('Error deleting from backend:', error);
      throw error;
    }
  };

  // Save a delivery record
  const handleSaveDelivery = async () => {
    if (!newDelivery.delivery_date || !newDelivery.recipient || !newDelivery.destination) {
      alert('Please complete delivery date, recipient, and destination.');
      return;
    }

    // Validate all items
    for (const [idx, item] of newDelivery.items.entries()) {
      if (!item.variety || item.sacks <= 0) {
        alert(`Please complete item #${idx + 1}: variety and a positive number of sacks.`);
        return;
      }
    }

    // Validate that inventory has sufficient quantity
    for (const [idx, item] of newDelivery.items.entries()) {
      const inventoryItem = inventoryData.find(inv => inv.name === item.variety);
      if (!inventoryItem) {
        alert(`Item #${idx + 1}: "${item.variety}" not found in inventory.`);
        return;
      }
      
      const requiredKg = item.sacks * item.sack_size_kg;
      const availableKg = inventoryItem.total_weight_rice_kg;
      
      if (requiredKg > availableKg) {
        alert(`Item #${idx + 1}: "${item.variety}" has insufficient inventory. Required: ${requiredKg} kg, Available: ${availableKg} kg`);
        return;
      }
    }

    setIsSavingDelivery(true);
    try {
      const success = await saveDeliveryToBackend(newDelivery);
      if (success) {
        // Subtract inventory for the delivery items
        subtractInventoryForDelivery(newDelivery);
        
        // Reload deliveries from backend
        await loadDeliveriesFromBackend();
        setIsDeliveryModalOpen(false);
        handleCloseDeliveryModal();
        alert('Delivery saved successfully! Inventory has been updated.');
      }
    } catch (e) {
      console.error('Error saving delivery:', e);
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const handleSackChange = (
    type: 'grains_25kg' | 'grains_50kg' | 'rice_25kg' | 'rice_50kg', 
    delta: number,
    isEditMode: boolean = false
  ) => {
    if (isEditMode && selectedInventory) {
      const key = `sacks_of_${type}` as keyof EditableInventoryItem;
      const currentValue = selectedInventory[key] as number;
      setSelectedInventory(prev => prev ? { ...prev, [key]: Math.max(0, currentValue + delta) } : null);
    } else {
      const key = `sacks_of_${type}` as keyof typeof newItem;
      const currentValue = newItem[key] as number;
      setNewItem(prev => ({ ...prev, [key]: Math.max(0, currentValue + delta) }));
    }
  };

  const handleSackInputChange = (
    type: 'grains_25kg' | 'grains_50kg' | 'rice_25kg' | 'rice_50kg', 
    value: string,
    isEditMode: boolean = false
  ) => {
    const num = parseInt(value) || 0;
    if (isEditMode && selectedInventory) {
      const key = `sacks_of_${type}` as keyof EditableInventoryItem;
      setSelectedInventory(prev => prev ? { ...prev, [key]: Math.max(0, num) } : null);
    } else {
      const key = `sacks_of_${type}` as keyof typeof newItem;
      setNewItem(prev => ({ ...prev, [key]: Math.max(0, num) }));
    }
  };

  const calculateTotals = (item: EditableInventoryItem) => {
    const total_sacks_of_grains = item.sacks_of_grains_25kg + item.sacks_of_grains_50kg;
    const total_sacks_of_rice = item.sacks_of_rice_25kg + item.sacks_of_rice_50kg;
    const total_weight_grains_kg = (item.sacks_of_grains_25kg * 25) + (item.sacks_of_grains_50kg * 50);
    const total_weight_rice_kg = (item.sacks_of_rice_25kg * 25) + (item.sacks_of_rice_50kg * 50);
    
    const grains_display_condition = item.grains_condition === "others" && item.grains_condition_other 
      ? item.grains_condition_other 
      : item.grains_condition;
    
    const rice_display_condition = item.rice_condition === "others" && item.rice_condition_other 
      ? item.rice_condition_other 
      : item.rice_condition;
    
    return {
      total_sacks_of_grains,
      total_sacks_of_rice,
      total_weight_grains_kg,
      total_weight_rice_kg,
      grains_display_condition,
      rice_display_condition,
    };
  };

  // Function to reset to default data (for testing)
  const resetToDefaultData = () => {
    if (confirm("Are you sure you want to reset all inventory data to default? This cannot be undone.")) {
      const deduplicatedData = deduplicateItems(DEFAULT_SAMPLE_INVENTORY);
      setInventoryData(deduplicatedData);
      saveToLocalStorage(deduplicatedData);
      alert("Inventory reset to default data.");
    }
  };

  // Function to clear all data
  const clearAllData = () => {
    if (confirm("Are you sure you want to clear all inventory data? This cannot be undone.")) {
      setInventoryData([]);
      localStorage.removeItem(STORAGE_KEYS.INVENTORY);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
      alert("All inventory data cleared.");
    }
  };

  // Function to export data to PDF
  const exportData = () => {
    if (inventoryData.length === 0) {
      alert("No data to export.");
      return;
    }

    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow pop-ups to generate PDF.");
      return;
    }

    // Calculate totals
    const totalGrainsSacks = inventoryData.reduce((sum, item) => sum + item.total_sacks_of_grains, 0);
    const totalRiceSacks = inventoryData.reduce((sum, item) => sum + item.total_sacks_of_rice, 0);
    const totalGrainsWeight = inventoryData.reduce((sum, item) => sum + item.total_weight_grains_kg, 0);
    const totalRiceWeight = inventoryData.reduce((sum, item) => sum + item.total_weight_rice_kg, 0);
    
    // MODIFIED: Calculate total value excluding "to dispose" items
    const totalValue = inventoryData.reduce((sum, item) => {
      let grainsValue = 0;
      let riceValue = 0;
      
      // Only include grains value if NOT "to dispose"
      if (item.grains_condition !== "to dispose" && item.grains_display_condition !== "to dispose") {
        grainsValue = item.total_weight_grains_kg * item.price;
      }
      
      // Only include rice value if NOT "to dispose"
      if (item.rice_condition !== "to dispose" && item.rice_display_condition !== "to dispose") {
        riceValue = item.total_weight_rice_kg * item.price;
      }
      
      return sum + grainsValue + riceValue;
    }, 0);

    // HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rice Inventory Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #2d3748; margin-bottom: 5px; }
          .header p { color: #4a5568; }
          .date { text-align: right; margin-bottom: 20px; color: #718096; }
          .summary { 
            background: #f7fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 30px;
            border-left: 4px solid #38a169;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-top: 15px;
          }
          .summary-item {
            text-align: center;
            padding: 10px;
          }
          .summary-value {
            font-size: 24px;
            font-weight: bold;
            color: #2d3748;
          }
          .summary-label {
            font-size: 12px;
            color: #718096;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #edf2f7;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #cbd5e0;
            color: #2d3748;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #4a5568;
          }
          tr:hover {
            background: #f7fafc;
          }
          .total-row {
            background: #ebf8ff !important;
            font-weight: bold;
          }
          .condition-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
          }
          .condition-sell { background: #d4edda; color: #155724; }
          .condition-plant { background: #d1ecf1; color: #0c5460; }
          .condition-dispose { background: #f8d7da; color: #721c24; }
          .condition-other { background: #fff3cd; color: #856404; }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #a0aec0;
            font-size: 12px;
          }
          .value-excluded {
            color: #dc3545;
            text-decoration: line-through;
          }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rice Varieties Inventory Report</h1>
          <p>Detailed inventory of all rice varieties</p>
          <p><small><em>Note: Items marked as "to dispose" are excluded from total value calculation</em></small></p>
        </div>
        
        <div class="date">
          Generated on: ${formatLongDate(new Date())} ${new Date().toLocaleTimeString()}
        </div>
        
        <div class="summary">
          <h3>Summary Overview</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${inventoryData.length}</div>
              <div class="summary-label">Rice Varieties</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${totalGrainsSacks.toLocaleString()}</div>
              <div class="summary-label">Total Grains Sacks</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${totalRiceSacks.toLocaleString()}</div>
              <div class="summary-label">Total Rice Sacks</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">₱${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <div class="summary-label">Total Value<br><small>(excluding "to dispose" items)</small></div>
            </div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Rice Variety</th>
              <th>Price (₱/kg)</th>
              <th>Grains</th>
              <th>Rice</th>
              <th>Grains Condition</th>
              <th>Rice Condition</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${inventoryData.map(item => {
              const grainsWeight = item.total_weight_grains_kg;
              const riceWeight = item.total_weight_rice_kg;
              
              // MODIFIED: Calculate item value excluding "to dispose" conditions
              let grainsValue = 0;
              let riceValue = 0;
              let isGrainsDispose = false;
              let isRiceDispose = false;
              
              // Check if grains should be excluded
              if (item.grains_condition === "to dispose" || item.grains_display_condition === "to dispose") {
                isGrainsDispose = true;
              } else {
                grainsValue = grainsWeight * item.price;
              }
              
              // Check if rice should be excluded
              if (item.rice_condition === "to dispose" || item.rice_display_condition === "to dispose") {
                isRiceDispose = true;
              } else {
                riceValue = riceWeight * item.price;
              }
              
              const totalValue = grainsValue + riceValue;
              const isAnyDispose = isGrainsDispose || isRiceDispose;
              
              // Determine badge class based on condition
              const getConditionClass = (condition: string) => {
                if (condition === "to sell") return "condition-sell";
                if (condition === "to plant") return "condition-plant";
                if (condition === "to dispose") return "condition-dispose";
                return "condition-other";
              };
              
              return `
                <tr>
                  <td><strong>${item.name}</strong></td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>
                    ${item.total_sacks_of_grains.toLocaleString()} sacks<br>
                    <small>${grainsWeight.toLocaleString()} kg</small>
                    ${isGrainsDispose ? '<br><small class="value-excluded">(value excluded)</small>' : ''}
                  </td>
                  <td>
                    ${item.total_sacks_of_rice.toLocaleString()} sacks<br>
                    <small>${riceWeight.toLocaleString()} kg</small>
                    ${isRiceDispose ? '<br><small class="value-excluded">(value excluded)</small>' : ''}
                  </td>
                  <td><span class="condition-badge ${getConditionClass(item.grains_display_condition)}">${item.grains_display_condition}</span></td>
                  <td><span class="condition-badge ${getConditionClass(item.rice_display_condition)}">${item.rice_display_condition}</span></td>
                  <td>
                    ${isAnyDispose ? '<small class="value-excluded">Excluded</small><br>' : ''}
                    <strong>₱${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                  </td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="2"><strong>TOTALS</strong></td>
              <td><strong>${totalGrainsSacks.toLocaleString()} sacks<br>${totalGrainsWeight.toLocaleString()} kg</strong></td>
              <td><strong>${totalRiceSacks.toLocaleString()} sacks<br>${totalRiceWeight.toLocaleString()} kg</strong></td>
              <td colspan="2"></td>
              <td><strong>₱${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>Rice Inventory Management System | Generated on ${formatLongDate(new Date())}</p>
          <p><em>Note: Items marked as "to dispose" are excluded from total value calculation</em></p>
          <p class="no-print">Click Ctrl+P to print or save as PDF</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-brand-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  const totals = selectedInventory ? calculateTotals(selectedInventory) : null;

  return (
    <div className="min-h-full bg-brand-hero">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Rice Varieties Inventory</h1>
              <p className="text-white mt-2">
                {user?.name ? `Welcome, ${user.name}! Manage your rice varieties here.` : "Manage your rice varieties here."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={exportData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 text-sm"
                  title="Export to PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </button>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Rice Variety
              </button>
            </div>
          </div>

          {/* Data Management Info Bar */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-blue-800">Inventory Management</p>
                  <p className="text-sm text-blue-600">
                    {inventoryData.length} rice varieties • Export to PDF for reporting
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetToDefaultData}
                  className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg font-medium hover:bg-amber-200 transition text-sm"
                >
                  Reset to Default
                </button>
                <button
                  onClick={clearAllData}
                  className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg font-medium hover:bg-red-200 transition text-sm"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 flex gap-3">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'inventory'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('deliveries')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'deliveries'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              Deliveries
            </button>
          </div>

          {/* Inventory Tab Content */}
          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Rice Varieties List */}
            <div className="bg-orange-50/90 rounded-2xl shadow-lg border border-green-300/50 overflow-hidden h-[720px] flex flex-col">
              <div className="px-6 py-5 border-b border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Your Rice Varieties</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Click any item to edit</p>
                    </div>
                    <span className="ml-2 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                      {inventoryData.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                </div>
              </div>
              
              {/* Scrollable container for inventory list */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-6">
                  <div className="space-y-4">
                    {inventoryData.length > 0 ? (
                      inventoryData.map((item) => (
                        <div
                          key={item.id}
                          className="group cursor-pointer p-5 rounded-xl border border-slate-200/60 bg-white hover:border-green-300 hover:shadow-md transition-all duration-200"
                          onClick={() => handleInventoryClick(item)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="font-semibold text-slate-900 group-hover:text-green-700 transition-colors truncate">
                                  {item.name}
                                </h3>
                                <span className="px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-md font-semibold flex-shrink-0">
                                  ₱ {formatPrice(item.price)}/kg
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                      </svg>
                                      Grains
                                    </span>
                                    <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded">
                                      {item.total_sacks_of_grains} sacks • {item.total_weight_grains_kg.toLocaleString()} kg
                                    </span>
                                  </div>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                      Rice
                                    </span>
                                    <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded">
                                      {item.total_sacks_of_rice} sacks • {item.total_weight_rice_kg.toLocaleString()} kg
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Grains: {item.grains_display_condition}</span>
                                <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-700 font-medium">Rice: {item.rice_display_condition}</span>
                              </div>
                              {item.remarks && (
                                <p className="text-sm text-slate-600 mt-3 flex items-start gap-1 line-clamp-2">
                                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                  </svg>
                                  <span className="flex-1">{item.remarks}</span>
                                </p>
                              )}
                            </div>
                            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-slate-500 font-medium mt-4">No rice varieties added yet</p>
                        <p className="text-sm text-slate-400 mt-1">Add your first rice variety to get started</p>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                        >
                          Add First Variety
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Details View */}
            <div className="bg-orange-50/90 rounded-2xl shadow-lg border border-green-300/50 overflow-hidden h-[720px] flex flex-col">
              {selectedInventory && totals ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{selectedInventory.name}</h2>
                        <p className="text-3xl font-bold text-green-600 mt-2">P {selectedInventory.price.toFixed(2)}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Inventory Details</h3>
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                            <span className="text-slate-700 font-medium">Grains</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-slate-900">{totals.total_sacks_of_grains.toLocaleString()} sacks</p>
                            <p className="text-lg font-semibold text-green-600">{totals.total_weight_grains_kg.toLocaleString()} kg</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">25kg sacks:</span>
                            <span className="font-medium">{selectedInventory.sacks_of_grains_25kg}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">50kg sacks:</span>
                            <span className="font-medium">{selectedInventory.sacks_of_grains_50kg}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="text-slate-600">Condition: </span>
                          <span className="font-medium">{totals.grains_display_condition}</span>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <span className="text-slate-700 font-medium">Rice</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-slate-900">{totals.total_sacks_of_rice.toLocaleString()} sacks</p>
                            <p className="text-lg font-semibold text-green-600">{totals.total_weight_rice_kg.toLocaleString()} kg</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">25kg sacks:</span>
                            <span className="font-medium">{selectedInventory.sacks_of_rice_25kg}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">50kg sacks:</span>
                            <span className="font-medium">{selectedInventory.sacks_of_rice_50kg}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="text-slate-600">Condition: </span>
                          <span className="font-medium">{totals.rice_display_condition}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Remarks/Notes</h3>
                    {selectedInventory.remarks ? (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-slate-700">{selectedInventory.remarks}</p>
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">No remarks/notes added</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full px-6 py-12">
                  <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-slate-700 font-semibold text-lg">No variety selected</p>
                  <p className="text-sm text-slate-500 mt-2 text-center px-6">Select a rice variety from the list to view its details</p>
                </div>
              )}
            </div>
          </div>
          )}
          {/* Deliveries Tab Content */}
          {activeTab === 'deliveries' && (
            <div className="w-full">
              <div className="bg-orange-50/90 rounded-2xl shadow-lg border border-green-300/50 overflow-hidden h-[720px] flex flex-col">
                <div className="px-6 py-5 flex items-center justify-between mb-0 border-b border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="3" width="15" height="13"></rect>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold text-lg leading-tight">Deliveries</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-tight">Track all shipments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDeliveryModalOpen(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition"
                  >
                    Add Delivery
                  </button>
                </div>

                {deliveries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full px-6 py-12">
                    <p className="text-slate-700 font-semibold text-lg">No deliveries yet</p>
                    <p className="text-sm text-slate-500 mt-2 text-center px-6">Create a delivery record to start tracking shipments</p>
                    <button
                      onClick={() => setIsDeliveryModalOpen(true)}
                      className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition"
                    >
                      Create First Delivery
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {(() => {
                      const upcomingList = deliveries
                        .filter(d => d.status === 'to be delivered')
                        .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
                      const completedList = deliveries
                        .filter(d => d.status === 'delivered')
                        .sort((a, b) => b.delivery_date.localeCompare(a.delivery_date));
                      const returnedCancelledList = deliveries
                        .filter(d => d.status === 'returned' || d.status === 'cancelled')
                        .sort((a, b) => b.delivery_date.localeCompare(a.delivery_date));

                      const tabBtn = (key: 'upcoming' | 'completed' | 'returned_cancelled', label: string, count: number) => (
                        <button
                          onClick={() => setDeliveryTab(key)}
                          className={`${deliveryTab === key ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-800'} px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5`}
                        >
                          <span>{label}</span>
                          <span className={`${deliveryTab === key ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'} px-1.5 py-0.5 rounded text-[10px] font-bold`}>{count}</span>
                        </button>
                      );

                      return (
                        <div className="space-y-5">
                          <div className="flex items-center justify-between">
                            <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1">
                              {tabBtn('upcoming', 'Upcoming', upcomingList.length)}
                              {tabBtn('completed', 'Completed', completedList.length)}
                              {tabBtn('returned_cancelled', 'Returned/Cancelled', returnedCancelledList.length)}
                            </div>
                          </div>

                          {/* Upcoming */}
                          {deliveryTab === 'upcoming' && (
                            <div className="space-y-4">
                              {upcomingList.length === 0 ? (
                                <p className="text-sm text-slate-500">No upcoming deliveries.</p>
                              ) : (
                                upcomingList.map(delivery => (
                                  <div key={delivery.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="font-semibold text-slate-900">{delivery.recipient}</p>
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">#{delivery.id}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{formatLongDate(delivery.delivery_date)}</p>
                                      <p className="text-xs text-slate-500 mt-1">Time: {delivery.delivery_time || '09:00'}</p>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm text-slate-600">{delivery.destination}</p>
                                      <span className={`text-xs px-2 py-1 rounded font-semibold ${delivery.method === 'delivery' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {delivery.method === 'delivery' ? 'Delivery' : 'Pick-up'}
                                      </span>
                                    </div>
                                    <div className="mt-3 text-xs font-semibold text-slate-600 mb-2">Order Details:</div>
                                    <div className="space-y-1 text-sm mb-3">
                                      {delivery.items.map((it, i) => {
                                        const inventoryItem = inventoryData.find(inv => inv.name === it.variety);
                                        const pricePerKg = inventoryItem?.price || 0;
                                        const totalKg = it.sacks * it.sack_size_kg;
                                        const subtotal = pricePerKg * totalKg;
                                        return (
                                          <div key={i} className="flex justify-between text-slate-600">
                                            <span>{it.variety} - {it.sacks}×{it.sack_size_kg}kg</span>
                                            <span className="font-semibold text-blue-600">₱{formatPrice(subtotal)}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {delivery.notes && (
                                      <div className="mt-2 p-3 bg-white/70 rounded">
                                        <div className="text-xs font-semibold text-slate-500 mb-1">Notes</div>
                                        <p className="text-sm text-slate-700">{delivery.notes}</p>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-blue-100 mb-3">
                                      <span className="text-xs text-slate-600">Total Price</span>
                                      <span className="font-bold text-blue-700">₱{formatPrice(calculateDeliveryPrice(delivery))}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => updateDeliveryStatus(delivery.id, 'delivered').then(() => loadDeliveriesFromBackend())}
                                        className="flex-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition font-medium"
                                      >
                                        Complete
                                      </button>
                                      <button
                                        onClick={() => updateDeliveryStatus(delivery.id, 'cancelled').then(() => loadDeliveriesFromBackend())}
                                        className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
                                      >
                                        Cancel Order
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Completed */}
                          {deliveryTab === 'completed' && (
                            <div className="space-y-3">
                              {completedList.length === 0 ? (
                                <p className="text-sm text-slate-500">No completed deliveries.</p>
                              ) : (
                                completedList.map(delivery => (
                                  <div key={delivery.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="font-semibold text-slate-900">{delivery.recipient}</p>
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">#{delivery.id}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{formatLongDate(delivery.delivery_date)}</p>
                                      <p className="text-xs text-slate-500 mt-1">Time: {delivery.delivery_time || '09:00'}</p>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm text-slate-600">{delivery.destination}</p>
                                      <span className={`text-xs px-2 py-1 rounded font-semibold ${delivery.method === 'delivery' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {delivery.method === 'delivery' ? 'Delivery' : 'Pick-up'}
                                      </span>
                                    </div>
                                    <div className="mt-3 text-xs font-semibold text-slate-600 mb-2">Order Details:</div>
                                    <div className="space-y-1 text-sm mb-3">
                                      {delivery.items.map((it, i) => {
                                        const inventoryItem = inventoryData.find(inv => inv.name === it.variety);
                                        const pricePerKg = inventoryItem?.price || 0;
                                        const totalKg = it.sacks * it.sack_size_kg;
                                        const subtotal = pricePerKg * totalKg;
                                        return (
                                          <div key={i} className="flex justify-between text-slate-600">
                                            <span>{it.variety} - {it.sacks}×{it.sack_size_kg}kg</span>
                                            <span className="font-semibold text-green-600">₱{formatPrice(subtotal)}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {delivery.notes && (
                                      <div className="mt-2 p-3 bg-white/70 rounded">
                                        <div className="text-xs font-semibold text-slate-500 mb-1">Notes</div>
                                        <p className="text-sm text-slate-700">{delivery.notes}</p>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-green-100 mb-3">
                                      <span className="text-xs text-slate-600">Total Price</span>
                                      <span className="font-bold text-green-700">₱{formatPrice(calculateDeliveryPrice(delivery))}</span>
                                    </div>
                                    <button
                                      onClick={() => updateDeliveryStatus(delivery.id, 'returned').then(() => loadDeliveriesFromBackend())}
                                      className="w-full px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition font-medium"
                                    >
                                      Return
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Returned/Cancelled */}
                          {deliveryTab === 'returned_cancelled' && (
                            <div className="space-y-3">
                              {returnedCancelledList.length === 0 ? (
                                <p className="text-sm text-slate-500">No returned or cancelled deliveries.</p>
                              ) : (
                                returnedCancelledList.map(delivery => (
                                  <div key={delivery.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="font-semibold text-slate-900">{delivery.recipient}</p>
                                      <span className={`text-xs px-2 py-1 rounded ${delivery.status === 'returned' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                        {delivery.status}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-600">{formatLongDate(delivery.delivery_date)}</p>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm text-slate-600">{delivery.destination}</p>
                                      <span className={`text-xs px-2 py-1 rounded font-semibold ${delivery.method === 'delivery' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {delivery.method === 'delivery' ? 'Delivery' : 'Pick-up'}
                                      </span>
                                    </div>
                                    <div className="mt-3 text-xs font-semibold text-slate-600 mb-2">Order Details:</div>
                                    <div className="space-y-1 text-sm mb-3">
                                      {delivery.items.map((it, i) => {
                                        const inventoryItem = inventoryData.find(inv => inv.name === it.variety);
                                        const pricePerKg = inventoryItem?.price || 0;
                                        const totalKg = it.sacks * it.sack_size_kg;
                                        const subtotal = pricePerKg * totalKg;
                                        return (
                                          <div key={i} className="flex justify-between text-slate-600">
                                            <span>{it.variety} - {it.sacks}×{it.sack_size_kg}kg</span>
                                            <span className="font-semibold text-slate-600">₱{formatPrice(subtotal)}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {delivery.notes && (
                                      <div className="mt-2 p-3 bg-white/70 rounded">
                                        <div className="text-xs font-semibold text-slate-500 mb-1">Notes</div>
                                        <p className="text-sm text-slate-700">{delivery.notes}</p>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                      <span className="text-xs text-slate-600">Total Price</span>
                                      <span className="font-bold text-slate-700">₱{formatPrice(calculateDeliveryPrice(delivery))}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
      {/* Edit Modal */}
      {isModalOpen && selectedInventory && totals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Edit Rice Variety</h2>
                <p className="text-slate-600 mt-1">Update the details for {selectedInventory.name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveInventory}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteInventory}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rice Variety Name *
                  </label>
                  <input
                    type="text"
                    value={selectedInventory.name}
                    onChange={(e) => setSelectedInventory(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., NSIC RC 220 SR (Japonica 1)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price per Unit (PHP)
                  </label>
                  <input
                    type="number"
                    value={selectedInventory.price}
                    onChange={(e) => setSelectedInventory(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Grains Inventory</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-700 font-bold">25</span>
                          </div>
                          <span className="text-slate-700 font-medium">25kg Sacks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSackChange('grains_25kg', -1, true)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Decrease 25kg sacks of grains"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            value={selectedInventory.sacks_of_grains_25kg}
                            onChange={(e) => handleSackInputChange('grains_25kg', e.target.value, true)}
                            className="font-bold text-lg w-16 text-center text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                            min="0"
                          />
                          <button
                            onClick={() => handleSackChange('grains_25kg', 1, true)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Increase 25kg sacks of grains"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Weight: <span className="font-medium">{(selectedInventory.sacks_of_grains_25kg * 25).toLocaleString()} kg</span>
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-700 font-bold">50</span>
                          </div>
                          <span className="text-slate-700 font-medium">50kg Sacks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSackChange('grains_50kg', -1, true)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Decrease 50kg sacks of grains"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            value={selectedInventory.sacks_of_grains_50kg}
                            onChange={(e) => handleSackInputChange('grains_50kg', e.target.value, true)}
                            className="font-bold text-lg w-16 text-center text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                            min="0"
                          />
                          <button
                            onClick={() => handleSackChange('grains_50kg', 1, true)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Increase 50kg sacks of grains"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Weight: <span className="font-medium">{(selectedInventory.sacks_of_grains_50kg * 50).toLocaleString()} kg</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Grains Condition
                    </label>
                    <select
                      value={selectedInventory.grains_condition}
                      onChange={(e) => setSelectedInventory(prev => prev ? { 
                        ...prev, 
                        grains_condition: e.target.value, 
                        grains_condition_other: e.target.value === "others" ? prev.grains_condition_other : "" 
                      } : null)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {GRAINS_CONDITION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {selectedInventory.grains_condition === "others" && (
                      <input
                        type="text"
                        value={selectedInventory.grains_condition_other}
                        onChange={(e) => setSelectedInventory(prev => prev ? { ...prev, grains_condition_other: e.target.value } : null)}
                        className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Specify condition..."
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Rice Inventory</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <span className="text-amber-700 font-bold">25</span>
                          </div>
                          <span className="text-slate-700 font-medium">25kg Sacks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSackChange('rice_25kg', -1, true)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Decrease 25kg sacks of rice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            value={selectedInventory.sacks_of_rice_25kg}
                            onChange={(e) => handleSackInputChange('rice_25kg', e.target.value, true)}
                            className="font-bold text-lg w-16 text-center text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                            min="0"
                          />
                          <button
                            onClick={() => handleSackChange('rice_25kg', 1, true)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Increase 25kg sacks of rice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Weight: <span className="font-medium">{(selectedInventory.sacks_of_rice_25kg * 25).toLocaleString()} kg</span>
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <span className="text-amber-700 font-bold">50</span>
                          </div>
                          <span className="text-slate-700 font-medium">50kg Sacks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSackChange('rice_50kg', -1, true)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Decrease 50kg sacks of rice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            value={selectedInventory.sacks_of_rice_50kg}
                            onChange={(e) => handleSackInputChange('rice_50kg', e.target.value, true)}
                            className="font-bold text-lg w-16 text-center text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                            min="0"
                          />
                          <button
                            onClick={() => handleSackChange('rice_50kg', 1, true)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Increase 50kg sacks of rice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Weight: <span className="font-medium">{(selectedInventory.sacks_of_rice_50kg * 50).toLocaleString()} kg</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Rice Condition
                    </label>
                    <select
                      value={selectedInventory.rice_condition}
                      onChange={(e) => setSelectedInventory(prev => prev ? { 
                        ...prev, 
                        rice_condition: e.target.value, 
                        rice_condition_other: e.target.value === "others" ? prev.rice_condition_other : "" 
                      } : null)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {RICE_CONDITION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {selectedInventory.rice_condition === "others" && (
                      <input
                        type="text"
                        value={selectedInventory.rice_condition_other}
                        onChange={(e) => setSelectedInventory(prev => prev ? { ...prev, rice_condition_other: e.target.value } : null)}
                        className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Specify condition..."
                      />
                    )}
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-600">Total Grains Sacks:</p>
                      <p className="font-bold text-lg text-slate-900">
                        {totals.total_sacks_of_grains}
                      </p>
                      <p className="text-slate-600">
                        Total Weight: <span className="font-medium">
                          {totals.total_weight_grains_kg.toLocaleString()} kg
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Total Rice Sacks:</p>
                      <p className="font-bold text-lg text-slate-900">
                        {totals.total_sacks_of_rice}
                      </p>
                      <p className="text-slate-600">
                        Total Weight: <span className="font-medium">
                          {totals.total_weight_rice_kg.toLocaleString()} kg
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Remarks/Notes (Optional)
                  </label>
                  <textarea
                    value={selectedInventory.remarks}
                    onChange={(e) => setSelectedInventory(prev => prev ? { ...prev, remarks: e.target.value } : null)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
                    placeholder="Add any remarks or notes about this rice variety..."
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    This will help you remember important details about this rice variety
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Add New Rice Variety</h2>
                <p className="text-slate-600 mt-1">Enter details for your new rice variety</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddInventory}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    "Add"
                  )}
                </button>
                <button
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rice Variety Name *
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., NSIC RC 220 SR (Japonica 1)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price per Unit (PHP)
                  </label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Grains Inventory</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-700 font-bold">25</span>
                          </div>
                          <span className="text-slate-700 font-medium">25kg Sacks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSackChange('grains_25kg', -1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Decrease 25kg sacks of grains"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            value={newItem.sacks_of_grains_25kg}
                            onChange={(e) => handleSackInputChange('grains_25kg', e.target.value)}
                            className="font-bold text-lg w-16 text-center text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                            min="0"
                          />
                          <button
                            onClick={() => handleSackChange('grains_25kg', 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Increase 25kg sacks of grains"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Weight: <span className="font-medium">{(newItem.sacks_of_grains_25kg * 25).toLocaleString()} kg</span>
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-700 font-bold">50</span>
                          </div>
                          <span className="text-slate-700 font-medium">50kg Sacks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSackChange('grains_50kg', -1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Decrease 50kg sacks of grains"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            value={newItem.sacks_of_grains_50kg}
                            onChange={(e) => handleSackInputChange('grains_50kg', e.target.value)}
                            className="font-bold text-lg w-16 text-center text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                            min="0"
                          />
                          <button
                            onClick={() => handleSackChange('grains_50kg', 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Increase 50kg sacks of grains"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Weight: <span className="font-medium">{(newItem.sacks_of_grains_50kg * 50).toLocaleString()} kg</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Grains Condition
                    </label>
                    <select
                      value={newItem.grains_condition}
                      onChange={(e) => setNewItem(prev => ({ ...prev, grains_condition: e.target.value, grains_condition_other: e.target.value === "others" ? prev.grains_condition_other : "" }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {GRAINS_CONDITION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {newItem.grains_condition === "others" && (
                      <input
                        type="text"
                        value={newItem.grains_condition_other}
                        onChange={(e) => setNewItem(prev => ({ ...prev, grains_condition_other: e.target.value }))}
                        className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Specify condition..."
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Rice Inventory</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <span className="text-amber-700 font-bold">25</span>
                          </div>
                          <span className="text-slate-700 font-medium">25kg Sacks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSackChange('rice_25kg', -1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Decrease 25kg sacks of rice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            value={newItem.sacks_of_rice_25kg}
                            onChange={(e) => handleSackInputChange('rice_25kg', e.target.value)}
                            className="font-bold text-lg w-16 text-center text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                            min="0"
                          />
                          <button
                            onClick={() => handleSackChange('rice_25kg', 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Increase 25kg sacks of rice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Weight: <span className="font-medium">{(newItem.sacks_of_rice_25kg * 25).toLocaleString()} kg</span>
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <span className="text-amber-700 font-bold">50</span>
                          </div>
                          <span className="text-slate-700 font-medium">50kg Sacks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSackChange('rice_50kg', -1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Decrease 50kg sacks of rice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <input
                            type="number"
                            value={newItem.sacks_of_rice_50kg}
                            onChange={(e) => handleSackInputChange('rice_50kg', e.target.value)}
                            className="font-bold text-lg w-16 text-center text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                            min="0"
                          />
                          <button
                            onClick={() => handleSackChange('rice_50kg', 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition"
                            aria-label="Increase 50kg sacks of rice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        Weight: <span className="font-medium">{(newItem.sacks_of_rice_50kg * 50).toLocaleString()} kg</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Rice Condition
                    </label>
                    <select
                      value={newItem.rice_condition}
                      onChange={(e) => setNewItem(prev => ({ ...prev, rice_condition: e.target.value, rice_condition_other: e.target.value === "others" ? prev.rice_condition_other : "" }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {RICE_CONDITION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {newItem.rice_condition === "others" && (
                      <input
                        type="text"
                        value={newItem.rice_condition_other}
                        onChange={(e) => setNewItem(prev => ({ ...prev, rice_condition_other: e.target.value }))}
                        className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Specify condition..."
                      />
                    )}
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Total Grains Sacks:</p>
                      <p className="font-bold text-lg text-slate-900">
                        {newItem.sacks_of_grains_25kg + newItem.sacks_of_grains_50kg}
                      </p>
                      <p className="text-slate-600">
                        Total Weight: <span className="font-medium">
                          {(newItem.sacks_of_grains_25kg * 25 + newItem.sacks_of_grains_50kg * 50).toLocaleString()} kg
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Total Rice Sacks:</p>
                      <p className="font-bold text-lg text-slate-900">
                        {newItem.sacks_of_rice_25kg + newItem.sacks_of_rice_50kg}
                      </p>
                      <p className="text-slate-600">
                        Total Weight: <span className="font-medium">
                          {(newItem.sacks_of_rice_25kg * 25 + newItem.sacks_of_rice_50kg * 50).toLocaleString()} kg
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Remarks/Notes (Optional)
                  </label>
                  <textarea
                    value={newItem.remarks}
                    onChange={(e) => setNewItem(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
                    placeholder="Add any remarks or notes about this rice variety..."
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    This will help you remember important details about this rice variety
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Modal */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h10v8H3zM13 10h4l3 3v2h-7V10z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Add Delivery</h2>
                  <p className="text-slate-600 mt-1">Record a delivery transaction</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDelivery}
                  disabled={isSavingDelivery}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSavingDelivery ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Delivery'
                  )}
                </button>
                <button
                  onClick={handleCloseDeliveryModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Date *</label>
                    <input
                      type="date"
                      value={newDelivery.delivery_date}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, delivery_date: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Time *</label>
                    <input
                      type="time"
                      value={newDelivery.delivery_time}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, delivery_time: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Recipient/Customer *</label>
                  <input
                    type="text"
                    value={newDelivery.recipient}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, recipient: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Juan Dela Cruz"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Method *</label>
                    <select
                      value={newDelivery.method}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, method: e.target.value as 'delivery' | 'pick-up' }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="delivery">Delivery</option>
                      <option value="pick-up">Pick-up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
                    <select
                      value={newDelivery.status}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, status: e.target.value as 'to be delivered' | 'delivered' | 'cancelled' | 'returned' }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="to be delivered">To be delivered</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="returned">Returned</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
                  <input
                    type="text"
                    value={newDelivery.destination}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, destination: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Barangay San Isidro, Nueva Ecija"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-4">Delivery Items *</label>
                  
                  {newDelivery.items.map((item, idx) => (
                    <div key={idx} className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-9 gap-3 mb-3">
                        <div className="md:col-span-5">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Variety</label>
                          <select
                            value={item.variety}
                            onChange={(e) => setNewDelivery(prev => ({
                              ...prev,
                              items: prev.items.map((row, i) => i === idx ? { ...row, variety: e.target.value } : row)
                            }))}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Select variety</option>
                            {inventoryData.map(v => (
                              <option key={v.id} value={v.name}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Sack Size</label>
                          <select
                            value={item.sack_size_kg}
                            onChange={(e) => setNewDelivery(prev => ({
                              ...prev,
                              items: prev.items.map((row, i) => i === idx ? { ...row, sack_size_kg: Number(e.target.value) as 25 | 50 } : row)
                            }))}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value={25}>25 kg</option>
                            <option value={50}>50 kg</option>
                          </select>
                        </div>
                        
                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Sacks</label>
                          <input
                            type="number"
                            min={1}
                            value={item.sacks}
                            onChange={(e) => setNewDelivery(prev => ({
                              ...prev,
                              items: prev.items.map((row, i) => i === idx ? { ...row, sacks: Math.max(0, parseInt(e.target.value) || 0) } : row)
                            }))}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="1"
                          />
                        </div>
                        
                        <div className="md:col-span-1">
                          <button
                            onClick={() => {
                              if (newDelivery.items.length > 1) {
                                setNewDelivery(prev => ({
                                  ...prev,
                                  items: prev.items.filter((_, i) => i !== idx)
                                }));
                              }
                            }}
                            disabled={newDelivery.items.length === 1}
                            className="w-full px-3 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600">
                        Qty: <span className="font-semibold">{item.sacks * item.sack_size_kg} kg</span>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      setNewDelivery(prev => ({
                        ...prev,
                        items: [...prev.items, { variety: '', sack_size_kg: 25, sacks: 1 }]
                      }));
                    }}
                    className="w-full px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium"
                  >
                    + Add another item
                  </button>
                  
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-slate-600">
                      Total Quantity: <span className="font-semibold text-green-700">{newDelivery.items.reduce((sum, it) => sum + it.sacks * it.sack_size_kg, 0)} kg</span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={newDelivery.notes}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
                    placeholder="Additional delivery details..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close main containers */}
        </div>
      </div>
    </div>
  );
}

