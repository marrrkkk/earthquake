/**
 * Get location name from coordinates (reverse geocoding)
 * Uses OpenStreetMap Nominatim API for accurate location names
 */
export interface LocationInfo {
  name: string;
  city: string;
  province: string;
  region: string;
  signalNumber?: number;
}

/**
 * Get location information from coordinates using reverse geocoding
 */
export async function getLocationFromCoordinates(
  latitude: number,
  longitude: number
): Promise<LocationInfo> {
  try {
    // Use OpenStreetMap Nominatim for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Disaster Monitor System",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.address) {
      const addr = data.address;
      
      // Get city/municipality name
      const city = 
        addr.city || 
        addr.town || 
        addr.municipality || 
        addr.village || 
        addr.suburb || 
        addr.county ||
        "Unknown City";
      
      // Get province
      let province = 
        addr.state || 
        addr.province || 
        "Unknown Province";
      
      // Map known cities to their provinces if province is unknown
      const cityToProvince: Record<string, string> = {
        "Lucena": "Quezon",
        "Tayabas": "Quezon",
        "Sariaya": "Quezon",
        "Candelaria": "Quezon",
        "Dolores": "Quezon",
        "San Antonio": "Quezon",
        "Tiaong": "Quezon",
        "Unisan": "Quezon",
        "Gumaca": "Quezon",
        "Atimonan": "Quezon",
        "Plaridel": "Quezon",
        "Pagbilao": "Quezon",
        "Mauban": "Quezon",
        "Real": "Quezon",
        "Infanta": "Quezon",
        "General Nakar": "Quezon",
        "Polillo": "Quezon",
        "Burdeos": "Quezon",
        "Jomalig": "Quezon",
        "Patnanungan": "Quezon",
        "Panukulan": "Quezon",
        "Calauag": "Quezon",
        "Tagkawayan": "Quezon",
        "Guinayangan": "Quezon",
        "Lopez": "Quezon",
        "Alabat": "Quezon",
        "Perez": "Quezon",
        "Agdangan": "Quezon",
        "Padre Burgos": "Quezon",
        "Mulanay": "Quezon",
        "San Francisco": "Quezon",
        "San Narciso": "Quezon",
        "Buenavista": "Quezon",
        "Catanauan": "Quezon",
        "Macalelon": "Quezon",
        "General Luna": "Quezon",
        "Pitogo": "Quezon",
        "Mulanay": "Quezon",
      };
      
      if (province === "Unknown Province" && cityToProvince[city]) {
        province = cityToProvince[city];
        console.log(`[Location] Mapped city ${city} to province ${province}`);
      }
      
      // Get region (try to map from province or use state_district)
      const region = 
        addr.state_district ||
        getRegionFromProvince(province) ||
        "Unknown Region";
      
      // Full location name
      const name = `${city}, ${province}`;

      return {
        name,
        city,
        province,
        region,
      };
    }
  } catch (error) {
    console.error("Error in reverse geocoding:", error);
  }

  // Fallback: Use simple lookup if geocoding fails
  return getLocationFromCoordinatesFallback(latitude, longitude);
}

/**
 * Fallback location lookup using predefined cities
 */
