import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Database, 
  MapPin, 
  Wind, 
  AlertTriangle, 
  Droplets,
  ExternalLink,
  CheckCircle2,
  Clock,
  Shield
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Sources - Disaster Monitoring System",
  description: "Information about all data sources used in the disaster monitoring system",
};

interface DataSource {
  name: string;
  description: string;
  website: string;
  category: "Earthquake" | "Typhoon" | "Flood" | "Infrastructure";
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  updateFrequency: string;
  reliability: "High" | "Medium" | "Low";
  official: boolean;
}

const dataSources: DataSource[] = [
  {
    name: "PHIVOLCS",
    description: "Philippine Institute of Volcanology and Seismology - Official government agency for earthquake monitoring in the Philippines",
    website: "https://earthquake.phivolcs.dost.gov.ph/",
    category: "Earthquake",
    icon: AlertTriangle,
    features: [
      "Real-time earthquake data",
      "Magnitude and location information",
      "Depth and coordinates",
      "Official Philippine government data"
    ],
    updateFrequency: "Real-time",
    reliability: "High",
    official: true,
  },
  {
    name: "PAGASA",
    description: "Philippine Atmospheric, Geophysical and Astronomical Services Administration - National weather service of the Philippines",
    website: "https://www.pagasa.dost.gov.ph/",
    category: "Typhoon",
    icon: Wind,
    features: [
      "Tropical cyclone information",
      "Public Storm Warning Signals (PSWS)",
      "Typhoon tracking and forecasts",
      "Weather advisories",
      "Official Philippine government data"
    ],
    updateFrequency: "Every 15 minutes",
    reliability: "High",
    official: true,
  },
  {
    name: "Windy.com",
    description: "Professional weather platform providing real-time weather data and tropical cyclone tracking",
    website: "https://www.windy.com/",
    category: "Typhoon",
    icon: Wind,
    features: [
      "Tropical cyclone tracking",
      "Real-time weather visualization",
      "Wind patterns and forecasts",
      "Interactive maps"
    ],
    updateFrequency: "Real-time",
    reliability: "High",
    official: false,
  },
  {
    name: "NOAA",
    description: "National Oceanic and Atmospheric Administration - US government agency providing tropical cyclone data",
    website: "https://www.nhc.noaa.gov/",
    category: "Typhoon",
    icon: Globe,
    features: [
      "Tropical cyclone tracking",
      "Western Pacific basin data",
      "Forecast models",
      "Historical data"
    ],
    updateFrequency: "Every 6 hours",
    reliability: "High",
    official: true,
  },
  {
    name: "Open-Meteo",
    description: "Open-source weather API providing flood monitoring data and river discharge information",
    website: "https://open-meteo.com/",
    category: "Flood",
    icon: Droplets,
    features: [
      "River discharge data",
      "Flood forecasting",
      "Historical flood data",
      "Free and open-source"
    ],
    updateFrequency: "Every 5 minutes",
    reliability: "Medium",
    official: false,
  },
  {
    name: "Convex",
    description: "Real-time database and backend platform for storing user data, notifications, and test earthquakes",
    website: "https://www.convex.dev/",
    category: "Infrastructure",
    icon: Database,
    features: [
      "Real-time data synchronization",
      "User notifications",
      "Alert settings storage",
      "Test earthquake simulation data"
    ],
    updateFrequency: "Real-time",
    reliability: "High",
    official: false,
  },
];

function getReliabilityColor(reliability: DataSource["reliability"]): string {
  switch (reliability) {
    case "High":
      return "bg-green-500 hover:bg-green-600";
    case "Medium":
      return "bg-yellow-500 hover:bg-yellow-600";
    case "Low":
      return "bg-orange-500 hover:bg-orange-600";
  }
}

function getCategoryColor(category: DataSource["category"]): string {
  switch (category) {
    case "Earthquake":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "Typhoon":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Flood":
      return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
    case "Infrastructure":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
  }
}

export default function SourcesPage() {
  const categories = Array.from(new Set(dataSources.map((s) => s.category)));

  return (
    <div className="container mx-auto py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
          Data Sources
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-3xl">
          Our disaster monitoring system aggregates data from multiple authoritative sources 
          to provide comprehensive and reliable information about earthquakes, typhoons, and floods 
          in the Philippines.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{dataSources.length}</div>
            <p className="text-sm text-muted-foreground">Total Sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {dataSources.filter((s) => s.official).length}
            </div>
            <p className="text-sm text-muted-foreground">Official Sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {dataSources.filter((s) => s.reliability === "High").length}
            </div>
            <p className="text-sm text-muted-foreground">High Reliability</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-sm text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Sources by Category */}
      {categories.map((category) => {
        const sourcesInCategory = dataSources.filter((s) => s.category === category);
        return (
          <div key={category} className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              {category}
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sourcesInCategory.map((source) => {
                const Icon = source.icon;
                return (
                  <Card key={source.name} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{source.name}</CardTitle>
                            {source.official && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Official
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge className={getCategoryColor(source.category)}>
                          {source.category}
                        </Badge>
                        <Badge className={getReliabilityColor(source.reliability)}>
                          {source.reliability} Reliability
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <CardDescription className="mb-4 flex-1">
                        {source.description}
                      </CardDescription>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Updates: {source.updateFrequency}</span>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-2">Features:</p>
                          <ul className="space-y-1">
                            {source.features.map((feature, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <a
                        href={source.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-auto"
                      >
                        Visit Website
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Additional Information */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle>About Our Data Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We prioritize data from official government sources (PHIVOLCS and PAGASA) 
            for the most accurate and authoritative information. Additional sources are 
            used to provide comprehensive coverage and redundancy.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Data Aggregation</h3>
              <p className="text-sm text-muted-foreground">
                Our system automatically aggregates data from multiple sources, 
                prioritizing official sources and falling back to alternative sources 
                when needed.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Offline Support</h3>
              <p className="text-sm text-muted-foreground">
                All data is cached locally to ensure availability even when offline. 
                Cached data is automatically updated when a network connection is available.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

