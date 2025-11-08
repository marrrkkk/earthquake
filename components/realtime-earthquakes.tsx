"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PaginatedEarthquakeList } from "@/components/paginated-earthquake-list";
import { EarthquakeStats } from "@/components/earthquake-stats";
import { getRealEarthquakes } from "@/app/actions/earthquake";
import { Earthquake } from "@/app/actions/earthquake";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function RealtimeEarthquakes() {
  // Get test earthquakes from Convex (real-time subscription)
  const testEarthquakesData = useQuery(api.earthquakes.getTestEarthquakes) || [];
  
  // Get all earthquakes from Convex (real-time subscription) - includes both test and real
  const allEarthquakesData = useQuery(api.earthquakes.getAllEarthquakes) || [];
  
  const saveRealEarthquake = useMutation(api.earthquakes.saveRealEarthquake);
  
  // State for real earthquakes from PHIVOLCS
  const [realEarthquakes, setRealEarthquakes] = useState<Earthquake[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(true);
  
  // Track which earthquake IDs we've already processed in this session
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Get existing earthquake IDs from database to avoid duplicates
  const existingEarthquakeIds = useMemo(() => {
    return new Set(allEarthquakesData.map((eq: any) => eq.id));
  }, [allEarthquakesData]);

  // Fetch real earthquakes on mount and periodically, and save new ones to database
  useEffect(() => {
    const fetchAndSaveRealEarthquakes = async () => {
      try {
        const earthquakes = await getRealEarthquakes();
        setRealEarthquakes(earthquakes);
        
        // Save new earthquakes to database for real-time notifications
        // Only save earthquakes that don't exist in the database yet
        for (const eq of earthquakes) {
          // Skip if we've already processed this ID in this session
          if (processedIdsRef.current.has(eq.id)) {
            continue;
          }
          
          // Skip if it already exists in the database
          if (existingEarthquakeIds.has(eq.id)) {
            processedIdsRef.current.add(eq.id);
            continue;
          }
          
          // This is a new earthquake - save it to trigger notifications
          try {
            await saveRealEarthquake({
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
            });
            // Mark as processed
            processedIdsRef.current.add(eq.id);
            console.log(`Saved new earthquake: ${eq.id} - M${eq.magnitude} at ${eq.place}`);
          } catch (error) {
            // Earthquake might already exist (race condition), that's okay
            console.debug("Error saving earthquake:", error);
            processedIdsRef.current.add(eq.id); // Mark as processed anyway
          }
        }
      } catch (error) {
        console.error("Error fetching real earthquakes:", error);
      } finally {
        setIsLoadingReal(false);
      }
    };

    // Fetch immediately
    fetchAndSaveRealEarthquakes();

    // Fetch every 2 minutes to check for new earthquakes (more frequent for real-time notifications)
    const interval = setInterval(fetchAndSaveRealEarthquakes, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [saveRealEarthquake, existingEarthquakeIds]);

  // Transform test earthquakes from Convex to Earthquake format
  const testEarthquakes: Earthquake[] = useMemo(() => {
    return testEarthquakesData.map((eq: any) => ({
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
  }, [testEarthquakesData]);

  // Transform all earthquakes from Convex to Earthquake format
  const allEarthquakesFromDB: Earthquake[] = useMemo(() => {
    return allEarthquakesData.map((eq: any) => ({
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
      isTest: eq.isTest,
    }));
  }, [allEarthquakesData]);

  // Use earthquakes from database (real-time) if available, otherwise fall back to merged data
  const allEarthquakes: Earthquake[] = useMemo(() => {
    if (allEarthquakesFromDB.length > 0) {
      return allEarthquakesFromDB;
    }
    // Fallback: merge real and test earthquakes
    const merged = [...realEarthquakes, ...testEarthquakes];
    // Filter to last 24 hours
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    return merged
      .filter((eq) => eq.time >= twentyFourHoursAgo)
      .sort((a, b) => b.time - a.time);
  }, [allEarthquakesFromDB, realEarthquakes, testEarthquakes]);

  // Show loading skeleton while initial load
  if (isLoadingReal && allEarthquakes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EarthquakeStats earthquakes={allEarthquakes} />
      <PaginatedEarthquakeList earthquakes={allEarthquakes} itemsPerPage={8} />
    </div>
  );
}

