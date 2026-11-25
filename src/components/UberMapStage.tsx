import { useMemo } from 'react';
import { LatLngLiteral, ParkedSpot, ParkingLot } from '../types/parking';
import { offsetLatLngMeters } from '../utils/geo';
import { LpuCampusMapClone } from './LpuCampusMapClone';

interface UberMapStageProps {
  isDark: boolean;
  lot: ParkingLot;
  activeSpot: ParkedSpot | null;
  isTracking: boolean;
  liveUserLocation: LatLngLiteral;
  etaMinutes: number;
}

export function UberMapStage({
  isDark,
  lot,
  activeSpot,
  isTracking,
  liveUserLocation,
  etaMinutes,
}: UberMapStageProps) {
  const pinnedLocation: LatLngLiteral | null = useMemo(() => {
    if (!activeSpot) return null;
    if (activeSpot.gps) return { lat: activeSpot.gps.lat, lng: activeSpot.gps.lng };
    const sec = lot.sections.find((s) => s.id === activeSpot.sectionId);
    if (sec) {
      return offsetLatLngMeters(
        lot.anchorCenter,
        sec.geoOffset.northMeters,
        sec.geoOffset.eastMeters
      );
    }
    return lot.anchorCenter;
  }, [activeSpot, lot]);

  return (
    <LpuCampusMapClone
      isDark={isDark}
      pinnedLocation={pinnedLocation}
      liveUserLocation={liveUserLocation}
      isTracking={isTracking}
      etaMinutes={etaMinutes}
    />
  );
}
