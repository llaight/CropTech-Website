"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FieldData {
  id: number;
  name: string;
  crop: string;
  coordinates: [number, number][];
  center: [number, number];
}

interface LeafletMapProps {
  center?: [number, number] | null;
  isDrawingMode?: boolean;
  onPolygonComplete?: (points: [number, number][]) => void;
  currentPolygonPoints?: [number, number][];
  savedFields?: FieldData[];
  onMapReady?: (map: L.Map) => void;
}

export default function LeafletMap({ center, isDrawingMode = false, onPolygonComplete, currentPolygonPoints = [], savedFields = [], onMapReady }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polygonRef = useRef<L.Polygon | null>(null);
  const savedPolygonsRef = useRef<L.Polygon[]>([]);
  const clickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);
  const onPolygonCompleteRef = useRef(onPolygonComplete);
  const onMapReadyRef = useRef(onMapReady);

  // Keep refs updated when callbacks change
  useEffect(() => {
    onPolygonCompleteRef.current = onPolygonComplete;
  }, [onPolygonComplete]);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

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
      
      // Notify parent that map is ready with navigation method
      if (onMapReadyRef.current) {
        (map as any).navigateToField = (coordinates: [number, number][]) => {
          if (coordinates.length > 0) {
            const bounds = L.latLngBounds(coordinates);
            map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 15
            });
          }
        };
        onMapReadyRef.current(map);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Effect to handle center changes (only when searching, not when drawing)
  const searchMarkerRef = useRef<L.Marker | null>(null);
  useEffect(() => {
    // Don't reset map view when in drawing mode
    if (mapInstanceRef.current && center && !isDrawingMode) {
      // Remove previous search marker
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
        searchMarkerRef.current = null;
      }

      mapInstanceRef.current.setView(center, 13, {
        animate: true,
        duration: 1.0
      });

      // Add a marker for the searched location
      const marker = L.marker(center as L.LatLngExpression, {
        icon: L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        }),
      }).addTo(mapInstanceRef.current);
      marker.bindPopup("Searched Location").openPopup();
      searchMarkerRef.current = marker;
    }
  }, [center, isDrawingMode]);

  // Use ref to track current polygon points so click handler always has latest
  const currentPolygonPointsRef = useRef<[number, number][]>(currentPolygonPoints);
  useEffect(() => {
    currentPolygonPointsRef.current = currentPolygonPoints;
  }, [currentPolygonPoints]);

  // Effect to handle drawing mode entry/exit
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (isDrawingMode) {
      // Clear any existing drawing markers and polygon when entering drawing mode
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (polygonRef.current) {
        polygonRef.current.remove();
        polygonRef.current = null;
      }

      // Ensure ref matches current state when entering drawing mode
      currentPolygonPointsRef.current = currentPolygonPoints;

      // Remove previous click handler if exists
      if (clickHandlerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.off('click', clickHandlerRef.current);
      }

      // Add click handler for new points
      clickHandlerRef.current = (e: L.LeafletMouseEvent) => {
        if (!mapInstanceRef.current) return;
        
        // Get current points from ref (always has latest value)
        const currentPoints = currentPolygonPointsRef.current;

        if (currentPoints.length >= 4) {
          // Already have 4 points, ignore clicks
          return;
        }

        const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
        const updatedPoints = [...currentPoints, newPoint];

        // Update the ref immediately so next click has latest value
        currentPolygonPointsRef.current = updatedPoints;

        // Notify parent component - visualization effect will handle rendering
        if (onPolygonCompleteRef.current) {
          onPolygonCompleteRef.current(updatedPoints);
        }
      };

      mapInstanceRef.current.on('click', clickHandlerRef.current);
      mapInstanceRef.current.getContainer().style.cursor = 'crosshair';
    } else {
      // Remove click handler when exiting drawing mode
      if (clickHandlerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.off('click', clickHandlerRef.current);
        clickHandlerRef.current = null;
      }
      
      // Clear drawing markers and polygon when exiting drawing mode
      if (mapInstanceRef.current) {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        
        if (polygonRef.current) {
          polygonRef.current.remove();
          polygonRef.current = null;
        }
        
        mapInstanceRef.current.getContainer().style.cursor = '';
      }
    }
  }, [isDrawingMode]); // Only depend on isDrawingMode - refs are stable and sync separately

  // Separate effect to update visualization when points change
  useEffect(() => {
    if (!mapInstanceRef.current || !isDrawingMode) return;

    // Remove previous markers and polygon
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }

    // If points are cleared (reset), we're done
    if (currentPolygonPoints.length === 0) return;

    // Recreate markers for existing points
    currentPolygonPoints.forEach((point) => {
      const marker = L.marker(point, {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="width: 20px; height: 20px; border-radius: 50%; background: #3b82f6; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });

    // Draw polygon if we have 2+ points
    if (currentPolygonPoints.length >= 2) {
      const polygonPoints = currentPolygonPoints.map(p => [p[0], p[1]] as L.LatLngExpression);
      if (currentPolygonPoints.length >= 3) {
        polygonPoints.push(polygonPoints[0]);
      }
      
      polygonRef.current = L.polygon(polygonPoints, {
        color: '#3b82f6',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
      }).addTo(mapInstanceRef.current!);
    }
  }, [currentPolygonPoints, isDrawingMode]);

  // Effect to display saved fields as polygons - DISABLED for now
  // useEffect(() => {
  //   if (!mapInstanceRef.current) return;

  //   // Remove existing saved polygons
  //   savedPolygonsRef.current.forEach(polygon => polygon.remove());
  //   savedPolygonsRef.current = [];

  //   if (savedFields.length === 0) return;

  //   // Add polygons for each saved field
  //   savedFields.forEach((field) => {
  //     const polygonPoints = field.coordinates.map(p => [p[0], p[1]] as L.LatLngExpression);
  //     // Close the polygon
  //     polygonPoints.push(polygonPoints[0]);

  //     const polygon = L.polygon(polygonPoints, {
  //       color: '#22c55e',
  //       weight: 3,
  //       fillColor: '#22c55e',
  //       fillOpacity: 0.3,
  //     }).addTo(mapInstanceRef.current!);

  //     // Add popup with field information
  //     polygon.bindPopup(`<b>${field.name}</b><br/>Crop: ${field.crop}`);

  //     savedPolygonsRef.current.push(polygon);
  //   });
  // }, [savedFields]);

  return <div ref={mapRef} className="absolute inset-0" style={{ minHeight: "600px" }} />;
}

