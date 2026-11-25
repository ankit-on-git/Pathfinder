import {
  AdvancedMarker,
  APILoadingStatus,
  ColorScheme,
  Map as GoogleMap,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Bike, Crosshair } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LatLngLiteral, ParkedSpot, ParkingLot } from '../types/parking';
import {
  calculateBearingDegrees,
  haversineDistanceMeters,
  isQuotaError,
  notifyQuotaExceeded,
  offsetLatLngMeters,
} from '../utils/geo';
import { LeafletStreetMap } from './LeafletStreetMap';

interface UberMapStageProps {
  hasApiKey: boolean;
  isDark: boolean;
  lot: ParkingLot;
  activeSpot: ParkedSpot | null;
  isTracking: boolean;
  liveUserLocation: LatLngLiteral;
  etaMinutes: number;
  onLiveRouteMetrics?: (metrics: { distanceMeters: number; durationSeconds: number } | null) => void;
}

function VectorTrackingOverlay({
  pinnedLocation,
  liveLocation,
  isTracking,
  recenterSignal,
  onLiveRouteMetrics,
}: {
  pinnedLocation: LatLngLiteral | null;
  liveLocation: LatLngLiteral;
  isTracking: boolean;
  recenterSignal: number;
  onLiveRouteMetrics?: (metrics: { distanceMeters: number; durationSeconds: number } | null) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const routeLinesRef = useRef<google.maps.Polyline[]>([]);
  const cachedRouteTailRef = useRef<LatLngLiteral[] | null>(null);
  const lastRoutedKeyRef = useRef<{ origin: LatLngLiteral; dest: LatLngLiteral } | null>(null);
  const wasTrackingRef = useRef<boolean>(false);
  const lastCenteredLocRef = useRef<LatLngLiteral | null>(null);

  const fitBothLocations = useCallback(() => {
    if (!map || typeof google === 'undefined' || !pinnedLocation) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(pinnedLocation);
    bounds.extend(liveLocation);
    map.fitBounds(bounds, { top: 96, right: 56, bottom: 280, left: 56 });
  }, [map, pinnedLocation, liveLocation]);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    if (isTracking && pinnedLocation) {
      if (!wasTrackingRef.current) {
        fitBothLocations();
        wasTrackingRef.current = true;
      }
      return;
    }

    wasTrackingRef.current = false;

    const focusPoint = pinnedLocation ?? liveLocation;
    const prev = lastCenteredLocRef.current;
    if (
      !prev ||
      haversineDistanceMeters(prev.lat, prev.lng, focusPoint.lat, focusPoint.lng) > 8
    ) {
      map.panTo(focusPoint);
      lastCenteredLocRef.current = focusPoint;
    }
  }, [map, isTracking, pinnedLocation, liveLocation, fitBothLocations]);

  useEffect(() => {
    if (recenterSignal === 0) return;
    fitBothLocations();
  }, [recenterSignal, fitBothLocations]);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    if (!isTracking || !pinnedLocation) {
      routeLinesRef.current.forEach((l) => l.setMap(null));
      routeLinesRef.current = [];
      cachedRouteTailRef.current = null;
      lastRoutedKeyRef.current = null;
      return;
    }

    const strokeColor = '#06C167';

    const updateLivePolylinePath = (pts: LatLngLiteral[]) => {
      if (routeLinesRef.current.length === 1) {
        routeLinesRef.current[0].setPath(pts);
      } else {
        routeLinesRef.current.forEach((l) => l.setMap(null));
        const line = new google.maps.Polyline({
          path: pts,
          geodesic: true,
          strokeColor,
          strokeOpacity: 0.95,
          strokeWeight: 6,
          map,
        });
        routeLinesRef.current = [line];
      }
    };

    const prev = lastRoutedKeyRef.current;
    const sameDest =
      prev &&
      haversineDistanceMeters(prev.dest.lat, prev.dest.lng, pinnedLocation.lat, pinnedLocation.lng) < 2;
    const closeOrigin =
      prev &&
      haversineDistanceMeters(prev.origin.lat, prev.origin.lng, liveLocation.lat, liveLocation.lng) < 35;

    if (sameDest && closeOrigin && routeLinesRef.current.length > 0) {
      const tail = cachedRouteTailRef.current;
      if (tail && tail.length >= 2) {
        const remainingDist = haversineDistanceMeters(
          liveLocation.lat,
          liveLocation.lng,
          pinnedLocation.lat,
          pinnedLocation.lng
        );
        if (remainingDist < 22) {
          updateLivePolylinePath([liveLocation, pinnedLocation]);
        } else {
          updateLivePolylinePath([liveLocation, ...tail.slice(1)]);
        }
      } else {
        updateLivePolylinePath([liveLocation, pinnedLocation]);
      }
      return;
    }

    let cancelled = false;

    const drawDirectLine = () => {
      if (cancelled || typeof google === 'undefined') return;
      cachedRouteTailRef.current = [liveLocation, pinnedLocation];
      updateLivePolylinePath([liveLocation, pinnedLocation]);
    };

    const RouteClass = (routesLib as unknown as {
      Route?: {
        computeRoutes: (req: unknown) => Promise<{
          routes?: Array<{
            path?: Array<google.maps.LatLng | LatLngLiteral>;
            distanceMeters?: number;
            durationMillis?: number;
            createPolylines: () => google.maps.Polyline[];
          }>;
        }>;
      };
    } | null)?.Route;

    if (!RouteClass?.computeRoutes) {
      drawDirectLine();
      return () => {
        cancelled = true;
      };
    }

    lastRoutedKeyRef.current = { origin: liveLocation, dest: pinnedLocation };

    RouteClass.computeRoutes({
      origin: liveLocation,
      destination: pinnedLocation,
      travelMode: 'WALKING',
      fields: ['path', 'distanceMeters', 'durationMillis'],
    })
      .then((res) => {
        if (cancelled) return;
        const route = res.routes?.[0];
        if (!route) {
          drawDirectLine();
          return;
        }
        if (Array.isArray(route.path) && route.path.length >= 2) {
          const pts = route.path.map((pt) => {
            const p = pt as { lat: number | (() => number); lng: number | (() => number) };
            return {
              lat: typeof p.lat === 'function' ? p.lat() : p.lat,
              lng: typeof p.lng === 'function' ? p.lng() : p.lng,
            };
          });
          cachedRouteTailRef.current = pts;
          updateLivePolylinePath([liveLocation, ...pts.slice(1)]);
        } else {
          routeLinesRef.current.forEach((l) => l.setMap(null));
          const polylines = route.createPolylines();
          polylines.forEach((p) => {
            p.setOptions({ strokeColor, strokeWeight: 6, strokeOpacity: 0.95 });
            p.setMap(map);
          });
          routeLinesRef.current = polylines;
        }

        if (typeof route.distanceMeters === 'number' && typeof route.durationMillis === 'number') {
          onLiveRouteMetrics?.({
            distanceMeters: route.distanceMeters,
            durationSeconds: Math.round(route.durationMillis / 1000),
          });
        }
      })
      .catch((err) => {
        if (isQuotaError(err)) {
          notifyQuotaExceeded();
        }
        drawDirectLine();
      });

    return () => {
      cancelled = true;
    };
  }, [map, routesLib, isTracking, pinnedLocation, liveLocation, onLiveRouteMetrics]);

  useEffect(() => {
    return () => {
      routeLinesRef.current.forEach((l) => l.setMap(null));
      routeLinesRef.current = [];
    };
  }, []);

  return null;
}

