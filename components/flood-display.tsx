"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { getActiveFloods, Flood } from "@/app/actions/flood";
import { fetchWithCache, getCached } from "@/lib/storage-cache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, MapPin, Clock, AlertTriangle, Users, Building2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Map loading placeholder component
function MapLoadingPlaceholder({ height }: { height?: string }) {
  return (
    <div 
      className="w-full rounded-md overflow-hidden border bg-muted/30 relative" 
      style={{ height: height || "600px" }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    </div>
  );
}

// Dynamically import FloodMap to avoid SSR issues with Leaflet
// Show map immediately with loading placeholder to prevent empty UI
const FloodMap = dynamic(
  () => import("./flood-map").then((mod) => ({ default: mod.FloodMap })),
  { 
    ssr: false,
    loading: () => <MapLoadingPlaceholder height="600px" />
  }
);

function getSeverityColor(severity: Flood["severity"]): string {
  const colors: Record<Flood["severity"], string> = {
    low: "bg-blue-500 hover:bg-blue-600",
    moderate: "bg-yellow-500 hover:bg-yellow-600",
    high: "bg-orange-500 hover:bg-orange-600",
    extreme: "bg-red-500 hover:bg-red-600",
  };
  return colors[severity] || "bg-gray-500 hover:bg-gray-600";
}

function getSeverityLabel(severity: Flood["severity"]): string {
  const labels: Record<Flood["severity"], string> = {
    low: "Low",
    moderate: "Moderate",
    high: "High",
    extreme: "Extreme",
  };
  return labels[severity] || severity;
}

function getWaterLevelStatusColor(status: Flood["waterLevel"]["status"]): string {
  const colors: Record<Flood["waterLevel"]["status"], string> = {
    normal: "bg-green-500",
    monitoring: "bg-blue-500",
    alert: "bg-yellow-500",
    alarm: "bg-red-500",
  };
  return colors[status] || "bg-gray-500";
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FloodDisplay() {
  const [floods, setFloods] = useState<Flood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousFloodIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const currentToastIdRef = useRef<string | number | null>(null);

  const fetchFloods = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchWithCache(
        "active-floods",
        () => getActiveFloods(),
        { ttl: 15 * 60 * 1000 } // 15 minutes
      );
      setFloods(data);
    } catch (err) {
      console.error("Error fetching floods:", err);
      // Try to get from cache as fallback
      const cached = getCached<typeof floods>("active-floods");
      if (cached) {
        setFloods(cached);
        setError("Using cached data (offline mode)");
      } else {
        setError("Failed to fetch flood data. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchFloods();

    // Fetch every 15 minutes
    const interval = setInterval(fetchFloods, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Show toast notification for latest flood
  useEffect(() => {
    // Skip on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      if (floods.length > 0) {
        previousFloodIdRef.current = floods[0].id;
      }
      return;
    }

    // Get the latest flood
    if (floods.length > 0) {
      const latestFlood = floods[0];
      
      // Only show toast if it's a new flood (not seen before)
      if (previousFloodIdRef.current !== latestFlood.id) {
        // Dismiss ALL existing toasts to ensure only one is displayed at a time
        toast.dismiss();
        
        // Format coordinates
        const coordinates = `${latestFlood.location.latitude.toFixed(4)}°N, ${latestFlood.location.longitude.toFixed(4)}°E`;
        
        // Determine if severe (red) or normal (white) - high or extreme severity
        const isSevere = latestFlood.severity === "high" || latestFlood.severity === "extreme";
        
        // Get location name
        const locationName = latestFlood.location.name || "Flood Alert";
        
        // Show toast - red for severe, neutral for normal
        const toastId = isSevere
          ? toast.error(locationName, {
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
          : toast(locationName, {
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
            });
        
        // Store the new toast ID
        currentToastIdRef.current = toastId;
        
        // Mark this flood as seen
        previousFloodIdRef.current = latestFlood.id;
      }
    }
  }, [floods]);

  return (
    <div className="space-y-6">
      {/* Map Section - Always show map, even during loading */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Flood Map - Philippines
            {isLoading && (
              <Badge variant="outline" className="ml-2">
                Loading...
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Real-time flood monitoring across the Philippines. Click on markers for details.
            {isLoading && " Fetching latest flood data..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FloodMap floods={floods} height="600px" isLoading={isLoading} />
          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flood List Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Active Floods {isLoading ? "" : `(${floods.length})`}
          </CardTitle>
          <CardDescription>
            Detailed information about current flood conditions
            {isLoading && " Loading flood data..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && floods.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : floods.length === 0 && !isLoading ? (
            <div className="text-center py-8">
              <Droplets className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Floods</h3>
              <p className="text-muted-foreground text-sm">
                There are currently no active flood warnings in the Philippines region.
                Flood data is updated every 15 minutes. Check back later for updates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
            {floods.map((flood) => (
              <Card
                key={flood.id}
                className={cn(
                  "border-l-4",
                  flood.severity === "extreme" && "border-l-red-600",
                  flood.severity === "high" && "border-l-orange-600",
                  flood.severity === "moderate" && "border-l-yellow-600",
                  flood.severity === "low" && "border-l-blue-600"
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{flood.location.name}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={getSeverityColor(flood.severity)}>
                          {getSeverityLabel(flood.severity)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            getWaterLevelStatusColor(flood.waterLevel.status)
                          )}
                        >
                          {flood.waterLevel.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {flood.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {flood.location.province}, {flood.location.region}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Updated {formatTime(flood.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Water Level Information */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Water Level
                      </h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Current:</span>
                          <span className="font-semibold">{flood.waterLevel.current}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Normal:</span>
                          <span>{flood.waterLevel.normal}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Above Normal:</span>
                          <span className={cn(
                            "font-semibold",
                            flood.waterLevel.current > flood.waterLevel.normal && "text-destructive"
                          )}>
                            +{(flood.waterLevel.current - flood.waterLevel.normal).toFixed(1)}m
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Impact Information */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Impact
                      </h4>
                      <div className="space-y-1">
                        {flood.affectedAreas.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Affected Areas:</span>
                            <p className="font-medium">{flood.affectedAreas.join(", ")}</p>
                          </div>
                        )}
                        {flood.affectedPopulation && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>
                              <span className="font-semibold">{flood.affectedPopulation.toLocaleString()}</span> people affected
                            </span>
                          </div>
                        )}
                        {flood.evacuationCenters && flood.evacuationCenters > 0 && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>
                              <span className="font-semibold">{flood.evacuationCenters}</span> evacuation center{flood.evacuationCenters > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {flood.description && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">{flood.description}</p>
                    </div>
                  )}

                  {/* Source */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Source: {flood.source} • Reported {formatTime(flood.reportedAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

