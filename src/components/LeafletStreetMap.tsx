import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { LatLngLiteral } from '../types/parking';
import { haversineDistanceMeters } from '../utils/geo';

interface LeafletStreetMapProps {
  isDark: boolean;
  initialCenter: LatLngLiteral;
  pinnedLocation: LatLngLiteral | null;
  liveUserLocation: LatLngLiteral;
  isTracking: boolean;
  bearingToDestination: number;
  etaMinutes: number;
}

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export function LeafletStreetMap({
  isDark,
  initialCenter,
  pinnedLocation,
  liveUserLocation,
  isTracking,
  bearingToDestination,
  etaMinutes,
}: LeafletStreetMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const wasTrackingRef = useRef<boolean>(false);
  const lastCenteredRef = useRef<LatLngLiteral | null>(null);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 17,
      zoomControl: false,
      attributionControl: true,
    });

    map.attributionControl.setPrefix(false);
    map.attributionControl.setPosition('topright');

    const layer = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    mapRef.current = map;
    tileLayerRef.current = layer;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      userMarkerRef.current = null;
      destMarkerRef.current = null;
      routeLineRef.current = null;
    };
  }, []);

  // Swap Light / Dark street tiles dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
  }, [isDark]);

  const fitBothLocations = useCallback(() => {
    const map = mapRef.current;
    if (!map || !pinnedLocation) return;
    const bounds = L.latLngBounds(
      [liveUserLocation.lat, liveUserLocation.lng],
      [pinnedLocation.lat, pinnedLocation.lng]
    );
    map.fitBounds(bounds, {
      paddingTopLeft: [48, 92],
      paddingBottomRight: [48, 280],
      maxZoom: 18,
      animate: true,
    });
  }, [liveUserLocation, pinnedLocation]);

  // Camera framing across Park Here -> Saved -> Find My Vehicle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isTracking && pinnedLocation) {
      if (!wasTrackingRef.current) {
        fitBothLocations();
        wasTrackingRef.current = true;
      }
      return;
    }

    wasTrackingRef.current = false;
    const focusPoint = pinnedLocation ?? liveUserLocation;
    const prev = lastCenteredRef.current;
    if (
      !prev ||
      haversineDistanceMeters(prev.lat, prev.lng, focusPoint.lat, focusPoint.lng) > 8
    ) {
      map.panTo([focusPoint.lat, focusPoint.lng], { animate: true });
      lastCenteredRef.current = focusPoint;
    }
  }, [isTracking, pinnedLocation, liveUserLocation, fitBothLocations]);

  // Sync Pinned Destination Marker + Live User Arrow/Dot Marker + Route Polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Pinned Vehicle Marker
    if (pinnedLocation) {
      const destHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
          ${
            isTracking
              ? `<div style="margin-bottom:6px;padding:3px 10px;border-radius:10px;background:${
                  isDark ? 'rgba(13,20,16,0.92)' : 'rgba(255,255,255,0.94)'
                };color:${
                  isDark ? '#FFFFFF' : '#09090B'
                };border:1px solid rgba(6,193,103,0.35);font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,0.22);">${etaMinutes} min</div>`
              : ''
          }
          <div style="width:40px;height:40px;border-radius:14px;background:linear-gradient(180deg,#0CE07A,#05A859);border:2px solid #FFFFFF;color:#FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(6,193,103,0.48);">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
          </div>
          <div style="width:10px;height:10px;margin-top:-6px;transform:rotate(45deg);background:#05A859;border-right:2px solid #FFFFFF;border-bottom:2px solid #FFFFFF;"></div>
        </div>
      `;

      const destIcon = L.divIcon({
        className: 'pf-leaflet-marker',
        html: destHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([pinnedLocation.lat, pinnedLocation.lng], {
          icon: destIcon,
        }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng([pinnedLocation.lat, pinnedLocation.lng]);
        destMarkerRef.current.setIcon(destIcon);
      }
    } else if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    // 2. Live User Location Marker (Pulsing dot on Park Here, Rotating Arrow on Find My Vehicle)
    const userHtml = isTracking
      ? `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;transform:translate(-50%,-50%);">
          <span class="animate-apple-ripple" style="position:absolute;inset:-4px;border-radius:9999px;background:rgba(6,193,103,0.28);"></span>
          <div style="width:40px;height:40px;border-radius:9999px;background:${
            isDark ? '#0D1410' : '#FFFFFF'
          };border:2px solid #06C167;box-shadow:0 8px 22px rgba(6,193,103,0.45);display:flex;align-items:center;justify-content:center;transform:rotate(${bearingToDestination}deg);transition:transform 250ms ease-out;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#06C167">
              <path d="M12 2.5L19.5 20.5L12 16.8L4.5 20.5L12 2.5Z"/>
            </svg>
          </div>
        </div>
      `
      : `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;transform:translate(-50%,-50%);">
          <span class="animate-apple-ripple" style="position:absolute;inset:-8px;border-radius:9999px;background:rgba(6,193,103,0.3);"></span>
          <span style="width:26px;height:26px;border-radius:9999px;background:rgba(6,193,103,0.25);display:flex;align-items:center;justify-content:center;">
            <span style="width:15px;height:15px;border-radius:9999px;background:#06C167;border:2.5px solid #FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:block;"></span>
          </span>
        </div>
      `;

    const userIcon = L.divIcon({
      className: 'pf-leaflet-user',
      html: userHtml,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([liveUserLocation.lat, liveUserLocation.lng], {
        icon: userIcon,
        zIndexOffset: 500,
      }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([liveUserLocation.lat, liveUserLocation.lng]);
      userMarkerRef.current.setIcon(userIcon);
    }

    // 3. Live Uber-Green Route Polyline
    if (isTracking && pinnedLocation) {
      const path: L.LatLngExpression[] = [
        [liveUserLocation.lat, liveUserLocation.lng],
        [pinnedLocation.lat, pinnedLocation.lng],
      ];
      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline(path, {
          color: '#06C167',
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
        }).addTo(map);
      } else {
        routeLineRef.current.setLatLngs(path);
      }
    } else if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
  }, [
    isDark,
    isTracking,
    pinnedLocation,
    liveUserLocation,
    bearingToDestination,
    etaMinutes,
  ]);

  return (
    <div className="relative w-full h-full bg-[#E5F2EA] dark:bg-[#060908]">
      <div ref={containerRef} className="w-full h-full" />

      {isTracking && pinnedLocation && (
        <button
          type="button"
          onClick={fitBothLocations}
          aria-label="Re-center route on map"
          className="fixed right-3 sm:right-5 bottom-[248px] z-[450] min-h-[44px] min-w-[44px] rounded-full bg-white/80 dark:bg-[#0D1410]/88 backdrop-blur-2xl border border-white/80 dark:border-[#06C167]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_28px_rgba(6,193,103,0.16)] text-[#05A357] dark:text-[#06C167] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
