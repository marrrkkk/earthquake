"use client";

import { useEffect, useRef } from "react";
import { getActiveFloods } from "@/app/actions/flood";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

export function FloodToast() {
  const previousFloodIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const currentToastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    const fetchAndShowToast = async () => {
      try {
        const floods = await getActiveFloods();
        
        if (floods.length > 0) {
          const latestFlood = floods[0];
          
          // Show toast on initial load or if it's a new flood
          const shouldShow = isInitialLoadRef.current || previousFloodIdRef.current !== latestFlood.id;
          
          if (shouldShow) {
            // Mark initial load as complete
            if (isInitialLoadRef.current) {
              isInitialLoadRef.current = false;
            }
            // Dismiss ALL existing toasts to ensure only one is displayed at a time
            toast.dismiss();
            
            // Format coordinates
            const coordinates = `${latestFlood.location.latitude.toFixed(4)}°N, ${latestFlood.location.longitude.toFixed(4)}°E`;
            
            // Determine if severe (red) or normal (white) - high or extreme severity
            const isSevere = latestFlood.severity === "high" || latestFlood.severity === "extreme";
            
            // Get location name
            const locationName = latestFlood.location.name || "Flood Alert";
            
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
            
            // Mark this flood as seen
            previousFloodIdRef.current = latestFlood.id;
          }
        }
      } catch (error) {
        console.error("Error fetching floods for toast:", error);
      }
    };

    // Fetch immediately
    fetchAndShowToast();

    // Fetch every 15 minutes
    // Cache is 15 minutes, so only refresh every 20 minutes to avoid unnecessary calls
    const interval = setInterval(fetchAndShowToast, 20 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything
  return null;
}

