"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Component that captures user location when they sign up or sign in
 * and saves it to Convex database
 */
export function UserLocationCapture() {
  const { user, isLoaded } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);
  const currentUser = useQuery(api.users.getUserByClerkId, 
    user ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    // Check if user already exists and has location saved
    if (currentUser?.location) {
      return;
    }

    // Request user location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Create or update the user record with location
            await createOrUpdateUser({
              clerkId: user.id,
              email: user.primaryEmailAddress?.emailAddress || "",
              name: user.fullName || undefined,
              image: user.imageUrl || undefined,
              location: {
                latitude,
                longitude,
              },
            });
          } catch (error) {
            console.error("Error saving user location:", error);
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
          // Still create user record without location
          if (!currentUser) {
            createOrUpdateUser({
              clerkId: user.id,
              email: user.primaryEmailAddress?.emailAddress || "",
              name: user.fullName || undefined,
              image: user.imageUrl || undefined,
            }).catch((err) => {
              console.error("Error creating user:", err);
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Geolocation not supported, still create user record
      if (!currentUser) {
        createOrUpdateUser({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          name: user.fullName || undefined,
          image: user.imageUrl || undefined,
        }).catch((err) => {
          console.error("Error creating user:", err);
        });
      }
    }
  }, [user, isLoaded, currentUser, createOrUpdateUser]);

  // This component doesn't render anything
  return null;
}

