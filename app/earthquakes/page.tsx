import { getEarthquakes } from "@/app/actions/earthquake";
import { EarthquakeList } from "@/components/earthquake-list";
import { EarthquakeStats } from "@/components/earthquake-stats";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Earthquakes - Philippines | Earthquake Monitoring System",
  description: "Real-time earthquake data for the Philippines region. Updated every 60 seconds.",
};

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

function LoadingSkeleton() {
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

async function EarthquakeContent() {
  const earthquakes = await getEarthquakes();

  return (
    <div className="space-y-6">
      <EarthquakeStats earthquakes={earthquakes} />
      <EarthquakeList earthquakes={earthquakes} />
    </div>
  );
}

export default function EarthquakesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Real-Time Earthquake Monitoring
        </h1>
        <p className="text-muted-foreground">
          Live earthquake data for the Philippines region. Data updates every 60 seconds.
        </p>
      </div>
      <Suspense fallback={<LoadingSkeleton />}>
        <EarthquakeContent />
      </Suspense>
    </div>
  );
}

