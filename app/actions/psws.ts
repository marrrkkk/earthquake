"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";

export interface PSWSData {
  signalNumber: number; // 1, 2, 3, 4, or 5
  areas: string[]; // List of provinces/areas under this signal
  typhoonName?: string;
  lastUpdate: number;
}

// Create an axios instance that ignores SSL certificate errors
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  },
});

/**
 * Fetch real PSWS (Public Storm Warning Signal) data from PAGASA
 */
// Cached for 15 minutes
export async function getPSWSData(): Promise<PSWSData[]> {
  const { unstable_cache } = await import("next/cache");
  
  return unstable_cache(
    async () => {
      try {
        console.log("[PSWS] Fetching PSWS data from PAGASA...");
    
    const urls = [
      "https://www.pagasa.dost.gov.ph/weather/tropical-cyclone-information",
      "https://www.pagasa.dost.gov.ph/weather/tropical-cyclone-bulletin",
      "https://www.pagasa.dost.gov.ph/weather",
      "https://www.pagasa.dost.gov.ph/weather/psws",
      "https://www.pagasa.dost.gov.ph/weather/public-storm-warning-signal",
      "https://www.pagasa.dost.gov.ph/weather/tropical-cyclone-bulletin-archive",
      "https://www.pagasa.dost.gov.ph/weather/tropical-cyclone-advisory",
      // Try alternative URL patterns
      "https://www.pagasa.dost.gov.ph/weather/tropical-cyclone",
      "https://www.pagasa.dost.gov.ph/weather/forecast",
      "https://www.pagasa.dost.gov.ph/weather/advisory",
      "https://www.pagasa.dost.gov.ph/weather/bulletin",
      // Try with different path structures
      "https://www.pagasa.dost.gov.ph/index.php/weather/tropical-cyclone-information",
      "https://www.pagasa.dost.gov.ph/index.php/weather/tropical-cyclone-bulletin",
    ];

    const pswsData: PSWSData[] = [];

    for (const url of urls) {
      try {
        console.log(`[PSWS] Trying URL: ${url}`);
        const response = await axiosInstance.get(url, {
          timeout: 15000,
          validateStatus: (status) => status < 500,
        });

        console.log(`[PSWS] Response status: ${response.status}`);
        
        if (response.status === 404) {
          console.log(`[PSWS] 404 for ${url}, skipping`);
          continue;
        }
        
        if (response.status !== 200) {
          console.log(`[PSWS] Non-200 status ${response.status} for ${url}, skipping`);
          continue;
        }

        const $ = cheerio.load(response.data);
        const pageText = $("body").text();
        
        console.log(`[PSWS] Page text length: ${pageText.length} characters`);
        console.log(`[PSWS] Page contains 'signal': ${pageText.toLowerCase().includes('signal')}`);
        console.log(`[PSWS] Page contains 'psws': ${pageText.toLowerCase().includes('psws')}`);
        console.log(`[PSWS] Page contains 'storm warning': ${pageText.toLowerCase().includes('storm warning')}`);
        
        // Look for any mentions of numbers 1-5 that might be signals
        const numberPattern = /\b([1-5])\b/g;
        const numberMatches = [...pageText.matchAll(numberPattern)];
        console.log(`[PSWS] Found ${numberMatches.length} occurrences of numbers 1-5 in page`);
        
        // Look for context around "storm warning" to see if signals are mentioned nearby
        const stormWarningMatches = [...pageText.matchAll(/storm warning[^.]{0,200}/gi)];
        if (stormWarningMatches.length > 0) {
          console.log(`[PSWS] Found ${stormWarningMatches.length} 'storm warning' mentions:`, stormWarningMatches.slice(0, 3).map(m => m[0].substring(0, 150)));
        }

        // Look for PSWS patterns in the page
        // Pattern 1: "Signal #1", "Signal 1", "PSWS #1", "PSWS 1"
        const signalPatterns = [
          /(?:PSWS|Public\s+Storm\s+Warning\s+Signal|Signal)\s*#?\s*([1-5])/gi,
          /Signal\s+([1-5])\s+(?:is\s+)?(?:raised|hoisted|in effect|for)/gi,
        ];
        
        // Log all signal number occurrences
        const allSignalMatches = pageText.match(/(?:PSWS|Signal|Public\s+Storm\s+Warning\s+Signal)\s*#?\s*([1-5])/gi);
        if (allSignalMatches) {
          console.log(`[PSWS] Found ${allSignalMatches.length} signal number mentions:`, allSignalMatches.slice(0, 10));
        }
        
        // Also check HTML structure for signal-related elements
        const signalElements = $('*:contains("Signal"), *:contains("PSWS"), *:contains("signal")');
        console.log(`[PSWS] Found ${signalElements.length} elements containing 'signal' or 'PSWS'`);
        
        // Check for any divs/sections that might contain PSWS info
        const possiblePSWSElements = $('div, section, article').filter((_, el) => {
          const text = $(el).text().toLowerCase();
          return text.includes('storm') && (text.includes('warning') || text.includes('signal') || text.includes('1') || text.includes('2') || text.includes('3') || text.includes('4') || text.includes('5'));
        });
        console.log(`[PSWS] Found ${possiblePSWSElements.length} elements that might contain PSWS info`);
        
        // Log first few possible PSWS elements
        possiblePSWSElements.slice(0, 3).each((idx, el) => {
          const text = $(el).text().substring(0, 300);
          console.log(`[PSWS] Possible PSWS element ${idx + 1}:`, text);
        });

        // Pattern 2: Look for areas/provinces listed under each signal
        const areaPatterns = [
          /(?:Signal|PSWS)\s*#?\s*([1-5])[:\s]+(.*?)(?=(?:Signal|PSWS)\s*#?\s*[1-5]|$)/gis,
          /(?:Signal|PSWS)\s*#?\s*([1-5])\s*[:\-]\s*(.*?)(?=(?:Signal|PSWS)\s*#?\s*[1-5]|$)/gis,
        ];

        // Try to extract PSWS information
        console.log(`[PSWS] Trying area patterns...`);
        for (const pattern of areaPatterns) {
          const matches = [...pageText.matchAll(pattern)];
          console.log(`[PSWS] Pattern found ${matches.length} matches`);
          
          for (const match of matches) {
            const signalNumber = parseInt(match[1], 10);
            const areasText = match[2] || "";
            
            console.log(`[PSWS] Processing Signal ${signalNumber}, areas text length: ${areasText.length}`);

            // Extract area names from the text
            const areas: string[] = [];
            
            // Common Philippine provinces and cities
            const philippineLocations = [
              "Metro Manila", "Manila", "Quezon City", "Makati", "Pasig", "Taguig", "Caloocan", "Las Piñas", "Malabon", "Mandaluyong", "Marikina", "Muntinlupa", "Navotas", "Parañaque", "San Juan", "Valenzuela",
              "Pampanga", "Bulacan", "Bataan", "Zambales", "Tarlac", "Nueva Ecija", "Aurora",
              "Laguna", "Rizal", "Batangas", "Cavite", "Quezon",
              "Cebu", "Bohol", "Negros Oriental", "Siquijor",
              "Iloilo", "Negros Occidental", "Capiz", "Aklan", "Antique", "Guimaras",
              "Davao del Sur", "Davao del Norte", "Davao Oriental", "Davao de Oro", "Davao Occidental",
              "Camarines Sur", "Albay", "Sorsogon", "Camarines Norte", "Catanduanes", "Masbate",
              "Ilocos Sur", "Ilocos Norte", "La Union", "Pangasinan",
              "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino", "Batanes",
              "Agusan del Norte", "Agusan del Sur", "Surigao del Norte", "Surigao del Sur", "Dinagat Islands",
              "South Cotabato", "North Cotabato", "Sultan Kudarat", "Sarangani",
              "Leyte", "Samar", "Eastern Samar", "Northern Samar", "Biliran",
              "Palawan", "Romblon", "Marinduque", "Occidental Mindoro", "Oriental Mindoro",
            ];

            // Check which locations are mentioned in the areas text
            for (const location of philippineLocations) {
              if (areasText.toLowerCase().includes(location.toLowerCase())) {
                if (!areas.includes(location)) {
                  areas.push(location);
                }
              }
            }

            // If no specific areas found, try to extract from common patterns
            if (areas.length === 0) {
              // Look for comma-separated or "and" separated lists
              const areaMatches = areasText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
              if (areaMatches) {
                areas.push(...areaMatches.slice(0, 20)); // Limit to 20 areas
              }
            }

            if (signalNumber >= 1 && signalNumber <= 5 && areas.length > 0) {
              // Check if we already have this signal number
              const existing = pswsData.find(p => p.signalNumber === signalNumber);
              if (existing) {
                // Merge areas
                for (const area of areas) {
                  if (!existing.areas.includes(area)) {
                    existing.areas.push(area);
                  }
                }
              } else {
                pswsData.push({
                  signalNumber,
                  areas,
                  lastUpdate: Date.now(),
                });
              }
            }
          }
        }

        // Try to extract PSWS from weather conditions table
        // PAGASA shows weather conditions that can be mapped to signal numbers
        console.log(`[PSWS] Checking weather conditions table for PSWS mapping...`);
        $("table, .table").each((idx, table) => {
          const rows = $(table).find("tr");
          
          rows.each((rowIdx, row) => {
            const cells = $(row).find("td, th");
            if (cells.length >= 3) {
              const placeCell = $(cells[0]).text().trim();
              const weatherCell = $(cells[1]).text().trim();
              const causedByCell = $(cells[2]).text().trim();
              
              // Check if this is a weather conditions table (has "Place", "Weather Condition", "Caused By")
              if (placeCell && weatherCell && causedByCell && 
                  (weatherCell.toLowerCase().includes('stormy') || 
                   weatherCell.toLowerCase().includes('rains with gusty winds') ||
                   weatherCell.toLowerCase().includes('signal'))) {
                
                console.log(`[PSWS] Found weather condition row: Place: ${placeCell.substring(0, 100)}, Weather: ${weatherCell}, Caused By: ${causedByCell}`);
                
                // Map weather conditions to signal numbers
                // "Stormy" typically indicates Signal 2-3
                // "Rains with gusty winds" typically indicates Signal 1-2
                let signalNumber = 0;
                if (weatherCell.toLowerCase().includes('stormy')) {
                  signalNumber = 3; // Stormy usually means Signal 2-3, default to 3
                } else if (weatherCell.toLowerCase().includes('rains with gusty winds')) {
                  signalNumber = 2; // Gusty winds usually means Signal 1-2, default to 2
                } else if (weatherCell.toLowerCase().includes('signal')) {
                  // Try to extract signal number from weather cell
                  const signalMatch = weatherCell.match(/(?:Signal|PSWS)\s*#?\s*([1-5])/i);
                  if (signalMatch) {
                    signalNumber = parseInt(signalMatch[1], 10);
                  }
                }
                
                if (signalNumber > 0) {
                  // Parse areas from place cell
                  const areasText = placeCell;
                  const areas: string[] = [];
                  
                  // Split by common delimiters
                  const areaParts = areasText.split(/[,;]|\sand\s/i).map(part => part.trim()).filter(part => part.length > 0);
                  
                  // Add known Philippine locations
                  const philippineLocations = [
                    "Metro Manila", "Manila", "Quezon City", "Makati", "Pasig", "Taguig", "Caloocan", "Las Piñas", "Malabon", "Mandaluyong", "Marikina", "Muntinlupa", "Navotas", "Parañaque", "San Juan", "Valenzuela",
                    "Pampanga", "Bulacan", "Bataan", "Zambales", "Tarlac", "Nueva Ecija", "Aurora",
                    "Laguna", "Rizal", "Batangas", "Cavite", "Quezon",
                    "Cebu", "Bohol", "Negros Oriental", "Siquijor",
                    "Iloilo", "Negros Occidental", "Capiz", "Aklan", "Antique", "Guimaras",
                    "Davao del Sur", "Davao del Norte", "Davao Oriental", "Davao de Oro", "Davao Occidental",
                    "Camarines Sur", "Albay", "Sorsogon", "Camarines Norte", "Catanduanes", "Masbate",
                    "Ilocos Sur", "Ilocos Norte", "La Union", "Pangasinan",
                    "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino", "Batanes",
                    "Agusan del Norte", "Agusan del Sur", "Surigao del Norte", "Surigao del Sur", "Dinagat Islands",
                    "South Cotabato", "North Cotabato", "Sultan Kudarat", "Sarangani",
                    "Leyte", "Samar", "Eastern Samar", "Northern Samar", "Biliran",
                    "Palawan", "Romblon", "Marinduque", "Occidental Mindoro", "Oriental Mindoro",
                    "Bicol Region", "Cordillera Administrative Region", "Central Luzon", "Central Visayas", "Eastern Visayas",
                    "CALABARZON", "NCR", "Metro Manila",
                    "Quezon", "Lucena", "2nd District",
                  ];
                  
                  // Check each area part against known locations
                  for (const part of areaParts) {
                    for (const location of philippineLocations) {
                      if (part.toLowerCase().includes(location.toLowerCase()) || location.toLowerCase().includes(part.toLowerCase())) {
                        if (!areas.includes(location)) {
                          areas.push(location);
                        }
                      }
                    }
                    // Also add the part itself if it looks like a location name
                    if (part.length > 3 && /^[A-Z]/.test(part) && !areas.includes(part)) {
                      areas.push(part);
                    }
                  }
                  
                  if (areas.length > 0) {
                    console.log(`[PSWS] Mapped weather condition to Signal ${signalNumber} for areas:`, areas);
                    const existing = pswsData.find(p => p.signalNumber === signalNumber);
                    if (existing) {
                      for (const area of areas) {
                        if (!existing.areas.includes(area)) {
                          existing.areas.push(area);
                        }
                      }
                    } else {
                      pswsData.push({
                        signalNumber,
                        areas,
                        lastUpdate: Date.now(),
                      });
                    }
                  }
                }
              }
            }
            
            // Also check for explicit signal numbers in tables
            if (cells.length >= 2) {
              const firstCell = $(cells[0]).text().trim();
              const secondCell = $(cells[1]).text().trim();
              
              // Log all cells for debugging
              if (firstCell.toLowerCase().includes('signal') || firstCell.toLowerCase().includes('psws') || 
                  firstCell.match(/\b[1-5]\b/) || secondCell.toLowerCase().includes('signal')) {
                console.log(`[PSWS] Potential signal row in table ${idx + 1}:`, {
                  firstCell: firstCell.substring(0, 100),
                  secondCell: secondCell.substring(0, 100),
                  allCells: cells.map((_, cell) => $(cell).text().trim()).get(),
                });
              }

              // Check if first cell contains signal number
              const signalMatch = firstCell.match(/(?:Signal|PSWS)\s*#?\s*([1-5])/i);
              if (signalMatch) {
                console.log(`[PSWS] Found signal in table row: Signal ${signalMatch[1]}, Areas: ${secondCell.substring(0, 100)}`);
                const signalNumber = parseInt(signalMatch[1], 10);
                const areasText = secondCell;

                const areas: string[] = [];
                const philippineLocations = [
                  "Metro Manila", "Manila", "Quezon City", "Makati", "Pasig", "Taguig",
                  "Pampanga", "Bulacan", "Bataan", "Zambales", "Tarlac", "Nueva Ecija", "Aurora",
                  "Laguna", "Rizal", "Batangas", "Cavite", "Quezon",
                  "Cebu", "Bohol", "Negros Oriental", "Siquijor",
                  "Iloilo", "Negros Occidental", "Capiz", "Aklan", "Antique", "Guimaras",
                  "Davao del Sur", "Davao del Norte", "Davao Oriental", "Davao de Oro", "Davao Occidental",
                  "Camarines Sur", "Albay", "Sorsogon", "Camarines Norte", "Catanduanes", "Masbate",
                  "Ilocos Sur", "Ilocos Norte", "La Union", "Pangasinan",
                  "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino", "Batanes",
                  "Agusan del Norte", "Agusan del Sur", "Surigao del Norte", "Surigao del Sur", "Dinagat Islands",
                  "South Cotabato", "North Cotabato", "Sultan Kudarat", "Sarangani",
                  "Leyte", "Samar", "Eastern Samar", "Northern Samar", "Biliran",
                  "Palawan", "Romblon", "Marinduque", "Occidental Mindoro", "Oriental Mindoro",
                ];

                for (const location of philippineLocations) {
                  if (areasText.toLowerCase().includes(location.toLowerCase())) {
                    if (!areas.includes(location)) {
                      areas.push(location);
                    }
                  }
                }

                if (signalNumber >= 1 && signalNumber <= 5 && areas.length > 0) {
                  const existing = pswsData.find(p => p.signalNumber === signalNumber);
                  if (existing) {
                    for (const area of areas) {
                      if (!existing.areas.includes(area)) {
                        existing.areas.push(area);
                      }
                    }
                  } else {
                    pswsData.push({
                      signalNumber,
                      areas,
                      lastUpdate: Date.now(),
                    });
                  }
                }
              }
            }
          });
        });

        if (pswsData.length > 0) {
          console.log(`[PSWS] Found PSWS data from ${url}:`, JSON.stringify(pswsData, null, 2));
          return pswsData;
        }
      } catch (urlError: any) {
        if (urlError.response?.status !== 404) {
          console.error(`[PSWS] Error fetching from ${url}:`, {
            status: urlError.response?.status,
            message: urlError.message,
          });
        }
        continue;
      }
    }

    console.log("[PSWS] No PSWS data found from PAGASA");
    return [];
      } catch (error: any) {
        console.error("[PSWS] Error fetching PSWS data:", error);
        return [];
      }
    },
    ["psws"],
    {
      revalidate: 900, // 15 minutes
      tags: ["psws"],
    }
  )();
}

/**
 * Get PSWS signal number for a specific location
 * @param locationName - City or province name
 * @param province - Province name
 * @param region - Region name
 * @returns Signal number (0-5), 0 means no signal
 */
export async function getPSWSForLocation(
  locationName: string,
  province: string,
  region: string
): Promise<number> {
  try {
    console.log("[PSWS] Getting PSWS for location:", {
      locationName,
      province,
      region,
    });

    const pswsData = await getPSWSData();
    
    console.log("[PSWS] Fetched PSWS data:", JSON.stringify(pswsData, null, 2));
    
    if (pswsData.length === 0) {
      console.log("[PSWS] No PSWS data available, returning 0");
      return 0;
    }

    // Normalize location names for better matching
    const normalizeLocation = (name: string): string => {
      if (!name) return "";
      return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/city$/i, "")
        .replace(/municipality$/i, "")
        .replace(/province$/i, "")
        .replace(/metro\s+/i, "")
        .replace(/^the\s+/i, "")
        .trim();
    };

    // Create alternative location name variations
    const getLocationVariations = (name: string, province: string, region: string): string[] => {
      const variations = new Set<string>();
      const normalized = normalizeLocation(name);
      const normalizedProvince = normalizeLocation(province);
      const normalizedRegion = normalizeLocation(region);
      
      if (normalized) variations.add(normalized);
      if (normalizedProvince) variations.add(normalizedProvince);
      if (normalizedRegion) variations.add(normalizedRegion);
      
      // Add without common prefixes/suffixes
      variations.add(normalized.replace(/^(san|santa|santo|saint)\s+/i, ""));
      variations.add(normalized.replace(/\s+(city|town|municipality)$/i, ""));
      
      // Add province variations
      if (normalizedProvince) {
        variations.add(normalizedProvince.replace(/\s+(province|prov)$/i, ""));
      }
      
      return Array.from(variations).filter(v => v.length > 0);
    };

    // Get all location variations to try matching
    const locationVariations = getLocationVariations(locationName, province, region);
    
    console.log("[PSWS] Location variations to match:", locationVariations);
    console.log("[PSWS] Available PSWS data:", pswsData.map(p => ({
      signal: p.signalNumber,
      areaCount: p.areas.length,
      sampleAreas: p.areas.slice(0, 5)
    })));

    // Check all signal levels, return the highest signal number found
    let maxSignal = 0;
    const matches: Array<{ signal: number; area: string; matchType: string }> = [];

    for (const psws of pswsData) {
      console.log(`[PSWS] Checking Signal ${psws.signalNumber} with ${psws.areas.length} areas`);
      
      for (const area of psws.areas) {
        const areaNormalized = normalizeLocation(area);
        
        // Try matching against all location variations
        let matchType = "";
        let isMatch = false;

        for (const locationVar of locationVariations) {
          // Strategy 1: Exact match
          if (locationVar === areaNormalized) {
            matchType = `exact match: "${locationVar}" = "${areaNormalized}"`;
            isMatch = true;
            break;
          }
          // Strategy 2: Contains match (bidirectional)
          else if (locationVar.includes(areaNormalized) || areaNormalized.includes(locationVar)) {
            matchType = `contains match: "${locationVar}" <-> "${areaNormalized}"`;
            isMatch = true;
            break;
          }
          // Strategy 3: Word-based matching
          else {
            const locationWords = locationVar.split(/\s+/).filter(w => w.length > 2);
            const areaWords = areaNormalized.split(/\s+/).filter(w => w.length > 2);
            
            // Check if any significant words match
            for (const locWord of locationWords) {
              for (const areaWord of areaWords) {
                if (locWord === areaWord || locWord.includes(areaWord) || areaWord.includes(locWord)) {
                  matchType = `word match: "${locWord}" in "${locationVar}" matches "${areaWord}" in "${areaNormalized}"`;
                  isMatch = true;
                  break;
                }
              }
              if (isMatch) break;
            }
            if (isMatch) break;
          }
        }
        
        if (isMatch) {
          console.log(`[PSWS] ✓ Match found! Signal ${psws.signalNumber}, Area: "${area}", Match: ${matchType}`);
          matches.push({
            signal: psws.signalNumber,
            area,
            matchType,
          });
          
          if (psws.signalNumber > maxSignal) {
            maxSignal = psws.signalNumber;
          }
        }
      }
    }

    console.log("[PSWS] All matches found:", matches);
    console.log("[PSWS] Final signal number:", maxSignal);
    
    return maxSignal;
  } catch (error) {
    console.error("[PSWS] Error getting PSWS for location:", error);
    return 0;
  }
}

