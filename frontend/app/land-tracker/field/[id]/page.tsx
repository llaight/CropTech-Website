import React from 'react';
import Link from 'next/link';

// Server component that shows field + crop + weather details.
// It will try to fetch the field record from the backend by id
// and fall back to demo values if the API is unavailable.
export default async function FieldDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Default/demo values (fallback)
  let field: { id: string | number; name: string; location: string; area_ha: number } = {
    id,
    name: `Field ${id}`,
    location: '14.5995,120.9842',
    area_ha: 1.25,
  };

  // Try to fetch the real field from the backend (server-side). If the
  // backend isn't available or returns no data, keep the defaults above.
  try {
    const res = await fetch(`http://127.0.0.1:5001/api/fields?id=${encodeURIComponent(String(id))}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const f = data.field ?? (Array.isArray(data.fields) ? data.fields[0] : undefined);
      if (f) {
        field = {
          id: f.id ?? id,
          name: f.name ?? `Field ${id}`,
          location: f.location ?? field.location,
          area_ha: f.area_ha ?? field.area_ha,
        };
      }
    }
  } catch (err) {
    // network/backend unavailable — keep demo values
  }

  const crop = {
    name: 'Jasmine Rice',
    planting_date: '2025-10-01',
    expected_harvest_date: '2026-02-15',
    health_status: 'Good',
    notes: 'No major pests detected. Apply balanced NPK at 45 days.'
  };

  const weather = {
    temperature_c: 29.4,
    humidity_percent: 78,
    wind_kph: 12,
    rainfall_mm_24h: 2.6,
    description: 'Partly cloudy with light showers',
  };

  return (
    <div className="min-h-screen p-8 bg-brand-hero">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">{field.name}</h1>
            <p className="text-sm text-white/90">Field ID: {field.id} • Location: {field.location}</p>
          </div>
          <div>
            <Link href="/land-tracker" className="px-3 py-2 text-sm font-medium text-white hover:text-green-300">← Back to Fields</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/80 p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-3">Current Weather</h2>
            <p className="text-sm text-slate-600 mb-2">{weather.description}</p>
            <ul className="text-sm space-y-1">
              <li><strong>Temperature:</strong> {weather.temperature_c} °C</li>
              <li><strong>Humidity:</strong> {weather.humidity_percent} %</li>
              <li><strong>Wind:</strong> {weather.wind_kph} kph</li>
              <li><strong>Rain (24h):</strong> {weather.rainfall_mm_24h} mm</li>
            </ul>
          </div>

          <div className="bg-white/80 p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-3">Crop Details</h2>
            <p className="text-sm text-slate-600 mb-2"><strong>Crop:</strong> {crop.name}</p>
            <ul className="text-sm space-y-1">
              <li><strong>Planting date:</strong> {crop.planting_date}</li>
              <li><strong>Expected harvest:</strong> {crop.expected_harvest_date}</li>
              <li><strong>Health status:</strong> {crop.health_status}</li>
              <li><strong>Notes:</strong> {crop.notes}</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-white/80 p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-2">Field Summary</h3>
          <p className="text-sm">Area: {field.area_ha} ha</p>
        </div>
      </div>
    </div>
  );
}