function getLocationFromCoordinatesFallback(
  latitude: number,
  longitude: number
): LocationInfo {
  // Major cities and regions in the Philippines with their approximate coordinates
  const locations: Array<{
    name: string;
    city: string;
    province: string;
    region: string;
    lat: number;
    lon: number;
    radius: number;
  }> = [
    // Metro Manila / NCR
    { name: "Manila, Metro Manila", city: "Manila", province: "Metro Manila", region: "NCR", lat: 14.5995, lon: 120.9842, radius: 50 },
    { name: "Quezon City, Metro Manila", city: "Quezon City", province: "Metro Manila", region: "NCR", lat: 14.6760, lon: 121.0437, radius: 30 },
    { name: "Makati, Metro Manila", city: "Makati", province: "Metro Manila", region: "NCR", lat: 14.5547, lon: 121.0244, radius: 20 },
    { name: "Pasig, Metro Manila", city: "Pasig", province: "Metro Manila", region: "NCR", lat: 14.5764, lon: 121.0851, radius: 20 },
    { name: "Taguig, Metro Manila", city: "Taguig", province: "Metro Manila", region: "NCR", lat: 14.5176, lon: 121.0509, radius: 20 },
    
    // Central Luzon
    { name: "Angeles City, Pampanga", city: "Angeles City", province: "Pampanga", region: "Central Luzon", lat: 15.1475, lon: 120.5847, radius: 30 },
    { name: "San Fernando, Pampanga", city: "San Fernando", province: "Pampanga", region: "Central Luzon", lat: 15.0319, lon: 120.6894, radius: 25 },
    { name: "Malolos, Bulacan", city: "Malolos", province: "Bulacan", region: "Central Luzon", lat: 14.8443, lon: 120.8104, radius: 25 },
    { name: "Bataan", city: "Bataan", province: "Bataan", region: "Central Luzon", lat: 14.6786, lon: 120.5370, radius: 40 },
    
    // CALABARZON
    { name: "Calamba, Laguna", city: "Calamba", province: "Laguna", region: "CALABARZON", lat: 14.2117, lon: 121.1653, radius: 30 },
    { name: "Los Baños, Laguna", city: "Los Baños", province: "Laguna", region: "CALABARZON", lat: 14.1700, lon: 121.2400, radius: 20 },
    { name: "Antipolo, Rizal", city: "Antipolo", province: "Rizal", region: "CALABARZON", lat: 14.6255, lon: 121.1245, radius: 30 },
    { name: "Batangas City, Batangas", city: "Batangas City", province: "Batangas", region: "CALABARZON", lat: 13.7565, lon: 121.0583, radius: 30 },
    
    // Central Visayas
    { name: "Cebu City, Cebu", city: "Cebu City", province: "Cebu", region: "Central Visayas", lat: 10.3157, lon: 123.8854, radius: 40 },
    { name: "Lapu-Lapu, Cebu", city: "Lapu-Lapu", province: "Cebu", region: "Central Visayas", lat: 10.3103, lon: 123.9494, radius: 25 },
    { name: "Mandaue, Cebu", city: "Mandaue", province: "Cebu", region: "Central Visayas", lat: 10.3333, lon: 123.9333, radius: 20 },
    
    // Western Visayas
    { name: "Iloilo City, Iloilo", city: "Iloilo City", province: "Iloilo", region: "Western Visayas", lat: 10.7202, lon: 122.5621, radius: 30 },
    { name: "Bacolod, Negros Occidental", city: "Bacolod", province: "Negros Occidental", region: "Western Visayas", lat: 10.6769, lon: 122.9506, radius: 30 },
    
    // Davao Region
    { name: "Davao City, Davao del Sur", city: "Davao City", province: "Davao del Sur", region: "Davao Region", lat: 7.1907, lon: 125.4553, radius: 50 },
    
    // Bicol Region
    { name: "Naga, Camarines Sur", city: "Naga", province: "Camarines Sur", region: "Bicol Region", lat: 13.6192, lon: 123.1814, radius: 30 },
    { name: "Legazpi, Albay", city: "Legazpi", province: "Albay", region: "Bicol Region", lat: 13.1390, lon: 123.7408, radius: 25 },
    
    // Ilocos Region
    { name: "San Fernando, La Union", city: "San Fernando", province: "La Union", region: "Ilocos Region", lat: 16.6164, lon: 120.3164, radius: 25 },
    { name: "Vigan, Ilocos Sur", city: "Vigan", province: "Ilocos Sur", region: "Ilocos Region", lat: 17.5748, lon: 120.3869, radius: 20 },
    
    // Cagayan Valley
    { name: "Tuguegarao, Cagayan", city: "Tuguegarao", province: "Cagayan", region: "Cagayan Valley", lat: 17.6133, lon: 121.7269, radius: 30 },
    
    // Caraga
    { name: "Butuan, Agusan del Norte", city: "Butuan", province: "Agusan del Norte", region: "Caraga", lat: 8.9475, lon: 125.5406, radius: 30 },
    
    // Soccsksargen
    { name: "General Santos, South Cotabato", city: "General Santos", province: "South Cotabato", region: "Soccsksargen", lat: 6.1128, lon: 125.1717, radius: 40 },
  ];

  // Find the closest location
  let closestLocation = locations[0];
  let minDistance = calculateDistance(
    latitude,
    longitude,
    locations[0].lat,
    locations[0].lon
  );

  for (const location of locations) {
    const distance = calculateDistance(
      latitude,
      longitude,
      location.lat,
      location.lon
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestLocation = location;
    }
  }

  // If within radius, return that location, otherwise return generic region
  if (minDistance <= closestLocation.radius) {
    return {
      name: closestLocation.name,
      city: closestLocation.city,
      province: closestLocation.province,
      region: closestLocation.region,
    };
  } else {
    // Return region-based location
    return {
      name: `${closestLocation.region}`,
      city: closestLocation.city,
      province: closestLocation.province,
      region: closestLocation.region,
    };
  }
}

