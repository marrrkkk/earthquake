"use server";

import axios from "axios";
import https from "https";

export interface Typhoon {
  id: string;
  name: string;
  internationalName?: string;
  category: "TD" | "TS" | "STS" | "TY" | "STY" | "SuperTY"; // Tropical Depression, Tropical Storm, Severe Tropical Storm, Typhoon, Super Typhoon
  currentPosition: {
    latitude: number;
    longitude: number;
  };
  windSpeed: number; // in km/h
  gustSpeed?: number; // in km/h
  pressure?: number; // in hPa
  movement: {
    direction: string; // e.g., "NW", "W", "N"
    speed: number; // in km/h
  };
  track: Array<{
    latitude: number;
    longitude: number;
    time: number;
    windSpeed: number;
    category: string;
  }>;
  forecast?: Array<{
    latitude: number;
    longitude: number;
    time: number;
    windSpeed: number;
    category: string;
  }>;
  lastUpdate: number;
  source: string;
  advisoryNumber?: string;
  status: "active" | "dissipated" | "warning";
}

// Create an axios instance that ignores SSL certificate errors
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "application/json, text/html, */*",
  },
});

// Fetch typhoon data from Tropical Cyclone API (public service)
async function fetchJTWCTyphoonData(): Promise<Typhoon[]> {
  try {
    // Using a public typhoon tracking service
    // You can replace this with actual JTWC data parsing if needed
    
    // Try fetching from a public typhoon tracking API
    // Example: https://www.tropicalstormrisk.com/ or similar services
    
    // For now, we'll use a public API endpoint if available
    // This is a placeholder that can be replaced with actual data source
    
    return [];
  } catch (error) {
    console.error("Error fetching JTWC typhoon data:", error);
    return [];
  }
}

// Fetch typhoon data from PAGASA (Philippine weather service)
async function fetchPAGASATyphoonData(): Promise<Typhoon[]> {
  try {
    // PAGASA website: https://www.pagasa.dost.gov.ph/
    // Try fetching from PAGASA's public data
    const response = await axiosInstance.get(
      "https://www.pagasa.dost.gov.ph/weather",
      {
        timeout: 15000,
      }
    );

    // Parse PAGASA HTML to extract typhoon data
    // This is a simplified parser - adjust based on actual PAGASA page structure
    // For now, return empty as PAGASA structure may vary
    
    // In production, you would parse the HTML response here
    // Example: Use cheerio to parse and extract typhoon information
    
    return [];
  } catch (error) {
    console.error("Error fetching PAGASA typhoon data:", error);
    return [];
  }
}

// Fetch from a public typhoon tracking API
async function fetchTyphoonDataFromAPI(): Promise<Typhoon[]> {
  try {
    // Try multiple public typhoon tracking services
    // Option 1: Try Tropical Cyclone Data API (if available)
    // Option 2: Try JTWC data parsing
    // Option 3: Try other public services
    
    // For now, we'll use a structure that can be adapted to real APIs
    // In production, you would integrate with:
    // - JTWC data (requires parsing their bulletins)
    // - PAGASA data (requires scraping their website)
    // - Commercial weather APIs (OpenWeatherMap, WeatherAPI, etc.)
    
    // Example implementation using a public service:
    // You can replace this with actual API calls when available
    
    // Try fetching from a public typhoon tracking endpoint
    // Note: This is a placeholder - replace with actual API endpoint
    try {
      const response = await axiosInstance.get(
        "https://www.tropicalstormrisk.com/tracker/dynamic/current.json",
        {
          timeout: 10000,
        }
      );

      // Parse the response based on the API format
      if (response.data && Array.isArray(response.data)) {
        return response.data.map((item: any) => ({
          id: item.id || `typhoon-${Date.now()}`,
          name: item.name || "Unnamed",
          internationalName: item.internationalName,
          category: (item.category || "TD") as Typhoon["category"],
          currentPosition: {
            latitude: item.latitude || 0,
            longitude: item.longitude || 0,
          },
          windSpeed: item.windSpeed || 0,
          gustSpeed: item.gustSpeed,
          pressure: item.pressure,
          movement: {
            direction: item.direction || "N",
            speed: item.speed || 0,
          },
          track: item.track || [],
          forecast: item.forecast || [],
          lastUpdate: item.lastUpdate || Date.now(),
          source: "tropicalstormrisk",
          advisoryNumber: item.advisoryNumber,
          status: (item.status || "active") as Typhoon["status"],
        }));
      }
    } catch (apiError) {
      console.log("Primary API unavailable, trying alternative sources...");
    }

    // If no API data available, return empty array
    // The structure is ready for real implementation
    // You can add scraping logic for PAGASA or JTWC here
    return [];
  } catch (error) {
    console.error("Error fetching typhoon data from API:", error);
    return [];
  }
}

// Main function to get typhoon data
// This will try multiple sources and return the best available data
export async function getTyphoons(): Promise<Typhoon[]> {
  try {
    // Try PAGASA first (most relevant for Philippines)
    const pagasaData = await fetchPAGASATyphoonData();
    if (pagasaData.length > 0) {
      return pagasaData;
    }

    // Fallback to JTWC
    const jtwcData = await fetchJTWCTyphoonData();
    if (jtwcData.length > 0) {
      return jtwcData;
    }

    // Fallback to API
    const apiData = await fetchTyphoonDataFromAPI();
    if (apiData.length > 0) {
      return apiData;
    }

    // If no real data available, return empty array
    // In production, you would always have at least one working source
    return [];
  } catch (error) {
    console.error("Error getting typhoon data:", error);
    return [];
  }
}

// Get active typhoons affecting Philippines
export async function getActiveTyphoons(): Promise<Typhoon[]> {
  const typhoons = await getTyphoons();
  
  // Filter for active typhoons in or near Philippines
  // Philippines bounds: 4.2°N to 21.1°N, 116.9°E to 127.0°E
  const philippinesBounds = {
    minLat: 4.2,
    maxLat: 21.1,
    minLon: 116.9,
    maxLon: 127.0,
  };

  return typhoons.filter((typhoon) => {
    if (typhoon.status !== "active") return false;
    
    const { latitude, longitude } = typhoon.currentPosition;
    
    // Check if typhoon is within or near Philippines (with buffer zone)
    const buffer = 5; // degrees buffer
    return (
      latitude >= philippinesBounds.minLat - buffer &&
      latitude <= philippinesBounds.maxLat + buffer &&
      longitude >= philippinesBounds.minLon - buffer &&
      longitude <= philippinesBounds.maxLon + buffer
    );
  });
}

