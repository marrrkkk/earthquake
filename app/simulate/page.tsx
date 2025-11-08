"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertSystem } from "@/components/alert-system";
import { EarthquakeList } from "@/components/earthquake-list";
import { EarthquakeStats } from "@/components/earthquake-stats";
import { AlertTriangle, Play, Trash2 } from "lucide-react";
import { Earthquake } from "@/app/actions/earthquake";

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(
  () => import("@/components/location-picker").then((mod) => ({ default: mod.LocationPicker })),
  { ssr: false }
);

export default function SimulatePage() {
  const [magnitude, setMagnitude] = useState("5.5");
  const [latitude, setLatitude] = useState("14.5995"); // Manila coordinates
  const [longitude, setLongitude] = useState("120.9842");
  const [depth, setDepth] = useState("10");
  const [location, setLocation] = useState("Manila, Philippines");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const saveEarthquake = useMutation(api.earthquakes.saveTestEarthquake);
  const testEarthquakes = useQuery(api.earthquakes.getTestEarthquakes) || [];
  const clearAll = useMutation(api.earthquakes.clearAllTestEarthquakes);

  // Transform Convex data to Earthquake format
  const earthquakes: Earthquake[] = testEarthquakes.map((eq: any) => ({
    id: eq.id,
    magnitude: eq.magnitude,
    place: eq.place,
    time: eq.time,
    updated: eq.updated,
    url: eq.url,
    detail: eq.detail,
    status: eq.status,
    tsunami: eq.tsunami,
    sig: eq.sig,
    net: eq.net,
    code: eq.code,
    ids: eq.ids,
    sources: eq.sources,
    types: eq.types,
    nst: eq.nst,
    dmin: eq.dmin,
    rms: eq.rms,
    gap: eq.gap,
    magType: eq.magType,
    type: eq.type,
    title: eq.title,
    coordinates: eq.coordinates,
  }));

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const now = Date.now();
      const mag = parseFloat(magnitude);
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const dep = parseFloat(depth);

      const testEarthquake: Omit<Earthquake, "id"> & { id: string } = {
        id: `test-${now}-${Math.random().toString(36).substring(7)}`,
        magnitude: mag,
        place: location,
        time: now,
        updated: now,
        url: "https://earthquake.phivolcs.dost.gov.ph/",
        detail: "https://earthquake.phivolcs.dost.gov.ph/",
        status: "reviewed",
        tsunami: mag >= 7.0 ? 1 : 0,
        sig: Math.round(mag * 100),
        net: "test",
        code: `test-${now}`,
        ids: `test-${now}`,
        sources: "test",
        types: "earthquake",
        nst: null,
        dmin: null,
        rms: 0,
        gap: null,
        magType: "ml",
        type: "earthquake",
        title: `M ${mag.toFixed(1)} - ${location}`,
        coordinates: {
          latitude: lat,
          longitude: lon,
          depth: dep,
        },
      };

      await saveEarthquake(testEarthquake);

      // Reset form
      setMagnitude("5.5");
      setLocation("Manila, Philippines");
    } catch (error) {
      console.error("Error simulating earthquake:", error);
      alert("Failed to simulate earthquake. Please try again.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearAll = async () => {
    if (
      confirm(
        "Are you sure you want to delete all test earthquakes? This cannot be undone."
      )
    ) {
      try {
        await clearAll({});
      } catch (error) {
        console.error("Error clearing earthquakes:", error);
        alert("Failed to clear earthquakes. Please try again.");
      }
    }
  };

  // Calculate distance between two points in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate bearing from point 1 to point 2 in degrees
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360;
    return bearing;
  };

  // Format location in PHIVOLCS style: "013 km N 87° E of Baganga (Davao Oriental)"
  const formatPHIVOLCSLocation = (
    distance: number,
    bearing: number,
    locationName: string,
    province: string
  ): string => {
    const distKm = Math.round(distance);
    const distStr = distKm.toString().padStart(3, "0");
    
    // Convert bearing to PHIVOLCS format (N/S angle E/W)
    // Bearing: 0° = North, 90° = East, 180° = South, 270° = West
    let northSouth: string;
    let eastWest: string;
    let angle: number;
    
    if (bearing <= 90) {
      // Northeast quadrant
      northSouth = "N";
      eastWest = "E";
      angle = bearing;
    } else if (bearing <= 180) {
      // Southeast quadrant
      northSouth = "S";
      eastWest = "E";
      angle = 180 - bearing;
    } else if (bearing <= 270) {
      // Southwest quadrant
      northSouth = "S";
      eastWest = "W";
      angle = bearing - 180;
    } else {
      // Northwest quadrant
      northSouth = "N";
      eastWest = "W";
      angle = 360 - bearing;
    }
    
    const angleStr = Math.round(angle).toString().padStart(2, "0");
    
    return `${distStr} km ${northSouth} ${angleStr}° ${eastWest} of ${locationName} (${province})`;
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Earthquake Alert System",
          },
        }
      );
      const data = await response.json();
      
      if (data.address) {
        const addr = data.address;
        
        // Get location name (city, town, municipality, or village)
        const locationName =
          addr.city || addr.town || addr.municipality || addr.village || addr.suburb || "Location";
        
        // Get province
        const province = addr.state || addr.province || "Philippines";
        
        // Get coordinates of the location (for calculating distance/bearing)
        // Use the center of the location if available, otherwise use the clicked point
        let refLat = lat;
        let refLon = lng;
        
        // Try to get a nearby reference point by searching for the location
        try {
          const searchResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              locationName + ", " + province
            )}&limit=1`,
            {
              headers: {
                "User-Agent": "Earthquake Alert System",
              },
            }
          );
          const searchData = await searchResponse.json();
          
          if (searchData.length > 0) {
            refLat = parseFloat(searchData[0].lat);
            refLon = parseFloat(searchData[0].lon);
          }
        } catch (searchError) {
          console.error("Error searching for reference location:", searchError);
        }
        
        // Calculate distance and bearing from reference point to clicked point
        const distance = calculateDistance(refLat, refLon, lat, lng);
        const bearing = calculateBearing(refLat, refLon, lat, lng);
        
        // If distance is very small (< 1km), just return the location name
        if (distance < 1) {
          return `${locationName} (${province})`;
        }
        
        // Format in PHIVOLCS style
        return formatPHIVOLCSLocation(distance, bearing, locationName, province);
      }
      
      // Fallback to coordinates if reverse geocoding fails
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  };

  const handleLocationChange = async (lat: number, lng: number) => {
    setLatitude(lat.toFixed(4));
    setLongitude(lng.toFixed(4));
    
    // Get location name from coordinates
    setIsGeocoding(true);
    try {
      const locationName = await reverseGeocode(lat, lng);
      setLocation(locationName);
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-orange-600" />
          Earthquake Alert Simulator
        </h1>
        <p className="text-muted-foreground">
          Test the alert system by simulating earthquakes. All test earthquakes are saved to Convex.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Simulation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Simulate Earthquake</CardTitle>
            <CardDescription>
              Create a test earthquake to trigger alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magnitude">Magnitude</Label>
              <Input
                id="magnitude"
                type="number"
                step="0.1"
                min="1.0"
                max="10.0"
                value={magnitude}
                onChange={(e) => setMagnitude(e.target.value)}
                placeholder="5.5"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 5.0+ to trigger alerts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                value={isGeocoding ? "Loading location..." : location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Manila, Philippines"
                disabled={isGeocoding}
              />
              {isGeocoding && (
                <p className="text-xs text-muted-foreground">
                  Getting location name from coordinates...
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Select Location on Map</Label>
              <p className="text-xs text-muted-foreground">
                Click on the map to set the earthquake location
              </p>
              <LocationPicker
                latitude={parseFloat(latitude) || 14.5995}
                longitude={parseFloat(longitude) || 120.9842}
                onLocationChange={handleLocationChange}
                height="300px"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="14.5995"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-filled from map
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="120.9842"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-filled from map
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="depth">Depth (km)</Label>
              <Input
                id="depth"
                type="number"
                step="0.1"
                min="0"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                placeholder="10"
              />
            </div>

            <Button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              {isSimulating ? "Simulating..." : "Simulate Earthquake"}
            </Button>

            {earthquakes.length > 0 && (
              <Button
                onClick={handleClearAll}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Test Earthquakes ({earthquakes.length})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Alert System */}
        <Card>
          <CardHeader>
            <CardTitle>Alert System</CardTitle>
            <CardDescription>
              Enable alerts to test notifications for simulated earthquakes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertSystem earthquakes={earthquakes} minMagnitude={5.0} />
          </CardContent>
        </Card>
      </div>

      {/* Test Earthquakes Stats and List */}
      {earthquakes.length > 0 && (
        <div className="mt-8 space-y-6">
          <EarthquakeStats earthquakes={earthquakes} />
          <EarthquakeList earthquakes={earthquakes} />
        </div>
      )}

      {earthquakes.length === 0 && (
        <Card className="mt-8">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No test earthquakes yet. Simulate an earthquake to test the alert system.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

