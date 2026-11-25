import { GeoZoneOffset, LatLngLiteral } from '../types/parking';

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function calculateBearingDegrees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lng2 - lng1));
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(bearing);
}

export function bearingToCardinal(deg: number): string {
  const dirs = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Projects a north/east meter offset from an anchor LatLngLiteral to exact coordinates.
 */
export function offsetLatLngMeters(
  origin: LatLngLiteral,
  northMeters: number,
  eastMeters: number
): LatLngLiteral {
  const latOffset = northMeters / 111320;
  const lngOffset = eastMeters / (111320 * Math.cos((origin.lat * Math.PI) / 180));
  return {
    lat: Number((origin.lat + latOffset).toFixed(6)),
    lng: Number((origin.lng + lngOffset).toFixed(6)),
  };
}

/**
 * Builds a closed rectangular 3D/2D polygon path around a zone's meter offset.
 */
export function buildSectionPolygonCoords(
  origin: LatLngLiteral,
  offset: GeoZoneOffset
): LatLngLiteral[] {
  const { northMeters, eastMeters, halfWidthMeters, halfLengthMeters } = offset;
  return [
    offsetLatLngMeters(origin, northMeters + halfLengthMeters, eastMeters - halfWidthMeters),
    offsetLatLngMeters(origin, northMeters + halfLengthMeters, eastMeters + halfWidthMeters),
    offsetLatLngMeters(origin, northMeters - halfLengthMeters, eastMeters + halfWidthMeters),
    offsetLatLngMeters(origin, northMeters - halfLengthMeters, eastMeters - halfWidthMeters),
  ];
}

export function detectWebGL2Support(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

export function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const text = String(err).toUpperCase();
  return (
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('OVERQUOTA') ||
    text.includes('429')
  );
}

export function notifyQuotaExceeded(): void {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
}

export function formatElapsedSince(isoString: string, nowMs: number = Date.now()): string {
  const start = new Date(isoString).getTime();
  const diffSec = Math.max(0, Math.floor((nowMs - start) / 1000));
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `${hrs}h ago`;
  return `${hrs}h ${remMins}m ago`;
}

export function formatClockTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export async function compressImageToDataUrl(file: File, maxWidth = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process image'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}
