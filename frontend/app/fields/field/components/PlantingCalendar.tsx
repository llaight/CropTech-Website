"use client";
import React, { useEffect, useState } from "react";
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

export default function PlantingCalendar({ fieldId, initialPlantingDate, initialHarvestDate, onPlantingDateChange, onHarvestDateChange }: Props) {
  const storageKey = `field-${fieldId}-dates`;
  const eventsKey = `field-${fieldId}-events`;
  const [plantingDate, setPlantingDate] = useState<string>(initialPlantingDate ?? "");
  const [harvestDate, setHarvestDate] = useState<string>(initialHarvestDate ?? "");
  const [events, setEvents] = useState<Record<string, { watered?: boolean; fertilizer?: boolean; pesticide?: boolean; typhoon?: boolean; note?: string }>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load dates and events on component mount
  useEffect(() => {
    try {
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

      // Load events
      const rawEvents = localStorage.getItem(eventsKey);
      if (rawEvents) {
        setEvents(JSON.parse(rawEvents));
      }
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
    if (isLoading) return;
    
    try {
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

  function formatDateKey(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

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

  function toggleEventForDate(dateKey: string, key: 'watered' | 'fertilizer' | 'pesticide' | 'typhoon') {
    setEvents(prev => {
      const prevEntry = prev[dateKey] ?? {};
      const updated = { ...prev, [dateKey]: { ...prevEntry, [key]: !prevEntry[key as keyof typeof prevEntry] } };
      return updated;
    });
  }

  function saveNoteForDate(dateKey: string, note: string) {
    setEvents(prev => ({ ...prev, [dateKey]: { ...(prev[dateKey] ?? {}), note } }));
  }

  function exportEventsCSV() {
    try {
      const header = ['date', 'watered', 'fertilizer', 'pesticide', 'typhoon', 'note'];
      const keys = Object.keys(events).sort();
      const rows = [header, ...keys.map(k => {
        const e = events[k] ?? {};
        return [k, e.watered ? '1' : '0', e.fertilizer ? '1' : '0', e.pesticide ? '1' : '0', e.typhoon ? '1' : '0', e.note ? String(e.note) : ''];
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

  const diffDays = daysBetween(plantingDate, harvestDate);

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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearDates}
            className="text-sm px-3 py-1 rounded-md bg-red-50 text-red-700 border border-red-100"
          >
            Clear
          </button>
        </div>
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
                      const e = events[key];
                      const isPlanting = plantingDate === key;
                      const isHarvest = harvestDate === key;
                      const hasTyphoon = e?.typhoon;
                      const highlightClass = hasTyphoon 
                        ? 'bg-red-100 ring-2 ring-red-400' 
                        : isPlanting || isHarvest 
                        ? 'bg-green-200/80 ring-2 ring-green-400' 
                        : '';
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedDate(key)}
                          className={`h-14 p-1 border rounded-md text-left hover:bg-slate-50 ${selectedDate === key ? 'ring-2 ring-green-300' : ''} ${highlightClass}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm">{day}</div>
                            <div className="flex items-center gap-1">
                              {e?.watered && (
                                <div className="w-5 h-5 flex items-center justify-center">
                                  <Image 
                                    src={waterIcon}
                                    alt="Watered" 
                                    width={16} 
                                    height={16} 
                                    className="w-4 h-4"
                                  />
                                </div>
                              )}
                              {e?.fertilizer && (
                                <div className="w-5 h-5 flex items-center justify-center">
                                  <Image 
                                    src={fertilizerIcon}
                                    alt="Fertilizer" 
                                    width={16} 
                                    height={16} 
                                    className="w-4 h-4"
                                  />
                                </div>
                              )}
                              {e?.pesticide && (
                                <div className="w-5 h-5 flex items-center justify-center">
                                  <Image 
                                    src={pesticideIcon}
                                    alt="Pesticide" 
                                    width={16} 
                                    height={16} 
                                    className="w-4 h-4"
                                  />
                                </div>
                              )}
                              {e?.typhoon && (
                                <div className="w-5 h-5 flex items-center justify-center">
                                  <Image 
                                    src={typhoonIcon}
                                    alt="Typhoon" 
                                    width={16} 
                                    height={16} 
                                    className="w-4 h-4"
                                  />
                                </div>
                              )}
                            </div>
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
                  <div className="text-sm text-slate-500">{new Date(selectedDate).toLocaleDateString()}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!events[selectedDate]?.watered} onChange={() => toggleEventForDate(selectedDate, 'watered')} />
                    <span className="text-sm">Watered</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!events[selectedDate]?.fertilizer} onChange={() => toggleEventForDate(selectedDate, 'fertilizer')} />
                    <span className="text-sm">Fertilizer</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!events[selectedDate]?.pesticide} onChange={() => toggleEventForDate(selectedDate, 'pesticide')} />
                    <span className="text-sm">Pesticide</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!events[selectedDate]?.typhoon} onChange={() => toggleEventForDate(selectedDate, 'typhoon')} />
                    <span className="text-sm">Typhoon</span>
                  </label>
                </div>

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
    </div>
  );
}