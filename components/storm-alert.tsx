"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getActiveTyphoons, Typhoon } from "@/app/actions/typhoon";
import { getLocationFromCoordinates } from "@/app/actions/location";
import { getPSWSForLocation } from "@/app/actions/psws";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Wind, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
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

/**
 * Get alert level based on distance and typhoon category
 */
function getAlertLevel(distance: number, category: Typhoon["category"]): {
  level: "warning" | "alert" | "watch";
  message: string;
} {
  // More severe categories have larger alert radius
  const alertRadius: Record<Typhoon["category"], number> = {
    TD: 200, // Tropical Depression - 200km
    TS: 300, // Tropical Storm - 300km
    STS: 400, // Severe Tropical Storm - 400km
    TY: 500, // Typhoon - 500km
    STY: 600, // Super Typhoon - 600km
    SuperTY: 700, // Super Typhoon - 700km
  };

  const radius = alertRadius[category] || 300;

  if (distance <= radius * 0.3) {
    return {
      level: "warning",
      message: `Immediate threat! ${category} is ${distance.toFixed(0)}km away. Take immediate precautions.`,
    };
  } else if (distance <= radius * 0.6) {
    return {
      level: "alert",
      message: `High alert! ${category} is ${distance.toFixed(0)}km away. Prepare for severe weather.`,
    };
  } else {
    return {
      level: "watch",
      message: `Weather watch: ${category} is ${distance.toFixed(0)}km away. Monitor conditions.`,
    };
  }
}

interface StormAlertProps {
  className?: string;
}

