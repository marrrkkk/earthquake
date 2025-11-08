"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Flood } from "@/app/actions/flood";
import { Droplets } from "lucide-react";

interface FloodMapProps {
  floods: Flood[];
  height?: string;
}

function MapUpdater({ floods }: { floods: Flood[] }) {
  const map = useMap();

  useEffect(() => {
    if (floods.length === 0) {
      // Default to Manila if no floods
      map.setView([14.5995, 120.9842], 6);
      return;
    }

    // Fit bounds to show all floods
    if (floods.length === 1) {
      const flood = floods[0];
      map.setView(
        [flood.location.latitude, flood.location.longitude],
        10
      );
    } else {
      const bounds = floods.map((flood) => [
        flood.location.latitude,
        flood.location.longitude,
      ]) as [number, number][];
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [floods, map]);

  return null;
}

function getSeverityColor(severity: Flood["severity"]): string {
  const colors: Record<Flood["severity"], string> = {
    low: "#3b82f6", // blue
    moderate: "#eab308", // yellow
    high: "#f97316", // orange
    extreme: "#ef4444", // red
  };
  return colors[severity] || "#6b7280";
}

function getSeverityRadius(severity: Flood["severity"], waterLevel: number): number {
  // Base radius in meters, scaled by severity and water level
  const baseRadius: Record<Flood["severity"], number> = {
    low: 2000,
    moderate: 5000,
    high: 10000,
    extreme: 20000,
  };
  const base = baseRadius[severity] || 2000;
  // Scale by water level (multiply by water level in meters)
  return base * (1 + waterLevel);
}

function createCustomIcon(color: string) {
  return L.divIcon({
    className: "custom-flood-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function FloodMap({ floods, height = "600px" }: FloodMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Fix for default marker icon in Next.js
    if (typeof window !== "undefined") {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    }
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-full bg-muted rounded-md flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  // Philippines bounds
  const philippinesBounds: L.LatLngBoundsExpression = [
    [4.2, 116.9], // Southwest corner
    [21.1, 127.0], // Northeast corner
  ];

  // Default center (Manila)
  const defaultCenter: [number, number] = [14.5995, 120.9842];

  return (
    <div className="w-full rounded-md overflow-hidden border" style={{ height }}>
      <MapContainer
        center={floods.length > 0 
          ? [floods[0].location.latitude, floods[0].location.longitude]
          : defaultCenter
        }
        zoom={floods.length > 0 ? 7 : 6}
        minZoom={4}
        maxZoom={18}
        maxBounds={philippinesBounds}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {floods.map((flood) => {
          const severityColor = getSeverityColor(flood.severity);
          const radius = getSeverityRadius(flood.severity, flood.waterLevel.current);
          const customIcon = createCustomIcon(severityColor);

          return (
            <div key={flood.id}>
              {/* Circle showing affected area */}
              <Circle
                center={[flood.location.latitude, flood.location.longitude]}
                radius={radius}
                pathOptions={{
                  color: severityColor,
                  fillColor: severityColor,
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
              
              {/* Marker for flood location */}
              <Marker
                position={[flood.location.latitude, flood.location.longitude]}
                icon={customIcon}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="h-5 w-5" style={{ color: severityColor }} />
                      <h3 className="font-bold text-lg">{flood.location.name}</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><strong>Severity:</strong> <span className="capitalize">{flood.severity}</span></p>
                      <p><strong>Water Level:</strong> {flood.waterLevel.current}m (Normal: {flood.waterLevel.normal}m)</p>
                      <p><strong>Status:</strong> <span className="capitalize">{flood.waterLevel.status}</span></p>
                      <p><strong>Province:</strong> {flood.location.province}</p>
                      <p><strong>Region:</strong> {flood.location.region}</p>
                      {flood.affectedPopulation && (
                        <p><strong>Affected:</strong> {flood.affectedPopulation.toLocaleString()} people</p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
        
        <MapUpdater floods={floods} />
      </MapContainer>
    </div>
  );
}

