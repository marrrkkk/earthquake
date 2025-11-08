"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getLocationFromCoordinates } from "@/app/actions/location";
import { getActiveTyphoons, Typhoon } from "@/app/actions/typhoon";
import { fetchWithCache } from "@/lib/storage-cache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Wind, Loader2, AlertTriangle } from "lucide-react";

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
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
}

export function UserLocationStormDetails() {
  const { user, isLoaded } = useUser();
  const [locationName, setLocationName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nearestStorm, setNearestStorm] = useState<{
    typhoon: Typhoon;
    distance: number;
  } | null>(null);

  const userLocation = useQuery(
    api.users.getCurrentUserLocation,
    user?.id ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !user || !userLocation) {
      setIsLoading(false);
      return;
    }

    const fetchStormDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get location info from coordinates
        const locationInfo = await getLocationFromCoordinates(
          userLocation.latitude,
          userLocation.longitude
        );

        setLocationName(locationInfo.name || `${locationInfo.city}, ${locationInfo.province}`);

        // Get active typhoons
        const typhoons = await fetchWithCache(
          "active-typhoons-details",
          () => getActiveTyphoons(),
          { ttl: 15 * 60 * 1000 } // 15 minutes
        );

        if (typhoons.length === 0) {
          setNearestStorm(null);
          setIsLoading(false);
          return;
        }

        // Find nearest storm
        let nearest: { typhoon: Typhoon; distance: number } | null = null;
        let minDist = Infinity;

        for (const typhoon of typhoons) {
          // Calculate distance to current position
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            typhoon.currentPosition.latitude,
            typhoon.currentPosition.longitude
          );

          // Check forecast track for closer approach
          let minDistance = distance;
          if (typhoon.forecast && typhoon.forecast.length > 0) {
            for (const forecastPoint of typhoon.forecast) {
              const forecastDistance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                forecastPoint.latitude,
                forecastPoint.longitude
              );
              minDistance = Math.min(minDistance, forecastDistance);
            }
          }

          if (minDistance < minDist) {
            minDist = minDistance;
            nearest = {
              typhoon,
              distance: minDistance,
            };
          }
        }

        setNearestStorm(nearest);
      } catch (err) {
        console.error("Error fetching storm details:", err);
        setError("Unable to fetch storm details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStormDetails();

    // Refresh every 15 minutes
    const interval = setInterval(fetchStormDetails, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, isLoaded, userLocation]);

  if (!user || !userLocation) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Your Location & Storm Details
        </CardTitle>
        <CardDescription>
          Current location and nearest active storm information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading storm details...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Your Location</p>
              </div>
              <p className="text-base font-semibold pl-6">{locationName || "Unknown"}</p>
            </div>

            {/* Storm Details */}
            {nearestStorm ? (
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Nearest Active Storm</p>
                </div>
                
                <div className="pl-6 space-y-2">
                  <div>
                    <p className="text-base font-semibold">
                      {nearestStorm.typhoon.name} ({nearestStorm.typhoon.category})
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Distance</p>
                      <p className="font-medium">{nearestStorm.distance.toFixed(0)} km</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Wind Speed</p>
                      <p className="font-medium">{nearestStorm.typhoon.windSpeed} km/h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Position</p>
                      <p className="font-medium">
                        {nearestStorm.typhoon.currentPosition.latitude.toFixed(2)}°N,{" "}
                        {nearestStorm.typhoon.currentPosition.longitude.toFixed(2)}°E
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Movement</p>
                      <p className="font-medium">
                        {nearestStorm.typhoon.movement.direction} at {nearestStorm.typhoon.movement.speed} km/h
                      </p>
                    </div>
                    {nearestStorm.typhoon.pressure && (
                      <div>
                        <p className="text-muted-foreground">Pressure</p>
                        <p className="font-medium">{nearestStorm.typhoon.pressure} hPa</p>
                      </div>
                    )}
                    {nearestStorm.typhoon.gustSpeed && (
                      <div>
                        <p className="text-muted-foreground">Gust Speed</p>
                        <p className="font-medium">{nearestStorm.typhoon.gustSpeed} km/h</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground pt-2">
                    Last updated: {new Date(nearestStorm.typhoon.lastUpdate).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  No active storms detected near your location.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

