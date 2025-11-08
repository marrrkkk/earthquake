"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getActiveFloods, Flood } from "@/app/actions/flood";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, MapPin, Clock, AlertTriangle, Users, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Dynamically import FloodMap to avoid SSR issues with Leaflet
const FloodMap = dynamic(
  () => import("./flood-map").then((mod) => ({ default: mod.FloodMap })),
  { ssr: false }
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

  const fetchFloods = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getActiveFloods();
      setFloods(data);
    } catch (err) {
      console.error("Error fetching floods:", err);
      setError("Failed to fetch flood data. Please try again later.");
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

  if (isLoading && floods.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && floods.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (floods.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Droplets className="h-12 w-12 text-cyan-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Active Floods</h3>
            <p className="text-muted-foreground">
              There are currently no active flood warnings in the Philippines region.
              Flood data is updated every 15 minutes. Check back later for updates.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Map Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Flood Map - Philippines
          </CardTitle>
          <CardDescription>
            Real-time flood monitoring across the Philippines. Click on markers for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FloodMap floods={floods} height="600px" />
        </CardContent>
      </Card>

      {/* Flood List Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Active Floods ({floods.length})
          </CardTitle>
          <CardDescription>
            Detailed information about current flood conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}

