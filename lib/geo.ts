// Geolocation helpers: Haversine distance + Nominatim geocoding.

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

/** Distance in kilometers between two lat/lng points (Haversine). */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Geocode a free-form address using the free OSM Nominatim service.
 * Note: Nominatim asks for a descriptive User-Agent and rate limits to ~1 req/s.
 */
export async function geocode(address: string): Promise<GeocodeResult | null> {
  if (!address.trim()) return null;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Cleanrus/1.0 (cleaner marketplace)',
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}
