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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Flood Monitoring
        </h1>
        <p className="text-muted-foreground">
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

