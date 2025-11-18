"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation';
import dynamic from "next/dynamic";

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
}

export default function LandTrackerPage() {
  const [activeMap, setActiveMap] = useState<MapType>("leaflet");
  const [address, setAddress] = useState("");
  const [searchCoords, setSearchCoords] = useState<[number, number] | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [fields, setFields] = useState<FieldData[]>([]);
  const mapInstanceRef = useRef<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUserName(parsed.name || null);
        setUserId(parsed.id || parsed.user_id || null);
      }
    } catch (e) {
      // ignore
    }
  }, []);
  const router = useRouter();

  // Load saved fields (and crops) from backend for this user
  useEffect(() => {
    if (!userId && !localStorage.getItem('token')) return;

    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Fetch fields for user (if userId present, filter by it)
        let fieldsUrl = 'http://localhost:5001/api/fields';
        if (userId) fieldsUrl += `?user_id=${userId}`;
        const fRes = await fetch(fieldsUrl, { headers });
        if (!fRes.ok) {
          console.warn('Failed to load fields', await fRes.text());
          return;
        }
        const fData = await fRes.json().catch(() => ({}));
        const fetchedFields = (fData.fields || []).map((f: any) => {
          let center: [number, number] = [0, 0];
          try {
            if (f.location && typeof f.location === 'string' && f.location.includes(',')) {
              const [latS, lngS] = f.location.split(',');
              const lat = parseFloat(latS);
              const lng = parseFloat(lngS);
              if (!Number.isNaN(lat) && !Number.isNaN(lng)) center = [lat, lng];
            }
          } catch (e) {}

          return {
            id: f.id,
            name: f.name || `Field ${f.id}`,
            crop: '',
            coordinates: [],
            center,
          } as FieldData;
        });

        // Fetch crops for this user and map to fields by field_id
        let cropsUrl = 'http://localhost:5001/api/crops';
        if (userId) cropsUrl += `?user_id=${userId}`;
        const cRes = await fetch(cropsUrl, { headers });
        if (cRes.ok) {
          const cData = await cRes.json().catch(() => ({}));
          const crops = cData.crops || [];
          const cropByField: Record<string, string> = {};
          for (const c of crops) {
            if (c.field_id) {
              // store first crop name per field
              if (!cropByField[c.field_id]) cropByField[c.field_id] = c.name || '';
            }
          }

          // attach crop names
          for (const ff of fetchedFields) {
            if (cropByField[ff.id]) ff.crop = cropByField[ff.id];
          }
        }

        // update UI
        if (fetchedFields.length > 0) setFields(fetchedFields as FieldData[]);
      } catch (err) {
        console.warn('Error loading saved fields:', err);
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

  return (
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
                    onMapReady={(map) => {
                      mapInstanceRef.current = map;
                    }}
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
                            setSelectedCrop("");
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
                            setSelectedCrop("");
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
                            if (!selectedCrop) {
                              alert("Please select a crop type");
                              return;
                            }
                            
                            // Calculate center point of polygon for display
                            const centerLat = polygonPoints.reduce((sum, p) => sum + p[0], 0) / polygonPoints.length;
                            const centerLng = polygonPoints.reduce((sum, p) => sum + p[1], 0) / polygonPoints.length;
                            
                                // Create new field (client-side object)
                                const newField: FieldData = {
                                  id: Date.now(),
                                  name: `${selectedCrop} Field ${fields.length + 1}`,
                                  crop: selectedCrop,
                                  coordinates: polygonPoints,
                                  center: [centerLat, centerLng],
                                };

                                // Try to persist field + crop to backend
                                (async () => {
                                  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                                  const storedUserRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
                                  const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
                                  const bodyField: any = { location: `${centerLat},${centerLng}` };
                                  if (!token && storedUser && (storedUser.id || storedUser.user_id)) bodyField.user_id = storedUser.id || storedUser.user_id;

                                  try {
                                    const headers: any = { 'Content-Type': 'application/json' };
                                    if (token) headers['Authorization'] = `Bearer ${token}`;

                                    const fRes = await fetch('http://localhost:5001/api/fields', {
                                      method: 'POST',
                                      headers,
                                      body: JSON.stringify(bodyField),
                                    });
                                    if (fRes.ok) {
                                      const fData = await fRes.json().catch(() => ({}));
                                      const createdField = fData.field;
                                      if (createdField && createdField.id) {
                                        // create crop linked to field
                                        const cropBody: any = {
                                          name: selectedCrop,
                                          field_id: createdField.id,
                                          planting_date: new Date().toISOString().slice(0,10),
                                        };
                                        if (!token && storedUser && (storedUser.id || storedUser.user_id)) cropBody.user_id = storedUser.id || storedUser.user_id;

                                        const cRes = await fetch('http://localhost:5001/api/crops', {
                                          method: 'POST',
                                          headers,
                                          body: JSON.stringify(cropBody),
                                        });
                                        if (!cRes.ok) {
                                          console.warn('Crop creation failed', await cRes.text());
                                        }
                                        // Attach created field id to local object
                                        newField.id = createdField.id;
                                      }
                                    } else {
                                      console.warn('Field creation failed', await fRes.text());
                                    }
                                  } catch (err) {
                                    console.warn('Network error saving field/crop', err);
                                  }

                                  // Add to fields list locally regardless of backend result
                                  setFields((prev) => [...prev, newField]);
                                  // Reset drawing mode
                                  setIsDrawingMode(false);
                                  setPolygonPoints([]);
                                  setSelectedCrop("");
                                })();
                          }}
                          className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl shadow-md hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2"
                        >
                          NEXT →
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label htmlFor="crop-select" className="text-sm font-medium text-green-900 whitespace-nowrap">
                        Rice Crop:
                      </label>
                      <select
                        id="crop-select"
                        value={selectedCrop}
                        onChange={(e) => setSelectedCrop(e.target.value)}
                        className="flex-1 px-4 py-2 border border-green-800/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      >
                        <option value="">Select a rice crop...</option>
                        <option value="Jasmine Rice">Jasmine Rice</option>
                        <option value="Basmati Rice">Basmati Rice</option>
                        <option value="Brown Rice">Brown Rice</option>
                        <option value="White Rice">White Rice</option>
                        <option value="Sticky Rice">Sticky Rice (Glutinous)</option>
                        <option value="Red Rice">Red Rice</option>
                        <option value="Black Rice">Black Rice</option>
                        <option value="Wild Rice">Wild Rice</option>
                        <option value="Arborio Rice">Arborio Rice</option>
                        <option value="Short Grain Rice">Short Grain Rice</option>
                        <option value="Long Grain Rice">Long Grain Rice</option>
                        <option value="Medium Grain Rice">Medium Grain Rice</option>
                      </select>
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
                      <p className="text-sm text-slate-600">Crops: {field.crop}</p>
                      <p className="text-xs text-slate-500">
                        Coordinates: {field.center[0].toFixed(4)}°N, {field.center[1].toFixed(4)}°E
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

