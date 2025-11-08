"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { Typhoon } from "@/app/actions/typhoon";

interface TyphoonMapWindyProps {
  typhoons: Typhoon[];
  height?: string;
  apiKey?: string;
}

/**
 * Typhoon Map using Windy.com API
 * 
 * To get your Windy.com API key:
 * 1. Visit https://api.windy.com/keys
 * 2. Sign up or log in to your Windy.com account
 * 3. Create a new API key
 * 4. Add it to your .env.local file as: NEXT_PUBLIC_WINDY_API_KEY=your_key_here
 * 
 * For more information:
 * - API Documentation: https://api.windy.com/
 * - Widget Documentation: https://community.windy.com/topic/8168/release-notes-windy-plugins
 */
export function TyphoonMapWindy({ 
  typhoons, 
  height = "600px",
  apiKey 
}: TyphoonMapWindyProps) {
  const [mounted, setMounted] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const windyContainerRef = useRef<HTMLDivElement>(null);
  const windyApiRef = useRef<any>(null);

  // Get API key from environment or prop
  const windyApiKey = apiKey || process.env.NEXT_PUBLIC_WINDY_API_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMounted(true);
  }, []);

  // Calculate center point from typhoons if available
  let centerLat = 14.5995; // Default: Manila
  let centerLon = 120.9842;
  let zoom = 6;

  if (typhoons.length > 0) {
    const firstTyphoon = typhoons[0];
    centerLat = firstTyphoon.currentPosition.latitude;
    centerLon = firstTyphoon.currentPosition.longitude;
    zoom = 7;
  }

  const handleScriptLoad = () => {
    if (!windyContainerRef.current || typeof window === "undefined") return;
    
    setScriptReady(true);
    
    // Initialize Windy map using the API
    if ((window as any).windyInit && windyApiKey) {
      const options = {
        key: windyApiKey,
        lat: centerLat,
        lon: centerLon,
        zoom: zoom,
        overlay: "wind", // Show wind overlay for typhoon tracking
      };

      try {
        (window as any).windyInit(options, (windyAPI: any) => {
          windyApiRef.current = windyAPI;
          const { map } = windyAPI;
          
          // Add markers for each typhoon
          typhoons.forEach((typhoon) => {
            const marker = map.marker({
              lat: typhoon.currentPosition.latitude,
              lon: typhoon.currentPosition.longitude,
              title: `${typhoon.name} - ${typhoon.category}`,
            });
            
            // Add popup with typhoon info
            marker.bindPopup(`
              <div style="padding: 10px;">
                <h3 style="margin: 0 0 8px 0; font-weight: bold;">${typhoon.name}</h3>
                ${typhoon.internationalName ? `<p style="margin: 0 0 8px 0; color: #666;">${typhoon.internationalName}</p>` : ""}
                <p style="margin: 4px 0;"><strong>Category:</strong> ${typhoon.category}</p>
                <p style="margin: 4px 0;"><strong>Wind Speed:</strong> ${typhoon.windSpeed} km/h</p>
                ${typhoon.pressure ? `<p style="margin: 4px 0;"><strong>Pressure:</strong> ${typhoon.pressure} hPa</p>` : ""}
                <p style="margin: 4px 0;"><strong>Movement:</strong> ${typhoon.movement.direction} at ${typhoon.movement.speed} km/h</p>
              </div>
            `);
          });
        });
      } catch (error) {
        console.error("Error initializing Windy API:", error);
      }
    } else if (!windyApiKey) {
      // Fallback to widget if no API key
      console.warn("No Windy API key provided. Using widget fallback. Get your API key at https://api.windy.com/keys");
    }
  };

  if (!mounted) {
    return (
      <div className="w-full bg-muted rounded-md flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground">Loading Windy map...</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-md overflow-hidden border relative" style={{ height }}>
      {windyApiKey ? (
        <>
          {/* Use Windy API if key is provided */}
          <Script
            src="https://api.windy.com/assets/map-forecast/libBoot.js"
            strategy="lazyOnload"
            onLoad={handleScriptLoad}
            onError={(e) => {
              console.error("Windy API script failed to load:", e);
            }}
          />
          <div
            ref={windyContainerRef}
            id="windy-typhoon-map"
            className="w-full h-full"
            style={{ backgroundColor: scriptReady ? "transparent" : "#f3f4f6" }}
          />
        </>
      ) : (
        <>
          {/* Fallback to widget if no API key */}
          <Script
            src="https://windy.app/widget3/windy_map_async.js"
            strategy="lazyOnload"
            onLoad={() => setScriptReady(true)}
            onError={(e) => {
              console.error("Windy widget script failed to load:", e);
            }}
          />
          <div
            ref={windyContainerRef}
            className="w-full h-full"
            style={{ backgroundColor: scriptReady ? "transparent" : "#f3f4f6" }}
            data-windywidget="map"
            data-appid="ea4746c6ad80abefcfd69bf5b01f729d"
            data-lat={centerLat.toString()}
            data-lon={centerLon.toString()}
            data-zoom={zoom.toString()}
            data-spots="true"
          />
        </>
      )}
      
      {/* Overlay typhoon information */}
      {typhoons.length > 0 && (
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-xs z-10">
          <h3 className="font-semibold text-sm mb-2">Active Typhoons: {typhoons.length}</h3>
          {typhoons.slice(0, 3).map((typhoon) => (
            <div key={typhoon.id} className="text-xs mb-1">
              <span className="font-medium">{typhoon.name}</span> - {typhoon.category} - {typhoon.windSpeed} km/h
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

