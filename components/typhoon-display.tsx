"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getActiveTyphoons, Typhoon } from "@/app/actions/typhoon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wind, MapPin, Clock, TrendingUp, Gauge } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Dynamically import TyphoonMap to avoid SSR issues with Leaflet
const TyphoonMap = dynamic(
  () => import("./typhoon-map").then((mod) => ({ default: mod.TyphoonMap })),
  { ssr: false }
);

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    TD: "bg-blue-500 hover:bg-blue-600",
    TS: "bg-green-500 hover:bg-green-600",
    STS: "bg-yellow-500 hover:bg-yellow-600",
    TY: "bg-orange-500 hover:bg-orange-600",
    STY: "bg-red-500 hover:bg-red-600",
    SuperTY: "bg-red-700 hover:bg-red-800",
  };
  return colors[category] || "bg-gray-500 hover:bg-gray-600";
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    TD: "Tropical Depression",
    TS: "Tropical Storm",
    STS: "Severe Tropical Storm",
    TY: "Typhoon",
    STY: "Super Typhoon",
    SuperTY: "Super Typhoon",
  };
  return labels[category] || category;
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

export function TyphoonDisplay() {
  const [typhoons, setTyphoons] = useState<Typhoon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTyphoons = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getActiveTyphoons();
      setTyphoons(data);
    } catch (err) {
      console.error("Error fetching typhoons:", err);
      setError("Failed to fetch typhoon data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchTyphoons();

    // Fetch every 15 minutes (typhoon data updates less frequently than earthquakes)
    const interval = setInterval(fetchTyphoons, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading && typhoons.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Typhoon Data
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={fetchTyphoons}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (typhoons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Typhoons</CardTitle>
          <CardDescription>
            There are currently no active typhoons affecting the Philippines region.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Typhoon data is updated every 15 minutes. Check back later for updates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {typhoons.map((typhoon) => (
        <Card key={typhoon.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wind className="h-5 w-5 text-blue-600" />
                  {typhoon.name}
                  {typhoon.internationalName && (
                    <span className="text-muted-foreground font-normal text-base">
                      ({typhoon.internationalName})
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {getCategoryLabel(typhoon.category)} • Last updated: {formatTime(typhoon.lastUpdate)}
                </CardDescription>
              </div>
              <Badge
                className={cn(
                  getCategoryColor(typhoon.category),
                  "text-white"
                )}
              >
                {typhoon.category}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Typhoon Map */}
            <div>
              <h3 className="font-semibold mb-2">Current Position & Track</h3>
              <TyphoonMap typhoons={[typhoon]} height="400px" />
            </div>

            {/* Typhoon Details */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Current Position</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {typhoon.currentPosition.latitude.toFixed(2)}°N,{" "}
                  {typhoon.currentPosition.longitude.toFixed(2)}°E
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Wind Speed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {typhoon.windSpeed} km/h
                  {typhoon.gustSpeed && ` (Gusts: ${typhoon.gustSpeed} km/h)`}
                </p>
              </div>

              {typhoon.pressure && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Pressure</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {typhoon.pressure} hPa
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Movement</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {typhoon.movement.direction} at {typhoon.movement.speed} km/h
                </p>
              </div>

              {typhoon.advisoryNumber && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Advisory</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    #{typhoon.advisoryNumber}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Status</span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {typhoon.status}
                </p>
              </div>
            </div>

            {/* Track Information */}
            {typhoon.track.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Historical Track</h3>
                <p className="text-sm text-muted-foreground">
                  {typhoon.track.length} position{typhoon.track.length > 1 ? "s" : ""} recorded
                </p>
              </div>
            )}

            {/* Forecast Information */}
            {typhoon.forecast && typhoon.forecast.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Forecast Track</h3>
                <p className="text-sm text-muted-foreground">
                  {typhoon.forecast.length} forecast point{typhoon.forecast.length > 1 ? "s" : ""} available
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

