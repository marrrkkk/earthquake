"use client";

import { NewEarthquakeAlert } from "./new-earthquake-alert";
import { Earthquake } from "@/app/actions/earthquake";

interface EarthquakeAlertWrapperProps {
  earthquakes: Earthquake[];
}

export function EarthquakeAlertWrapper({
  earthquakes,
}: EarthquakeAlertWrapperProps) {
  return (
    <div className="mb-6 right-0 bottom-0 z-50 flex flex-col items-end space-y-2">
      <NewEarthquakeAlert earthquakes={earthquakes} />
    </div>
  );
}

