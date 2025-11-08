import { FloodDisplay } from "@/components/flood-display";
import type { Metadata } from "next";
import { FloodToast } from "@/components/flood-toast";

export const metadata: Metadata = {
  title: "Flood Monitoring - Philippines | Disaster Monitoring System",
  description: "Real-time flood monitoring and alerts for the Philippines region.",
};

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

export default function FloodPage() {
  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2 sm:mb-3">
          Flood Monitoring
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Real-time flood monitoring and alerts for the Philippines region. 
          Data is updated every 15 minutes from authoritative sources.
        </p>
      </div>

      {/* Flood toast notification */}
      <FloodToast />

      <FloodDisplay />
    </div>
  );
}

