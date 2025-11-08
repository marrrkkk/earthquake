"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getActiveTyphoons } from "@/app/actions/typhoon";
import { getLocationFromCoordinates, calculateSignalNumber } from "@/app/actions/location";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

export function TyphoonToast() {
  const previousTyphoonIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const currentToastIdRef = useRef<string | number | null>(null);
  const { user } = useUser();

  // Get user location from Convex
  const userLocation = useQuery(
    api.users.getCurrentUserLocation,
    user?.id ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    // Only proceed if user is loaded and userLocation is available
    // Don't show toast if userLocation is still loading (null) or unavailable
    if (user === undefined || userLocation === undefined) {
      return; // Still loading, wait
    }

    // If user is logged in but has no location, don't show toast
    if (user && userLocation === null) {
      return; // User has no location saved, skip toast
    }

    const fetchAndShowToast = async () => {
      try {
        const typhoons = await getActiveTyphoons();
        
        if (typhoons.length > 0 && userLocation) {
          const latestTyphoon = typhoons[0];
          
          // Show toast on initial load or if it's a new typhoon
          const shouldShow = isInitialLoadRef.current || previousTyphoonIdRef.current !== latestTyphoon.id;
          
          if (shouldShow) {
            // Mark initial load as complete
            if (isInitialLoadRef.current) {
              isInitialLoadRef.current = false;
            }
            // Dismiss ALL existing toasts to ensure only one is displayed at a time
            toast.dismiss();
            
            // Format storm coordinates
            const stormCoordinates = `${latestTyphoon.currentPosition.latitude.toFixed(2)}°N, ${latestTyphoon.currentPosition.longitude.toFixed(2)}°E`;
            
            // Calculate distance and PSWS signal (userLocation is guaranteed to be available here)
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              latestTyphoon.currentPosition.latitude,
              latestTyphoon.currentPosition.longitude
            );

            // Calculate PSWS signal number
            const signalNumber = calculateSignalNumber(latestTyphoon.category, distance);

            // Get user location name
            let userLocationName = "Unknown Location";
            try {
              const locationInfo = await getLocationFromCoordinates(
                userLocation.latitude,
                userLocation.longitude
              );
              userLocationName = locationInfo.city || locationInfo.name || "Unknown Location";
            } catch (error) {
              console.error("Error getting location name:", error);
            }

            // Determine if severe (red) or normal (white) - STY, SuperTY, or TY with high wind speed
            const isSevere = latestTyphoon.category === "STY" || 
                            latestTyphoon.category === "SuperTY" || 
                            (latestTyphoon.category === "TY" && latestTyphoon.windSpeed >= 150) ||
                            signalNumber >= 3;
            
            // Create description message
            const descriptionMessage = signalNumber > 0
              ? `PSWS Signal ${signalNumber} is in effect for your area. Weather watch: ${latestTyphoon.category} is ${distance.toFixed(0)}km away. Monitor conditions.`
              : `Weather watch: ${latestTyphoon.category} is ${distance.toFixed(0)}km away. Monitor conditions.`;
            
            // Show toast - red for severe, neutral for normal
            const toastId = toast.custom(
              (t) => (
                <div className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg ${
                  isSevere 
                    ? "border-red-500 bg-red-50 dark:bg-red-950" 
                    : "border-border bg-background"
                }`}>
                  <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                    isSevere ? "text-red-600" : "text-foreground"
                  }`} />
                  <div className="flex-1 space-y-2 whitespace-normal">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-black dark:text-white">{userLocationName}</div>
                      {signalNumber > 0 && (
                        <Badge 
                          variant={signalNumber >= 3 ? "destructive" : signalNumber === 2 ? "default" : "secondary"}
                          className="text-xs font-bold"
                        >
                          PSWS {signalNumber}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-black dark:text-white opacity-90">
                      {descriptionMessage}
                    </div>
                    <div className="text-xs text-black dark:text-white opacity-75 space-y-0.5">
                      <div>Your Location: {userLocationName}</div>
                      <div>Storm Position: {stormCoordinates}</div>
                      <div>Wind Speed: {latestTyphoon.windSpeed.toFixed(0)} km/h</div>
                      <div>Distance: {distance.toFixed(0)}km</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.dismiss(t)}
                    className="shrink-0 rounded-md p-1 text-black dark:text-white opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ),
              {
                duration: 10000, // 10 seconds
              }
            );
            
            // Store the new toast ID
            currentToastIdRef.current = toastId;
            
            // Mark this typhoon as seen
            previousTyphoonIdRef.current = latestTyphoon.id;
          }
        }
      } catch (error) {
        console.error("Error fetching typhoons for toast:", error);
      }
    };

    // Fetch immediately
    fetchAndShowToast();

    // Fetch every 15 minutes (typhoon data updates less frequently)
    const interval = setInterval(fetchAndShowToast, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, userLocation]);

  // This component doesn't render anything
  return null;
}

