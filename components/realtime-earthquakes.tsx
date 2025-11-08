"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "convex/react";
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
  
  // State for real earthquakes from PHIVOLCS
  const [realEarthquakes, setRealEarthquakes] = useState<Earthquake[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(true);

  // Fetch real earthquakes on mount and periodically
  useEffect(() => {
    const fetchRealEarthquakes = async () => {
      try {
        const earthquakes = await getRealEarthquakes();
        setRealEarthquakes(earthquakes);
      } catch (error) {
        console.error("Error fetching real earthquakes:", error);
      } finally {
        setIsLoadingReal(false);
      }
    };

    // Fetch immediately
    fetchRealEarthquakes();

    // Fetch every 60 seconds
    const interval = setInterval(fetchRealEarthquakes, 60000);

    return () => clearInterval(interval);
  }, []);

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

  // Merge real and test earthquakes
  const allEarthquakes: Earthquake[] = useMemo(() => {
    const merged = [...realEarthquakes, ...testEarthquakes];
    // Filter to last 24 hours
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    return merged
      .filter((eq) => eq.time >= twentyFourHoursAgo)
      .sort((a, b) => b.time - a.time);
  }, [realEarthquakes, testEarthquakes]);

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

