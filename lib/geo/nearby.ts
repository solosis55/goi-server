/** Radio por defecto para facet/sort «Cerca» (km). */
export const NEARBY_MAX_KM = 50;

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type GeoPoint = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
};

export function hasGeoPoint(point: GeoPoint): point is { latitude: number; longitude: number } {
  return (
    typeof point.latitude === "number" &&
    Number.isFinite(point.latitude) &&
    typeof point.longitude === "number" &&
    Number.isFinite(point.longitude)
  );
}

function normLocation(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

/** Coincidencia por coordenadas (prioritario) o por texto de ubicación (legacy). */
export function isNearbyMatch(
  viewer: GeoPoint & { location?: string | null },
  candidate: GeoPoint & { location?: string | null },
  maxKm = NEARBY_MAX_KM
): { nearby: boolean; distanceKm: number | null } {
  if (hasGeoPoint(viewer) && hasGeoPoint(candidate)) {
    const distanceKm = haversineKm(
      viewer.latitude,
      viewer.longitude,
      candidate.latitude,
      candidate.longitude
    );
    return { nearby: distanceKm <= maxKm, distanceKm };
  }

  const a = normLocation(viewer.location);
  const b = normLocation(candidate.location);
  if (a && b && (a === b || a.includes(b) || b.includes(a))) {
    return { nearby: true, distanceKm: null };
  }

  return { nearby: false, distanceKm: null };
}
