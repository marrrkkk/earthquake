"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  timeout: 30000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  },
});

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
 * Fetch flood data from Open-Meteo Flood API
 */
async function fetchOpenMeteoFloodData(): Promise<Flood[]> {
  try {
    console.log("[Open-Meteo] Starting flood data fetch...");
    const floods: Flood[] = [];
    
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

    console.log(`[Open-Meteo] Checking ${philippineBasins.length} river basins...`);

    for (const basin of philippineBasins) {
      try {
        // Try the correct Open-Meteo flood API endpoint
        const url = "https://flood-api.open-meteo.com/v1/flood";
        const params = {
          latitude: basin.lat,
          longitude: basin.lon,
          daily: "river_discharge,river_discharge_mean",
          forecast_days: 1,
        };
        
        console.log(`[Open-Meteo] Fetching data for ${basin.name} at (${basin.lat}, ${basin.lon})...`);
        console.log(`[Open-Meteo] Request URL: ${url}`, params);

        let response;
        try {
          // Try the full URL with query string
          const fullUrl = `${url}?latitude=${basin.lat}&longitude=${basin.lon}&daily=river_discharge,river_discharge_mean&forecast_days=1`;
          console.log(`[Open-Meteo] Full URL: ${fullUrl}`);
          
          response = await axiosInstance.get(fullUrl, {
            timeout: 15000,
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
          });
          
          console.log(`[Open-Meteo] Response status: ${response.status}`);
          
          if (response.status !== 200) {
            console.error(`[Open-Meteo] Non-200 status for ${basin.name}:`, {
              status: response.status,
              statusText: response.statusText,
              data: response.data,
            });
            continue; // Skip this basin
          }
        } catch (requestError: any) {
          // Log more details about the error
          console.error(`[Open-Meteo] Request error for ${basin.name}:`, {
            message: requestError.message,
            code: requestError.code,
            errno: requestError.errno,
            syscall: requestError.syscall,
            hostname: requestError.hostname,
            response: requestError.response ? {
              data: requestError.response.data,
              status: requestError.response.status,
              statusText: requestError.response.statusText,
              headers: requestError.response.headers,
            } : undefined,
            config: {
              url: requestError.config?.url,
              method: requestError.config?.method,
              baseURL: requestError.config?.baseURL,
            },
          });
          continue; // Skip this basin and continue with others
        }

        console.log(`[Open-Meteo] Response status: ${response.status}`);
        console.log(`[Open-Meteo] Response data for ${basin.name}:`, JSON.stringify(response.data, null, 2));

        if (response.data?.daily) {
          const discharge = response.data.daily.river_discharge?.[0];
          const meanDischarge = response.data.daily.river_discharge_mean?.[0];
          
          console.log(`[Open-Meteo] ${basin.name} - Discharge: ${discharge}, Mean: ${meanDischarge}`);
          
          if (discharge && meanDischarge) {
            // Calculate severity based on discharge ratio
            const ratio = discharge / meanDischarge;
            console.log(`[Open-Meteo] ${basin.name} - Discharge ratio: ${ratio.toFixed(2)}`);
            
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
            } else if (ratio > 1.2) {
              severity = "low";
              status = "monitoring";
            }

            // Only include if there's significant flooding
            if (ratio > 1.2) {
              const waterLevel = Math.max(0.5, (discharge - meanDischarge) / 1000); // Estimate water level
              
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
                reportedAt: Date.now() - 3600000, // 1 hour ago
                updatedAt: Date.now(),
                source: "Open-Meteo",
                description: `River discharge is ${(ratio * 100).toFixed(0)}% of normal levels. ${severity === "extreme" || severity === "high" ? "Immediate attention required." : "Monitoring ongoing."}`,
              };
              
              console.log(`[Open-Meteo] Adding flood for ${basin.name}:`, flood);
              floods.push(flood);
            } else {
              console.log(`[Open-Meteo] ${basin.name} - Ratio ${ratio.toFixed(2)} is below threshold (1.2), skipping`);
            }
          } else {
            console.log(`[Open-Meteo] ${basin.name} - Missing discharge data. Discharge: ${discharge}, Mean: ${meanDischarge}`);
          }
        } else {
          console.log(`[Open-Meteo] ${basin.name} - No daily data in response`);
        }
      } catch (basinError: any) {
        console.error(`[Open-Meteo] Error fetching data for ${basin.name}:`, {
          message: basinError.message,
          response: basinError.response?.data,
          status: basinError.response?.status,
          statusText: basinError.response?.statusText,
        });
        // Continue with other basins
      }
    }

    console.log(`[Open-Meteo] Total floods found: ${floods.length}`);
    return floods;
  } catch (error: any) {
    console.error("[Open-Meteo] Error fetching flood data:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    return [];
  }
}

/**
 * Fetch flood data from PAGASA by scraping
 */
