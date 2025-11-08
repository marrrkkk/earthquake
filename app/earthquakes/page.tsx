import { RealtimeEarthquakes } from "@/components/realtime-earthquakes";
import type { Metadata } from "next";
import { HomeEarthquakeDisplay } from "@/components/home-earthquake-display";

export const metadata: Metadata = {
  title: "Live Earthquakes - Philippines | Earthquake Monitoring System",
  description: "Real-time earthquake data for the Philippines region. Updates in real-time.",
};

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

export default function EarthquakesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Real-Time Earthquake Monitoring
        </h1>
        <p className="text-muted-foreground">
          Live earthquake data for the Philippines region from the last 24 hours. Updates in real-time.
        </p>
      </div>
      <HomeEarthquakeDisplay />
      <RealtimeEarthquakes />
    </div>
  );
}

