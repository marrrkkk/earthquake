"use server";

import axios from "axios";
import * as cheerio from "cheerio";
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

// Fetch typhoon data from Windy API
async function fetchWindyTyphoonData(): Promise<Typhoon[]> {
  try {
    const windyApiKey = process.env.WINDY_API_KEY;
    
    if (!windyApiKey) {
      console.log("Windy API key not found. Please set WINDY_API_KEY in your environment variables.");
      return [];
    }

    const typhoons: Typhoon[] = [];

    // Try Windy's tropical cyclone/storms API endpoint
    // Windy provides tropical cyclone data through their API
    try {
      // Option 1: Try Windy's storms/tropical cyclone endpoint
      const stormsResponse = await axiosInstance.get(
        `https://api.windy.com/api/v1.0/storms`,
        {
          params: {
            key: windyApiKey,
            basin: 'wp', // Western Pacific
          },
          timeout: 15000,
        }
      );

      if (stormsResponse.data) {
        const storms = Array.isArray(stormsResponse.data) 
          ? stormsResponse.data 
          : [stormsResponse.data];

        for (const storm of storms) {
          // Parse Windy storm data - adjust field names based on actual API response
          const windSpeed = storm.windSpeed || storm.maxWind || storm.wind || 0;
          const coords = storm.position || storm.center || storm.location || storm.coords;
          
          if (coords && (coords.lat !== undefined || coords.latitude !== undefined) && 
              (coords.lon !== undefined || coords.longitude !== undefined)) {
            
            // Convert wind speed if needed (Windy might use m/s, we need km/h)
            let windSpeedKmh = windSpeed;
            if (windSpeed < 100) {
              // Likely in m/s, convert to km/h
              windSpeedKmh = windSpeed * 3.6;
            }

            typhoons.push({
              id: `windy-${storm.id || storm.name || Date.now()}`,
              name: storm.name || "Unnamed",
              internationalName: storm.internationalName || storm.international_name,
              category: getCategoryFromWindSpeed(windSpeedKmh),
              currentPosition: {
                latitude: coords.lat || coords.latitude,
                longitude: coords.lon || coords.longitude,
              },
              windSpeed: windSpeedKmh,
              gustSpeed: storm.gustSpeed ? (storm.gustSpeed < 100 ? storm.gustSpeed * 3.6 : storm.gustSpeed) : undefined,
              pressure: storm.pressure,
              movement: {
                direction: storm.direction || storm.movement?.direction || storm.heading || "N",
                speed: storm.speed ? (storm.speed < 50 ? storm.speed * 3.6 : storm.speed) : (storm.movement?.speed || 0) * 3.6,
              },
              track: storm.track || storm.history || [],
              forecast: storm.forecast || storm.projected || [],
              lastUpdate: storm.lastUpdate || storm.timestamp || storm.updated || Date.now(),
              source: "Windy",
              advisoryNumber: storm.advisoryNumber || storm.advisory_number,
              status: (storm.status || "active") as Typhoon["status"],
            });
          }
        }
      }
    } catch (stormsError: any) {
      console.log("Windy storms API error, trying alternative endpoint:", stormsError.message);
      
      // Option 2: Try alternative endpoint or parse from different response format
      try {
        // Try a different endpoint or method
        const altResponse = await axiosInstance.get(
          `https://api.windy.com/api/v1.0/tropical-cyclones`,
          {
            params: {
              key: windyApiKey,
              region: 'western-pacific',
            },
            timeout: 15000,
          }
        );
        
        // Parse alternative response format
        if (altResponse.data) {
          console.log("Windy alternative API response received");
          // Parse similar to above
        }
      } catch (altError: any) {
        console.log("Windy alternative API also failed:", altError.message);
      }
    }

    return typhoons;
  } catch (error) {
    console.error("Error fetching Windy typhoon data:", error);
    return [];
  }
}

