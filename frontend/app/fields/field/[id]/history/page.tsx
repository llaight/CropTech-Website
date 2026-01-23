"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackButton from "../../../../components/BackButton";
import { formatLongDate } from "../../../../lib/utils";

interface HarvestHistory {
  id: number;
  field_id: number;
  crop_name: string;
  planting_date: string;
  harvest_date: string;
  expected_yield_kg: number;
  actual_yield_kg: number;
  notes: string;
  calendar_events?: Record<string, CalendarEvent> | null;
  created_at: string;
}

interface CalendarEvent {
  watered?: boolean;
  fertilizer?: boolean;
  pesticide?: boolean;
  typhoon?: boolean;
  typhoonData?: {
    name?: string;
    signalWarning?: string;
    rainfallWarning?: string;
    duration?: string;
    durationUnit?: string;
    isStartDate?: boolean;
    typhoonId?: string;
  };
  note?: string;
}

export default function FieldHistoryPage() {
  const params = useParams();
  const fieldId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [history, setHistory] = useState<HarvestHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<HarvestHistory | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!fieldId) {
        setError("Missing field id");
        setIsLoading(false);
        return;
      }

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const headers: any = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Fetch field name first
        const fieldRes = await fetch(`http://localhost:5001/api/fields/${encodeURIComponent(fieldId)}`, { headers });
        if (fieldRes.ok) {
          const fieldData = await fieldRes.json().catch(() => ({}));
          setFieldName(fieldData.name || `Field ${fieldId}`);
        }

        // Fetch harvest history
        const historyRes = await fetch(`http://localhost:5001/api/fields/${encodeURIComponent(fieldId)}/harvest-history`, { headers });
        if (historyRes.ok) {
          const data = await historyRes.json().catch(() => ({}));
          const historyData = ((data.history || []) as HarvestHistory[]).map((item) => {
            let parsedEvents: Record<string, CalendarEvent> | null = null;
            const rawEvents = (item as any).calendar_events;
            if (rawEvents) {
              try {
                parsedEvents = typeof rawEvents === "string" ? JSON.parse(rawEvents) : rawEvents;
              } catch (e) {
                console.warn("Failed to parse calendar events for record", item.id, e);
              }
            }

            return {
              ...item,
              calendar_events: parsedEvents,
              // Normalize possible null/undefined payloads so rendering and math stay safe
              expected_yield_kg: Number(item.expected_yield_kg ?? 0),
              actual_yield_kg: Number(item.actual_yield_kg ?? 0),
              planting_date: item.planting_date || "",
              harvest_date: item.harvest_date || "",
              notes: item.notes || "-",
            };
          });
          setHistory(historyData);
          console.log("Loaded harvest history:", historyData.length, "records");
        } else if (historyRes.status === 404) {
          setHistory([]);
          console.log("No harvest history found for this field");
        } else {
          throw new Error(`Failed to fetch history: ${historyRes.status}`);
        }
      } catch (err) {
        console.error("Error loading history:", err);
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setIsLoading(false);
      }
    };

    if (fieldId) {
      loadHistory();
    }
  }, [fieldId]);

  const summarizeEvents = (events?: Record<string, CalendarEvent> | null) => {
    if (!events) return { watered: 0, fertilizer: 0, pesticide: 0, typhoon: 0, noted: 0 };
    return Object.values(events).reduce(
      (acc, evt) => ({
        watered: acc.watered + (evt.watered ? 1 : 0),
        fertilizer: acc.fertilizer + (evt.fertilizer ? 1 : 0),
        pesticide: acc.pesticide + (evt.pesticide ? 1 : 0),
        typhoon: acc.typhoon + (evt.typhoon ? 1 : 0),
        noted: acc.noted + (evt.note ? 1 : 0),
      }),
      { watered: 0, fertilizer: 0, pesticide: 0, typhoon: 0, noted: 0 }
    );
  };

  const renderEventTags = (event: CalendarEvent) => (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {event.watered && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Watered</span>}
      {event.fertilizer && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Fertilizer</span>}
      {event.pesticide && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Pesticide</span>}
      {event.typhoon && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700">Typhoon</span>}
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-hero p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-extrabold text-slate-900">
                    {fieldName} - Harvest History
                  </h1>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Field ID: <span className="font-medium text-slate-700">{fieldId}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  View all past harvests and yields from this field
                </p>
              </div>

              <div className="self-start">
                <BackButton href={`/fields/field/${fieldId}`} iconClassName="text-slate-900" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading harvest history...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-medium">Error loading history</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-600 font-medium">No harvest history</p>
            <p className="text-slate-500 text-sm mt-1">This field has no recorded harvests yet</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Crop</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Planting Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Harvest Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Expected Yield (kg)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Actual Yield (kg)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Notes</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Calendar</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, index) => (
                    <tr 
                      key={record.id} 
                      className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900">{record.crop_name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {record.planting_date ? formatLongDate(record.planting_date) : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {record.harvest_date ? formatLongDate(record.harvest_date) : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          {record.expected_yield_kg.toLocaleString()} kg
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {record.actual_yield_kg.toLocaleString()} kg
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                        <div className="truncate" title={record.notes || "No notes"}>
                          {record.notes || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {record.calendar_events ? (
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="px-3 py-1 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No events</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Records</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{history.length}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Expected Yield</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {history.reduce((sum, record) => sum + record.expected_yield_kg, 0).toLocaleString()} kg
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Actual Yield</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {history.reduce((sum, record) => sum + record.actual_yield_kg, 0).toLocaleString()} kg
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedRecord.crop_name} Calendar</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Planting: {selectedRecord.planting_date ? formatLongDate(selectedRecord.planting_date) : "N/A"} • Harvest: {selectedRecord.harvest_date ? formatLongDate(selectedRecord.harvest_date) : "N/A"}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-3 py-1 border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Event Summary</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summarizeEvents(selectedRecord.calendar_events)).map(([label, count]) => (
                    <span key={label} className="px-3 py-1 rounded-full bg-white border border-slate-200 text-sm capitalize text-slate-700">
                      {label}: {count}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedRecord.notes || "No notes"}</p>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Events</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Notes</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Typhoon</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.calendar_events && Object.keys(selectedRecord.calendar_events).length > 0 ? (
                    Object.entries(selectedRecord.calendar_events)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([dateKey, event]) => (
                        <tr key={dateKey} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatLongDate(dateKey)}</td>
                          <td className="px-4 py-3">{renderEventTags(event)}</td>
                          <td className="px-4 py-3 text-slate-700 max-w-xs">{event.note || "-"}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {event.typhoon && event.typhoonData ? (
                              <div className="space-y-1">
                                <p className="font-medium text-slate-800">{event.typhoonData.name || "Typhoon"}</p>
                                <p className="text-xs text-slate-600">Signal: {event.typhoonData.signalWarning || "-"} • Rainfall: {event.typhoonData.rainfallWarning || "-"}</p>
                                <p className="text-xs text-slate-600">Duration: {event.typhoonData.duration || "-"} {event.typhoonData.durationUnit || "days"}</p>
                                {event.typhoonData.isStartDate && <span className="text-[11px] text-red-600 font-semibold">Start day</span>}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-slate-500">No calendar events recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
