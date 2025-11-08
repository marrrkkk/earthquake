"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Dynamically import LocationPicker to avoid SSR issues with react-leaflet
const LocationPicker = dynamic(() => import("./location-picker").then(mod => ({ default: mod.LocationPicker })), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-muted rounded-md flex items-center justify-center" style={{ height: "300px" }}>
      <p className="text-muted-foreground">Loading map...</p>
    </div>
  ),
});

export function AlertSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useUser();
  const [enabled, setEnabled] = useState(false);
  const [minMagnitude, setMinMagnitude] = useState(5.0);
  const [alertLocation, setAlertLocation] = useState<{
    latitude: number;
    longitude: number;
    radiusKm: number;
  } | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const settings = useQuery(
    api.alerts.getAlertSettings,
    user ? { clerkId: user.id } : "skip"
  );

  const updateSettings = useMutation(api.alerts.updateAlertSettings);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setMinMagnitude(settings.minMagnitude);
      if (settings.alertLocation) {
        setAlertLocation({
          latitude: settings.alertLocation.latitude,
          longitude: settings.alertLocation.longitude,
          radiusKm: settings.alertLocation.radiusKm,
        });
      }
    }
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;

    await updateSettings({
      clerkId: user.id,
      enabled,
      minMagnitude,
      alertLocation: alertLocation || undefined,
    });

    onOpenChange(false);
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setAlertLocation({
      latitude: lat,
      longitude: lng,
      radiusKm: alertLocation?.radiusKm || 50, // Default 50km radius
    });
    setLocationPickerOpen(false);
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto w-[calc(100vw-2rem)] sm:w-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Alert Settings</DialogTitle>
          <DialogDescription className="text-base">
            Configure when and where you want to receive earthquake alerts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable/Disable Alerts */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1 flex-1">
              <Label htmlFor="enabled" className="text-base font-semibold">Enable Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications for earthquakes matching your criteria
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              className="ml-4"
            />
          </div>

          {/* Minimum Magnitude */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="magnitude" className="text-base font-semibold">Minimum Magnitude</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Only receive alerts for earthquakes with magnitude ≥ {minMagnitude}
              </p>
            </div>
            <Input
              id="magnitude"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={minMagnitude}
              onChange={(e) => setMinMagnitude(parseFloat(e.target.value) || 0)}
              className="max-w-32"
            />
          </div>

          {/* Location-based Alerts */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <Label className="text-base font-semibold">Location-based Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Only receive alerts for earthquakes near a specific location
                </p>
              </div>
              <Button
                variant={alertLocation ? "outline" : "default"}
                size="sm"
                onClick={() => setLocationPickerOpen(!locationPickerOpen)}
                className="ml-4"
              >
                {alertLocation ? "Change Location" : "Set Location"}
              </Button>
            </div>

            {alertLocation && (
              <div className="p-4 bg-background border rounded-md space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Current Location:</p>
                  <p className="text-sm text-muted-foreground">
                    {alertLocation.latitude.toFixed(4)}, {alertLocation.longitude.toFixed(4)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radius" className="text-sm font-medium">
                    Alert Radius (km)
                  </Label>
                  <Input
                    id="radius"
                    type="number"
                    step="1"
                    min="1"
                    max="1000"
                    value={alertLocation.radiusKm}
                    onChange={(e) =>
                      setAlertLocation({
                        ...alertLocation,
                        radiusKm: parseFloat(e.target.value) || 50,
                      })
                    }
                    className="max-w-32"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAlertLocation(null)}
                  className="w-full"
                >
                  Remove Location Filter
                </Button>
              </div>
            )}

            {locationPickerOpen && (
              <div className="mt-3 border rounded-md overflow-hidden">
                <LocationPicker
                  latitude={alertLocation?.latitude || 14.5995}
                  longitude={alertLocation?.longitude || 120.9842}
                  onLocationChange={handleLocationSelect}
                  height="300px"
                />
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="min-w-24">
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

