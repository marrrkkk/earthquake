"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wind, Droplets, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/earthquakes", label: "Earthquakes", icon: AlertTriangle },
    { href: "/typhoon", label: "Typhoon", icon: Wind },
    { href: "/flood", label: "Flood", icon: Droplets },
  ];

  return (
    <nav className="bg-black">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            
            <span className="font-bold text-white text-xl">Philcast</span>
          </Link>
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "flex items-center gap-2 text-white",
                    isActive && "bg-white text-black hover:!bg-white hover:!text-black"
                  )}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" className="flex items-center gap-2">
                  Sign In
                </Button>
              </SignInButton> 
              <SignUpButton mode="modal">
                <Button variant="default" className="flex items-center gap-2">
                  Sign Up
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
}