export function StormAlert({ className }: StormAlertProps) {
  const { user, isLoaded } = useUser();
  const [isfetching, setIsfetching] = useState<boolean>(false);
  const [typhoons, setTyphoons] = useState<Typhoon[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [nearbyStorms, setNearbyStorms] = useState<
    Array<{
      typhoon: Typhoon;
      distance: number;
      alertLevel: "warning" | "alert" | "watch";
      message: string;
      locationName: string;
      signalNumber: number;
    }>
  >([]);

  // Get user location from Convex
  const userLocation = useQuery(
    api.users.getCurrentUserLocation,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Fetch typhoons - reduced frequency since data is cached
  useEffect(() => {
    const fetchTyphoons = async () => {
      try {
        const data = await getActiveTyphoons();
        setTyphoons(data);
      } catch (error) {
        console.error("Error fetching typhoons for alert:", error);
      }
    };

    fetchTyphoons();
    // Cache is 15 minutes, so only refresh every 20 minutes to avoid unnecessary calls
    const interval = setInterval(fetchTyphoons, 20 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate nearby storms when user location or typhoons change
  useEffect(() => {
    if (!isLoaded || !user || !userLocation || typhoons.length === 0) {
      console.log("[StormAlert] Skipping calculation - missing requirements", {
        isLoaded,
        hasUser: !!user,
        hasUserLocation: !!userLocation,
        typhoonsCount: typhoons.length,
      });
      setNearbyStorms([]);
      return;
    }

    // Async function to calculate storms with location info
    const calculateStorms = async () => {
      const storms: typeof nearbyStorms = [];
      setIsfetching(true);
      // Get location info once for all storms
      let locationInfo: Awaited<ReturnType<typeof getLocationFromCoordinates>>;
      try {
        locationInfo = await getLocationFromCoordinates(
          userLocation.latitude,
          userLocation.longitude
        );
        console.log("[StormAlert] Location info:", locationInfo);
      } catch (error) {
        console.error("[StormAlert] Error getting location:", error);
        // Use fallback location
        locationInfo = {
          name: "Unknown Location",
          city: "Unknown City",
          province: "Unknown Province",
          region: "Unknown Region",
        };
      }

      for (const typhoon of typhoons) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          typhoon.currentPosition.latitude,
          typhoon.currentPosition.longitude
        );

        console.log(`[StormAlert] ${typhoon.name} - Current distance: ${distance.toFixed(2)}km`);

        // Check forecast track for future proximity
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
          console.log(`[StormAlert] ${typhoon.name} - Min distance (with forecast): ${minDistance.toFixed(2)}km`);
        }

        // Alert radius - increased to cover Philippines region better
        const alertRadius: Record<Typhoon["category"], number> = {
          TD: 500,      // Increased from 200km
          TS: 800,      // Increased from 300km
          STS: 1000,    // Increased from 400km
          TY: 1200,     // Increased from 500km
          STY: 1500,    // Increased from 600km
          SuperTY: 2000, // Increased from 700km
        };

        // Extended monitoring radius for all typhoons in Philippines region
        const monitoringRadius = 2500; // Show all typhoons within 2500km (covers entire Philippines region)

        const radius = alertRadius[typhoon.category] || 800;
        console.log(`[StormAlert] ${typhoon.name} - Alert radius: ${radius}km, Monitoring radius: ${monitoringRadius}km, Min distance: ${minDistance.toFixed(2)}km`);

        if (minDistance <= monitoringRadius) {
          // Get real PSWS signal number from PAGASA
          console.log(`[StormAlert] Fetching PSWS for location:`, {
            city: locationInfo.city,
            province: locationInfo.province,
            region: locationInfo.region,
          });
          
          const signalNumber = await getPSWSForLocation(
            locationInfo.city,
            locationInfo.province,
            locationInfo.region
          );
          
          console.log(`[StormAlert] PSWS signal number received:`, signalNumber);
          
          // Determine alert level
          let alertLevel: "warning" | "alert" | "watch";
          let message: string;
          
          if (minDistance <= radius) {
            // Within alert radius - use standard alert levels
            const alert = getAlertLevel(minDistance, typhoon.category);
            alertLevel = alert.level;
            message = alert.message;
          } else {
            // Beyond alert radius but within monitoring radius - show as monitoring/watch
            alertLevel = "watch";
            message = `Monitoring: ${typhoon.category} ${typhoon.name} is ${minDistance.toFixed(0)}km away. Continue monitoring for updates.`;
          }
          
          // If we have a real PSWS signal, update the message
          if (signalNumber > 0) {
            message = `PSWS Signal ${signalNumber} is in effect for your area. ${message}`;
            // Upgrade alert level if signal is high
            if (signalNumber >= 4) {
              alertLevel = "warning";
            } else if (signalNumber >= 3) {
              alertLevel = "alert";
            }
          }
          
          console.log(`[StormAlert] Adding alert for ${typhoon.name} - ${minDistance.toFixed(2)}km away (${alertLevel}), Location: ${locationInfo.city}, Signal: ${signalNumber}`);
          storms.push({
            typhoon,
            distance: minDistance,
            alertLevel,
            message,
            locationName: locationInfo.city, // Use city name for display
            signalNumber,
          });
        } else {
          console.log(`[StormAlert] ${typhoon.name} is too far (${minDistance.toFixed(2)}km > ${monitoringRadius}km)`);
        }
      }

      // Sort by distance (closest first)
      storms.sort((a, b) => a.distance - b.distance);
      console.log(`[StormAlert] Found ${storms.length} nearby storm(s)`);
      setNearbyStorms(storms);
      setIsfetching(false);
    };

    calculateStorms();
  }, [user, isLoaded, userLocation, typhoons]);

  // Don't show anything if user is not signed in
  if (!isLoaded || !user) {
    console.log("[StormAlert] User not signed in or not loaded");
    return null;
  }

  // Don't show anything if user has no location
  if (!userLocation) {
    console.log("[StormAlert] User has no location saved");
    return null;
  }

  // Filter out dismissed alerts
  const activeAlerts = nearbyStorms.filter(
    (storm) => !dismissedAlerts.has(storm.typhoon.id)
  );

  if (activeAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (typhoonId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(typhoonId));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {activeAlerts.map((storm) => {
        const isWarning = storm.alertLevel === "warning";
        const isAlert = storm.alertLevel === "alert";

        return (
          <Alert
            key={storm.typhoon.id}
            className={cn(
              "border-2 animate-in slide-in-from-top-5",
              isWarning
                ? "border-red-500 bg-red-50 dark:bg-red-950"
                : isAlert
                ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
            )}
          >
            <AlertTriangle
              className={cn(
                "h-4 w-4",
                isWarning
                  ? "text-red-600"
                  : isAlert
                  ? "text-orange-600"
                  : "text-yellow-600"
              )}
            />
            <AlertTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Wind className="h-4 w-4" />
                <span>
                  {storm.typhoon.name} ({storm.typhoon.category})
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-bold",
                    storm.signalNumber >= 4 && "bg-red-500 text-white border-red-600",
                    storm.signalNumber === 3 && "bg-orange-500 text-white border-orange-600",
                    storm.signalNumber === 2 && "bg-yellow-500 text-white border-yellow-600",
                    storm.signalNumber === 1 && "bg-blue-500 text-white border-blue-600",
                    storm.signalNumber === 0 && "bg-gray-500 text-white border-gray-600"
                  )}
                >
                  PSWS {storm.signalNumber}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {storm.locationName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleDismiss(storm.typhoon.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{storm.message}</p>
                  {storm.signalNumber > 0 && (
                    <Badge
                      className={cn(
                        "font-semibold",
                        storm.signalNumber >= 4 && "bg-red-600 text-white",
                        storm.signalNumber === 3 && "bg-orange-600 text-white",
                        storm.signalNumber === 2 && "bg-yellow-600 text-white",
                        storm.signalNumber === 1 && "bg-blue-600 text-white"
                      )}
                    >
                      Signal {storm.signalNumber}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      <strong>Your Location:</strong> {storm.locationName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      <strong>Storm Position:</strong>{" "}
                      {storm.typhoon.currentPosition.latitude.toFixed(2)}°N,{" "}
                      {storm.typhoon.currentPosition.longitude.toFixed(2)}°E
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind className="h-3 w-3" />
                    <span>
                      <strong>Wind Speed:</strong> {storm.typhoon.windSpeed} km/h
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>
                      <strong>Distance:</strong> {storm.distance.toFixed(0)}km
                    </span>
                  </div>
                </div>
                {isWarning && (
                  <p className="text-sm font-semibold text-red-600 mt-2">
                    ⚠️ Take immediate action! This storm poses a direct threat to
                    your location.
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}

