import { TyphoonDisplay } from "@/components/typhoon-display";
import type { Metadata } from "next";
import { DailyForecast } from "@/components/daily-forecast";
import { WindyMap } from "@/components/windy";
import { StormAlert } from "@/components/storm-alert";

export const metadata: Metadata = {
  title: "Typhoon Monitoring - Philippines | Disaster Monitoring System",
  description: "Real-time typhoon tracking and monitoring for the Philippines region.",
};

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

export default function TyphoonPage() {
  return (
    <div className="container mx-auto py-8 px-4 mb-64">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Typhoon Monitoring
        </h1>
        <p className="text-muted-foreground">
          Real-time typhoon tracking and monitoring for the Philippines region. 
          Data is updated every 15 minutes from authoritative sources.
        </p>
      </div>
      <WindyMap className={""}/>
    <DailyForecast />
    </div>
  );
}

