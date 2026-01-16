"use client";

import React, { useEffect, useMemo, useState } from "react";
import PlantingCalendar from "../components/PlantingCalendar";
import BackButton from "../../../components/BackButton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCachedData } from "../../../lib/dataPreloader";
import { formatLongDate } from "../../../lib/utils";

/* Human-readable weather descriptions kept (no attribute removal) */
const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle (light)",
  57: "Freezing drizzle (dense)",
  61: "Rain (slight)",
  63: "Rain (moderate)",
  65: "Rain (heavy)",
  66: "Freezing rain (light)",
  67: "Freezing rain (heavy)",
  71: "Snow fall (slight)",
  73: "Snow fall (moderate)",
  75: "Snow fall (heavy)",
  77: "Snow grains",
  80: "Rain showers (slight)",
  81: "Rain showers (moderate)",
  82: "Rain showers (violent)",
  85: "Snow showers (slight)",
  86: "Snow showers (heavy)",
  95: "Thunderstorm (slight or moderate)",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

function describeWeatherCode(code: number | null | undefined) {
  if (code == null) return "Unknown";
  const n = Number(code);
  if (Number.isNaN(n)) return "Unknown";
  return WEATHER_CODE_MAP[n] ?? `Weather code ${n}`;
}

/* Simple svg icons for main weather categories */
function WeatherIcon({ code, size = 48 }: { code: number | null | undefined; size?: number }) {
  const s = size;
  if (code == null) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="#9CA3AF" strokeWidth="1.5" />
      </svg>
    );
  }
  const n = Number(code);
  if (Number.isNaN(n)) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="#9CA3AF" strokeWidth="1.5" />
      </svg>
    );
  }

  // Sun (bright radial)
  if (n === 0) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <defs>
          <radialGradient id="sunGrad" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#FFF1C9" />
            <stop offset="60%" stopColor="#FDBA74" />
            <stop offset="100%" stopColor="#FB923C" />
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="5" fill="url(#sunGrad)" />
        <g stroke="#FB923C" strokeWidth="1.2" strokeLinecap="round">
          <path d="M12 1.6v2.2" />
          <path d="M12 20.2v2.2" />
          <path d="M3.8 4.4l1.6 1.6" />
          <path d="M18.6 17.2l1.6 1.6" />
          <path d="M1.6 12h2.2" />
          <path d="M20.2 12h2.2" />
          <path d="M3.8 19.6l1.6-1.6" />
          <path d="M18.6 6.4l1.6-1.6" />
        </g>
      </svg>
    );
  }

  // Partly cloudy (sun + cloud)
  if (n === 1 || n === 2) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <defs>
          <linearGradient id="pSun" x1="0" x2="1">
            <stop offset="0%" stopColor="#FFF1C9" />
            <stop offset="100%" stopColor="#FDBA74" />
          </linearGradient>
        </defs>
        <circle cx="8.5" cy="8.5" r="3" fill="url(#pSun)" />
        <path d="M6 15a4 4 0 010-8 6 6 0 0110.5 3 4 4 0 01-1 7H6z" fill="#E6EEF8" />
      </svg>
    );
  }

  // Overcast / Cloud
  if (n === 3) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <defs>
          <linearGradient id="cloudG" x1="0" x2="1">
            <stop offset="0%" stopColor="#E6EEF8" />
            <stop offset="100%" stopColor="#CFE1F8" />
          </linearGradient>
        </defs>
        <path d="M6 16a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="url(#cloudG)" />
      </svg>
    );
  }

  // Fog
  if (n === 45 || n === 48) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <path d="M5 11a7 7 0 0114 0" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <g stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round">
          <path d="M3 15h18" />
          <path d="M3 18h18" />
        </g>
      </svg>
    );
  }

  // Drizzle
  if (n === 51 || n === 53 || n === 55) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <path d="M6 13a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#E6EEF8" />
        <g fill="#60A5FA">
          <ellipse cx="9.5" cy="18" rx="0.9" ry="1.6" />
          <ellipse cx="13.5" cy="18" rx="0.9" ry="1.6" />
          <ellipse cx="16.5" cy="18" rx="0.9" ry="1.6" />
        </g>
      </svg>
    );
  }

  // Freezing drizzle / freezing rain
  if (n === 56 || n === 57 || n === 66 || n === 67) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <path d="M6 13a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#E6EEF8" />
        <g>
          <path d="M10 18l-0.5 1.2" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M13 18l-0.5 1.2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  // Rain
  if (n === 61 || n === 63 || n === 65) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <path d="M6 14a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#E6EEF8" />
        <g fill="#2563EB">
          <path d="M9 17.6c-.5 1-1 1.6-1 1.6s-.9.6-1.2.1c-.3-.5.6-1.6.6-1.6s.4-.7 1.6-.9z" />
          <path d="M13 17.6c-.5 1-1 1.6-1 1.6s-.9.6-1.2.1c-.3-.5.6-1.6.6-1.6s.4-.7 1.6-.9z" />
          <path d="M17 17.6c-.5 1-1 1.6-1 1.6s-.9.6-1.2.1c-.3-.5.6-1.6.6-1.6s.4-.7 1.6-.9z" />
        </g>
      </svg>
    );
  }

  // Showers
  if (n === 80 || n === 81) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <path d="M6 13a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#E6EEF8" />
        <g fill="#1D4ED8">
          <ellipse cx="9" cy="17.6" rx="0.9" ry="1.6" />
          <ellipse cx="13" cy="17.6" rx="0.9" ry="1.6" />
        </g>
      </svg>
    );
  }

  // Violent showers
  if (n === 82) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <path d="M6 13a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#D1E3F9" />
        <g fill="#1E40AF">
          <path d="M10 17l-1 2" />
          <path d="M13 17l-1 2" />
        </g>
        <path d="M12 13l1.5-3-2 .5.5-2" fill="#F59E0B" />
      </svg>
    );
  }

  // Snow / showers-snow
  if (n === 71 || n === 73 || n === 75 || n === 85 || n === 86) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <path d="M6 14a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#E6EEF8" />
        <g stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l0-2" />
          <path d="M11 18l0-2" />
          <path d="M13 18l0-2" />
          <path d="M15 18l0-2" />
        </g>
      </svg>
    );
  }

  // Snow grains
  if (n === 77) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <path d="M6 13a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#E6EEF8" />
        <g fill="#93C5FD">
          <circle cx="9.5" cy="18" r="0.4" />
          <circle cx="12.5" cy="18" r="0.4" />
          <circle cx="15.5" cy="18" r="0.4" />
        </g>
      </svg>
    );
  }

  // Thunderstorm
  if (n === 95 || n === 96 || n === 99) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
        <path d="M6 14a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#E6EEF8" />
        <path d="M11 13l-2 4h3l-1 3 4-6h-3l1-3z" fill="#FBBF24" />
      </svg>
    );
  }

  // fallback -> colored cloud
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
      <path d="M6 16a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#DDECFB" />
    </svg>
  );
}

const TempIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <defs>
      <linearGradient id="gTemp" x1="0" x2="1"><stop offset="0%" stopColor="#FFF1C9"/><stop offset="100%" stopColor="#FB923C"/></linearGradient>
    </defs>
    <rect x="10.5" y="3" width="3" height="12" rx="1.5" fill="url(#gTemp)"/>
    <circle cx="12" cy="18.5" r="3" fill="#FB923C"/>
  </svg>
);

const HumidityIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 3s5 5.5 5 9.5A5 5 0 017 12.5C7 8.5 12 3 12 3z" fill="#60A5FA"/>
    <path d="M12 3s-2.2 2.4-2.8 4.5" stroke="#93C5FD" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
  </svg>
);

const PrecipProbIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M5 8h14" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="4.5" y="10.5" width="3" height="5.5" rx="1.2" fill="#EDE9FE"/>
    <rect x="9.5" y="10.5" width="3" height="3.5" rx="1.2" fill="#C7B3FF"/>
    <rect x="14.5" y="10.5" width="3" height="2" rx="1.2" fill="#7C3AED"/>
  </svg>
);

const PrecipIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M7 10a5 5 0 0110 0 4 4 0 01-1 7H7a4 4 0 01-1-7z" fill="#DCEFFE"/>
    <g fill="#3B82F6">
      <path d="M9.5 18.5c-.4.9-.8 1.3-1 1.3s-.6.4-0.8.1c-.2-.3.4-1.1.4-1.1s.3-.5 1.4-.7z"/>
      <path d="M13.5 18.5c-.4.9-.8 1.3-1 1.3s-.6.4-0.8.1c-.2-.3.4-1.1.4-1.1s.3-.5 1.4-.7z"/>
    </g>
  </svg>
);

const CloudIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 14a4 4 0 010-8 6 6 0 0111 2 4 4 0 01-1 7H6z" fill="#E6EEF8"/>
  </svg>
);

const WindIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 8h12a3 3 0 010 6H5" stroke="#06B6D4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 16h8" stroke="#7DD3FC" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export default function FieldDetailPage() {
  const params = useParams();
  const fieldId = params.id as string;

  const [field, setField] = useState<{ id: string | number; name: string; location: string; area_ha: number } | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [weather, setWeather] = useState<any>({
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
  });
  const [crop, setCrop] = useState<{
    name: string;
    planting_date: string | null;
    expected_harvest_date: string | null;
    actual_harvest_date: string | null;
    expected_yield_kg: number | null;
    actual_yield_kg: number | null;
    health_status: string | null;
    notes: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fieldName, setFieldName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isPlantCropModalOpen, setIsPlantCropModalOpen] = useState(false);
  const [plantCropForm, setPlantCropForm] = useState({
    cropName: "",
    plantingDate: "",
    expectedYield: "",
  });
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const [plantCropError, setPlantCropError] = useState<string | null>(null);
  const [availableCrops, setAvailableCrops] = useState<string[]>([]);
  const [isLoadingCrops, setIsLoadingCrops] = useState(false);

  const defaultFieldName = useMemo(() => {
    const fid = field?.id ?? fieldId;
    if (field?.name) return field.name;
    if (crop?.name) return `${crop.name} Field ${fid}`;
    return `Field ${fid}`;
  }, [crop?.name, field?.id, field?.name, fieldId]);

  const plantingStatus = useMemo(() => {
    if (!crop?.planting_date) return "Planting date not set";
    
    // Parse as date only (ignore time) to avoid timezone issues
    const [year, month, day] = crop.planting_date.split('-').map(Number);
    const planted = new Date(year, month - 1, day); // month is 0-indexed
    if (Number.isNaN(planted.getTime())) return "Planting date invalid";

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    planted.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - planted.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30.44);

    if (diffMonths < 0) {
      const monthsUntil = Math.abs(diffMonths);
      if (monthsUntil === 0) return "Planted soon";
      return `To be planted in ${monthsUntil} month${monthsUntil === 1 ? "" : "s"}`;
    }

    if (diffMonths === 0) {
      if (diffDays === 0) return "Planted today";
      if (diffDays === 1) return "Planted yesterday";
      return `Planted ${diffDays} days ago`;
    }

    return `Planted ${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }, [crop?.planting_date]);

  useEffect(() => {
    if (!nameDirty) {
      setFieldName(defaultFieldName);
    }
  }, [defaultFieldName, nameDirty]);

  const saveFieldName = async () => {
    const targetId = field?.id ?? fieldId;
    if (!targetId) return;

    const nextName = (fieldName || "").trim() || defaultFieldName;

    setIsSavingName(true);
    setNameError(null);
    try {
      const headers: any = { "Content-Type": "application/json" };
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`http://127.0.0.1:5001/api/fields/${targetId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: nextName }),
      });

      if (!res.ok) {
        const text = await res.text();
        setNameError(text || "Failed to save field name");
      } else {
        const data = await res.json().catch(() => ({}));
        const updatedName = data.field?.name || nextName;
        setField((prev) => (prev ? { ...prev, name: updatedName } : prev));
        setFieldName(updatedName);
        setNameDirty(false);
        setIsNameModalOpen(false);
      }
    } catch (err: any) {
      setNameError(err?.message || "Network error while saving field name");
    } finally {
      setIsSavingName(false);
    }
  };

  const saveCrop = async () => {
    const cropName = (plantCropForm.cropName || "").trim();
    const plantingDate = plantCropForm.plantingDate.trim();
    const expectedYield = plantCropForm.expectedYield.trim();

    if (!cropName || !plantingDate || !expectedYield) {
      setPlantCropError("All fields are required");
      return;
    }

    const expectedYieldNum = parseFloat(expectedYield);
    if (isNaN(expectedYieldNum) || expectedYieldNum <= 0) {
      setPlantCropError("Expected yield must be a positive number");
      return;
    }

    // Calculate expected harvest date as 120 days from planting date
    const plantingDateObj = new Date(plantingDate);
    const expectedHarvestDateObj = new Date(plantingDateObj);
    expectedHarvestDateObj.setDate(expectedHarvestDateObj.getDate() + 120);
    const expectedHarvestDate = expectedHarvestDateObj.toISOString().split('T')[0];

    setIsSavingCrop(true);
    setPlantCropError(null);
    try {
      const headers: any = { "Content-Type": "application/json" };
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`http://127.0.0.1:5001/api/crops`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          field_id: fieldId,
          name: cropName,
          planting_date: plantingDate,
          expected_harvest_date: expectedHarvestDate,
          expected_yield_kg: expectedYieldNum,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setPlantCropError(text || "Failed to save crop");
      } else {
        const data = await res.json().catch(() => ({}));
        const newCrop = data.crop ?? data;
        setCrop({
          name: newCrop.name || cropName,
          planting_date: newCrop.planting_date || plantingDate,
          expected_harvest_date: newCrop.expected_harvest_date || expectedHarvestDate,
          actual_harvest_date: newCrop.actual_harvest_date || null,
          expected_yield_kg: newCrop.expected_yield_kg ?? expectedYieldNum,
          actual_yield_kg: newCrop.actual_yield_kg ?? null,
          health_status: newCrop.health_status || "Good",
          notes: newCrop.notes || "Crop just planted",
        });
        setIsPlantCropModalOpen(false);
        setPlantCropForm({ cropName: "", plantingDate: "", expectedYield: "" });
      }
    } catch (err: any) {
      setPlantCropError(err?.message || "Network error while saving crop");
    } finally {
      setIsSavingCrop(false);
    }
  };

  const fetchAvailableCrops = async () => {
    setIsLoadingCrops(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`http://localhost:5001/api/inventory/crops`, { headers });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const crops = (data.crops || []).map((c: any) => c.name || c).filter(Boolean);
        setAvailableCrops(crops);
        console.log("Loaded crops from inventory:", crops.length, "crops");
      } else {
        console.warn("Failed to fetch crops");
      }
    } catch (err) {
      console.error("Error fetching crops:", err);
    } finally {
      setIsLoadingCrops(false);
    }
  };

  const updateCropPlantingDate = async (newPlantingDate: string) => {
    if (!crop || !crop.name) return;

    try {
      const headers: any = { "Content-Type": "application/json" };
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Find the crop ID by fetching crops again
      const cropRes = await fetch(`http://127.0.0.1:5001/api/crops?field_id=${fieldId}`, { headers });
      if (!cropRes.ok) return;

      const cropData = await cropRes.json().catch(() => ({}));
      if (!cropData.crops || !Array.isArray(cropData.crops) || cropData.crops.length === 0) return;

      const cropId = cropData.crops[0].id;

      // Update the crop's planting date
      const updateRes = await fetch(`http://127.0.0.1:5001/api/crops/${cropId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ planting_date: newPlantingDate }),
      });

      if (updateRes.ok) {
        const updatedCropData = await updateRes.json().catch(() => ({}));
        const updatedCrop = updatedCropData.crop;
        if (updatedCrop) {
          setCrop({
            name: updatedCrop.name || crop.name,
            planting_date: updatedCrop.planting_date || null,
            expected_harvest_date: updatedCrop.expected_harvest_date || null,
            actual_harvest_date: updatedCrop.actual_harvest_date || null,
            expected_yield_kg: updatedCrop.expected_yield_kg ?? null,
            actual_yield_kg: updatedCrop.actual_yield_kg ?? null,
            health_status: updatedCrop.health_status || crop.health_status,
            notes: updatedCrop.notes || crop.notes,
          });
        }
      }
    } catch (err) {
      console.error("Error updating crop planting date:", err);
    }
  };

  useEffect(() => {
    const loadFieldData = async () => {
      setIsLoading(true);

      // Try to get field from cache first
      console.log("Checking for cached field data for ID:", fieldId);
      const cachedData = getCachedData();
      let fieldData = null;

      if (cachedData && Array.isArray(cachedData.fields)) {
        console.log("Found cached fields, searching for ID:", fieldId);
        fieldData = cachedData.fields.find((f: any) => String(f.id) === String(fieldId));
        if (fieldData) {
          console.log("Field found in cache:", fieldData);
        }
      }

      // If not in cache, fetch from backend
      if (!fieldData) {
        console.log("❌ Field not in cache, fetching from backend...");
        try {
          const res = await fetch(
            `http://127.0.0.1:5001/api/fields?id=${encodeURIComponent(String(fieldId))}`,
            { cache: "no-store" }
          );
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            let f = data.field ?? undefined;
            if (!f && Array.isArray(data.fields)) {
              f = data.fields.find((x: any) => String(x.id) === String(fieldId));
            }
            if (f) {
              fieldData = f;
              console.log("📡 Field fetched from backend:", fieldData);
            }
          }
        } catch (err) {
          console.error("Error fetching field:", err);
        }
      }

      // Set field with default fallback
      const finalField = fieldData
        ? {
            id: fieldData.id ?? fieldId,
            name: fieldData.name ?? `Field ${fieldId}`,
            location: fieldData.location ?? "14.5995,120.9842",
            area_ha: fieldData.area_ha ?? 1.25,
          }
        : {
            id: fieldId,
            name: `Field ${fieldId}`,
            location: "14.5995,120.9842",
            area_ha: 1.25,
          };

      setField(finalField);

      // Parse location for geocoding
      let latNum: number | null = null;
      let lonNum: number | null = null;
      if (finalField.location && typeof finalField.location === "string" && finalField.location.includes(",")) {
        const [latS, lonS] = finalField.location.split(",").map((s) => s.trim());
        const lat = parseFloat(latS);
        const lon = parseFloat(lonS);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          latNum = lat;
          lonNum = lon;
        }
      }

      // Reverse geocode to get city name
      if (latNum !== null && lonNum !== null) {
        try {
          const gRes = await fetch(
            `http://127.0.0.1:5001/api/reverse-geocode?lat=${encodeURIComponent(
              String(latNum)
            )}&lon=${encodeURIComponent(String(lonNum))}`,
            { cache: "no-store" }
          );
          if (gRes.ok) {
            const gData = await gRes.json().catch(() => ({}));
            const parts: string[] = [];
            if (gData.city) parts.push(gData.city);
            if (gData.state) parts.push(gData.state);
            const city = parts.length > 0 ? parts.join(", ") : gData.display_name ?? null;
            setCityName(city);
            console.log("City name loaded:", city);
          }
        } catch (e) {
          console.error("Error reverse geocoding:", e);
        }
      }

      // Fetch weather data
      if (latNum !== null && lonNum !== null) {
        try {
          const wRes = await fetch("http://127.0.0.1:5001/api/fetch-weather", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latNum, lon: lonNum, field_id: Number(fieldId) }),
            cache: "no-store",
          });
          if (wRes.ok) {
            const wData = await wRes.json().catch(() => ({}));
            const w = wData.weather ?? {};

            const rawTemp = w.temperature ?? null;
            const rawRelHum = w.relative_humidity ?? null;
            const rawPrecipProb = w.precipitation_probability ?? null;
            const rawPrecip = w.precipitation ?? null;
            const rawCloud = w.cloud_cover ?? null;
            const rawWind = w.wind_speed_10m ?? null;
            const rawWindDir = w.wind_direction_10m ?? null;

            const tempC =
              rawTemp != null
                ? Number(rawTemp)
                : w.temperature_c != null
                ? Number(w.temperature_c)
                : null;
            const relHum =
              rawRelHum != null ? Number(rawRelHum) : w.humidity_percent != null ? Number(w.humidity_percent) : null;

            let windKph = null;
            if (rawWind != null) {
              const windNum = Number(rawWind);
              if (!Number.isNaN(windNum)) {
                windKph = windNum <= 60 ? +(windNum * 3.6).toFixed(1) : +windNum;
              }
            } else if (w.wind_kph != null) {
              windKph = Number(w.wind_kph);
            }

            const weatherData = {
              id: w.id ?? null,
              date: w.date ?? null,
              weather_code: w.weather_code ?? null,
              temperature: rawTemp != null ? Number(rawTemp) : w.temperature_c != null ? Number(w.temperature_c) : null,
              temperature_c: tempC,
              relative_humidity: relHum,
              precipitation_probability: rawPrecipProb != null ? Number(rawPrecipProb) : null,
              precipitation: rawPrecip != null ? Number(rawPrecip) : null,
              cloud_cover: rawCloud != null ? Number(rawCloud) : null,
              wind_speed_10m: rawWind != null ? Number(rawWind) : null,
              wind_kph: windKph,
              wind_direction_10m: rawWindDir != null ? Number(rawWindDir) : null,
              field_id: w.field_id ?? null,
              location: w.location ?? null,
              description: w.description ?? describeWeatherCode(w.weather_code) ?? null,
            };

            setWeather(weatherData);
            console.log("Weather data loaded:", weatherData);
          }
        } catch (e) {
          console.error("Error fetching weather:", e);
        }
      }
      // Fetch crop data for this field
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const cropRes = await fetch(`http://localhost:5001/api/crops?field_id=${fieldId}`, { headers });
        if (cropRes.ok) {
          const cropData = await cropRes.json().catch(() => ({}));
          if (cropData.crops && Array.isArray(cropData.crops) && cropData.crops.length > 0) {
            const fetchedCrop = cropData.crops[0];
            
            setCrop({
              name: fetchedCrop.name || "Unknown Crop",
              planting_date: fetchedCrop.planting_date || null,
              expected_harvest_date: fetchedCrop.expected_harvest_date || null,
              actual_harvest_date: fetchedCrop.actual_harvest_date || null,
              expected_yield_kg: fetchedCrop.expected_yield_kg ?? null,
              actual_yield_kg: fetchedCrop.actual_yield_kg ?? null,
              health_status: fetchedCrop.health_status || "Unknown",
              notes:
                fetchedCrop.notes ||
                "Crop data from database. Health status auto-derived from planting age when available.",
            });
            console.log("🌾 Crop data loaded:", fetchedCrop);
          } else {
            console.log("No crop data found for this field");
          }
        }
      } catch (e) {
        console.error("Error fetching crop data:", e);
      }
      setIsLoading(false);
    };

    loadFieldData();
  }, [fieldId]);

  return (
    <div className="min-h-screen bg-brand-hero p-6">
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading field details...</p>
            </div>
          </div>
        ) : field ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-xl font-extrabold text-slate-900">{field.name || defaultFieldName}</h1>
                      <button
                        onClick={() => {
                          setFieldName(field.name || defaultFieldName);
                          setNameDirty(false);
                          setNameError(null);
                          setIsNameModalOpen(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit field name"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Field ID: <span className="font-medium text-slate-700">{field.id}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600 hidden sm:block">{cityName ?? field.location}</p>
                  </div>

                  <div className="self-start">
                    <BackButton href="/fields" iconClassName="text-slate-900" />
                  </div>
                </div>
              </div>
            </div>

            {isNameModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900">Edit field name</h2>
                  <p className="text-sm text-slate-500 mt-1">Default is crop name + field ID if unchanged.</p>
                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="field-name-input">Field name</label>
                    <input
                      id="field-name-input"
                      value={fieldName}
                      onChange={(e) => {
                        setFieldName(e.target.value);
                        setNameDirty(true);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={defaultFieldName}
                    />
                    {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setIsNameModalOpen(false);
                        setNameDirty(false);
                        setFieldName(field.name || defaultFieldName);
                        setNameError(null);
                      }}
                      className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveFieldName}
                      disabled={isSavingName}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isSavingName ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isPlantCropModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900">Plant a Crop</h2>
                  <p className="text-sm text-slate-500 mt-1">Enter the crop details to start a new planting cycle.</p>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700" htmlFor="crop-name">Crop Name</label>
                      <select
                        id="crop-name"
                        value={plantCropForm.cropName}
                        onChange={(e) => {
                          setPlantCropForm({ ...plantCropForm, cropName: e.target.value });
                          setPlantCropError(null);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      >
                        <option value="">Select a crop...</option>
                        {isLoadingCrops ? (
                          <option disabled>Loading crops...</option>
                        ) : availableCrops.length === 0 ? (
                          <option disabled>No crops available in inventory</option>
                        ) : (
                          availableCrops.map((crop) => (
                            <option key={crop} value={crop}>
                              {crop}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700" htmlFor="planting-date">Planting Date</label>
                      <input
                        id="planting-date"
                        type="date"
                        value={plantCropForm.plantingDate}
                        onChange={(e) => {
                          setPlantCropForm({ ...plantCropForm, plantingDate: e.target.value });
                          setPlantCropError(null);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700" htmlFor="expected-yield">Expected Yield (kg)</label>
                      <input
                        id="expected-yield"
                        type="number"
                        step="0.1"
                        min="0"
                        value={plantCropForm.expectedYield}
                        onChange={(e) => {
                          setPlantCropForm({ ...plantCropForm, expectedYield: e.target.value });
                          setPlantCropError(null);
                        }}
                        placeholder="e.g., 500"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    {plantCropError && <p className="text-xs text-red-600">{plantCropError}</p>}
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setIsPlantCropModalOpen(false);
                        setPlantCropForm({ cropName: "", plantingDate: "", expectedYield: "" });
                        setPlantCropError(null);
                      }}
                      className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveCrop}
                      disabled={isSavingCrop}
                      className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow hover:bg-green-700 disabled:opacity-60"
                    >
                      {isSavingCrop ? "Planting..." : "Plant"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weather card */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <WeatherIcon code={weather.weather_code} size={56} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{weather.description ?? "No data"}</h3>
                    <p className="text-sm text-slate-500">{weather.date ?? "—"}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white">
                      <TempIcon />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Temp (°C)</div>
                      <div className="text-lg font-medium">{weather.temperature_c ?? "—"}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white">
                      <HumidityIcon />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Humidity</div>
                      <div className="text-lg font-medium">{weather.relative_humidity ?? "—"}%</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white">
                      <PrecipProbIcon />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Precip Prob</div>
                      <div className="text-lg font-medium">{weather.precipitation_probability ?? "—"}%</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white">
                      <PrecipIcon />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Precip (mm)</div>
                      <div className="text-lg font-medium">{weather.precipitation ?? "—"}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white">
                      <CloudIcon />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Cloud Cover</div>
                      <div className="text-lg font-medium">{weather.cloud_cover ?? "—"}%</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white">
                      <WindIcon />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Wind</div>
                      <div className="text-lg font-medium">{weather.wind_kph ?? "—"} kph</div>
                    </div>
                  </div>
                </div>

                {/*debug info for OpenWeather API*/}
                {/* <div className="mt-4 border-t pt-3 text-xs text-slate-500">
                  <div><strong>Weather Code:</strong> {weather.weather_code ?? "—"}</div>
                  <div><strong>Wind Dir (10m):</strong> {weather.wind_direction_10m ?? "—"}°</div>
                  <div><strong>Field ID (weather):</strong> {weather.field_id ?? "—"}</div>
                  <div><strong>Location (weather):</strong> {weather.location ?? field.location ?? "—"}</div>
                  <div><strong>Raw Temp Value:</strong> {weather.temperature ?? "—"}</div>
                  <div className="mt-2 text-xs text-slate-400">All weather attributes are shown for diagnostics and kept intact.</div>
                </div> */}
              </div>

              {/* Crop details & planting calendar */}
              <div className="lg:col-span-2 space-y-6">
                {crop ? (
                  <>
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h2 className="text-xl font-semibold text-slate-900">{crop.name}</h2>
                          <p className="text-sm text-slate-500">
                            Planting: <span className="font-medium">{crop.planting_date ? formatLongDate(crop.planting_date) : "Not set"}</span>
                            {/* {' '}|{' '}
                            Expected Harvest: <span className="font-medium">{crop.expected_harvest_date ? formatLongDate(crop.expected_harvest_date) : "Not set"}</span>
                            {' '}|{' '}
                            Actual Harvest: <span className="font-medium">{crop.actual_harvest_date ? formatLongDate(crop.actual_harvest_date) : "Not recorded"}</span> */}
                          </p>
                          {/* <p className="text-sm text-slate-500">
                            Expected Yield: <span className="font-medium">{crop.expected_yield_kg != null ? `${crop.expected_yield_kg} kg` : "Not set"}</span>
                            {' '}|{' '}
                            Actual Yield: <span className="font-medium">{crop.actual_yield_kg != null ? `${crop.actual_yield_kg} kg` : "Not recorded"}</span>
                          </p> */}
                        </div>
                        <div className="text-sm text-slate-500 text-right">
                          <div className="mb-1"><strong>Health:</strong> <span className="font-medium">{crop.health_status ?? "Unknown"}</span></div>
                          <div className="mb-1"><strong>Age:</strong> <span className="font-medium">{plantingStatus}</span></div>
                          <div><strong>Area:</strong> <span className="font-medium">{field.area_ha} ha</span></div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-slate-600">
                        <h4 className="font-medium mb-1">Notes</h4>
                        <p className="leading-relaxed whitespace-pre-line">{crop.notes}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Planting & Harvest Calendar</h3>
                      <PlantingCalendar
                        fieldId={field.id}
                        initialPlantingDate={crop.planting_date || undefined}
                        initialHarvestDate={crop.expected_harvest_date || undefined}
                        onPlantingDateChange={updateCropPlantingDate}
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-500">No crop data available for this field.</p>
                      <button
                        onClick={() => {
                          setIsPlantCropModalOpen(true);
                          setPlantCropError(null);
                          setPlantCropForm({ cropName: "", plantingDate: "", expectedYield: "" });
                          fetchAvailableCrops();
                        }}
                        className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow hover:bg-green-700 transition-colors"
                      >
                        Plant a Crop
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-3">Field Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-500">Area</div>
                      <div className="text-lg font-medium">{field.area_ha} ha</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-500">Location</div>
                      <div className="text-lg font-medium">{field.location}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-500">City</div>
                      <div className="text-lg font-medium">{cityName ?? "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600">Failed to load field details. Please try again.</p>
          </div>
        )}
      </div> 
    </div>
  );
}