async function fetchPAGASAFloodData(): Promise<Flood[]> {
  try {
    console.log("[PAGASA] Starting flood data fetch...");
    const floods: Flood[] = [];
    
    // Try to fetch PAGASA flood bulletins
    const urls = [
      "https://www.pagasa.dost.gov.ph/flood",
      "https://www.pagasa.dost.gov.ph/flood-bulletin",
      "https://www.pagasa.dost.gov.ph/weather/flood",
    ];

    for (const url of urls) {
      try {
        console.log(`[PAGASA] Trying URL: ${url}`);
        const response = await axiosInstance.get(url, { timeout: 15000 });
        console.log(`[PAGASA] Response status: ${response.status}`);
        console.log(`[PAGASA] Response headers:`, response.headers);
        console.log(`[PAGASA] Response data length: ${response.data?.length || 0} characters`);
        
        const $ = cheerio.load(response.data);
        const pageText = $("body").text().toLowerCase();
        console.log(`[PAGASA] Page contains 'flood': ${pageText.includes("flood")}`);
        console.log(`[PAGASA] Page contains 'water level': ${pageText.includes("water level")}`);

        // Try multiple selectors to find flood content
        const selectors = [
          ".flood-alert", ".flood-warning", ".flood-bulletin", 
          "article", ".news-item", ".alert", ".warning",
          ".content", ".main-content", ".page-content",
          "div[class*='flood']", "div[class*='alert']", "div[class*='warning']",
          "table", ".table", "tbody tr"
        ];

        let foundCount = 0;
        const processedTexts = new Set<string>(); // Avoid duplicates

        // First, try to find any text containing flood keywords
        const allText = $("body").text();
        const floodMatches = allText.match(/flood[^.]{0,200}/gi);
        if (floodMatches) {
          console.log(`[PAGASA] Found ${floodMatches.length} text matches containing 'flood'`);
          floodMatches.slice(0, 10).forEach((match, idx) => {
            console.log(`[PAGASA] Flood match ${idx + 1}:`, match.substring(0, 150));
          });
        }

        // Look for flood-related content using multiple selectors
        for (const selector of selectors) {
          $(selector).each((_, element) => {
            const text = $(element).text().trim();
            const textLower = text.toLowerCase();
            
            // Check if this is flood-related and not already processed
            if ((textLower.includes("flood") || textLower.includes("inundation") || textLower.includes("water level")) 
                && text.length > 20 && !processedTexts.has(text.substring(0, 100))) {
              foundCount++;
              processedTexts.add(text.substring(0, 100));
              console.log(`[PAGASA] Found flood-related content (${foundCount}) from selector '${selector}':`, text.substring(0, 300));
              
              // Try to extract location information
              const locationMatch = text.match(/(manila|cebu|davao|iloilo|bataan|pampanga|laguna|rizal|bulacan|cagayan|pangasinan|bicol|agusan|mindanao|metro manila|ncr|central luzon|calabarzon|western visayas|central visayas|davao region|caraga|soccsksargen)/i);
              const severityMatch = text.match(/(low|moderate|high|extreme|severe|critical|warning|alert)/i);
              
              console.log(`[PAGASA] Location match:`, locationMatch?.[0]);
              console.log(`[PAGASA] Severity match:`, severityMatch?.[0]);
              
              if (locationMatch) {
                const locationName = locationMatch[0];
                const severity = severityMatch ? 
                  (severityMatch[0].toLowerCase().includes("extreme") || severityMatch[0].toLowerCase().includes("critical") ? "extreme" :
                   severityMatch[0].toLowerCase().includes("high") || severityMatch[0].toLowerCase().includes("severe") ? "high" :
                   severityMatch[0].toLowerCase().includes("moderate") ? "moderate" : "low") : "moderate";

                // Get coordinates for known locations
                const locationData = getLocationCoordinates(locationName);
                if (locationData) {
                  const waterLevelStatus: Flood["waterLevel"]["status"] = 
                    severity === "extreme" || severity === "high" ? "alarm" : 
                    severity === "moderate" ? "alert" : "monitoring";
                  
                  const floodStatus: Flood["status"] = 
                    severity === "extreme" || severity === "high" ? "active" : "monitoring";
                  
                  const flood: Flood = {
                    id: `pagasa-${locationName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${foundCount}`,
                    location: locationData,
                    severity: severity as Flood["severity"],
                    waterLevel: {
                      current: severity === "extreme" ? 3.0 : severity === "high" ? 2.0 : severity === "moderate" ? 1.2 : 0.6,
                      normal: 0.5,
                      status: waterLevelStatus,
                    },
                    affectedAreas: [locationName],
                    status: floodStatus,
                    reportedAt: Date.now() - 7200000, // 2 hours ago
                    updatedAt: Date.now() - 3600000, // 1 hour ago
                    source: "PAGASA",
                    description: text.substring(0, 500) || `Flood alert for ${locationName}. ${severity === "extreme" || severity === "high" ? "Take immediate precautions." : "Monitor situation."}`,
                  };
                  
                  console.log(`[PAGASA] Adding flood:`, flood);
                  floods.push(flood);
                } else {
                  console.log(`[PAGASA] No coordinates found for location: ${locationName}`);
                }
              }
            }
          });
        }

        console.log(`[PAGASA] Found ${foundCount} flood-related elements, created ${floods.length} flood records`);

        if (floods.length > 0) {
          console.log(`[PAGASA] Successfully found floods from ${url}, stopping search`);
          break; // If we found data, stop trying other URLs
        }
      } catch (urlError: any) {
        console.error(`[PAGASA] Error fetching from ${url}:`, {
          message: urlError.message,
          response: urlError.response?.data?.substring?.(0, 500),
          status: urlError.response?.status,
          statusText: urlError.response?.statusText,
        });
        continue;
      }
    }

    console.log(`[PAGASA] Total floods found: ${floods.length}`);
    return floods;
  } catch (error: any) {
    console.error("[PAGASA] Error fetching flood data:", {
      message: error.message,
      response: error.response?.data?.substring?.(0, 500),
      status: error.response?.status,
    });
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
 * This function aggregates data from multiple sources
 */
// Cached for 15 minutes
export async function getActiveFloods(): Promise<Flood[]> {
  const { unstable_cache } = await import("next/cache");
  
  return unstable_cache(
    async () => {
  try {
    console.log("========================================");
    console.log("[FLOOD] Starting getActiveFloods()");
    console.log("========================================");
    
    const allFloods: Flood[] = [];
    const floodMap = new Map<string, Flood>();

    // Try Open-Meteo API first (most reliable)
    console.log("[FLOOD] Attempting to fetch from Open-Meteo...");
    try {
      const openMeteoData = await fetchOpenMeteoFloodData();
      console.log(`[FLOOD] Open-Meteo returned ${openMeteoData.length} flood(s)`);
      openMeteoData.forEach(flood => {
        floodMap.set(flood.id, flood);
        console.log(`[FLOOD] Added Open-Meteo flood: ${flood.location.name} (${flood.severity})`);
      });
    } catch (error: any) {
      console.error("[FLOOD] Error fetching Open-Meteo data:", {
        message: error.message,
        stack: error.stack,
      });
    }

    // Try PAGASA
    console.log("[FLOOD] Attempting to fetch from PAGASA...");
    try {
      const pagasaData = await fetchPAGASAFloodData();
      console.log(`[FLOOD] PAGASA returned ${pagasaData.length} flood(s)`);
      pagasaData.forEach(flood => {
        // Merge with existing or add new
        const existing = Array.from(floodMap.values()).find(
          f => f.location.name === flood.location.name
        );
        if (existing) {
          console.log(`[FLOOD] Merging PAGASA data with existing flood for ${flood.location.name}`);
          // Update existing with PAGASA data if more severe
          if (getSeverityLevel(flood.severity) > getSeverityLevel(existing.severity)) {
            floodMap.set(existing.id, { ...existing, ...flood, source: "PAGASA + Open-Meteo" });
            console.log(`[FLOOD] Updated flood severity for ${flood.location.name}`);
          }
        } else {
          floodMap.set(flood.id, flood);
          console.log(`[FLOOD] Added PAGASA flood: ${flood.location.name} (${flood.severity})`);
        }
      });
    } catch (error: any) {
      console.error("[FLOOD] Error fetching PAGASA data:", {
        message: error.message,
        stack: error.stack,
      });
    }

    // Try alternative sources
    console.log("[FLOOD] Attempting to fetch from alternative sources...");
    try {
      const altData = await fetchAlternativeFloodData();
      console.log(`[FLOOD] Alternative sources returned ${altData.length} flood(s)`);
      altData.forEach(flood => {
        const existing = Array.from(floodMap.values()).find(
          f => f.location.name === flood.location.name
        );
        if (!existing) {
          floodMap.set(flood.id, flood);
          console.log(`[FLOOD] Added alternative source flood: ${flood.location.name}`);
        }
      });
    } catch (error: any) {
      console.error("[FLOOD] Error fetching alternative data:", {
        message: error.message,
        stack: error.stack,
      });
    }

    // Convert map to array
    allFloods.push(...Array.from(floodMap.values()));
    console.log(`[FLOOD] Total unique floods after merging: ${allFloods.length}`);

    // Sort by severity (extreme first)
    allFloods.sort((a, b) => getSeverityLevel(b.severity) - getSeverityLevel(a.severity));

    console.log("========================================");
    console.log(`[FLOOD] Final result: ${allFloods.length} flood(s) found`);
    if (allFloods.length > 0) {
      console.log("[FLOOD] Floods:", allFloods.map(f => `${f.location.name} (${f.severity})`).join(", "));
    } else {
      console.log("[FLOOD] No flood data found from any source");
    }
    console.log("========================================");

    return allFloods;
      } catch (error: any) {
        console.error("[FLOOD] Fatal error in getActiveFloods:", {
          message: error.message,
          stack: error.stack,
        });
        return [];
      }
    },
    ["floods"],
    {
      revalidate: 900, // 15 minutes
      tags: ["floods"],
    }
  )();
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


