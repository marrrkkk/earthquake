"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  updated: number;
  url: string;
  detail: string;
  status: string;
  tsunami: number;
  sig: number;
  net: string;
  code: string;
  ids: string;
  sources: string;
  types: string;
  nst: number | null;
  dmin: number | null;
  rms: number;
  gap: number | null;
  magType: string;
  type: string;
  title: string;
  coordinates: {
    longitude: number;
    latitude: number;
    depth: number;
  };
}

interface PHIVOLCSEarthquake {
  dateTime: string;
  detailLink: string | null;
  latitude: string;
  longitude: string;
  depth: string;
  magnitude: string;
  location: string;
}

const BASE_URL = "https://earthquake.phivolcs.dost.gov.ph/";

// Create an axios instance that ignores SSL certificate errors
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  timeout: 30000, // 30 second timeout
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    Connection: "keep-alive",
  },
});

// Parse Philippine time string to timestamp
function parsePhilippineTime(dateTimeStr: string): number {
  try {
    // PHIVOLCS format examples:
    // - "08 November 2025 - 03:38 PM"
    // - "2024-01-15 10:30:00"
    // - "2024-01-15 10:30:00 Philippine Time"
    
    let cleaned = dateTimeStr
      .replace(/Philippine Time/gi, "")
      .replace(/PHT/gi, "")
      .trim();

    // Handle format: "08 November 2025 - 03:38 PM"
    const longFormatMatch = cleaned.match(/(\d{1,2})\s+(\w+)\s+(\d{4})\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (longFormatMatch) {
      const [, day, monthName, year, hour, minute, ampm] = longFormatMatch;
      const monthMap: Record<string, string> = {
        january: "01", february: "02", march: "03", april: "04",
        may: "05", june: "06", july: "07", august: "08",
        september: "09", october: "10", november: "11", december: "12"
      };
      
      const month = monthMap[monthName.toLowerCase()];
      if (month) {
        let hour24 = parseInt(hour, 10);
        if (ampm.toUpperCase() === "PM" && hour24 !== 12) {
          hour24 += 12;
        } else if (ampm.toUpperCase() === "AM" && hour24 === 12) {
          hour24 = 0;
        }
        
        // Create ISO string and parse (Philippine Time is UTC+8)
        const isoString = `${year}-${month}-${day.padStart(2, "0")}T${hour24.toString().padStart(2, "0")}:${minute}:00+08:00`;
        const date = new Date(isoString);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      }
    }

    // Handle format: "2024-01-15 10:30:00"
    const isoFormatMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (isoFormatMatch) {
      const [, year, month, day, hour, minute, second] = isoFormatMatch;
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`;
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }

    // Try default parsing
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }

    // Fallback: return current time if parsing fails
    console.warn(`Failed to parse date: ${dateTimeStr}`);
    return Date.now();
  } catch (error) {
    console.error(`Error parsing date ${dateTimeStr}:`, error);
    return Date.now();
  }
}

// Extract numeric value from string (e.g., "5.2 km" -> 5.2)
function extractNumber(str: string): number {
  const match = str.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

// Generate a unique ID from earthquake data
function generateId(earthquake: PHIVOLCSEarthquake): string {
  return `${earthquake.dateTime}-${earthquake.latitude}-${earthquake.longitude}-${earthquake.magnitude}`.replace(/[^a-zA-Z0-9-]/g, "-");
}

async function fetchPHIVOLCSEarthquakeData(): Promise<PHIVOLCSEarthquake[]> {
  try {
    console.log("Fetching data from PHIVOLCS...");

    const response = await axiosInstance.get(BASE_URL);
    console.log("Successfully fetched HTML, parsing...");

    const $ = cheerio.load(response.data);
    const earthquakes: PHIVOLCSEarthquake[] = [];

    // Find all tables
    const allTables = $("table.MsoNormalTable");
    console.log(`Found ${allTables.length} MsoNormalTable(s)`);

    // Find the table with earthquake data (has Date-Time header)
    let dataTable: ReturnType<typeof $> | null = null;

    for (let i = 0; i < allTables.length; i++) {
      const table = allTables.eq(i);
      const text = table.text();
      if (text.includes("Date - Time") || text.includes("Philippine Time")) {
        dataTable = table;
        console.log(`Found data table at index ${i}`);
        break;
      }
    }

    if (!dataTable) {
      throw new Error("Could not find earthquake data table");
    }

    // Get all rows from the data table
    const rows = dataTable.find("tr");
    console.log(`Found ${rows.length} rows in data table`);

    // Process each row
    rows.each((_index: number, row: any) => {
      const cells = $(row).find("td");

      // Skip if not enough cells (header row or empty row)
      if (cells.length < 6) {
        return;
      }

      // Extract data from cells
      const dateTimeCell = $(cells[0]);
      const latitudeCell = $(cells[1]);
      const longitudeCell = $(cells[2]);
      const depthCell = $(cells[3]);
      const magnitudeCell = $(cells[4]);
      const locationCell = $(cells[5]);

      // Get the date/time text (may be in a link)
      let dateTime = dateTimeCell.find("a").text().trim();
      const href = dateTimeCell.find("a").attr("href");
      let detailLink: string | null = null;

      if (href) {
        const normalizedPath = href.replace(/\\/g, "/").trim();
        try {
          detailLink = new URL(normalizedPath, BASE_URL).href;
        } catch (e) {
          detailLink = normalizedPath.startsWith("http")
            ? normalizedPath
            : `${BASE_URL}${normalizedPath}`;
        }
      }

      if (!dateTime) {
        dateTime = dateTimeCell.text().trim();
      }

      // Get other values
      const latitude = latitudeCell.text().trim();
      const longitude = longitudeCell.text().trim();
      const depth = depthCell.text().trim();
      const magnitude = magnitudeCell.text().trim();
      const location = locationCell.text().trim();

      // Validate that this is a data row (has valid date and magnitude)
      if (
        dateTime &&
        magnitude &&
        dateTime.length > 10 &&
        !dateTime.toLowerCase().includes("date") &&
        !isNaN(parseFloat(magnitude))
      ) {
        earthquakes.push({
          dateTime,
          detailLink,
          latitude,
          longitude,
          depth,
          magnitude,
          location,
        });
      }
    });

    console.log(`Successfully parsed ${earthquakes.length} earthquakes`);

    if (earthquakes.length === 0) {
      throw new Error("No earthquake data found in table");
    }

    return earthquakes;
  } catch (error) {
    console.error("Error fetching PHIVOLCS earthquake data:", error);
    throw error;
  }
}

// Transform PHIVOLCS data to our Earthquake format
function transformPHIVOLCSData(
  phivolcsData: PHIVOLCSEarthquake[]
): Earthquake[] {
  return phivolcsData.map((eq) => {
    const latitude = extractNumber(eq.latitude);
    const longitude = extractNumber(eq.longitude);
    const depth = extractNumber(eq.depth);
    const magnitude = extractNumber(eq.magnitude);
    const time = parsePhilippineTime(eq.dateTime);

    return {
      id: generateId(eq),
      magnitude,
      place: eq.location || "Philippines",
      time,
      updated: time, // PHIVOLCS doesn't provide separate updated time
      url: eq.detailLink || BASE_URL,
      detail: eq.detailLink || BASE_URL,
      status: "reviewed", // PHIVOLCS data is pre-reviewed
      tsunami: 0, // PHIVOLCS doesn't provide tsunami info in table
      sig: Math.round(magnitude * 100), // Significance based on magnitude
      net: "phivolcs",
      code: generateId(eq).substring(0, 8),
      ids: generateId(eq),
      sources: "phivolcs",
      types: "earthquake",
      nst: null,
      dmin: null,
      rms: 0,
      gap: null,
      magType: "ml", // Local magnitude (typical for PHIVOLCS)
      type: "earthquake",
      title: `M ${magnitude.toFixed(1)} - ${eq.location}`,
      coordinates: {
        longitude,
        latitude,
        depth,
      },
    };
  });
}

export async function getEarthquakes(): Promise<Earthquake[]> {
  try {
    const phivolcsData = await fetchPHIVOLCSEarthquakeData();
    const earthquakes = transformPHIVOLCSData(phivolcsData);

    // Sort by most recent first
    const sorted = earthquakes.sort((a, b) => b.time - a.time);

    return sorted;
  } catch (error) {
    console.error("Error fetching earthquakes:", error);
    return [];
  }
}