function VectorMapCanvas({
  isDark,
  initialCenter,
  pinnedLocation,
  liveUserLocation,
  isTracking,
  bearingToDestination,
  etaMinutes,
  onLiveRouteMetrics,
}: {
  isDark: boolean;
  initialCenter: LatLngLiteral;
  pinnedLocation: LatLngLiteral | null;
  liveUserLocation: LatLngLiteral;
  isTracking: boolean;
  bearingToDestination: number;
  etaMinutes: number;
  onLiveRouteMetrics?: (metrics: { distanceMeters: number; durationSeconds: number } | null) => void;
}) {
  const [recenterSignal, setRecenterSignal] = useState<number>(0);

  return (
    <div className="relative w-full h-full bg-[#E5F2EA] dark:bg-[#060908]">
      <GoogleMap
        key={isDark ? 'gmp-dark-vector' : 'gmp-light-vector'}
        mapId="DEMO_MAP_ID"
        colorScheme={isDark ? ColorScheme.DARK : ColorScheme.LIGHT}
        defaultCenter={initialCenter}
        defaultZoom={17}
        defaultTilt={0}
        defaultHeading={0}
        gestureHandling="greedy"
        disableDefaultUI
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <VectorTrackingOverlay
          pinnedLocation={pinnedLocation}
          liveLocation={liveUserLocation}
          isTracking={isTracking}
          recenterSignal={recenterSignal}
          onLiveRouteMetrics={onLiveRouteMetrics}
        />

        {pinnedLocation && (
          <AdvancedMarker position={pinnedLocation} title="Parked Vehicle Destination">
            <div className="flex flex-col items-center">
              {isTracking && (
                <div className="mb-1.5 px-2.5 py-1 rounded-xl bg-white/90 dark:bg-[#0D1410]/90 backdrop-blur-md border border-white/80 dark:border-[#06C167]/30 text-slate-950 dark:text-white text-[11px] font-bold shadow-lg whitespace-nowrap">
                  {etaMinutes} min
                </div>
              )}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#0CE07A] to-[#05A859] border-2 border-white text-white shadow-[0_10px_24px_rgba(6,193,103,0.48)] flex items-center justify-center">
                <Bike className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="w-2.5 h-2.5 -mt-1.5 rotate-45 bg-[#05A859] border-r-2 border-b-2 border-white" />
            </div>
          </AdvancedMarker>
        )}

        <AdvancedMarker position={liveUserLocation} title="Your Live Location">
          {isTracking ? (
            <div className="relative flex items-center justify-center">
              <span className="absolute w-14 h-14 rounded-full bg-[#06C167]/25 animate-apple-ripple" />
              <div
                className="w-10 h-10 rounded-full bg-white dark:bg-[#0D1410] border-2 border-[#06C167] shadow-[0_8px_22px_rgba(6,193,103,0.45)] flex items-center justify-center transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${bearingToDestination}deg)` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-[#06C167]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2.5L19.5 20.5L12 16.8L4.5 20.5L12 2.5Z" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <span className="absolute w-12 h-12 rounded-full bg-[#06C167]/30 animate-apple-ripple" />
              <span className="w-7 h-7 rounded-full bg-[#06C167]/25 flex items-center justify-center">
                <span className="w-4 h-4 rounded-full bg-[#06C167] border-[2.5px] border-white shadow-lg block" />
              </span>
            </div>
          )}
        </AdvancedMarker>
      </GoogleMap>

      {isTracking && (
        <button
          type="button"
          onClick={() => setRecenterSignal((c) => c + 1)}
          aria-label="Re-center route on map"
          className="fixed right-3 sm:right-5 bottom-[248px] z-30 min-h-[44px] min-w-[44px] rounded-full bg-white/75 dark:bg-[#0D1410]/85 backdrop-blur-2xl border border-white/80 dark:border-[#06C167]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_28px_rgba(6,193,103,0.16)] text-[#05A357] dark:text-[#06C167] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function UberMapStage({
  hasApiKey,
  isDark,
  lot,
  activeSpot,
  isTracking,
  liveUserLocation,
  etaMinutes,
  onLiveRouteMetrics,
}: UberMapStageProps) {
  const apiStatus = useApiLoadingStatus();
  const [authFailed, setAuthFailed] = useState<boolean>(false);

  useEffect(() => {
    const onAuthFail = () => setAuthFailed(true);
    window.addEventListener('gmp-auth-failure', onAuthFail);
    return () => window.removeEventListener('gmp-auth-failure', onAuthFail);
  }, []);

  const mapsUnavailable =
    !hasApiKey ||
    authFailed ||
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE;

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

  const initialCenter: LatLngLiteral = useMemo(() => {
    if (pinnedLocation && isTracking) {
      return {
        lat: (pinnedLocation.lat + liveUserLocation.lat) / 2,
        lng: (pinnedLocation.lng + liveUserLocation.lng) / 2,
      };
    }
    return pinnedLocation ?? liveUserLocation;
  }, [pinnedLocation, liveUserLocation, isTracking]);

  const bearingToDestination = useMemo(() => {
    if (!pinnedLocation) return 0;
    return calculateBearingDegrees(
      liveUserLocation.lat,
      liveUserLocation.lng,
      pinnedLocation.lat,
      pinnedLocation.lng
    );
  }, [liveUserLocation, pinnedLocation]);

  // On Vercel without VITE_GOOGLE_MAPS_API_KEY (or if key is domain-blocked),
  // render a real interactive Leaflet street map of LPU campus so the map never disappears.
  if (mapsUnavailable) {
    return (
      <LeafletStreetMap
        isDark={isDark}
        initialCenter={initialCenter}
        pinnedLocation={pinnedLocation}
        liveUserLocation={liveUserLocation}
        isTracking={isTracking}
        bearingToDestination={bearingToDestination}
        etaMinutes={etaMinutes}
      />
    );
  }

  return (
    <VectorMapCanvas
      isDark={isDark}
      initialCenter={initialCenter}
      pinnedLocation={pinnedLocation}
      liveUserLocation={liveUserLocation}
      isTracking={isTracking}
      bearingToDestination={bearingToDestination}
      etaMinutes={etaMinutes}
      onLiveRouteMetrics={onLiveRouteMetrics}
    />
  );
}
