import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Wind, Droplets } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Disaster Monitoring System
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Real-time disaster monitoring and alert system for the Philippines
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
        {/* Earthquake Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/earthquakes" className="block">
            <CardHeader className="text-center">
              <AlertTriangle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
              <CardTitle className="text-2xl">Earthquake</CardTitle>
              <CardDescription>
                Real-time earthquake monitoring and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                View Earthquakes
              </Button>
            </CardContent>
          </Link>
        </Card>

        {/* Typhoon Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/typhoon" className="block">
            <CardHeader className="text-center">
              <Wind className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-2xl">Typhoon</CardTitle>
              <CardDescription>
                Typhoon tracking and monitoring (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                View Typhoons
              </Button>
            </CardContent>
          </Link>
        </Card>

        {/* Flood Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/flood" className="block">
            <CardHeader className="text-center">
              <Droplets className="h-16 w-16 text-cyan-600 mx-auto mb-4" />
              <CardTitle className="text-2xl">Flood</CardTitle>
              <CardDescription>
                Flood monitoring and alerts (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg" variant="outline" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
