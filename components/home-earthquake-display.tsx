"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getRealEarthquakes } from "@/app/actions/earthquake";
import { fetchWithCache, getCached } from "@/lib/storage-cache";
import { Earthquake } from "@/app/actions/earthquake";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Clock, TrendingUp, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DottedSeparator } from "./ui/dottedLine";
import { toast } from "sonner";

// Dynamically import EarthquakeMap to avoid SSR issues with Leaflet
const EarthquakeMap = dynamic(
  () => import("./earthquake-map").then((mod) => ({ default: mod.EarthquakeMap })),
  { ssr: false }
);

function getMagnitudeColor(magnitude: number): string {
  if (magnitude >= 7.0) return "destructive";
  if (magnitude >= 5.0) return "bg-orange-500 hover:bg-orange-600";
  if (magnitude >= 4.0) return "bg-yellow-500 hover:bg-yellow-600";
  return "bg-blue-500 hover:bg-blue-600";
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HomeEarthquakeDisplay() {
  // Get test earthquakes from Convex (real-time subscription)
  const testEarthquakesQuery = useQuery(api.earthquakes.getTestEarthquakes);

  // State for real earthquakes from PHIVOLCS
  const [realEarthquakes, setRealEarthquakes] = useState<Earthquake[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(true);

  // Track previous earthquakes to detect new ones
  const previousEarthquakesRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const currentToastIdRef = useRef<string | number | null>(null);

  // Fetch real earthquakes on mount and periodically
  useEffect(() => {
    const fetchRealEarthquakes = async () => {
      try {
        const earthquakes = await fetchWithCache(
          "real-earthquakes",
          () => getRealEarthquakes(),
          { ttl: 5 * 60 * 1000 } // 5 minutes
        );
        setRealEarthquakes(earthquakes);
      } catch (error) {
        console.error("Error fetching real earthquakes:", error);
        // Try to get from cache as last resort
        const cached = getCached<typeof realEarthquakes>("real-earthquakes");
        if (cached) {
          setRealEarthquakes(cached);
        }
      } finally {
        setIsLoadingReal(false);
      }
    };

    // Fetch immediately
    fetchRealEarthquakes();

    // Fetch every 5 minutes (data is cached for 5 minutes on server)
    const interval = setInterval(fetchRealEarthquakes, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Transform test earthquakes from Convex to Earthquake format
  const testEarthquakes: Earthquake[] = useMemo(() => {
    const testEarthquakesData = testEarthquakesQuery || [];
    return testEarthquakesData.map((eq: {
      id: string;
      magnitude: number;
      place: string;
      time: number;
      updated: number;
      url: string;
      detail: string;
      status: string;
      tsunami: number;
      sig: number;
      net: string;
      code: string;
      ids: string;
      sources: string;
      types: string;
      nst: number | null;
      dmin: number | null;
      rms: number;
      gap: number | null;
      magType: string;
      type: string;
      title: string;
      coordinates: {
        longitude: number;
        latitude: number;
        depth: number;
      };
      isTest: boolean;
    }) => ({
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
      isTest: true,
    }));
  }, [testEarthquakesQuery]);

  // Merge real and test earthquakes
  const allEarthquakes: Earthquake[] = useMemo(() => {
    const merged = [...realEarthquakes, ...testEarthquakes];
    // Filter to last 24 hours
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    return merged
      .filter((eq) => eq.time >= twentyFourHoursAgo)
      .sort((a, b) => b.time - a.time);
  }, [realEarthquakes, testEarthquakes]);

  // Show toast notification for latest earthquake
  useEffect(() => {
    // Skip on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      // Store current earthquake IDs
      if (allEarthquakes.length > 0) {
        previousEarthquakesRef.current.add(allEarthquakes[0].id);
      }
      return;
    }

    // Get the latest earthquake
    if (allEarthquakes.length > 0) {
      const latestEarthquake = allEarthquakes[0]; // Already sorted by time

      // Only show toast if it's a new earthquake (not seen before)
      if (!previousEarthquakesRef.current.has(latestEarthquake.id)) {
        // Dismiss ALL existing toasts to ensure only one is displayed at a time
        toast.dismiss();

        // Format coordinates
        const coordinates = `${latestEarthquake.coordinates.latitude.toFixed(4)}°N, ${latestEarthquake.coordinates.longitude.toFixed(4)}°E`;

        // Determine if high magnitude (red) or normal (white)
        const isHighMagnitude = latestEarthquake.magnitude >= 7.0;

        // Show toast - red for high magnitude, neutral for normal
        const toastId = isHighMagnitude
          ? toast.error(latestEarthquake.place, {
            icon: <AlertTriangle className="h-5 w-5" />,
            description: (
              <div className="space-y-1 whitespace-normal">
                <div className="text-xs opacity-90">Location: {coordinates}</div>
              </div>
            ),
            duration: 10000, // 10 seconds
            action: {
              label: <X className="h-4 w-4" />,
              onClick: () => {
                toast.dismiss(toastId);
                currentToastIdRef.current = null;
              },
            },
          })
          : toast(latestEarthquake.place, {
            icon: <AlertTriangle className="h-5 w-5" />,
            description: (
              <div className="space-y-1 text-black whitespace-normal">
                <div className="text-xs text-black">Location: {coordinates}</div>
              </div>
            ),
            duration: 10000, // 10 seconds
            action: {
              label: <X className="h-4 w-4" />,
              onClick: () => {
                toast.dismiss(toastId);
                currentToastIdRef.current = null;
              },
            },
          });

        // Store the new toast ID
        currentToastIdRef.current = toastId;

        // Mark this earthquake as seen
        previousEarthquakesRef.current.add(latestEarthquake.id);
      }
    }
  }, [allEarthquakes]);


  // Get most recent earthquake
  const mostRecentEarthquake = allEarthquakes.length > 0 ? allEarthquakes[0] : null;

  // Show loading skeleton while initial load
  if (isLoadingReal && allEarthquakes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // If no earthquakes, show empty state
  if (allEarthquakes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Recent Earthquakes</CardTitle>
          <CardDescription>
            No earthquakes detected in the Philippines region in the last 24 hours.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 flex flex-col ">
      {/* Show most recent earthquake with map */}
      {mostRecentEarthquake && (
        <Card>
          <CardContent className="flex flex-col lg:flex-row w-full gap-2 lg:gap-8 p-0">
            <div className="flex flex-col flex-1 p-4">
              {/* Left Div - Earthquake Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Latest Earthquake
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Most recent earthquake detected in the Philippines
                      </CardDescription>
                    </div>
                    <div>
                      <Badge
                      className={cn(
                        getMagnitudeColor(mostRecentEarthquake.magnitude),
                        "text-white p-2 border rounded-md z-50 right-0"
                      )}
                      variant={mostRecentEarthquake.magnitude >= 7.0 ? "destructive" : "default"}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      M {mostRecentEarthquake.magnitude.toFixed(1)}
                      {mostRecentEarthquake.isTest && (
                        <span className="ml-1">(TEST)</span>
                      )}
                    </Badge>
                    </div>
                  </div>
                  <DottedSeparator className="py-2" />
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {mostRecentEarthquake.place}
                    {mostRecentEarthquake.isTest && (
                      <span className="text-orange-600 ml-2">(Test)</span>
                    )}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Time</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(mostRecentEarthquake.time)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(mostRecentEarthquake.time).toLocaleString()}
                  </p>
                </div>

                <div>
                  <div className="font-medium mb-2">Details</div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      Depth: {mostRecentEarthquake.coordinates.depth.toFixed(1)} km
                    </p>
                    <p>
                      Coordinates: {mostRecentEarthquake.coordinates.latitude.toFixed(4)}°N,{" "}
                      {mostRecentEarthquake.coordinates.longitude.toFixed(4)}°E
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Div - Map */}
            <div className="flex-1 space-y-2 relative">
                      <Badge
                      className={cn(
                        getMagnitudeColor(mostRecentEarthquake.magnitude),
                        "text-white p-2 border rounded-md absolute z-50 right-0"
                      )}
                      variant={mostRecentEarthquake.magnitude >= 7.0 ? "destructive" : "default"}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      M {mostRecentEarthquake.magnitude.toFixed(1)}
                      {mostRecentEarthquake.isTest && (
                        <span className="ml-1">(TEST)</span>
                      )}
                    </Badge>
              <div className="w-full h-[300px] sm:h-[350px] lg:h-[400px]">
                <EarthquakeMap
                  latitude={mostRecentEarthquake.coordinates.latitude}
                  longitude={mostRecentEarthquake.coordinates.longitude}
                  height="100%"
                />
              </div>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}