/**
 * Map province to region (Philippines)
 */
function getRegionFromProvince(province: string): string {
  const provinceToRegion: Record<string, string> = {
    // NCR
    "Metro Manila": "NCR",
    "Manila": "NCR",
    
    // Central Luzon
    "Pampanga": "Central Luzon",
    "Bulacan": "Central Luzon",
    "Bataan": "Central Luzon",
    "Zambales": "Central Luzon",
    "Tarlac": "Central Luzon",
    "Nueva Ecija": "Central Luzon",
    "Aurora": "Central Luzon",
    
    // CALABARZON
    "Laguna": "CALABARZON",
    "Rizal": "CALABARZON",
    "Batangas": "CALABARZON",
    "Cavite": "CALABARZON",
    "Quezon": "CALABARZON",
    
    // Central Visayas
    "Cebu": "Central Visayas",
    "Bohol": "Central Visayas",
    "Negros Oriental": "Central Visayas",
    "Siquijor": "Central Visayas",
    
    // Western Visayas
    "Iloilo": "Western Visayas",
    "Negros Occidental": "Western Visayas",
    "Capiz": "Western Visayas",
    "Aklan": "Western Visayas",
    "Antique": "Western Visayas",
    "Guimaras": "Western Visayas",
    
    // Davao Region
    "Davao del Sur": "Davao Region",
    "Davao del Norte": "Davao Region",
    "Davao Oriental": "Davao Region",
    "Davao de Oro": "Davao Region",
    "Davao Occidental": "Davao Region",
    
    // Bicol Region
    "Camarines Sur": "Bicol Region",
    "Albay": "Bicol Region",
    "Sorsogon": "Bicol Region",
    "Camarines Norte": "Bicol Region",
    "Catanduanes": "Bicol Region",
    "Masbate": "Bicol Region",
    
    // Ilocos Region
    "Ilocos Sur": "Ilocos Region",
    "Ilocos Norte": "Ilocos Region",
    "La Union": "Ilocos Region",
    "Pangasinan": "Ilocos Region",
    
    // Cagayan Valley
    "Cagayan": "Cagayan Valley",
    "Isabela": "Cagayan Valley",
    "Nueva Vizcaya": "Cagayan Valley",
    "Quirino": "Cagayan Valley",
    "Batanes": "Cagayan Valley",
    
    // Caraga
    "Agusan del Norte": "Caraga",
    "Agusan del Sur": "Caraga",
    "Surigao del Norte": "Caraga",
    "Surigao del Sur": "Caraga",
    "Dinagat Islands": "Caraga",
    
    // Soccsksargen
    "South Cotabato": "Soccsksargen",
    "North Cotabato": "Soccsksargen",
    "Sultan Kudarat": "Soccsksargen",
    "Sarangani": "Soccsksargen",
  };

  return provinceToRegion[province] || "Unknown Region";
}

/**
 * Calculate distance between two coordinates
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate Public Storm Warning Signal (PSWS) number based on typhoon category and distance
 * PSWS 1-5 system in the Philippines
 */
export function calculateSignalNumber(
  category: "TD" | "TS" | "STS" | "TY" | "STY" | "SuperTY",
  distance: number
): number {
  // Signal number based on category and distance
  // Signal 5: Super Typhoon within 50km
  // Signal 4: Super Typhoon within 100km, or Typhoon within 50km
  // Signal 3: Typhoon within 100km, or Severe Tropical Storm within 50km
  // Signal 2: Typhoon within 200km, or Severe Tropical Storm within 100km, or Tropical Storm within 50km
  // Signal 1: Any storm within alert radius

  if (category === "SuperTY") {
    if (distance <= 50) return 5;
    if (distance <= 100) return 4;
    if (distance <= 200) return 3;
    if (distance <= 400) return 2;
    if (distance <= 1000) return 1;
  } else if (category === "STY") {
    if (distance <= 50) return 4;
    if (distance <= 100) return 3;
    if (distance <= 200) return 2;
    if (distance <= 500) return 1;
  } else if (category === "TY") {
    if (distance <= 50) return 3;
    if (distance <= 100) return 2;
    if (distance <= 300) return 1;
  } else if (category === "STS") {
    if (distance <= 50) return 2;
    if (distance <= 150) return 1;
  } else if (category === "TS") {
    if (distance <= 50) return 1;
  } else if (category === "TD") {
    if (distance <= 50) return 1;
  }

  return 0; // No signal
}