// Helper function to parse coordinates from text
function parseCoordinates(text: string): { latitude: number; longitude: number } | null {
  // Try to find coordinates in various formats
  // Format: "12.5°N, 123.4°E" or "12.5N, 123.4E" or "12.5° N, 123.4° E"
  const coordPattern = /(\d+\.?\d*)\s*°?\s*([NS])\s*[,/]\s*(\d+\.?\d*)\s*°?\s*([EW])/i;
  const match = text.match(coordPattern);
  
  if (match) {
    let lat = parseFloat(match[1]);
    let lon = parseFloat(match[3]);
    
    if (match[2].toUpperCase() === 'S') lat = -lat;
    if (match[4].toUpperCase() === 'W') lon = -lon;
    
    return { latitude: lat, longitude: lon };
  }
  
  // Try decimal format: "12.5, 123.4"
  const decimalPattern = /(-?\d+\.?\d*)\s*[,/]\s*(-?\d+\.?\d*)/;
  const decimalMatch = text.match(decimalPattern);
  if (decimalMatch) {
    return {
      latitude: parseFloat(decimalMatch[1]),
      longitude: parseFloat(decimalMatch[2])
    };
  }
  
  return null;
}

// Helper function to parse wind speed from text
function parseWindSpeed(text: string): number {
  // Look for patterns like "65 km/h", "65 kph", "65 kmh"
  const patterns = [
    /(\d+)\s*(?:km\/h|kph|kmh)/i,
    /(\d+)\s*(?:knots?|kt)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let speed = parseFloat(match[1]);
      // Convert knots to km/h if needed
      if (text.toLowerCase().includes('knot') || text.toLowerCase().includes('kt')) {
        speed = speed * 1.852; // 1 knot = 1.852 km/h
      }
      return speed;
    }
  }
  
  return 0;
}

// Helper function to parse movement direction and speed
function parseMovement(text: string): { direction: string; speed: number } {
  // Look for patterns like "NW at 15 km/h", "Northwest at 15 kph"
  const directionPattern = /(?:moving|heading|toward|towards)?\s*(?:in\s*a\s*)?(?:direction\s*of\s*)?([NSEW]{1,2}|North|South|East|West|Northeast|Northwest|Southeast|Southwest|NE|NW|SE|SW)/i;
  const speedPattern = /(?:at|with|speed\s*of)\s*(\d+)\s*(?:km\/h|kph|kmh|knots?|kt)/i;
  
  const dirMatch = text.match(directionPattern);
  const speedMatch = text.match(speedPattern);
  
  let direction = "N";
  if (dirMatch) {
    const dir = dirMatch[1].toUpperCase();
    const dirMap: Record<string, string> = {
      'NORTH': 'N', 'SOUTH': 'S', 'EAST': 'E', 'WEST': 'W',
      'NORTHEAST': 'NE', 'NORTHWEST': 'NW', 'SOUTHEAST': 'SE', 'SOUTHWEST': 'SW',
      'NE': 'NE', 'NW': 'NW', 'SE': 'SE', 'SW': 'SW'
    };
    direction = dirMap[dir] || dir;
  }
  
  let speed = 0;
  if (speedMatch) {
    speed = parseFloat(speedMatch[1]);
    if (text.toLowerCase().includes('knot') || text.toLowerCase().includes('kt')) {
      speed = speed * 1.852;
    }
  }
  
  return { direction, speed };
}

// Helper function to determine category from wind speed
function getCategoryFromWindSpeed(windSpeed: number): Typhoon["category"] {
  // Wind speeds in km/h
  if (windSpeed >= 252) return "SuperTY";
  if (windSpeed >= 185) return "STY";
  if (windSpeed >= 118) return "TY";
  if (windSpeed >= 89) return "STS";
  if (windSpeed >= 62) return "TS";
  return "TD";
}

