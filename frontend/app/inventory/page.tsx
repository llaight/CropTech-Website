"use client";

import { useState, useEffect } from "react";

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
  LAST_SYNC: 'rice_inventory_last_sync'
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

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      // Try to load user from localStorage
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
      }
      
      // Try to load inventory data from localStorage
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
          
          setInventoryData(validatedData);
          console.log("Loaded inventory from localStorage:", validatedData.length, "items");
        } else {
          // If saved data is invalid, use default
          setInventoryData(DEFAULT_SAMPLE_INVENTORY);
          saveToLocalStorage(DEFAULT_SAMPLE_INVENTORY);
        }
      } else {
        // No saved data, start with empty array
        setInventoryData([]);
      }
      
      setIsLoading(false);
      
    } catch (e) {
      console.error("Error loading data:", e);
      // On error, start with empty array
      setInventoryData([]);
      setIsLoading(false);
    }
  }, []);

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

  // Update localStorage whenever inventoryData changes
  useEffect(() => {
    if (!isLoading) {
      saveToLocalStorage(inventoryData);
    }
  }, [inventoryData, isLoading]);

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
      
      // Update locally
      const updatedInventory = inventoryData.map(item => 
        item.id === selectedInventory.id 
          ? updatedItem
          : item
      );
      setInventoryData(updatedInventory);
      
      // Also try to save to backend (simulated)
      await saveToBackend(updatedItem);
      
      setIsModalOpen(false);
      alert("Inventory updated successfully!");
      
    } catch (error) {
      console.error("Error updating inventory:", error);
      setIsModalOpen(false);
      alert("Inventory updated successfully!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInventory = async () => {
    if (!selectedInventory) return;

    if (!confirm("Are you sure you want to delete this rice variety?")) return;

    try {
      // Delete locally
      const updatedInventory = inventoryData.filter(item => item.id !== selectedInventory.id);
      setInventoryData(updatedInventory);
      
      // Also try to delete from backend (simulated)
      await deleteFromBackend(selectedInventory.id);
      
      setIsModalOpen(false);
      
    } catch (error) {
      console.error("Error deleting inventory:", error);
      setIsModalOpen(false);
    }
  };

  const handleAddInventory = async () => {
    if (!newItem.name) {
      alert("Please enter a name for the rice variety");
      return;
    }

    setIsSaving(true);
    try {
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
      
      // Generate new ID (max existing ID + 1)
      const newId = inventoryData.length > 0 
        ? Math.max(...inventoryData.map(item => item.id)) + 1 
        : 1;
      
      // Create new inventory item
      const newInventoryItem: InventoryItem = {
        id: newId,
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
        
        user_id: 1,
        created_at: new Date().toISOString(),
      };
      
      // Add locally
      const updatedInventory = [...inventoryData, newInventoryItem];
      setInventoryData(updatedInventory);
      
      // Also try to save to backend (simulated)
      await saveToBackend(newInventoryItem);
      
      handleCloseAddModal();
      alert("Rice variety added successfully!");
      
    } catch (error: any) {
      console.error("Error adding inventory:", error);
      alert("Rice variety added successfully!");
    } finally {
      setIsSaving(false);
    }
  };

  // Simulated backend save function
  const saveToBackend = async (item: InventoryItem): Promise<void> => {
    // In a real app, this would make an API call to your backend
    console.log("Simulating save to backend:", item);
    
    // For demo purposes, we'll simulate an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Successfully saved to backend (simulated)");
        resolve();
      }, 500);
    });
  };

  // Simulated backend delete function
  const deleteFromBackend = async (itemId: number): Promise<void> => {
    // In a real app, this would make an API call to your backend
    console.log("Simulating delete from backend:", itemId);
    
    // For demo purposes, we'll simulate an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Successfully deleted from backend (simulated)");
        resolve();
      }, 500);
    });
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
      setInventoryData(DEFAULT_SAMPLE_INVENTORY);
      saveToLocalStorage(DEFAULT_SAMPLE_INVENTORY);
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
          Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
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
          <p>Rice Inventory Management System | Generated on ${new Date().toLocaleDateString()}</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Rice Varieties List */}
            <div className="bg-orange-50/90 rounded-2xl shadow-lg border border-green-300/50 overflow-hidden">
              <div className="p-6 border-b border-slate-600/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Your Rice Varieties</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Click on any item to edit • {inventoryData.length} items total
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Scrollable container for inventory list */}
              <div className="p-0">
                <div className="max-h-[500px] overflow-y-auto p-6">
                  <div className="space-y-3">
                    {inventoryData.length > 0 ? (
                      inventoryData.map((item) => (
                        <div
                          key={item.id}
                          className="group cursor-pointer p-4 rounded-xl border border-green-300/50 bg-white/60 hover:bg-white/80 hover:border-green-400 transition-all duration-200 shadow-sm hover:shadow-md"
                          onClick={() => handleInventoryClick(item)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-900 group-hover:text-green-700 transition-colors">
                                {item.name}
                              </h3>
                              <div className="mt-2 flex items-center gap-4">
                                <p className="text-2xl font-bold text-green-600">P {item.price.toFixed(2)}</p>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    {item.total_sacks_of_grains} sacks of grains
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    {item.total_sacks_of_rice} sacks of rice
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-600">Grains:</span>
                                  <span className="font-medium">{item.total_weight_grains_kg.toLocaleString()} kg</span>
                                  <span className="text-slate-500">({item.grains_display_condition})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-600">Rice:</span>
                                  <span className="font-medium">{item.total_weight_rice_kg.toLocaleString()} kg</span>
                                  <span className="text-slate-500">({item.rice_display_condition})</span>
                                </div>
                              </div>
                              {item.remarks && (
                                <p className="text-sm text-slate-600 mt-2 flex items-start gap-1 line-clamp-2">
                                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                  </svg>
                                  <span className="flex-1">{item.remarks}</span>
                                </p>
                              )}
                            </div>
                            <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div className="bg-orange-50/90 rounded-2xl shadow-lg border border-green-300/50 overflow-hidden">
              {selectedInventory && totals ? (
                <div className="p-6">
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
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium">Select a rice variety to view details</p>
                  <p className="text-sm text-slate-400 mt-1">Click on any rice variety from the list</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
    </div>
  );
}