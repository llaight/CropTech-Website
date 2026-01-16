"use client";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Image from "next/image";

// Import your local PNG files
import waterIcon from "./water.png";
import fertilizerIcon from "./fertilizer.png";
import pesticideIcon from "./pesticide.png";
import typhoonIcon from "./typhoon.png";

interface Props {
  fieldId: string | number;
  initialPlantingDate?: string;
  initialHarvestDate?: string;
  onPlantingDateChange?: (date: string) => void;
  onHarvestDateChange?: (date: string) => void;
}

// Typhoon interface
interface TyphoonData {
  name: string;
  signalWarning: string;
  rainfallWarning: string;
  duration: string;
  durationUnit: 'days' | 'weeks';
  isStartDate?: boolean;
  typhoonId?: string;
  note?: string;
}

interface EventData {
  watered?: boolean;
  fertilizer?: boolean;
  pesticide?: boolean;
  typhoon?: boolean;
  typhoonData?: TyphoonData;
  note?: string;
}

export default function PlantingCalendar({ fieldId, initialPlantingDate, initialHarvestDate, onPlantingDateChange, onHarvestDateChange }: Props) {
  const storageKey = `field-${fieldId}-dates`;
  const eventsKey = `field-${fieldId}-events`;
  
  const [plantingDate, setPlantingDate] = useState<string>(initialPlantingDate ?? "");
  const [harvestDate, setHarvestDate] = useState<string>(initialHarvestDate ?? "");
  const [events, setEvents] = useState<Record<string, EventData>>({});
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [typhoonForm, setTyphoonForm] = useState<TyphoonData>({
    name: "",
    signalWarning: "none",
    rainfallWarning: "none",
    duration: "1",
    durationUnit: "days",
    isStartDate: true
  });

  // Harvest modal state
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
  const [harvestFormDate, setHarvestFormDate] = useState<string>("");
  const [actualYieldKg, setActualYieldKg] = useState<string>("");
  const [harvestNotes, setHarvestNotes] = useState<string>("");
  const [isSubmittingHarvest, setIsSubmittingHarvest] = useState(false);
  const [harvestError, setHarvestError] = useState<string | null>(null);

  // Use ref to track loading state
  const initialLoadDone = useRef(false);

  // Generate unique typhoon ID
  const generateTyphoonId = useCallback(() => `typhoon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);

  // Load dates and events on component mount - ONLY ONCE
  useEffect(() => {
    if (initialLoadDone.current) return;
    
    try {
      console.log("Loading calendar data...");
      
      // Load dates
      const rawDates = localStorage.getItem(storageKey);
      if (rawDates) {
        const parsed = JSON.parse(rawDates);
        setPlantingDate(parsed.planting ?? initialPlantingDate ?? "");
        setHarvestDate(parsed.harvest ?? initialHarvestDate ?? "");
      } else {
        setPlantingDate(initialPlantingDate ?? "");
        setHarvestDate(initialHarvestDate ?? "");
      }

      // Load events - combine both regular events and typhoon data
      const rawEvents = localStorage.getItem(eventsKey);
      let loadedEvents: Record<string, EventData> = {};
      
      if (rawEvents) {
        try {
          loadedEvents = JSON.parse(rawEvents);
          console.log("Loaded events from storage:", Object.keys(loadedEvents).length);
        } catch (e) {
          console.error("Error parsing events:", e);
        }
      }
      
      setEvents(loadedEvents);
      initialLoadDone.current = true;
      
    } catch (e) {
      console.error("Error loading from localStorage:", e);
    } finally {
      setIsLoading(false);
    }
  }, [fieldId, initialPlantingDate, initialHarvestDate, storageKey, eventsKey]);

  // Save dates when they change
  useEffect(() => {
    if (isLoading) return;
    
    const payload = { planting: plantingDate, harvest: harvestDate };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error("Error saving dates to localStorage:", e);
    }

    // Notify parent of changes
    if (plantingDate) {
      onPlantingDateChange?.(plantingDate);
    }
    if (harvestDate) {
      onHarvestDateChange?.(harvestDate);
    }
  }, [plantingDate, harvestDate, storageKey, isLoading, onPlantingDateChange, onHarvestDateChange]);

  // Save events when they change
  useEffect(() => {
    if (isLoading || !initialLoadDone.current) return;
    
    try {
      console.log("Saving events to storage:", Object.keys(events).length);
      localStorage.setItem(eventsKey, JSON.stringify(events));
    } catch (e) {
      console.error("Error saving events to localStorage:", e);
    }
  }, [events, eventsKey, isLoading]);

  function clearDates() {
    setPlantingDate("");
    setHarvestDate("");
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error("Error clearing dates:", e);
    }
  }

  const formatDateKey = useCallback((d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const getDateFromKey = useCallback((dateKey: string): Date => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, []);

  function getMonthsBetween(start: Date, end: Date) {
    const months = [] as { year: number; month: number }[];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= last) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  }

  const calendarRanges = React.useMemo(() => {
    if (!plantingDate) return [] as { year: number; month: number }[];
    const start = new Date(plantingDate + 'T00:00:00');
    let end: Date;
    if (harvestDate) {
      end = new Date(harvestDate + 'T00:00:00');
    } else {
      end = new Date(start);
      end.setMonth(end.getMonth() + 2);
    }
    return getMonthsBetween(start, end);
  }, [plantingDate, harvestDate]);

  const [visibleMonthIndex, setVisibleMonthIndex] = useState<number>(0);
  useEffect(() => setVisibleMonthIndex(0), [plantingDate, calendarRanges.length]);

  // Find start date for a typhoon
  const findTyphoonStartDate = useCallback((typhoonId: string): string | null => {
    for (const [dateKey, event] of Object.entries(events)) {
      if (event.typhoonData?.typhoonId === typhoonId && event.typhoonData.isStartDate) {
        return dateKey;
      }
    }
    return null;
  }, [events]);

  // Find typhoon data for a date
  const getTyphoonDataForDate = useCallback((dateKey: string): TyphoonData | null => {
    return events[dateKey]?.typhoonData || null;
  }, [events]);

  // Check if date is part of a typhoon
  const isDateInTyphoon = useCallback((dateKey: string): boolean => {
    return !!events[dateKey]?.typhoon;
  }, [events]);

  // Get day number in typhoon (e.g., "2nd day")
  const getTyphoonDayNumber = useCallback((dateKey: string): string | null => {
    const typhoonData = events[dateKey]?.typhoonData;
    if (!typhoonData || !typhoonData.typhoonId) return null;
    
    const startDateKey = findTyphoonStartDate(typhoonData.typhoonId);
    if (!startDateKey) return null;
    
    const startDate = getDateFromKey(startDateKey);
    const checkDate = getDateFromKey(dateKey);
    const diffTime = checkDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays <= 0) return null;
    
    // Format as ordinal (1st, 2nd, 3rd, etc.)
    const suffixes = ["th", "st", "nd", "rd"];
    const v = diffDays % 100;
    return diffDays + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }, [events, findTyphoonStartDate, getDateFromKey]);

  // Create new typhoon
  const createNewTyphoon = useCallback((dateKey: string, data: TyphoonData) => {
    const typhoonId = generateTyphoonId();
    const duration = parseInt(data.duration) || 1;
    const startDate = getDateFromKey(dateKey);
    
    const newEvents = { ...events };
    
    // Add start date
    newEvents[dateKey] = {
      ...(newEvents[dateKey] || {}),
      typhoon: true,
      typhoonData: {
        ...data,
        isStartDate: true,
        typhoonId
      }
    };
    
    // Add duration days
    for (let i = 1; i < duration; i++) {
      const nextDate = new Date(startDate);
      nextDate.setDate(nextDate.getDate() + i);
      const nextDateKey = formatDateKey(nextDate);
      
      newEvents[nextDateKey] = {
        ...(newEvents[nextDateKey] || {}),
        typhoon: true,
        typhoonData: {
          ...data,
          isStartDate: false,
          typhoonId
        }
      };
    }
    
    return newEvents;
  }, [events, generateTyphoonId, formatDateKey, getDateFromKey]);

  // Update existing typhoon
  const updateTyphoon = useCallback((dateKey: string, data: TyphoonData) => {
    const currentData = events[dateKey]?.typhoonData;
    if (!currentData || !currentData.typhoonId) return events;
    
    const typhoonId = currentData.typhoonId;
    const startDateKey = findTyphoonStartDate(typhoonId);
    if (!startDateKey) return events;
    
    const oldDuration = parseInt(currentData.duration) || 1;
    const newDuration = parseInt(data.duration) || 1;
    const startDate = getDateFromKey(startDateKey);
    
    const newEvents = { ...events };
    
    // Update start date if this is it
    if (dateKey === startDateKey) {
      newEvents[dateKey] = {
        ...newEvents[dateKey],
        typhoonData: {
          ...data,
          isStartDate: true,
          typhoonId
        }
      };
      
      // Remove old duration days if duration decreased
      if (newDuration < oldDuration) {
        for (let i = newDuration; i < oldDuration; i++) {
          const targetDate = new Date(startDate);
          targetDate.setDate(targetDate.getDate() + i);
          const targetDateKey = formatDateKey(targetDate);
          
          if (newEvents[targetDateKey]) {
            const { typhoonData, typhoon, ...rest } = newEvents[targetDateKey];
            if (Object.keys(rest).length > 0) {
              newEvents[targetDateKey] = rest;
            } else {
              delete newEvents[targetDateKey];
            }
          }
        }
      }
      
      // Add/update new duration days
      for (let i = 1; i < newDuration; i++) {
        const nextDate = new Date(startDate);
        nextDate.setDate(nextDate.getDate() + i);
        const nextDateKey = formatDateKey(nextDate);
        
        newEvents[nextDateKey] = {
          ...(newEvents[nextDateKey] || {}),
          typhoon: true,
          typhoonData: {
            ...data,
            isStartDate: false,
            typhoonId
          }
        };
      }
    } else {
      // Update just this day
      newEvents[dateKey] = {
        ...newEvents[dateKey],
        typhoonData: {
          ...currentData,
          signalWarning: data.signalWarning,
          rainfallWarning: data.rainfallWarning,
          isStartDate: false,
          typhoonId
        }
      };
    }
    
    return newEvents;
  }, [events, findTyphoonStartDate, formatDateKey, getDateFromKey]);

  // Remove typhoon
  const removeTyphoon = useCallback((dateKey: string) => {
    const currentData = events[dateKey]?.typhoonData;
    if (!currentData || !currentData.typhoonId) return events;
    
    const typhoonId = currentData.typhoonId;
    const startDateKey = findTyphoonStartDate(typhoonId);
    
    const newEvents = { ...events };
    
    if (dateKey === startDateKey) {
      // Remove entire typhoon
      const duration = parseInt(currentData.duration) || 1;
      const startDate = getDateFromKey(dateKey);
      
      for (let i = 0; i < duration; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(targetDate.getDate() + i);
        const targetDateKey = formatDateKey(targetDate);
        
        if (newEvents[targetDateKey]) {
          const { typhoonData, typhoon, ...rest } = newEvents[targetDateKey];
          if (Object.keys(rest).length > 0) {
            newEvents[targetDateKey] = rest;
          } else {
            delete newEvents[targetDateKey];
          }
        }
      }
    } else {
      // Remove just this day from typhoon
      const { typhoonData, typhoon, ...rest } = newEvents[dateKey];
      if (Object.keys(rest).length > 0) {
        newEvents[dateKey] = rest;
      } else {
        delete newEvents[dateKey];
      }
    }
    
    return newEvents;
  }, [events, findTyphoonStartDate, formatDateKey, getDateFromKey]);

  // Toggle events
  const toggleEventForDate = useCallback((dateKey: string, key: 'watered' | 'fertilizer' | 'pesticide' | 'typhoon') => {
    setEvents(prev => {
      const prevEntry = prev[dateKey] || {};
      
      if (key === 'typhoon') {
        if (!prevEntry.typhoon) {
          // Adding typhoon - check if part of existing typhoon
          const existingTyphoonData = Object.values(prev).find(event => 
            event.typhoonData?.typhoonId && 
            event.typhoonData.isStartDate
          )?.typhoonData;
          
          if (existingTyphoonData) {
            // Check if this date is within existing typhoon duration
            const startDateKey = findTyphoonStartDate(existingTyphoonData.typhoonId!);
            if (startDateKey) {
              const startDate = getDateFromKey(startDateKey);
              const checkDate = getDateFromKey(dateKey);
              const diffTime = checkDate.getTime() - startDate.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays >= 0 && diffDays < parseInt(existingTyphoonData.duration || "1")) {
                // Date is within existing typhoon duration
                return {
                  ...prev,
                  [dateKey]: {
                    ...prevEntry,
                    typhoon: true,
                    typhoonData: {
                      ...existingTyphoonData,
                      isStartDate: dateKey === startDateKey
                    }
                  }
                };
              }
            }
          }
          
          // Create new typhoon
          const newEvents = createNewTyphoon(dateKey, {
            ...typhoonForm,
            isStartDate: true
          });
          return newEvents;
        } else {
          // Removing typhoon
          return removeTyphoon(dateKey);
        }
      } else {
        // Other events
        return {
          ...prev,
          [dateKey]: {
            ...prevEntry,
            [key]: !prevEntry[key]
          }
        };
      }
    });
  }, [typhoonForm, createNewTyphoon, removeTyphoon, findTyphoonStartDate, getDateFromKey]);

  // Save typhoon data
  const saveTyphoonDataForDate = useCallback((dateKey: string, data: TyphoonData) => {
    setEvents(prev => {
      const currentData = prev[dateKey]?.typhoonData;
      
      if (!currentData) {
        // Create new typhoon
        return createNewTyphoon(dateKey, data);
      } else {
        // Update existing typhoon
        return updateTyphoon(dateKey, data);
      }
    });
  }, [createNewTyphoon, updateTyphoon]);

  // Handle date click
  const handleDateClick = useCallback((dateKey: string) => {
    const eventData = events[dateKey];
    const typhoonData = eventData?.typhoonData;
    
    if (typhoonData) {
      setTyphoonForm({
        name: typhoonData.name || "",
        signalWarning: typhoonData.signalWarning || "none",
        rainfallWarning: typhoonData.rainfallWarning || "none",
        duration: typhoonData.duration || "1",
        durationUnit: typhoonData.durationUnit || "days",
        isStartDate: typhoonData.isStartDate || false,
        typhoonId: typhoonData.typhoonId
      });
    } else {
      setTyphoonForm({
        name: "",
        signalWarning: "none",
        rainfallWarning: "none",
        duration: "1",
        durationUnit: "days",
        isStartDate: true
      });
    }
    
    setSelectedDate(dateKey);
  }, [events]);

  const saveNoteForDate = useCallback((dateKey: string, note: string) => {
    setEvents(prev => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || {}),
        note
      }
    }));
  }, []);

  function exportEventsCSV() {
    try {
      const header = ['date', 'watered', 'fertilizer', 'pesticide', 'typhoon', 'typhoon_name', 'signal_warning', 'rainfall_warning', 'duration', 'duration_unit', 'note'];
      const keys = Object.keys(events).sort();
      const rows = [header, ...keys.map(k => {
        const e = events[k] || {};
        const typhoonData = e.typhoonData;
        return [
          k, 
          e.watered ? '1' : '0', 
          e.fertilizer ? '1' : '0', 
          e.pesticide ? '1' : '0', 
          e.typhoon ? '1' : '0',
          typhoonData?.name || '',
          typhoonData?.signalWarning || '',
          typhoonData?.rainfallWarning || '',
          typhoonData?.duration || '',
          typhoonData?.durationUnit || '',
          e.note ? String(e.note) : ''
        ];
      })];
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `field-${fieldId}-events.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error exporting CSV:", e);
    }
  }

  function clearAllEvents() {
    if (!confirm('Clear all recorded events for this field? This cannot be undone.')) return;
    setEvents({});
    try { 
      localStorage.removeItem(eventsKey);
    } catch (e) {
      console.error("Error clearing events:", e);
    }
    setSelectedDate(null);
  }

  function daysBetween(a?: string, b?: string) {
    if (!a || !b) return null;
    const da = new Date(a);
    const db = new Date(b);
    if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
    const diff = Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  // Get typhoon warning color
  const getTyphoonWarningColor = useCallback((signalWarning: string, rainfallWarning: string): string => {
    if (signalWarning === "5" || rainfallWarning === "red") return "bg-red-100 ring-2 ring-red-400";
    if (signalWarning === "4" || rainfallWarning === "orange") return "bg-orange-100 ring-2 ring-orange-400";
    if (signalWarning === "3" || rainfallWarning === "yellow") return "bg-yellow-100 ring-2 ring-yellow-400";
    if (signalWarning === "2") return "bg-amber-50 ring-2 ring-amber-300";
    if (signalWarning === "1") return "bg-blue-50 ring-2 ring-blue-300";
    return "bg-yellow-50 ring-2 ring-yellow-300";
  }, []);

  const diffDays = daysBetween(plantingDate, harvestDate);

  // Check if date is start of typhoon
  const isStartDateOfTyphoon = useCallback((dateKey: string): boolean => {
    return events[dateKey]?.typhoonData?.isStartDate || false;
  }, [events]);

  // Check if ready to harvest
  const isReadyToHarvest = useMemo(() => {
    if (!harvestDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(harvestDate);
    expected.setHours(0, 0, 0, 0);
    return today >= expected;
  }, [harvestDate]);

  // Open harvest modal
  const openHarvestModal = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setHarvestFormDate(today);
    setActualYieldKg("");
    setHarvestNotes("");
    setHarvestError(null);
    setIsHarvestModalOpen(true);
  }, []);

  // Submit harvest
  const submitHarvest = useCallback(async () => {
    if (!harvestFormDate) {
      setHarvestError("Please select a harvest date");
      return;
    }

    if (!actualYieldKg || parseFloat(actualYieldKg) <= 0) {
      setHarvestError("Please enter a valid actual yield");
      return;
    }

    setIsSubmittingHarvest(true);
    setHarvestError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Fetch crop ID
      const cropRes = await fetch(`http://localhost:5001/api/crops?field_id=${fieldId}`, { headers });
      if (!cropRes.ok) {
        setHarvestError("Failed to fetch crop data");
        setIsSubmittingHarvest(false);
        return;
      }

      const cropData = await cropRes.json().catch(() => ({}));
      if (!cropData.crops || !Array.isArray(cropData.crops) || cropData.crops.length === 0) {
        setHarvestError("No crop found for this field");
        setIsSubmittingHarvest(false);
        return;
      }

      const cropId = cropData.crops[0].id;

      // Record harvest history and free the field
      const harvestRes = await fetch(`http://127.0.0.1:5001/api/crops/${cropId}/harvest`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          actual_harvest_date: harvestFormDate,
          actual_yield_kg: actualYieldKg ? parseFloat(actualYieldKg) : undefined,
          notes: harvestNotes || undefined
        }),
      });

      if (!harvestRes.ok) {
        const text = await harvestRes.text();
        setHarvestError(text || "Failed to record harvest");
        setIsSubmittingHarvest(false);
        return;
      }

      console.log("Harvest recorded successfully");

      // Update field status to "available" after harvest
      const updateFieldRes = await fetch(`http://127.0.0.1:5001/api/fields/${fieldId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "available" }),
      });

      if (!updateFieldRes.ok) {
        console.error("Failed to update field status");
      } else {
        console.log("Field status updated to available");
      }

      setHarvestDate(harvestFormDate);
      setIsHarvestModalOpen(false);
      
      // Clear cache to ensure fresh data on reload
      try {
        localStorage.removeItem('cachedFieldsData');
        localStorage.removeItem('cachedInventoryData');
      } catch (e) {
        console.error("Error clearing cache:", e);
      }
      
      alert(`Harvest recorded successfully on ${harvestFormDate}. The field is now available.`);
      
      // Reload the page to reflect the changes (crop deleted, field available)
      window.location.reload();
      
    } catch (err: any) {
      setHarvestError(err?.message || "Network error while recording harvest");
    } finally {
      setIsSubmittingHarvest(false);
    }
  }, [actualYieldKg, fieldId, harvestFormDate, harvestNotes]);

  return (
    <div className="mt-6 bg-white/80 p-6 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-3">Planting & Harvest</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col">
          <span className="text-sm font-medium text-slate-700 mb-1">Planting date</span>
          <input
            type="date"
            value={plantingDate}
            onChange={(e) => { setPlantingDate(e.target.value); setSelectedDate(null); }}
            className="px-3 py-2 border rounded-md"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-slate-700 mb-1">Expected harvest</span>
          <input
            type="date"
            value={harvestDate}
            onChange={(e) => { setHarvestDate(e.target.value); setSelectedDate(null); }}
            className="px-3 py-2 border rounded-md"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-slate-700">
          {diffDays === null ? (
            <span>Set both dates to see duration</span>
          ) : (
            <span>Estimated crop duration: <strong>{diffDays} days</strong></span>
          )}
        </div>

        <button
          type="button"
          onClick={clearDates}
          className="text-sm px-3 py-1 rounded-md bg-red-50 text-red-700 border border-red-100"
        >
          Clear
        </button>
      </div>

      {/* Calendar view */}
      <div className="mt-6">
        {!plantingDate ? (
          <div className="text-sm text-slate-600">Set a planting date to view the calendar.</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="font-medium">Calendar</div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={exportEventsCSV} className="px-2 py-1 border rounded-md text-sm bg-white">Export CSV</button>
                <button type="button" onClick={clearAllEvents} className="px-2 py-1 border rounded-md text-sm bg-red-50 text-red-700">Clear Events</button>
              </div>
            </div>

            {/* Legend for event icons */}
            <div className="flex items-center gap-4 text-sm text-slate-700 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <Image 
                    src={waterIcon}
                    alt="Watered" 
                    width={16} 
                    height={16} 
                    className="w-4 h-4"
                  />
                </div>
                <span>Watered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <Image 
                    src={fertilizerIcon}
                    alt="Fertilizer" 
                    width={16} 
                    height={16} 
                    className="w-4 h-4"
                  />
                </div>
                <span>Fertilizer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <Image 
                    src={pesticideIcon}
                    alt="Pesticide" 
                    width={16} 
                    height={16} 
                    className="w-4 h-4"
                  />
                </div>
                <span>Pesticide</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <Image 
                    src={typhoonIcon}
                    alt="Typhoon" 
                    width={16} 
                    height={16} 
                    className="w-4 h-4"
                  />
                </div>
                <span>Typhoon</span>
              </div>
            </div>

            {/* Show one month at a time with Prev/Next controls */}
            {calendarRanges.length === 0 ? null : (() => {
              const idx = Math.max(0, Math.min(visibleMonthIndex, calendarRanges.length - 1));
              const { year, month } = calendarRanges[idx];
              const first = new Date(year, month, 1);
              const days = new Date(year, month + 1, 0).getDate();
              const startOffset = first.getDay();
              const monthName = first.toLocaleString(undefined, { month: 'long' });

              function prev() { setVisibleMonthIndex(i => Math.max(0, i - 1)); }
              function next() { setVisibleMonthIndex(i => Math.min(calendarRanges.length - 1, i + 1)); }

              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={prev} disabled={idx === 0} className="px-2 py-1 border rounded-md">◀</button>
                      <h4 className="font-medium">{monthName} {year}</h4>
                      <button type="button" onClick={next} disabled={idx === calendarRanges.length - 1} className="px-2 py-1 border rounded-md">▶</button>
                    </div>
                    <div className="text-sm text-slate-500">{idx + 1} / {calendarRanges.length}</div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-sm">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} className="text-center text-xs text-slate-500">{d}</div>
                    ))}

                    {Array.from({ length: startOffset }).map((_, i) => (
                      <div key={`pad-${i}`} />
                    ))}

                    {Array.from({ length: days }).map((_, i) => {
                      const day = i + 1;
                      const date = new Date(year, month, day);
                      const key = formatDateKey(date);
                      const e = events[key] || {};
                      const isPlanting = plantingDate === key;
                      const isHarvest = harvestDate === key;
                      const hasTyphoon = e.typhoon;
                      const typhoonData = e.typhoonData;
                      const typhoonDayNumber = getTyphoonDayNumber(key);
                      const isStartDate = isStartDateOfTyphoon(key);
                      
                      const highlightClass = hasTyphoon 
                        ? getTyphoonWarningColor(typhoonData?.signalWarning || "none", typhoonData?.rainfallWarning || "none")
                        : isPlanting || isHarvest 
                        ? 'bg-green-200/80 ring-2 ring-green-400' 
                        : '';
                      
                      // Count active events for layout
                      const activeEvents = [
                        e.watered,
                        e.fertilizer,
                        e.pesticide,
                        hasTyphoon
                      ].filter(Boolean).length;
                      
                      // Determine icon layout based on number of active events
                      const iconContainerClass = activeEvents > 2 
                        ? "flex flex-wrap justify-end gap-0.5" 
                        : "flex items-center justify-end gap-1";
                      
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleDateClick(key)}
                          className={`h-16 p-1 border rounded-md text-left hover:bg-slate-50 ${selectedDate === key ? 'ring-2 ring-green-300' : ''} ${highlightClass}`}
                        >
                          <div className="flex flex-col h-full justify-between">
                            <div className="flex justify-between">
                              <div className="text-sm font-medium">{day}</div>
                              <div className={`${iconContainerClass} w-16`}>
                                {e.watered && (
                                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                    <Image 
                                      src={waterIcon}
                                      alt="Watered" 
                                      width={12} 
                                      height={12} 
                                      className="w-3 h-3"
                                    />
                                  </div>
                                )}
                                {e.fertilizer && (
                                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                    <Image 
                                      src={fertilizerIcon}
                                      alt="Fertilizer" 
                                      width={12} 
                                      height={12} 
                                      className="w-3 h-3"
                                    />
                                  </div>
                                )}
                                {e.pesticide && (
                                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                    <Image 
                                      src={pesticideIcon}
                                      alt="Pesticide" 
                                      width={12} 
                                      height={12} 
                                      className="w-3 h-3"
                                    />
                                  </div>
                                )}
                                {hasTyphoon && (
                                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                    <Image 
                                      src={typhoonIcon}
                                      alt="Typhoon" 
                                      width={12} 
                                      height={12} 
                                      className="w-3 h-3"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            {typhoonDayNumber && (
                              <div className="text-xs text-center font-medium text-slate-700 mt-1">
                                Day {typhoonDayNumber} {isStartDate && "★"}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* editor for selected date */}
            {selectedDate && (
              <div className="mt-4 p-4 border rounded-md bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Edit events for {selectedDate}</div>
                  <div className="text-sm text-slate-500">
                    {new Date(selectedDate).toLocaleDateString()}
                    {getTyphoonDayNumber(selectedDate) && (
                      <span className="ml-2 font-medium text-yellow-700">
                        ({getTyphoonDayNumber(selectedDate)} of typhoon{isStartDateOfTyphoon(selectedDate) && " - Start Date"})
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={!!events[selectedDate]?.watered} 
                      onChange={() => toggleEventForDate(selectedDate, 'watered')} 
                    />
                    <span className="text-sm">Watered</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={!!events[selectedDate]?.fertilizer} 
                      onChange={() => toggleEventForDate(selectedDate, 'fertilizer')} 
                    />
                    <span className="text-sm">Fertilizer</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={!!events[selectedDate]?.pesticide} 
                      onChange={() => toggleEventForDate(selectedDate, 'pesticide')} 
                    />
                    <span className="text-sm">Pesticide</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={!!events[selectedDate]?.typhoon} 
                      onChange={() => toggleEventForDate(selectedDate, 'typhoon')} 
                    />
                    <span className="text-sm">Typhoon</span>
                  </label>
                </div>

                {/* Typhoon details form - only show if typhoon is checked */}
                {events[selectedDate]?.typhoon && (
                  <div className="mb-3 p-3 border border-yellow-200 rounded-md bg-yellow-50">
                    <h5 className="font-medium text-sm mb-2 text-yellow-800">
                      Typhoon Details {getTyphoonDayNumber(selectedDate) && `- Day ${getTyphoonDayNumber(selectedDate)}`}
                      {isStartDateOfTyphoon(selectedDate) && " (Start Date ★)"}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {typhoonForm.isStartDate ? (
                        <>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Typhoon Name *</label>
                            <input
                              type="text"
                              value={typhoonForm.name}
                              onChange={(e) => setTyphoonForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Enter typhoon name"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Duration *</label>
                              <input
                                type="number"
                                min="1"
                                value={typhoonForm.duration}
                                onChange={(e) => setTyphoonForm(prev => ({ ...prev, duration: e.target.value }))}
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Unit *</label>
                              <select
                                value={typhoonForm.durationUnit}
                                onChange={(e) => setTyphoonForm(prev => ({ ...prev, durationUnit: e.target.value as 'days' | 'weeks' }))}
                                className="w-full px-2 py-1 border rounded text-sm"
                              >
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                              </select>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="md:col-span-2">
                          <p className="text-xs text-slate-600 mb-2">
                            <span className="font-medium">Typhoon:</span> {typhoonForm.name || "Unnamed"} 
                            <span className="ml-2 font-medium">Duration:</span> {typhoonForm.duration} {typhoonForm.durationUnit}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Signal Warning</label>
                        <select
                          value={typhoonForm.signalWarning}
                          onChange={(e) => setTyphoonForm(prev => ({ ...prev, signalWarning: e.target.value }))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="none">None</option>
                          <option value="1">Signal #1</option>
                          <option value="2">Signal #2</option>
                          <option value="3">Signal #3</option>
                          <option value="4">Signal #4</option>
                          <option value="5">Signal #5</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Rainfall Warning</label>
                        <select
                          value={typhoonForm.rainfallWarning}
                          onChange={(e) => setTyphoonForm(prev => ({ ...prev, rainfallWarning: e.target.value }))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="none">None</option>
                          <option value="yellow">Yellow</option>
                          <option value="orange">Orange</option>
                          <option value="red">Red</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveTyphoonDataForDate(selectedDate, typhoonForm)}
                        className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm"
                      >
                        {typhoonForm.isStartDate ? "Save Typhoon (All Days)" : "Save This Day Only"}
                      </button>
                      {!typhoonForm.isStartDate && (
                        <button
                          type="button"
                          onClick={() => toggleEventForDate(selectedDate, 'typhoon')}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm"
                        >
                          Remove Typhoon From This Day Only
                        </button>
                      )}
                    </div>
                    {events[selectedDate]?.typhoonData && (
                      <div className="mt-2 text-xs text-slate-600">
                        <p>
                          <strong>Current for this day:</strong> Signal: {events[selectedDate].typhoonData?.signalWarning || "none"} - 
                          Rainfall: {events[selectedDate].typhoonData?.rainfallWarning || "none"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-3">
                  <textarea
                    placeholder="Notes (e.g. amount applied, observations)"
                    className="w-full border rounded-md p-2 text-sm"
                    value={events[selectedDate]?.note ?? ''}
                    onChange={(e) => saveNoteForDate(selectedDate, e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setSelectedDate(null)} className="px-3 py-1 border rounded-md">Close</button>
                  <button type="button" onClick={() => { setSelectedDate(null); }} className="px-3 py-1 bg-green-600 text-white rounded-md">Done</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Harvest button - bottom right */}
      {harvestDate && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={openHarvestModal}
            className={`text-sm px-4 py-2 rounded-md font-semibold shadow transition-colors ${
              isReadyToHarvest
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {isReadyToHarvest ? "🌾 Harvest Now" : "⚠️ Harvest Early"}
          </button>
        </div>
      )}

      {/* Harvest Modal */}
      {isHarvestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {isReadyToHarvest ? "Record Harvest" : "Record Early Harvest"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isReadyToHarvest
                ? "The expected harvest date has been reached."
                : "You are harvesting before the expected date."}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="harvest-date-input">
                  Actual Harvest Date
                </label>
                <input
                  id="harvest-date-input"
                  type="date"
                  value={harvestFormDate}
                  onChange={(e) => setHarvestFormDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="actual-yield-input">
                  Actual Yield (kg)
                </label>
                <input
                  id="actual-yield-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualYieldKg}
                  onChange={(e) => setActualYieldKg(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter harvested yield in kg"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="harvest-notes-input">
                  Notes (optional)
                </label>
                <textarea
                  id="harvest-notes-input"
                  value={harvestNotes}
                  onChange={(e) => setHarvestNotes(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Add any notes about the harvest..."
                />
              </div>

              {harvestError && (
                <p className="text-xs text-red-600">{harvestError}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsHarvestModalOpen(false);
                  setHarvestError(null);
                }}
                disabled={isSubmittingHarvest}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitHarvest}
                disabled={isSubmittingHarvest || !harvestFormDate || !actualYieldKg}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow hover:bg-green-700 disabled:opacity-60"
              >
                {isSubmittingHarvest ? "Recording..." : "Record Harvest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}