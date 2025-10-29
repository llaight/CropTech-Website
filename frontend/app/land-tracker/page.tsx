"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./components/LeafletMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse" />,
});


type MapType = "leaflet";

export default function LandTrackerPage() {
  const [activeMap, setActiveMap] = useState<MapType>("leaflet");
  const [address, setAddress] = useState("");
  const [searchCoords, setSearchCoords] = useState<[number, number] | null>(null);

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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-orange-50/90 backdrop-blur-xl border-b border-green-300/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-green-900">
                Welcome 'User'
              </h1>
              <p className="text-sm text-green-800 mt-1">
                Field Tracking Map
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-green-900 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Map and Fields Side by Side */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

            <div className="bg-orange-50/90 rounded-2xl shadow-2xl overflow-hidden border border-green-300/50">
              <div className="h-[700px] w-full relative">
                {activeMap === "leaflet" && <LeafletMap center={searchCoords} />}
              </div>
            </div>
          </div>

          {/* Fields List */}
          <div className="lg:col-span-3 bg-orange-50/90 rounded-2xl shadow-2xl border border-green-300/50 h-[777px] flex flex-col overflow-hidden">
            <div className="p-6 pb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-green-900">
                Crop Fields
              </h2>
            </div>
            <div className="flex-1 px-6 pb-6 overflow-y-auto">
              <div className="space-y-3">
                <div className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm">
                  <h3 className="font-semibold text-green-800">Central Luzon</h3>
                  <p className="text-sm text-slate-600">Crops: Rice</p>
                  <p className="text-xs text-slate-500">Coordinates: 15.4828°N, 120.5848°E</p>
                </div>
              
                <div className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm">
                  <h3 className="font-semibold text-green-800">Cagayan Valley</h3>
                  <p className="text-sm text-slate-600">Crops: Rice & Corn</p>
                  <p className="text-xs text-slate-500">Coordinates: 17.6129°N, 121.7265°E</p>
                </div>

                <div className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm">
                  <h3 className="font-semibold text-green-800">Mindanao</h3>
                  <p className="text-sm text-slate-600">Crops: Various Crops</p>
                  <p className="text-xs text-slate-500">Coordinates: 7.9644°N, 123.6253°E</p>
                </div>

                <div className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm">
                  <h3 className="font-semibold text-green-800">Bicol Region</h3>
                  <p className="text-sm text-slate-600">Crops: Coconuts & Rice</p>
                  <p className="text-xs text-slate-500">Coordinates: 13.4210°N, 123.2911°E</p>
                </div>

                <div className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm">
                  <h3 className="font-semibold text-green-800">Ilocos Region</h3>
                  <p className="text-sm text-slate-600">Crops: Rice & Tobacco</p>
                  <p className="text-xs text-slate-500">Coordinates: 16.5670°N, 120.3977°E</p>
                </div>

                <div className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm">
                  <h3 className="font-semibold text-green-800">Visayas</h3>
                  <p className="text-sm text-slate-600">Crops: Sugar & Rice</p>
                  <p className="text-xs text-slate-500">Coordinates: 10.3157°N, 123.8854°E</p>
                </div>

                <div className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm">
                  <h3 className="font-semibold text-green-800">Central Luzon</h3>
                  <p className="text-sm text-slate-600">Crops: Rice</p>
                  <p className="text-xs text-slate-500">Coordinates: 15.4828°N, 120.5848°E</p>
                </div>
              
                <div className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm">
                  <h3 className="font-semibold text-green-800">Cagayan Valley</h3>
                  <p className="text-sm text-slate-600">Crops: Rice & Corn</p>
                  <p className="text-xs text-slate-500">Coordinates: 17.6129°N, 121.7265°E</p>
                </div>

                <div className="p-4 bg-white/60 rounded-lg border border-green-300/50 shadow-sm">
                  <h3 className="font-semibold text-green-800">Mindanao</h3>
                  <p className="text-sm text-slate-600">Crops: Various Crops</p>
                  <p className="text-xs text-slate-500">Coordinates: 7.9644°N, 123.6253°E</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

