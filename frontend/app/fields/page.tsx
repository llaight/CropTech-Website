"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import dynamic from "next/dynamic";
import { getCachedData } from "../lib/dataPreloader";

const LeafletMap = dynamic(() => import("./components/LeafletMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse" />,
});


type MapType = "leaflet";

interface FieldData {
  id: number;
  name: string;
  crop: string;
  coordinates: [number, number][];
  center: [number, number];
  area_ha?: number | null;
  status?: string | null;
  city?: string | null;
  state?: string | null;
  planting_date?: string | null;
  health_status?: string | null;
}

// Helper function to get planting status
function getPlantingStatus(plantingDate: string | null | undefined): string {
  if (!plantingDate) return "No planting date";
  
  const planted = new Date(plantingDate);
  const now = new Date();
  const diffTime = now.getTime() - planted.getTime();
  const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average month length
  
  if (diffMonths < 0) {
    const monthsUntil = Math.abs(diffMonths);
    if (monthsUntil === 0) return "To be planted soon";
    return `To be planted in ${monthsUntil} month${monthsUntil === 1 ? '' : 's'}`;
  } else if (diffMonths === 0) {
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Planted today";
    if (diffDays === 1) return "Planted yesterday";
    return `Planted ${diffDays} days ago`;
  } else {
    return `Planted ${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  }
}

export default function LandTrackerPage() {
  const activeMap: MapType = "leaflet";
  const [address, setAddress] = useState("");
  const [searchCoords, setSearchCoords] = useState<[number, number] | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [fields, setFields] = useState<FieldData[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [pendingCenter, setPendingCenter] = useState<[number, number] | null>(null);
  const [pendingPolygon, setPendingPolygon] = useState<[number, number][]>([]);
  const [inventoryCrops, setInventoryCrops] = useState<string[]>([]);
  const [fieldForm, setFieldForm] = useState({
    name: "",
    cropName: "",
    areaHa: "",
    status: "available",
    plantingDate: "",
    expectedYield: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUserId(parsed.id || parsed.user_id || null);
      }
    } catch (e) {
      // ignore
    }
  }, []);
  const router = useRouter();

  // Load saved fields from backend for this user
  useEffect(() => {
    (async () => {
      try {
        // Ensure we have a user id so we only fetch that user's fields
        if (!userId) {
          console.log('No user id yet, skipping fields load');
          return;
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          console.log('No token found, skipping fields load');
          return;
        }

        const headers: any = { 'Content-Type': 'application/json' };
        headers['Authorization'] = `Bearer ${token}`;

        console.log('Checking for cached fields/inventory data...');
        // Try to load from cache first
        const cachedData = getCachedData();
        let fieldsData = cachedData?.fields || [];
        let inventoryData = cachedData?.inventory || [];
        let fromCache = false;

        if (fieldsData && Array.isArray(fieldsData) && fieldsData.length > 0) {
          console.log('Loaded fields from cache:', fieldsData.length, 'items');
          fromCache = true;
        } else {
          // If no cached data, fetch from backend
          console.log('No cache found, fetching fields from backend...');
          let fieldsUrl = 'http://localhost:5001/api/fields';
          if (userId) fieldsUrl += `?user_id=${userId}`;
          
          const fRes = await fetch(fieldsUrl, { headers });
          if (!fRes.ok) {
            console.warn('Failed to load fields', await fRes.text());
            return;
          }
          const fData = await fRes.json().catch(() => ({}));
          fieldsData = fData.fields || [];
          console.log('Loaded fields from backend:', fieldsData.length, 'items');
        }

        // Fetch crop names from dedicated endpoint
        let cropsFromInventory: string[] = [];
        try {
          let cropsUrl = 'http://localhost:5001/api/inventory/crops';
          if (userId) cropsUrl += `?user_id=${userId}`;
          const cropsRes = await fetch(cropsUrl, { headers });
          if (cropsRes.ok) {
            const cropsJson = await cropsRes.json().catch(() => ({}));
            cropsFromInventory = (cropsJson.crops || []).map((c: any) => c.name || c).filter(Boolean);
            console.log('Loaded crops from inventory/crops endpoint:', cropsFromInventory.length, 'crops');
          }
        } catch (err) {
          console.warn('Failed to load crops from inventory', err);
        }

        if (!fieldsData || !Array.isArray(fieldsData)) {
          console.warn('Invalid fields data received:', fieldsData);
          return;
        }

        const fetchedFields = fieldsData.map((f: any) => {
          let center: [number, number] = [0, 0];
          try {
            if (f.location && typeof f.location === 'string' && f.location.includes(',')) {
              const [latS, lngS] = f.location.split(',');
              const lat = parseFloat(latS);
              const lng = parseFloat(lngS);
              if (!Number.isNaN(lat) && !Number.isNaN(lng)) center = [lat, lng];
            }
          } catch (e) {
            console.error('Error parsing location:', e);
          }

          return {
            id: f.id,
            name: f.name || `Field ${f.id}`,
            crop: f.crop_name || '',
            area_ha: f.area_ha ?? null,
            status: f.status || 'available',
            coordinates: [],
            center,
            city: f.city || null,
            state: f.state || null,
            planting_date: null, // Will be populated from crops API
            health_status: null, // Will be populated from crops API
          } as FieldData;
        });

        // Fetch crop data for each field to get planting dates (always fetch, regardless of cache)
        for (let i = 0; i < fetchedFields.length; i++) {
          const ff = fetchedFields[i];
          try {
            // Fetch crop data for this field
            const cropRes = await fetch(`http://localhost:5001/api/crops?field_id=${ff.id}`, { headers });
            if (cropRes.ok) {
              const cropData = await cropRes.json().catch(() => ({}));
              if (cropData.crops && Array.isArray(cropData.crops) && cropData.crops.length > 0) {
                const firstCrop = cropData.crops[0];
                // Get the first (or most recent) crop's planting date
                ff.planting_date = firstCrop.planting_date || null;
                ff.health_status = firstCrop.health_status || null;
                // Auto-mark status occupied when any crop exists
                ff.status = 'occupied';
                // Fill crop name if missing
                if (!ff.crop && firstCrop.name) ff.crop = firstCrop.name;
                console.log(`Loaded planting date for field ${ff.id}: ${ff.planting_date}`);
              }
            } else {
              console.warn(`Failed to fetch crops for field ${ff.id}: ${cropRes.status}`);
            }
          } catch (e) {
            console.error(`Error fetching crops for field ${ff.id}:`, e);
          }
        }

        // update UI
        console.log('Setting fields:', fetchedFields.length, 'fields to display');
        setFields(fetchedFields as FieldData[]);
        setInventoryCrops(cropsFromInventory);
      } catch (err) {
        console.error('Error loading saved fields:', err);
      }
    })();
  }, [userId]);

  const handleAddressSearch = async () => {
    if (!address.trim()) return;

    try {
      // Use OpenStreetMap Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            "User-Agent": "CropTech Field Tracking"
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setSearchCoords([lat, lon]);
      } else {
        alert("Address not found. Please try a different location.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("Error searching address. Please try again.");
    }
  };

  const handleFieldModalClose = () => {
    setIsFieldModalOpen(false);
  };

  const handleFieldSave = async () => {
    if (!pendingCenter || pendingPolygon.length === 0) {
      setIsFieldModalOpen(false);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const storedUserRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;

    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const areaVal = fieldForm.areaHa ? parseFloat(fieldForm.areaHa) : null;
    const cropName = fieldForm.cropName.trim();
    const statusVal = cropName ? 'occupied' : 'available';
    const fieldBody: any = {
      location: `${pendingCenter[0]},${pendingCenter[1]}`,
      status: statusVal,
    };
    if (!Number.isNaN(areaVal) && areaVal !== null) fieldBody.area_ha = areaVal;
    if (fieldForm.name.trim()) fieldBody.name = fieldForm.name.trim();
    if (!token && storedUser && (storedUser.id || storedUser.user_id)) fieldBody.user_id = storedUser.id || storedUser.user_id;

    let createdField: any = null;

    try {
      const fRes = await fetch('http://localhost:5001/api/fields', {
        method: 'POST',
        headers,
        body: JSON.stringify(fieldBody),
      });

      if (fRes.ok) {
        const fData = await fRes.json().catch(() => ({}));
        createdField = fData.field;
      } else {
        console.warn('Field creation failed', await fRes.text());
      }
    } catch (err) {
      console.warn('Network error creating field', err);
    }

    // Create optional crop if provided and field was created
    if (cropName && createdField?.id) {
      const plantingDate = fieldForm.plantingDate || new Date().toISOString().slice(0,10);
      
      // Calculate expected harvest date as 120 days from planting date
      const plantingDateObj = new Date(plantingDate);
      const expectedHarvestDateObj = new Date(plantingDateObj);
      expectedHarvestDateObj.setDate(expectedHarvestDateObj.getDate() + 120);
      const expectedHarvestDate = expectedHarvestDateObj.toISOString().split('T')[0];
      
      const cropBody: any = {
        name: cropName,
        field_id: createdField.id,
        planting_date: plantingDate,
        expected_harvest_date: expectedHarvestDate,
        health_status: 'Good', // Default health status for new crops
      };
      if (fieldForm.expectedYield && !Number.isNaN(parseFloat(fieldForm.expectedYield))) {
        cropBody.expected_yield_kg = parseFloat(fieldForm.expectedYield);
      }
      if (!token && storedUser && (storedUser.id || storedUser.user_id)) cropBody.user_id = storedUser.id || storedUser.user_id;

      try {
        const cRes = await fetch('http://localhost:5001/api/crops', {
          method: 'POST',
          headers,
          body: JSON.stringify(cropBody),
        });
        if (!cRes.ok) {
          console.warn('Crop creation failed', await cRes.text());
        }
      } catch (err) {
        console.warn('Network error creating crop', err);
      }
    }

    const newField: FieldData = {
      id: createdField?.id || Date.now(),
      name: createdField?.name || fieldForm.name || `Field ${fields.length + 1}`,
      crop: cropName || '',
      coordinates: pendingPolygon,
      center: pendingCenter,
      area_ha: createdField?.area_ha ?? areaVal ?? null,
      status: createdField?.status || statusVal,
      planting_date: cropName ? fieldForm.plantingDate : null,
      health_status: cropName ? 'Good' : null,
    };

    setFields((prev) => [...prev, newField]);
    setIsDrawingMode(false);
    setPolygonPoints([]);
    setPendingCenter(null);
    setPendingPolygon([]);
    setFieldForm({ name: '', cropName: '', areaHa: '', status: 'available', plantingDate: '', expectedYield: '' });
    setIsFieldModalOpen(false);
  };

  return (
    <>
    <div className="min-h-screen bg-brand-hero">

      {/* Map and Fields Side by Side */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-0">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Map Container */}
          <div className="lg:col-span-7">
            {/* Search Bar */}
            <div className="mb-4 bg-orange-50/90 rounded-2xl shadow-lg border border-green-800/50 p-2">
              <div className="flex gap-1.5 font-semibold text-green-800">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
                  placeholder="Search for a location or address (e.g., Manila, Philippines)"
                  className="flex-1 px-2 py-1 text-sm border border-green-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddressSearch}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl shadow-md hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="bg-orange-50/90 rounded-2xl shadow-2xl overflow-hidden border border-green-300/50 relative">
              <div className="h-[700px] w-full relative z-0">
                {activeMap === "leaflet" && (
                  <LeafletMap 
                    center={searchCoords}
                    isDrawingMode={isDrawingMode}
                    currentPolygonPoints={polygonPoints}
                    onPolygonComplete={(points) => setPolygonPoints(points)}
                    savedFields={fields}
                  />
                )}
              </div>
              
              {/* Drawing Instructions Overlay */}
              {isDrawingMode && polygonPoints.length < 4 && (
                <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-green-300/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-green-900">Draw your field</h3>
                    <button
                      onClick={() => {
                        setIsDrawingMode(false);
                        setPolygonPoints([]);
                      }}
                      className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Click on the map to place point {polygonPoints.length + 1} of 4
                  </p>
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <div
                        key={num}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          num <= polygonPoints.length
                            ? 'bg-blue-600 text-white'
                            : num === polygonPoints.length + 1
                            ? 'bg-blue-200 text-blue-800 ring-2 ring-blue-600'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completion Footer */}
              {isDrawingMode && polygonPoints.length === 4 && (
                <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-sm border-t border-green-300/50 p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-900">Selected 1 Field</p>
                        <button
                          onClick={() => {
                            setIsDrawingMode(false);
                            setPolygonPoints([]);
                            setPendingCenter(null);
                            setPendingPolygon([]);
                            setFieldForm((prev) => ({ ...prev, name: "", cropName: "" }));
                          }}
                          className="text-sm text-red-600 hover:text-red-800 mt-1"
                        >
                          Exit Field
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setPolygonPoints([]);
                            setPendingCenter(null);
                            setPendingPolygon([]);
                            setFieldForm((prev) => ({ ...prev, name: "", cropName: "", plantingDate: "", expectedYield: "" }));
                          }}
                          className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                          title="Reset"
                        >
                          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const centerLat = polygonPoints.reduce((sum, p) => sum + p[0], 0) / polygonPoints.length;
                            const centerLng = polygonPoints.reduce((sum, p) => sum + p[1], 0) / polygonPoints.length;
                            setPendingCenter([centerLat, centerLng]);
                            setPendingPolygon(polygonPoints);
                            setFieldForm((prev) => ({
                              ...prev,
                              name: prev.name || `Field ${fields.length + 1}`,
                              plantingDate: new Date().toISOString().slice(0,10),
                            }));
                            setIsFieldModalOpen(true);
                          }}
                          className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl shadow-md hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2"
                        >
                          NEXT →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fields List */}
          <div className="lg:col-span-3 bg-orange-50/90 rounded-2xl shadow-2xl border border-green-300/50 h-[777px] flex flex-col overflow-hidden">
            <div className="p-6 pb-4 flex-shrink-0 flex items-center justify-between">
              <h2 className="text-xl font-bold text-green-900">
                Crop Fields
              </h2>
              {!isDrawingMode && (
                <button
                  onClick={() => {
                    setIsDrawingMode(true);
                    setPolygonPoints([]);
                    // Don't clear searchCoords - keeps current map view
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg shadow-md hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  + Field
                </button>
              )}
            </div>
            <div className="flex-1 px-6 pb-6 overflow-y-auto">
              {fields.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-sm">No fields added yet</p>
                  <p className="text-slate-400 text-xs mt-2">Click "+ Field" to create your first field</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div 
                      key={field.id} 
                      className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm cursor-pointer hover:bg-white/80 hover:border-green-400 transition-all"
                      onClick={() => router.push(`/fields/field/${field.id}`)}
                    >
                      <h3 className="font-semibold text-green-800">{field.name}</h3>
                      {field.status !== 'available' && field.crop && (
                        <p className="text-sm text-slate-600">Crops: {field.crop}</p>
                      )}
                      <p className="text-xs font-semibold text-green-700">Status: {field.status || 'available'}{field.area_ha ? ` · ${field.area_ha} ha` : ''}</p>
                      {field.status !== 'available' && field.health_status && (
                        <p className="text-xs font-medium text-blue-600">Health: {field.health_status}</p>
                      )}
                      {field.status !== 'available' && field.planting_date && (
                        <p className="text-sm font-medium text-blue-600">
                          {getPlantingStatus(field.planting_date)}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        Coordinates: {field.center[0].toFixed(4)}°N, {field.center[1].toFixed(4)}°E
                      </p>
                      {(field.city || field.state) && (
                        <p className="text-xs text-slate-500">
                          {field.city || ''}{field.city && field.state ? ', ' : ''}{field.state || ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {isFieldModalOpen && (
      <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-green-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-green-900">Field Details</h3>
            <button
              onClick={handleFieldModalClose}
              className="text-slate-500 hover:text-slate-800"
              aria-label="Close field details"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Field name</span>
              <input
                type="text"
                value={fieldForm.name}
                onChange={(e) => setFieldForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-green-800/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., North Plot"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Crop (from inventory, optional)</span>
              <select
                value={fieldForm.cropName}
                onChange={(e) => {
                  const newCropName = e.target.value;
                  setFieldForm((prev) => ({
                    ...prev,
                    cropName: newCropName,
                    // Clear planting date and yield if skipping crop
                    plantingDate: newCropName ? prev.plantingDate : "",
                    expectedYield: newCropName ? prev.expectedYield : "",
                  }));
                }}
                className="mt-1 w-full rounded-xl border border-green-800/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">Skip (no crop yet)</option>
                {inventoryCrops.length === 0 ? (
                  <option value="" disabled>No crops available in inventory</option>
                ) : (
                  inventoryCrops.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))
                )}
              </select>
              {inventoryCrops.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">No inventory crops found. Add inventory first or skip.</p>
              )}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Field size (ha) *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fieldForm.areaHa}
                  onChange={(e) => setFieldForm((prev) => ({ ...prev, areaHa: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-green-800/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 2.5"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Planting date</span>
                <input
                  type="date"
                  value={fieldForm.plantingDate}
                  onChange={(e) => setFieldForm((prev) => ({ ...prev, plantingDate: e.target.value }))}
                  className={`mt-1 w-full rounded-xl border border-green-800/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    !fieldForm.cropName ? 'bg-slate-100 cursor-not-allowed opacity-50' : ''
                  }`}
                  disabled={!fieldForm.cropName}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Expected yield (kg)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={fieldForm.expectedYield}
                onChange={(e) => setFieldForm((prev) => ({ ...prev, expectedYield: e.target.value }))}
                className={`mt-1 w-full rounded-xl border border-green-800/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  !fieldForm.cropName ? 'bg-slate-100 cursor-not-allowed opacity-50' : ''
                }`}
                placeholder="e.g., 5000"
                disabled={!fieldForm.cropName}
              />
            </label>

            {pendingCenter && (
              <p className="text-xs text-slate-500">Location: {pendingCenter[0]?.toFixed(4)}°N, {pendingCenter[1]?.toFixed(4)}°E</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleFieldModalClose}
              className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleFieldSave}
              className="px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Save Field
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

