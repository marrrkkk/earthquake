import { TyphoonDisplay } from "@/components/typhoon-display";
import type { Metadata } from "next";
import { DailyForecast } from "@/components/daily-forecast";
import { WindyMap } from "@/components/windy";
import { TyphoonToast } from "@/components/typhoon-toast";
import { UserLocationStormDetails } from "@/components/user-location-storm-details";

export const metadata: Metadata = {
  title: "Typhoon Monitoring - Philippines | Disaster Monitoring System",
  description: "Real-time typhoon tracking and monitoring for the Philippines region.",
};

// Use dynamic rendering but allow caching for better performance
export const revalidate = 900; // Revalidate every 15 minutes (900 seconds)

export default function TyphoonPage() {
  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 mb-16 sm:mb-32 lg:mb-64">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2 sm:mb-3">
          Typhoon Monitoring
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Real-time typhoon tracking and monitoring for the Philippines region. 
          Data is updated every 15 minutes from authoritative sources.
        </p>
      </div>
      
      {/* Typhoon toast notification */}
      <TyphoonToast />
      
      {/* User Location and Storm Details */}
      <div className="mb-4 sm:mb-6">
        <UserLocationStormDetails />
      </div>
      
      <div className="mb-6 sm:mb-8">
        <WindyMap />
      </div>
      
    <DailyForecast />
    </div>
  );
}

