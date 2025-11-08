"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Typhoon } from "@/app/actions/typhoon";

// Fix for default marker icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom typhoon icon
function createTyphoonIcon(category: string) {
  const colors: Record<string, string> = {
    TD: "#00BFFF", // Light blue
    TS: "#00FF00", // Green
    STS: "#FFFF00", // Yellow
    TY: "#FF8C00", // Orange
    STY: "#FF0000", // Red
    SuperTY: "#8B0000", // Dark red
  };

  const color = colors[category] || "#00BFFF";

  return L.divIcon({
    className: "typhoon-marker",
    html: `<div style="
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 0 10px ${color};
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

interface TyphoonMapProps {
  typhoons: Typhoon[];
  height?: string;
}

function MapUpdater({ typhoons }: { typhoons: Typhoon[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (typhoons.length === 0) return;

    // Fit map to show all typhoons
    const bounds = typhoons
      .flatMap((typhoon) => [
        ...typhoon.track.map((point) => [point.latitude, point.longitude] as [number, number]),
        ...(typhoon.forecast || []).map((point) => [point.latitude, point.longitude] as [number, number]),
        [typhoon.currentPosition.latitude, typhoon.currentPosition.longitude] as [number, number],
      ])
      .filter((point) => point[0] !== 0 && point[1] !== 0);

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    } else if (typhoons.length > 0) {
      // Fallback to first typhoon position
      const firstTyphoon = typhoons[0];
      map.setView(
        [firstTyphoon.currentPosition.latitude, firstTyphoon.currentPosition.longitude],
        6
      );
    }
  }, [typhoons, map]);

  return null;
}

export function TyphoonMap({ typhoons, height = "600px" }: TyphoonMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
        center={typhoons.length > 0 
          ? [typhoons[0].currentPosition.latitude, typhoons[0].currentPosition.longitude]
          : defaultCenter
        }
        zoom={typhoons.length > 0 ? 6 : 6}
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
        
        {typhoons.map((typhoon) => {
          // Historical track (past positions)
          const trackPoints = typhoon.track
            .filter((point) => point.latitude !== 0 && point.longitude !== 0)
            .map((point) => [point.latitude, point.longitude] as [number, number]);

          // Forecast track (future positions)
          const forecastPoints = (typhoon.forecast || [])
            .filter((point) => point.latitude !== 0 && point.longitude !== 0)
            .map((point) => [point.latitude, point.longitude] as [number, number]);

          return (
            <div key={typhoon.id}>
              {/* Historical track line */}
              {trackPoints.length > 1 && (
                <Polyline
                  positions={trackPoints}
                  color="#FF6B6B"
                  weight={3}
                  opacity={0.6}
                />
              )}

              {/* Forecast track line */}
              {forecastPoints.length > 1 && (
                <Polyline
                  positions={forecastPoints}
                  color="#4ECDC4"
                  weight={3}
                  opacity={0.6}
                  dashArray="10, 5"
                />
              )}

              {/* Current position marker */}
              <Marker
                position={[typhoon.currentPosition.latitude, typhoon.currentPosition.longitude]}
                icon={createTyphoonIcon(typhoon.category)}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg">{typhoon.name}</h3>
                    {typhoon.internationalName && (
                      <p className="text-sm text-muted-foreground">
                        {typhoon.internationalName}
                      </p>
                    )}
                    <p className="text-sm">
                      <strong>Category:</strong> {typhoon.category}
                    </p>
                    <p className="text-sm">
                      <strong>Wind Speed:</strong> {typhoon.windSpeed} km/h
                    </p>
                    {typhoon.pressure && (
                      <p className="text-sm">
                        <strong>Pressure:</strong> {typhoon.pressure} hPa
                      </p>
                    )}
                    <p className="text-sm">
                      <strong>Movement:</strong> {typhoon.movement.direction} at {typhoon.movement.speed} km/h
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Last updated: {new Date(typhoon.lastUpdate).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}

        <MapUpdater typhoons={typhoons} />
      </MapContainer>
    </div>
  );
}

