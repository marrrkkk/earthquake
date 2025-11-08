"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
}

function MapClickHandler({
  onLocationChange,
}: {
  onLocationChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    },
  });
  return null;
}

function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);
  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  height = "400px",
}: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders on client side and fix Leaflet icons
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

  return (
    <div className="w-full rounded-md overflow-hidden border" style={{ height }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={6}
        minZoom={5}
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
        <Marker position={[latitude, longitude]} />
        <MapClickHandler onLocationChange={onLocationChange} />
        <MapUpdater latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  );
}

