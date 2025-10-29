"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LeafletMapProps {
  center?: [number, number] | null;
}

export default function LeafletMap({ center }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      // Philippines center coordinates (default)
      const defaultCenter: [number, number] = [12.8797, 121.7740];
      const initialCenter = center || defaultCenter;

      // Create map
      const map = L.map(mapRef.current).setView(initialCenter, center ? 13 : 6);

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add agricultural area markers in the Philippines
      const agriculturalAreas = [
        { name: "Central Luzon", coords: [15.4828, 120.5848], type: "Rice" },
        { name: "Cagayan Valley", coords: [17.6129, 121.7265], type: "Rice & Corn" },
        { name: "Mindanao", coords: [7.9644, 123.6253], type: "Various Crops" },
        { name: "Bicol Region", coords: [13.4210, 123.2911], type: "Coconuts & Rice" },
        { name: "Ilocos Region", coords: [16.5670, 120.3977], type: "Rice & Tobacco" },
        { name: "Visayas", coords: [10.3157, 123.8854], type: "Sugar & Rice" },
      ];

      agriculturalAreas.forEach((area) => {
        L.marker(area.coords as L.LatLngExpression, {
          icon: L.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        })
          .addTo(map)
          .bindPopup(`<b>${area.name}</b><br/>Crops: ${area.type}`);
      });


      mapInstanceRef.current = map;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Effect to handle center changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, 13, {
        animate: true,
        duration: 1.0
      });

      // Add a marker for the searched location
      L.marker(center as L.LatLngExpression, {
        icon: L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        }),
      }).addTo(mapInstanceRef.current).bindPopup("Searched Location").openPopup();
    }
  }, [center]);

  return <div ref={mapRef} className="absolute inset-0" style={{ minHeight: "600px" }} />;
}

