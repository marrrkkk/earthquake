import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Wind, Droplets, Shield, Bell, MapPin, TrendingUp, ArrowRight } from "lucide-react";
import Image from 'next/image';

export default function Home() {
  const features = [
    {
      icon: AlertTriangle,
      title: "Real-Time Earthquakes",
      description: "Monitor seismic activity with live updates from PHIVOLCS",
      href: "/earthquakes",
    },
    {
      icon: Wind,
      title: "Typhoon Tracking",
      description: "Track active typhoons with PSWS alerts and forecasts",
      href: "/typhoon",
    },
    {
      icon: Droplets,
      title: "Flood Monitoring",
      description: "Real-time flood alerts and water level information",
      href: "/flood",
    },
  ];

  const benefits = [
    {
      icon: Bell,
      title: "Instant Alerts",
      description: "Real-time notifications for earthquakes, typhoons, and floods",
    },
    {
      icon: MapPin,
      title: "Location-Based",
      description: "Personalized alerts with PSWS signal numbers",
    },
    {
      icon: TrendingUp,
      title: "Accurate Data",
      description: "Sourced from PAGASA, PHIVOLCS, and authoritative sources",
    },
    {
      icon: Shield,
      title: "Stay Safe",
      description: "Early warnings to help you prepare during disasters",
    },
  ];

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="relative h-full w-full">
            <Image
              src="/bg.jpg"
              alt="Background"
              fill
              className="object-cover opacity-20 dark:opacity-10"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-xl bg-primary shadow-lg shadow-primary/30">
              <AlertTriangle className="h-7 w-7 text-primary-foreground" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
              Philcast
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
              Your trusted source for real-time disaster monitoring and alerts in the Philippines. 
              Stay informed, stay safe.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                <Link href="/earthquakes">
                  View Live Data
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/typhoon">
                  Track Typhoons
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">24/7</div>
                <div className="text-xs text-muted-foreground">Updates</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">3+</div>
                <div className="text-xs text-muted-foreground">Sources</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">PH</div>
                <div className="text-xs text-muted-foreground">Coverage</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-8 sm:py-12 bg-muted/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Comprehensive Disaster Monitoring
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Real-time alerts and detailed information about natural disasters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="group hover:shadow-md transition-all duration-200 hover:border-primary/50"
                >
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="ghost" size="sm" className="w-full group-hover:text-primary">
                      <Link href={feature.href}>
                        Explore
                        <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                Why Choose Philcast?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base mb-1">{benefit.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-8 sm:py-12 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-2">
              Ready to Stay Informed?
            </h2>
            <p className="text-sm text-primary-foreground/90 mb-6">
              Sign up for personalized alerts and real-time disaster monitoring
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/earthquakes">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}