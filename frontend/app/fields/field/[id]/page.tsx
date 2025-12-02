import React from 'react';
import Link from 'next/link';
import PlantingCalendar from '../components/PlantingCalendar';

// Map Open-Meteo weather codes to human-readable descriptions
const WEATHER_CODE_MAP: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle (light)',
  57: 'Freezing drizzle (dense)',
  61: 'Rain (slight)',
  63: 'Rain (moderate)',
  65: 'Rain (heavy)',
  66: 'Freezing rain (light)',
  67: 'Freezing rain (heavy)',
  71: 'Snow fall (slight)',
  73: 'Snow fall (moderate)',
  75: 'Snow fall (heavy)',
  77: 'Snow grains',
  80: 'Rain showers (slight)',
  81: 'Rain showers (moderate)',
  82: 'Rain showers (violent)',
  85: 'Snow showers (slight)',
  86: 'Snow showers (heavy)',
  95: 'Thunderstorm (slight or moderate)',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function describeWeatherCode(code: number | null | undefined) {
  if (code == null) return null;
  const n = Number(code);
  if (Number.isNaN(n)) return null;
  return WEATHER_CODE_MAP[n] ?? `Weather code ${n}`;
}

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
        // Backend returns either a single `field` or an array `fields`.
        // If `fields` is returned, find the one matching the requested id.
        let f = data.field ?? undefined;
        if (!f && Array.isArray(data.fields)) {
          f = data.fields.find((x: any) => String(x.id) === String(id));
        }
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

  // Attempt to reverse-geocode the location into a city name by calling the backend
  let cityName: string | null = null;
  // Parse coordinates once for reuse (reverse-geocode + weather fetch)
  let latNum: number | null = null;
  let lonNum: number | null = null;
  if (field.location && typeof field.location === 'string' && field.location.includes(',')) {
    const [latS, lonS] = field.location.split(',').map(s => s.trim());
    const lat = parseFloat(latS);
    const lon = parseFloat(lonS);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      latNum = lat;
      lonNum = lon;
    }
  }

  // Reverse-geocode (server-side) if we have coordinates
  try {
    if (latNum !== null && lonNum !== null) {
      try {
        const gRes = await fetch(`http://127.0.0.1:5001/api/reverse-geocode?lat=${encodeURIComponent(String(latNum))}&lon=${encodeURIComponent(String(lonNum))}`, { cache: 'no-store' });
        if (gRes.ok) {
          const gData = await gRes.json().catch(() => ({}));
          // Combine city and state when available, fall back to display_name
          const parts: string[] = [];
          if (gData.city) parts.push(gData.city);
          if (gData.state) parts.push(gData.state);
          if (parts.length > 0) {
            cityName = parts.join(', ');
          } else {
            cityName = gData.display_name ?? null;
          }
        }
      } catch (e) {
        // ignore reverse geocode failures (backend now returns nulls on timeout)
      }
    }
  } catch (e) {
    // ignore
  }

  const crop = {
    name: 'Jasmine Rice',
    planting_date: '2025-10-01',
    expected_harvest_date: '2026-02-15',
    health_status: 'Good',
    notes: 'No major pests detected. Apply balanced NPK at 45 days.'
  };

  // Weather object — only populated from the server. Initialize to nulls
  let weather: any = {
    id: null,
    date: null,
    weather_code: null,
    temperature: null,
    temperature_c: null,
    relative_humidity: null,
    precipitation_probability: null,
    precipitation: null,
    cloud_cover: null,
    wind_speed_10m: null,
    wind_kph: null,
    wind_direction_10m: null,
    field_id: null,
    location: null,
    description: null,
  };

  // Fetch live weather from backend (server-side). Use the parsed coordinates if available.
  if (latNum !== null && lonNum !== null) {
    try {
      const wRes = await fetch('http://127.0.0.1:5001/api/fetch-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: latNum, lon: lonNum, field_id: Number(id) }),
        cache: 'no-store',
      });
      if (wRes.ok) {
        const wData = await wRes.json().catch(() => ({}));
        const w = wData.weather ?? {};

        // Raw values mapped directly from backend where available
        const rawTemp = w.temperature ?? null;
        const rawRelHum = w.relative_humidity ?? null;
        const rawPrecipProb = w.precipitation_probability ?? null;
        const rawPrecip = w.precipitation ?? null;
        const rawCloud = w.cloud_cover ?? null;
        const rawWind = w.wind_speed_10m ?? null;
        const rawWindDir = w.wind_direction_10m ?? null;

        // Convert/derive friendly fields
        const tempC = rawTemp != null ? Number(rawTemp) : (w.temperature_c != null ? Number(w.temperature_c) : weather.temperature_c);
        const relHum = rawRelHum != null ? Number(rawRelHum) : (w.humidity_percent != null ? Number(w.humidity_percent) : weather.relative_humidity);
        // Wind: keep raw m/s if provided, also derive kph
        let windKph = weather.wind_kph;
        if (rawWind != null) {
          const windNum = Number(rawWind);
          if (!Number.isNaN(windNum)) {
            // If value looks like m/s (<=60), convert to kph, else assume kph
            windKph = windNum <= 60 ? +(windNum * 3.6).toFixed(1) : +windNum;
          }
        } else if (w.wind_kph != null) {
          windKph = Number(w.wind_kph);
        }

        weather = {
          id: w.id ?? weather.id,
          date: w.date ?? weather.date,
          weather_code: w.weather_code ?? weather.weather_code,
          temperature: rawTemp != null ? Number(rawTemp) : (w.temperature_c != null ? Number(w.temperature_c) : weather.temperature),
          temperature_c: tempC,
          relative_humidity: relHum,
          precipitation_probability: rawPrecipProb != null ? Number(rawPrecipProb) : weather.precipitation_probability,
          precipitation: rawPrecip != null ? Number(rawPrecip) : weather.precipitation,
          cloud_cover: rawCloud != null ? Number(rawCloud) : weather.cloud_cover,
          wind_speed_10m: rawWind != null ? Number(rawWind) : weather.wind_speed_10m,
          wind_kph: windKph,
          wind_direction_10m: rawWindDir != null ? Number(rawWindDir) : weather.wind_direction_10m,
          field_id: w.field_id ?? weather.field_id,
          location: w.location ?? weather.location,
          description: w.description ?? describeWeatherCode(w.weather_code) ?? weather.description,
        };
      }
    } catch (e) {
      // keep demo values on any error
    }
  }

  return (
    <div className="min-h-screen p-8 bg-brand-hero">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">{field.name}</h1>
            <p className="text-sm text-white/90">Field ID: {field.id} • Location: {field.location}</p>
            {cityName ? (
              <p className="text-xs text-white/80">{cityName}</p>
            ) : null}
          </div>
          <div>
            <Link href="/fields" className="px-3 py-2 text-sm font-medium text-white hover:text-green-300">← Back to Fields</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/80 p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-3">Current Weather</h2>
            <strong><p className="text-sm text-slate-600 mb-2">{weather.description}</p></strong>
            <ul className="text-sm space-y-1">
              <li><strong>ID:</strong> {weather.id ?? '—'}</li>
              <li><strong>Date:</strong> {weather.date ?? '—'}</li>
              <li><strong>Weather code:</strong> {weather.weather_code ?? '—'}</li>
              <li><strong>Temperature (°C):</strong> {weather.temperature_c ?? '—'}</li>
              <li><strong>Relative humidity:</strong> {weather.relative_humidity ?? '—'} %</li>
              <li><strong>Precipitation probability:</strong> {weather.precipitation_probability ?? '—'} %</li>
              <li><strong>Precipitation:</strong> {weather.precipitation ?? '—'} mm</li>
              <li><strong>Cloud cover:</strong> {weather.cloud_cover ?? '—'} %</li>
              <li><strong>Wind speed (10m):</strong> {weather.wind_speed_10m ?? '—'} m/s</li>
              <li><strong>Wind (kph):</strong> {weather.wind_kph ?? '—'} kph</li>
              <li><strong>Wind direction (10m):</strong> {weather.wind_direction_10m ?? '—'}°</li>
              <li><strong>Field ID:</strong> {weather.field_id ?? '—'}</li>
              <li><strong>Location:</strong> {weather.location ?? field.location ?? '—'}</li>
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

        {/* Planting / Harvest calendar (client component) */}
        <PlantingCalendar
          fieldId={field.id}
          initialPlantingDate={crop.planting_date}
          initialHarvestDate={crop.expected_harvest_date}
        />

        <div className="mt-6 bg-white/80 p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-2">Field Summary</h3>
          <p className="text-sm">Area: {field.area_ha} ha</p>
        </div>
      </div>
    </div>
  );
}
