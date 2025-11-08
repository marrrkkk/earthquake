"use client";

import { useEffect, useRef } from "react";
import { getActiveTyphoons } from "@/app/actions/typhoon";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

export function TyphoonToast() {
  const previousTyphoonIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const currentToastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    const fetchAndShowToast = async () => {
      try {
        const typhoons = await getActiveTyphoons();
        
        if (typhoons.length > 0) {
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
            
            // Format coordinates
            const coordinates = `${latestTyphoon.currentPosition.latitude.toFixed(4)}°N, ${latestTyphoon.currentPosition.longitude.toFixed(4)}°E`;
            
            // Determine if severe (red) or normal (white) - STY, SuperTY, or TY with high wind speed
            const isSevere = latestTyphoon.category === "STY" || 
                            latestTyphoon.category === "SuperTY" || 
                            (latestTyphoon.category === "TY" && latestTyphoon.windSpeed >= 150);
            
            // Get location name (use name or a default)
            const locationName = latestTyphoon.name || "Typhoon Alert";
            
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
                  <div className="flex-1 space-y-1 whitespace-normal">
                    <div className="font-semibold text-black dark:text-white">{locationName}</div>
                    <div className="text-xs text-black dark:text-white opacity-90">Location: {coordinates}</div>
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
    // Cache is 15 minutes, so only refresh every 20 minutes to avoid unnecessary calls
    const interval = setInterval(fetchAndShowToast, 20 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything
  return null;
}

