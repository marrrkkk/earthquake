"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    maxSockets: 10,
  }),
  timeout: 10000, // Reduced from 30s to 10s for faster failures
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  },
});

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  // Type assertion is safe here because we control what goes into the cache
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

export interface Flood {
  id: string;
  location: {
    name: string;
    province: string;
    region: string;
    latitude: number;
    longitude: number;
  };
  severity: "low" | "moderate" | "high" | "extreme";
  waterLevel: {
    current: number; // in meters
    normal: number; // in meters
    status: "normal" | "monitoring" | "alert" | "alarm";
  };
  affectedAreas: string[];
  status: "active" | "monitoring" | "resolved";
  reportedAt: number; // timestamp
  updatedAt: number; // timestamp
  source: string;
  description?: string;
  evacuationCenters?: number;
  affectedPopulation?: number;
}

/**
 * Fetch flood data for a single basin from Open-Meteo
 */
async function fetchBasinData(basin: {
  name: string;
  lat: number;
  lon: number;
  province: string;
  region: string;
}): Promise<Flood | null> {
  const cacheKey = `openmeteo-${basin.name}-${basin.lat}-${basin.lon}`;
  const cached = getCached<Flood>(cacheKey);
  if (cached) {
    console.log(`[Open-Meteo] Using cached data for ${basin.name}`);
    return cached;
  }

  try {
    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${basin.lat}&longitude=${basin.lon}&daily=river_discharge,river_discharge_mean&forecast_days=1`;
    
    const response = await axiosInstance.get(url, {
      timeout: 8000, // Reduced timeout for individual requests
      validateStatus: (status) => status < 500,
    });

    if (response.status !== 200 || !response.data?.daily) {
      return null;
    }

    const discharge = response.data.daily.river_discharge?.[0];
    const meanDischarge = response.data.daily.river_discharge_mean?.[0];

    if (!discharge || !meanDischarge) {
      return null;
    }

    const ratio = discharge / meanDischarge;

    // Only include if there's significant flooding
    if (ratio <= 1.2) {
      return null;
    }

    let severity: Flood["severity"] = "low";
    let status: Flood["waterLevel"]["status"] = "normal";

    if (ratio > 3.0) {
      severity = "extreme";
      status = "alarm";
    } else if (ratio > 2.0) {
      severity = "high";
      status = "alarm";
    } else if (ratio > 1.5) {
      severity = "moderate";
      status = "alert";
    } else {
      severity = "low";
      status = "monitoring";
    }

    const waterLevel = Math.max(0.5, (discharge - meanDischarge) / 1000);
    const floodStatus: Flood["status"] = severity === "extreme" || severity === "high" ? "active" : "monitoring";

    const flood: Flood = {
      id: `openmeteo-${basin.name.toLowerCase().replace(/\s+/g, "-")}`,
      location: {
        name: basin.name,
        province: basin.province,
        region: basin.region,
        latitude: basin.lat,
        longitude: basin.lon,
      },
      severity,
      waterLevel: {
        current: waterLevel,
        normal: Math.max(0.3, meanDischarge / 1000),
        status,
      },
      affectedAreas: [basin.name],
      status: floodStatus,
      reportedAt: Date.now() - 3600000,
      updatedAt: Date.now(),
      source: "Open-Meteo",
      description: `River discharge is ${(ratio * 100).toFixed(0)}% of normal levels. ${severity === "extreme" || severity === "high" ? "Immediate attention required." : "Monitoring ongoing."}`,
    };

    // Cache the result
    setCache(cacheKey, flood, CACHE_TTL);
    return flood;
  } catch {
    // Silently fail for individual basins - we'll return what we can get
    return null;
  }
}

/**
 * Fetch flood data from Open-Meteo Flood API (optimized with parallel requests)
 */
async function fetchOpenMeteoFloodData(): Promise<Flood[]> {
  try {
    console.log("[Open-Meteo] Starting flood data fetch...");
    
    // Major river basins in the Philippines with their coordinates
    const philippineBasins = [
      { name: "Pasig River", lat: 14.5995, lon: 120.9842, province: "Metro Manila", region: "NCR" },
      { name: "Marikina River", lat: 14.6500, lon: 121.1000, province: "Metro Manila", region: "NCR" },
      { name: "Cagayan River", lat: 17.6167, lon: 121.7167, province: "Cagayan", region: "Cagayan Valley" },
      { name: "Pampanga River", lat: 15.0000, lon: 120.7000, province: "Pampanga", region: "Central Luzon" },
      { name: "Agno River", lat: 16.2000, lon: 120.4000, province: "Pangasinan", region: "Ilocos Region" },
      { name: "Bicol River", lat: 13.6000, lon: 123.2000, province: "Camarines Sur", region: "Bicol Region" },
      { name: "Agusan River", lat: 8.5000, lon: 125.5000, province: "Agusan del Sur", region: "Caraga" },
      { name: "Mindanao River", lat: 7.2000, lon: 124.2000, province: "Cotabato", region: "Soccsksargen" },
    ];

    console.log(`[Open-Meteo] Fetching data for ${philippineBasins.length} river basins in parallel...`);

    // Fetch all basins in parallel with Promise.allSettled for better error handling
    const results = await Promise.allSettled(
      philippineBasins.map(basin => fetchBasinData(basin))
    );

    const floods: Flood[] = results
      .filter((result): result is PromiseFulfilledResult<Flood> => 
        result.status === "fulfilled" && result.value !== null
      )
      .map(result => result.value);

    console.log(`[Open-Meteo] Total floods found: ${floods.length}`);
    return floods;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Open-Meteo] Error fetching flood data:", message);
    return [];
  }
}

/**
 * Fetch and parse flood data from a single PAGASA URL
 */
async function fetchPAGASAUrl(url: string): Promise<Flood[]> {
  const cacheKey = `pagasa-${url}`;
  const cached = getCached<Flood[]>(cacheKey);
  if (cached) {
    console.log(`[PAGASA] Using cached data for ${url}`);
    return cached;
  }

  try {
    const response = await axiosInstance.get(url, { 
      timeout: 8000,
      validateStatus: (status) => status < 500,
    });

    if (response.status !== 200) {
      return [];
    }

    const $ = cheerio.load(response.data);
    const floods: Flood[] = [];
    const processedTexts = new Set<string>();

    // Optimized: Use more specific selectors first, then fall back to broader ones
    const selectors = [
      "article", ".news-item", ".alert", ".warning",
      ".content", ".main-content", ".page-content",
      "table tbody tr", ".table tbody tr"
    ];

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const text = $(element).text().trim();
        if (text.length < 20) return;

        const textLower = text.toLowerCase();
        const textKey = text.substring(0, 100);

        if (!textLower.includes("flood") && !textLower.includes("inundation") && !textLower.includes("water level")) {
          return;
        }

        if (processedTexts.has(textKey)) {
          return;
        }

        processedTexts.add(textKey);

        const locationMatch = text.match(/(manila|cebu|davao|iloilo|bataan|pampanga|laguna|rizal|bulacan|cagayan|pangasinan|bicol|agusan|mindanao|metro manila|ncr|central luzon|calabarzon|western visayas|central visayas|davao region|caraga|soccsksargen)/i);
        const severityMatch = text.match(/(low|moderate|high|extreme|severe|critical|warning|alert)/i);

        if (locationMatch) {
          const locationName = locationMatch[0];
          const locationData = getLocationCoordinates(locationName);

          if (locationData) {
            const severity = severityMatch ?
              (severityMatch[0].toLowerCase().includes("extreme") || severityMatch[0].toLowerCase().includes("critical") ? "extreme" :
               severityMatch[0].toLowerCase().includes("high") || severityMatch[0].toLowerCase().includes("severe") ? "high" :
               severityMatch[0].toLowerCase().includes("moderate") ? "moderate" : "low") : "moderate";

            const waterLevelStatus: Flood["waterLevel"]["status"] =
              severity === "extreme" || severity === "high" ? "alarm" :
              severity === "moderate" ? "alert" : "monitoring";

            const floodStatus: Flood["status"] =
              severity === "extreme" || severity === "high" ? "active" : "monitoring";

            const flood: Flood = {
              id: `pagasa-${locationName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${processedTexts.size}`,
              location: locationData,
              severity: severity as Flood["severity"],
              waterLevel: {
                current: severity === "extreme" ? 3.0 : severity === "high" ? 2.0 : severity === "moderate" ? 1.2 : 0.6,
                normal: 0.5,
                status: waterLevelStatus,
              },
              affectedAreas: [locationName],
              status: floodStatus,
              reportedAt: Date.now() - 7200000,
              updatedAt: Date.now() - 3600000,
              source: "PAGASA",
              description: text.substring(0, 500) || `Flood alert for ${locationName}. ${severity === "extreme" || severity === "high" ? "Take immediate precautions." : "Monitor situation."}`,
            };

            floods.push(flood);
          }
        }
      });

      // If we found floods with this selector, we can stop
      if (floods.length > 0) {
        break;
      }
    }

    // Cache results (even if empty, to avoid re-fetching)
    setCache(cacheKey, floods, CACHE_TTL);
    return floods;
  } catch {
    // Return empty array on error
    return [];
  }
}

/**
 * Fetch flood data from PAGASA by scraping (optimized with parallel requests)
 */
async function fetchPAGASAFloodData(): Promise<Flood[]> {
  try {
    console.log("[PAGASA] Starting flood data fetch...");

    const urls = [
      "https://www.pagasa.dost.gov.ph/flood",
      "https://www.pagasa.dost.gov.ph/flood-bulletin",
      "https://www.pagasa.dost.gov.ph/weather/flood",
    ];

    // Fetch all URLs in parallel
    const results = await Promise.allSettled(
      urls.map(url => fetchPAGASAUrl(url))
    );

    // Collect all floods from successful requests
    const allFloods: Flood[] = [];
    const seenLocations = new Set<string>();

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const flood of result.value) {
          // Deduplicate by location name
          const locationKey = flood.location.name.toLowerCase();
          if (!seenLocations.has(locationKey)) {
            seenLocations.add(locationKey);
            allFloods.push(flood);
          }
        }
      }
    }

    console.log(`[PAGASA] Total floods found: ${allFloods.length}`);
    return allFloods;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[PAGASA] Error fetching flood data:", message);
    return [];
  }
}

/**
 * Get coordinates for known Philippine locations
 */
function getLocationCoordinates(locationName: string): { name: string; province: string; region: string; latitude: number; longitude: number } | null {
  const locations: Record<string, { name: string; province: string; region: string; latitude: number; longitude: number }> = {
    manila: { name: "Manila", province: "Metro Manila", region: "NCR", latitude: 14.5995, longitude: 120.9842 },
    cebu: { name: "Cebu City", province: "Cebu", region: "Central Visayas", latitude: 10.3157, longitude: 123.8854 },
    davao: { name: "Davao City", province: "Davao del Sur", region: "Davao Region", latitude: 7.1907, longitude: 125.4553 },
    iloilo: { name: "Iloilo City", province: "Iloilo", region: "Western Visayas", latitude: 10.7202, longitude: 122.5621 },
    bataan: { name: "Bataan", province: "Bataan", region: "Central Luzon", latitude: 14.6786, longitude: 120.5370 },
    pampanga: { name: "Pampanga", province: "Pampanga", region: "Central Luzon", latitude: 15.0794, longitude: 120.6200 },
    laguna: { name: "Laguna", province: "Laguna", region: "CALABARZON", latitude: 14.2669, longitude: 121.4618 },
    rizal: { name: "Rizal", province: "Rizal", region: "CALABARZON", latitude: 14.6500, longitude: 121.2000 },
    bulacan: { name: "Bulacan", province: "Bulacan", region: "Central Luzon", latitude: 14.7943, longitude: 120.8799 },
    cagayan: { name: "Cagayan", province: "Cagayan", region: "Cagayan Valley", latitude: 17.6167, longitude: 121.7167 },
    pangasinan: { name: "Pangasinan", province: "Pangasinan", region: "Ilocos Region", latitude: 16.0439, longitude: 120.3320 },
    bicol: { name: "Bicol", province: "Camarines Sur", region: "Bicol Region", latitude: 13.6000, longitude: 123.2000 },
    agusan: { name: "Agusan", province: "Agusan del Sur", region: "Caraga", latitude: 8.5000, longitude: 125.5000 },
    mindanao: { name: "Mindanao", province: "Cotabato", region: "Soccsksargen", latitude: 7.2000, longitude: 124.2000 },
  };

  const key = locationName.toLowerCase();
  return locations[key] || null;
}

/**
 * Fetch flood data from alternative sources (NDRRMC, news sources, etc.)
 */
async function fetchAlternativeFloodData(): Promise<Flood[]> {
  try {
    const floods: Flood[] = [];
    
    // Try to fetch from NDRRMC or other government sources
    // This is a placeholder - implement when API becomes available
    // For now, we can try scraping news sources or social media
    
    return floods;
  } catch (error) {
    console.log("Error fetching alternative flood data:", error);
    return [];
  }
}

/**
 * Get active floods in the Philippines
 * This function aggregates data from multiple sources (optimized with parallel fetching)
 */
export async function getActiveFloods(): Promise<Flood[]> {
  try {
    console.log("========================================");
    console.log("[FLOOD] Starting getActiveFloods()");
    console.log("========================================");
    
    // Check cache first
    const cacheKey = "active-floods-all";
    const cached = getCached<Flood[]>(cacheKey);
    if (cached) {
      console.log("[FLOOD] Using cached flood data");
      return cached;
    }

    const floodMap = new Map<string, Flood>();

    // Fetch from all sources in parallel for maximum speed
    console.log("[FLOOD] Fetching from all sources in parallel...");
    const [openMeteoResult, pagasaResult, altResult] = await Promise.allSettled([
      fetchOpenMeteoFloodData(),
      fetchPAGASAFloodData(),
      fetchAlternativeFloodData(),
    ]);

    // Process Open-Meteo results
    if (openMeteoResult.status === "fulfilled") {
      console.log(`[FLOOD] Open-Meteo returned ${openMeteoResult.value.length} flood(s)`);
      openMeteoResult.value.forEach(flood => {
        floodMap.set(flood.id, flood);
      });
    } else {
      console.error("[FLOOD] Error fetching Open-Meteo data:", openMeteoResult.reason?.message);
    }

    // Process PAGASA results (merge with existing)
    if (pagasaResult.status === "fulfilled") {
      console.log(`[FLOOD] PAGASA returned ${pagasaResult.value.length} flood(s)`);
      pagasaResult.value.forEach(flood => {
        const existing = Array.from(floodMap.values()).find(
          f => f.location.name.toLowerCase() === flood.location.name.toLowerCase()
        );
        if (existing) {
          // Update existing with PAGASA data if more severe
          if (getSeverityLevel(flood.severity) > getSeverityLevel(existing.severity)) {
            floodMap.set(existing.id, { 
              ...existing, 
              ...flood, 
              source: `${existing.source} + PAGASA` 
            });
          }
        } else {
          floodMap.set(flood.id, flood);
        }
      });
    } else {
      console.error("[FLOOD] Error fetching PAGASA data:", pagasaResult.reason?.message);
    }

    // Process alternative source results
    if (altResult.status === "fulfilled") {
      console.log(`[FLOOD] Alternative sources returned ${altResult.value.length} flood(s)`);
      altResult.value.forEach(flood => {
        const existing = Array.from(floodMap.values()).find(
          f => f.location.name.toLowerCase() === flood.location.name.toLowerCase()
        );
        if (!existing) {
          floodMap.set(flood.id, flood);
        }
      });
    } else {
      console.error("[FLOOD] Error fetching alternative data:", altResult.reason?.message);
    }

    // Convert map to array and sort by severity
    const allFloods = Array.from(floodMap.values());
    allFloods.sort((a, b) => getSeverityLevel(b.severity) - getSeverityLevel(a.severity));

    console.log(`[FLOOD] Total unique floods after merging: ${allFloods.length}`);
    console.log("========================================");
    console.log(`[FLOOD] Final result: ${allFloods.length} flood(s) found`);
    if (allFloods.length > 0) {
      console.log("[FLOOD] Floods:", allFloods.map(f => `${f.location.name} (${f.severity})`).join(", "));
    }
    console.log("========================================");

    // Cache the result
    setCache(cacheKey, allFloods, CACHE_TTL);

    return allFloods;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[FLOOD] Fatal error in getActiveFloods:", {
      message,
      stack,
    });
    return [];
  }
}

/**
 * Get severity level as number for sorting
 */
function getSeverityLevel(severity: Flood["severity"]): number {
  const levels: Record<Flood["severity"], number> = {
    low: 1,
    moderate: 2,
    high: 3,
    extreme: 4,
  };
  return levels[severity] || 0;
}