// Fetch typhoon data from PAGASA (Philippine weather service)
async function fetchPAGASATyphoonData(): Promise<Typhoon[]> {
  try {
    // Try multiple PAGASA pages
    const urls = [
      "https://www.pagasa.dost.gov.ph/weather/tropical-cyclone-information",
      "https://www.pagasa.dost.gov.ph/weather/tropical-cyclone-bulletin",
      "https://www.pagasa.dost.gov.ph/weather",
    ];

    for (const url of urls) {
      try {
        const response = await axiosInstance.get(url, {
          timeout: 15000,
        });

        const $ = cheerio.load(response.data);
        const typhoons: Typhoon[] = [];

        // Look for typhoon information in various page structures
        // Try to find advisory sections, typhoon cards, or data tables
        
        // Method 1: Look for typhoon advisory sections
        $('div[class*="typhoon"], div[class*="cyclone"], div[class*="advisory"], section[class*="typhoon"], article[class*="typhoon"], .typhoon-info, .cyclone-info').each((_, element) => {
          const $el = $(element);
          const text = $el.text();
          
          // Look for typhoon name - try multiple patterns
          const namePatterns = [
            /(?:Tropical\s+)?(?:Cyclone|Depression|Storm|Typhoon)\s+([A-Z][A-Za-z]+)/i,
            /([A-Z][A-Za-z]+)\s+(?:Tropical\s+)?(?:Cyclone|Depression|Storm|Typhoon)/i,
            /Typhoon\s+([A-Z][A-Za-z]+)/i,
            /TC\s+([A-Z][A-Za-z]+)/i,
          ];
          
          let nameMatch = null;
          for (const pattern of namePatterns) {
            nameMatch = text.match(pattern);
            if (nameMatch) break;
          }
          
          if (!nameMatch) return;
          
          const name = nameMatch[1];
          const coords = parseCoordinates(text);
          if (!coords) {
            // Try to find coordinates in nearby elements
            const nearbyText = $el.parent().text() + ' ' + $el.siblings().text();
            const nearbyCoords = parseCoordinates(nearbyText);
            if (!nearbyCoords) return;
            // Use nearby coords
            const windSpeed = parseWindSpeed(text + ' ' + nearbyText);
            const movement = parseMovement(text + ' ' + nearbyText);
            const category = getCategoryFromWindSpeed(windSpeed);
            
            const advisoryMatch = (text + ' ' + nearbyText).match(/(?:Advisory|Bulletin)\s*#?\s*(\d+)/i);
            const advisoryNumber = advisoryMatch ? advisoryMatch[1] : undefined;
            
            typhoons.push({
              id: `pagasa-${name.toLowerCase()}-${Date.now()}`,
              name: name,
              category,
              currentPosition: nearbyCoords,
              windSpeed,
              movement,
              track: [],
              lastUpdate: Date.now(),
              source: "PAGASA",
              advisoryNumber,
              status: "active",
            });
            return;
          }
          
          const windSpeed = parseWindSpeed(text);
          const movement = parseMovement(text);
          const category = getCategoryFromWindSpeed(windSpeed);
          
          // Try to find advisory number
          const advisoryMatch = text.match(/(?:Advisory|Bulletin)\s*#?\s*(\d+)/i);
          const advisoryNumber = advisoryMatch ? advisoryMatch[1] : undefined;
          
          typhoons.push({
            id: `pagasa-${name.toLowerCase()}-${Date.now()}`,
            name: name,
            category,
            currentPosition: coords,
            windSpeed,
            movement,
            track: [],
            lastUpdate: Date.now(),
            source: "PAGASA",
            advisoryNumber,
            status: "active",
          });
        });

        // Method 2: Look for data tables with typhoon information
        $('table').each((_, table) => {
          const $table = $(table);
          const rows = $table.find('tr');
          
          let typhoonData: Partial<Typhoon> = {};
          
          rows.each((_, row) => {
            const $row = $(row);
            const cells = $row.find('td, th');
            const label = cells.first().text().toLowerCase();
            const value = cells.last().text();
            
            if (label.includes('name') || label.includes('typhoon')) {
              typhoonData.name = value.trim();
            } else if (label.includes('position') || label.includes('location') || label.includes('coordinates')) {
              const coords = parseCoordinates(value);
              if (coords) {
                typhoonData.currentPosition = coords;
              }
            } else if (label.includes('wind') && label.includes('speed')) {
              typhoonData.windSpeed = parseWindSpeed(value);
            } else if (label.includes('movement') || label.includes('direction')) {
              typhoonData.movement = parseMovement(value);
            } else if (label.includes('advisory') || label.includes('bulletin')) {
              const match = value.match(/(\d+)/);
              if (match) typhoonData.advisoryNumber = match[1];
            }
          });
          
          if (typhoonData.name && typhoonData.currentPosition) {
            const windSpeed = typhoonData.windSpeed || 0;
            typhoons.push({
              id: `pagasa-${typhoonData.name.toLowerCase()}-${Date.now()}`,
              name: typhoonData.name,
              category: getCategoryFromWindSpeed(windSpeed),
              currentPosition: typhoonData.currentPosition,
              windSpeed,
              movement: typhoonData.movement || { direction: "N", speed: 0 },
              track: [],
              lastUpdate: Date.now(),
              source: "PAGASA",
              advisoryNumber: typhoonData.advisoryNumber,
              status: "active",
            });
          }
        });

        // Method 3: Look for JSON-LD structured data
        $('script[type="application/ld+json"]').each((_, script) => {
          try {
            const json = JSON.parse($(script).html() || '{}');
            // Parse structured data if available
          } catch (e) {
            // Ignore JSON parse errors
          }
        });

        // Method 4: Comprehensive text search as fallback
        // If no typhoons found yet, search the entire page text
        if (typhoons.length === 0) {
          const pageText = $.text();
          
          // Look for patterns that indicate active typhoon information
          const typhoonIndicators = [
            /(?:Tropical\s+)?(?:Cyclone|Depression|Storm|Typhoon)\s+([A-Z][A-Za-z]+)/gi,
            /([A-Z][A-Za-z]+)\s+(?:Tropical\s+)?(?:Cyclone|Depression|Storm|Typhoon)/gi,
          ];
          
          for (const pattern of typhoonIndicators) {
            const matches = [...pageText.matchAll(pattern)];
            for (const match of matches) {
              const name = match[1];
              const contextStart = Math.max(0, match.index! - 500);
              const contextEnd = Math.min(pageText.length, match.index! + match[0].length + 500);
              const context = pageText.substring(contextStart, contextEnd);
              
              const coords = parseCoordinates(context);
              if (!coords) continue;
              
              const windSpeed = parseWindSpeed(context);
              const movement = parseMovement(context);
              const category = getCategoryFromWindSpeed(windSpeed);
              
              // Check if we already have this typhoon
              const exists = typhoons.some(t => t.name === name);
              if (exists) continue;
              
              const advisoryMatch = context.match(/(?:Advisory|Bulletin)\s*#?\s*(\d+)/i);
              const advisoryNumber = advisoryMatch ? advisoryMatch[1] : undefined;
              
              typhoons.push({
                id: `pagasa-${name.toLowerCase()}-${Date.now()}`,
                name: name,
                category,
                currentPosition: coords,
                windSpeed,
                movement,
                track: [],
                lastUpdate: Date.now(),
                source: "PAGASA",
                advisoryNumber,
                status: "active",
              });
            }
          }
        }

        if (typhoons.length > 0) {
          return typhoons;
        }
      } catch (urlError) {
        console.log(`Error fetching from ${url}:`, urlError);
        continue;
      }
    }

    return [];
  } catch (error) {
    console.error("Error fetching PAGASA typhoon data:", error);
    return [];
  }
}

// Fetch from NOAA Tropical Cyclone Data Portal
async function fetchNOAATyphoonData(): Promise<Typhoon[]> {
  try {
    // NOAA provides tropical cyclone data in various formats
    // Try their active storms endpoint
    const response = await axiosInstance.get(
      "https://www.nhc.noaa.gov/gtwo.php?basin=wp&fdays=5",
      {
        timeout: 10000,
      }
    );

    const $ = cheerio.load(response.data);
    const typhoons: Typhoon[] = [];

    // Parse NOAA's tropical cyclone information
    // This is a simplified parser - adjust based on actual NOAA page structure
    $('div[class*="storm"], div[class*="cyclone"], table[class*="storm"]').each((_, element) => {
      const $el = $(element);
      const text = $el.text();
      
      // Look for storm name and details
      const nameMatch = text.match(/(?:Tropical\s+)?(?:Cyclone|Depression|Storm|Typhoon)\s+([A-Z][A-Za-z]+)/i);
      if (!nameMatch) return;
      
      const name = nameMatch[1];
      const coords = parseCoordinates(text);
      if (!coords) return;
      
      const windSpeed = parseWindSpeed(text);
      const movement = parseMovement(text);
      const category = getCategoryFromWindSpeed(windSpeed);
      
      typhoons.push({
        id: `noaa-${name.toLowerCase()}-${Date.now()}`,
        name: name,
        category,
        currentPosition: coords,
        windSpeed,
        movement,
        track: [],
        lastUpdate: Date.now(),
        source: "NOAA",
        status: "active",
      });
    });

    return typhoons;
  } catch (error) {
    console.log("NOAA API unavailable:", error);
    return [];
  }
}

// Fetch from a public typhoon tracking API
async function fetchTyphoonDataFromAPI(): Promise<Typhoon[]> {
  try {
    // Try multiple public typhoon tracking services
    
    // Option 1: Try WeatherAPI.com (requires API key, but has free tier)
    // You can add your API key to environment variables if needed
    const weatherApiKey = process.env.WEATHER_API_KEY;
    if (weatherApiKey) {
      try {
        const response = await axiosInstance.get(
          `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=Manila&days=1&alerts=yes`,
          { timeout: 10000 }
        );
        
        // WeatherAPI provides alerts for tropical cyclones
        if (response.data?.alerts?.alert) {
          const alerts = Array.isArray(response.data.alerts.alert) 
            ? response.data.alerts.alert 
            : [response.data.alerts.alert];
          
          const typhoonAlerts = alerts.filter((alert: any) => 
            alert.event?.toLowerCase().includes('typhoon') ||
            alert.event?.toLowerCase().includes('tropical') ||
            alert.event?.toLowerCase().includes('cyclone')
          );
          
          if (typhoonAlerts.length > 0) {
            return typhoonAlerts.map((alert: any, index: number) => {
              // Try to extract coordinates from alert description
              const coords = parseCoordinates(alert.desc || '');
              const windSpeed = parseWindSpeed(alert.desc || '');
              
              return {
                id: `weatherapi-${index}-${Date.now()}`,
                name: alert.headline || alert.event || "Tropical Cyclone",
                category: getCategoryFromWindSpeed(windSpeed),
                currentPosition: coords || { latitude: 14.5995, longitude: 120.9842 }, // Default to Manila
                windSpeed,
                movement: parseMovement(alert.desc || ''),
                track: [],
                lastUpdate: Date.now(),
                source: "WeatherAPI",
                status: "active" as const,
              };
            });
          }
        }
      } catch (apiError) {
        console.log("WeatherAPI unavailable:", apiError);
      }
    }

    // Option 2: Try Tropical Cyclone Data Portal (if available)
    try {
      const response = await axiosInstance.get(
        "https://www.nhc.noaa.gov/gtwo.php?basin=wp&fdays=5",
        { timeout: 10000 }
      );
      
      // This would need parsing similar to NOAA function
      // For now, return empty and let NOAA function handle it
    } catch (error) {
      // Ignore
    }

    return [];
  } catch (error) {
    console.error("Error fetching typhoon data from API:", error);
    return [];
  }
}

// Main function to get typhoon data
// This will try Windy API first, then fallback to other sources
export async function getTyphoons(): Promise<Typhoon[]> {
  try {
    // Try Windy API first (primary source)
    const windyData = await fetchWindyTyphoonData();
    if (windyData.length > 0) {
      console.log(`Found ${windyData.length} typhoon(s) from Windy API`);
      return windyData;
    }

    // Fallback to PAGASA (most relevant for Philippines)
    const pagasaData = await fetchPAGASATyphoonData();
    if (pagasaData.length > 0) {
      console.log(`Found ${pagasaData.length} typhoon(s) from PAGASA`);
      return pagasaData;
    }

    // Fallback to NOAA
    const noaaData = await fetchNOAATyphoonData();
    if (noaaData.length > 0) {
      console.log(`Found ${noaaData.length} typhoon(s) from NOAA`);
      return noaaData;
    }

    // Fallback to API (WeatherAPI, etc.)
    const apiData = await fetchTyphoonDataFromAPI();
    if (apiData.length > 0) {
      console.log(`Found ${apiData.length} typhoon(s) from API`);
      return apiData;
    }

    // If no real data available, return empty array
    console.log("No typhoon data found from any source");
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

