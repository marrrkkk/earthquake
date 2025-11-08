import { RealtimeEarthquakes } from "@/components/realtime-earthquakes";
import type { Metadata } from "next";
import { HomeEarthquakeDisplay } from "@/components/home-earthquake-display";
import { DottedSeparator } from "@/components/ui/dottedLine";

export const metadata: Metadata = {
  title: "Live Earthquakes - Philippines | Earthquake Monitoring System",
  description: "Real-time earthquake data for the Philippines region. Updates in real-time.",
};

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

export default function EarthquakesPage() {
  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2 sm:mb-3">
          Real-Time Earthquake Monitoring
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Live earthquake data for the Philippines region from the last 24 hours. Updates in real-time.
        </p>
      </div>
      <div className="mb-6 sm:mb-8">
      <HomeEarthquakeDisplay/>
      </div>
      <RealtimeEarthquakes />
    </div>
  );
}

