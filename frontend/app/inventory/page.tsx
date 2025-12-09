"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";

const LeafletMap = dynamic(() => import("@/app/fields/components/LeafletMap"), {
  ssr: false,
});

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  seeds: number;
  sacks: number;
  fieldLocations: {
    name: string;
    coordinates: [number, number];
  }[];
}

const inventoryData: InventoryItem[] = [
  {
    id: "1",
    name: "NSIC RC 220 SR (Japonica 1)",
    price: 32.17,
    seeds: 1241,
    sacks: 1241,
    fieldLocations: [
      { name: "Caloocan City", coordinates: [14.6548, 120.9783] },
      { name: "SM City Fairview", coordinates: [14.7044, 121.0565] },
      { name: "La Mesa", coordinates: [14.7000, 121.0833] },
    ],
  },
  {
    id: "2",
    name: "NSIC RC 148 (MABANGO 2)",
    price: 22.0,
    seeds: 850,
    sacks: 850,
    fieldLocations: [
      { name: "Caloocan City", coordinates: [14.6548, 120.9783] },
      { name: "SM City Fairview", coordinates: [14.7044, 121.0565] },
    ],
  },
  {
    id: "3",
    name: "NSIC RC 122 (ANGELICA)",
    price: 40.15,
    seeds: 2100,
    sacks: 2100,
    fieldLocations: [
      { name: "La Mesa", coordinates: [14.7000, 121.0833] },
      { name: "Caloocan City", coordinates: [14.6548, 120.9783] },
    ],
  },
  {
    id: "4",
    name: "NSIC RC 194 (SUBMARINE)",
    price: 25.17,
    seeds: 950,
    sacks: 950,
    fieldLocations: [
      { name: "SM City Fairview", coordinates: [14.7044, 121.0565] },
    ],
  },
  {
    id: "5",
    name: "NSIC RC 110 (TUBIGAN 1)",
    price: 36.0,
    seeds: 1500,
    sacks: 1500,
    fieldLocations: [
      { name: "Caloocan City", coordinates: [14.6548, 120.9783] },
      { name: "La Mesa", coordinates: [14.7000, 121.0833] },
    ],
  },
];

export default function InventoryPage() {
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seedsCount, setSeedsCount] = useState(0);
  const [sacksCount, setSacksCount] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [user, setUser] = useState<{ name?: string } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleInventoryClick = (item: InventoryItem) => {
    setSelectedInventory(item);
    setSeedsCount(item.seeds);
    setSacksCount(item.sacks);
    setIsModalOpen(true);
    setIsMapReady(false);
    
    if (item.fieldLocations.length > 0) {
      setMapCenter(item.fieldLocations[0].coordinates);
    }
  };

  const handleCloseModal = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    setIsModalOpen(false);
    setSelectedInventory(null);
    setMapCenter(null);
    setIsMapReady(false);
  };

  const handleSeedsChange = (delta: number) => {
    setSeedsCount((prev) => Math.max(0, prev + delta));
  };

  const handleSacksChange = (delta: number) => {
    setSacksCount((prev) => Math.max(0, prev + delta));
  };

  const handleFieldLocationClick = (coordinates: [number, number]) => {
    setMapCenter(coordinates);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(coordinates, 13, {
        animate: true,
        duration: 1.0,
      });
    }
  };

  const addMarkersToMap = useCallback(() => {
    if (!mapInstanceRef.current || !selectedInventory || !isMapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    selectedInventory.fieldLocations.forEach((location) => {
      try {
        const marker = L.marker(location.coordinates, {
          icon: L.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(mapInstanceRef.current!);
        marker.bindPopup(`<b>${location.name}</b><br/>${selectedInventory.name}`);
        markersRef.current.push(marker);
      } catch (error) {
        console.error("Error adding marker:", error);
      }
    });

    if (selectedInventory.fieldLocations.length > 0 && mapInstanceRef.current) {
      try {
        const bounds = L.latLngBounds(
          selectedInventory.fieldLocations.map((loc) => loc.coordinates)
        );
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13,
        });
      } catch (error) {
        console.error("Error fitting bounds:", error);
      }
    }
  }, [selectedInventory, isMapReady]);

  useEffect(() => {
    if (isModalOpen && selectedInventory && isMapReady && mapInstanceRef.current) {
      const timer = setTimeout(() => {
        addMarkersToMap();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedInventory, isModalOpen, isMapReady, addMarkersToMap]);

  return (
    <div className="min-h-full bg-brand-hero">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-orange-50/90 rounded-2xl shadow-lg border border-green-300/50 overflow-hidden">
              <div className="p-6 border-b border-slate-600/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">Rice Varieties</h2>
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {inventoryData.map((item) => (
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
                              {item.seeds} seeds
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              {item.sacks} sacks
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-50/90 rounded-2xl shadow-lg border border-green-300/50 overflow-hidden">
              {selectedInventory ? (
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
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <span className="text-slate-600 font-medium">Seeds</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900">{selectedInventory.seeds.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <span className="text-slate-600 font-medium">Sacks</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900">{selectedInventory.sacks.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Field Locations</h3>
                    <div className="space-y-2">
                      {selectedInventory.fieldLocations.map((location, index) => (
                        <div key={index} className="flex items-center p-3 bg-slate-50 rounded-lg">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <span className="text-slate-700 font-medium">{location.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-6">
                 <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium">Select an inventory item to view details</p>
                  <p className="text-sm text-slate-400 mt-1">Click on any rice variety from the list</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && selectedInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedInventory.name}</h2>
                <p className="text-3xl font-bold text-green-600 mt-2">P {selectedInventory.price.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                {/* Save button */}
                <button
                  onClick={() => {
                    // Save logic here (e.g., update inventory, close modal)
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                >
                  Save
                </button>
                {/* Cancel button */}
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Inventory Management</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <span className="text-slate-700 font-medium">Seeds</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSeedsChange(-1)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow"
                          aria-label="Decrease seeds"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="font-bold text-xl min-w-[80px] text-center text-slate-900">{seedsCount.toLocaleString()}</span>
                        <button
                          onClick={() => handleSeedsChange(1)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow"
                          aria-label="Increase seeds"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <span className="text-slate-700 font-medium">Sacks</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSacksChange(-1)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow"
                          aria-label="Decrease sacks"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="font-bold text-xl min-w-[80px] text-center text-slate-900">{sacksCount.toLocaleString()}</span>
                        <button
                          onClick={() => handleSacksChange(1)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-bold text-slate-700 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow"
                          aria-label="Increase sacks"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Field Locations</h3>
                <div className="mb-4 space-y-2">
                  {selectedInventory.fieldLocations.map((location, index) => (
                    <button
                      key={index}
                      onClick={() => handleFieldLocationClick(location.coordinates)}
                      className="w-full flex items-center p-3 rounded-xl hover:bg-green-50 border border-slate-200 hover:border-green-300 transition-all duration-200 text-left group"
                    >
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3 group-hover:scale-125 transition-transform"></div>
                      <span className="text-slate-700 font-medium group-hover:text-green-700">{location.name}</span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200" style={{ height: "400px" }}>
                  {mapCenter && (
                    <LeafletMap
                      center={mapCenter}
                      isDrawingMode={false}
                      onMapReady={(map) => {
                        mapInstanceRef.current = map;
                        setIsMapReady(true);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
