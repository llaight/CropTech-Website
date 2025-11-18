"use client";
import React, { useEffect, useState } from "react";

interface Props {
  fieldId: string | number;
  initialPlantingDate?: string;
  initialHarvestDate?: string;
}

export default function PlantingCalendar({ fieldId, initialPlantingDate, initialHarvestDate }: Props) {
  const storageKey = `field-${fieldId}-dates`;
  const [plantingDate, setPlantingDate] = useState<string>(initialPlantingDate ?? "");
  const [harvestDate, setHarvestDate] = useState<string>(initialHarvestDate ?? "");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPlantingDate(parsed.planting ?? initialPlantingDate ?? "");
        setHarvestDate(parsed.harvest ?? initialHarvestDate ?? "");
      } else {
        setPlantingDate(initialPlantingDate ?? "");
        setHarvestDate(initialHarvestDate ?? "");
      }
    } catch (e) {
      setPlantingDate(initialPlantingDate ?? "");
      setHarvestDate(initialHarvestDate ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId]);

  useEffect(() => {
    const payload = { planting: plantingDate, harvest: harvestDate };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      // ignore localStorage errors
    }
  }, [plantingDate, harvestDate, storageKey]);

  function clearDates() {
    setPlantingDate("");
    setHarvestDate("");
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
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
            onChange={(e) => setPlantingDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-slate-700 mb-1">Expected harvest</span>
          <input
            type="date"
            value={harvestDate}
            onChange={(e) => setHarvestDate(e.target.value)}
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
    </div>
  );
}
