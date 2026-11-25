import { Crosshair, Minus, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LatLngLiteral } from '../types/parking';
import { calculateBearingDegrees } from '../utils/geo';

interface LpuCampusMapCloneProps {
  isDark: boolean;
  pinnedLocation: LatLngLiteral | null;
  liveUserLocation: LatLngLiteral;
  isTracking: boolean;
  etaMinutes: number;
}

// Geographic bounding box covering Lovely Professional University (LPU), Phagwara
const BOUNDS = {
  minLat: 31.2516,
  maxLat: 31.2594,
  minLng: 75.7008,
  maxLng: 75.7098,
};

const VIEW_W = 1000;
const VIEW_H = 900;

function projectLatLng(coord: LatLngLiteral): { x: number; y: number } {
  const x = ((coord.lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * VIEW_W;
  const y = ((BOUNDS.maxLat - coord.lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEW_H;
  return { x, y };
}

export function LpuCampusMapClone({
  isDark,
  pinnedLocation,
  liveUserLocation,
  isTracking,
  etaMinutes,
}: LpuCampusMapCloneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: -40 });
  const [zoom, setZoom] = useState<number>(1.35);
  const draggingRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origPanX: 0,
    origPanY: 0,
  });

  const userPt = useMemo(() => projectLatLng(liveUserLocation), [liveUserLocation]);
  const destPt = useMemo(
    () => (pinnedLocation ? projectLatLng(pinnedLocation) : null),
    [pinnedLocation]
  );

  const bearing = useMemo(() => {
    if (!pinnedLocation) return 0;
    return calculateBearingDegrees(
      liveUserLocation.lat,
      liveUserLocation.lng,
      pinnedLocation.lat,
      pinnedLocation.lng
    );
  }, [liveUserLocation, pinnedLocation]);

  const recenterCamera = useCallback(() => {
    if (isTracking && destPt) {
      const midX = (userPt.x + destPt.x) / 2;
      const midY = (userPt.y + destPt.y) / 2;
      const offsetX = (VIEW_W / 2 - midX) * 0.9;
      const offsetY = (VIEW_H / 2 - midY) * 0.9 - 55;
      setZoom(1.42);
      setPan({ x: offsetX, y: offsetY });
    } else if (destPt) {
      setZoom(1.48);
      setPan({
        x: (VIEW_W / 2 - destPt.x) * 0.9,
        y: (VIEW_H / 2 - destPt.y) * 0.9 - 55,
      });
    } else {
      setZoom(1.42);
      setPan({
        x: (VIEW_W / 2 - userPt.x) * 0.9,
        y: (VIEW_H / 2 - userPt.y) * 0.9 - 55,
      });
    }
  }, [isTracking, destPt, userPt]);

  // Smoothly frame active focus when switching between Park Here -> Saved -> Find My Vehicle
  const prevTrackingRef = useRef<boolean>(false);
  const prevPinnedRef = useRef<boolean>(false);

  useEffect(() => {
    const hasPinned = Boolean(destPt);
    if (
      prevTrackingRef.current !== isTracking ||
      prevPinnedRef.current !== hasPinned
    ) {
      recenterCamera();
      prevTrackingRef.current = isTracking;
      prevPinnedRef.current = hasPinned;
    }
  }, [isTracking, destPt, recenterCamera]);

  useEffect(() => {
    recenterCamera();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current.active) return;
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    setPan({
      x: Math.max(-360, Math.min(360, draggingRef.current.origPanX + dx)),
      y: Math.max(-360, Math.min(360, draggingRef.current.origPanY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Google Maps style palette tokens for Light & Dark Modes
  const p = isDark
    ? {
        land: '#121A17',
        park: '#10271C',
        parkStroke: '#173828',
        water: '#0C2332',
        roadCasing: '#0A0F0D',
        roadFill: '#222F2A',
        roadMinor: '#1A2420',
        highwayCasing: '#5E4B23',
        highwayFill: '#8F712F',
        walkway: '#293D34',
        buildingShadow: '#080D0B',
        buildingFill: '#1B2521',
        buildingStroke: '#2A3832',
        mallFill: '#212E29',
        labelText: '#D7E5DE',
        labelSub: '#8EA89B',
        labelHalo: '#121A17',
        roadLabel: '#789085',
      }
    : {
        land: '#ECEFF1',
        park: '#CBEAD2',
        parkStroke: '#B1DDBB',
        water: '#B4D9F8',
        roadCasing: '#D5DCE0',
        roadFill: '#FFFFFF',
        roadMinor: '#F7F9FA',
        highwayCasing: '#E2B649',
        highwayFill: '#FDE293',
        walkway: '#DCE3E8',
        buildingShadow: '#CFD6DB',
        buildingFill: '#E1E5E8',
        buildingStroke: '#CBD2D6',
        mallFill: '#EAE0D5',
        labelText: '#3C4043',
        labelSub: '#5F6368',
        labelHalo: '#FFFFFF',
        roadLabel: '#70757A',
      };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-full overflow-hidden touch-none cursor-grab active:cursor-grabbing select-none"
      style={{ backgroundColor: p.land }}
    >
      {/* Interactive Pan/Zoom Google Maps Clone Canvas of LPU Campus */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-[1000px] h-[900px] max-w-none shrink-0"
          role="img"
          aria-label="LPU Campus Map"
        >
          <defs>
            <filter id="pf-route-glow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Base Land */}
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={p.land} />

          {/* Campus Green Lawns, Gardens & Sports Zones */}
          <path
            d="M 180 120 Q 410 70 690 110 L 820 340 Q 750 470 590 430 L 320 390 Q 200 320 180 120 Z"
            fill={p.park}
            stroke={p.parkStroke}
            strokeWidth="2"
          />
          <ellipse cx="485" cy="195" rx="95" ry="56" fill={p.park} stroke={p.parkStroke} strokeWidth="2.5" />
          <ellipse
            cx="485"
            cy="195"
            rx="72"
            ry="38"
            fill="none"
            stroke={isDark ? '#214D36' : '#9FD4AC'}
            strokeWidth="2"
            strokeDasharray="6 5"
          />
          {/* South Lawn beside Unipolis */}
          <path
            d="M 520 530 Q 670 510 780 560 L 790 675 Q 640 700 500 660 Z"
            fill={p.park}
            stroke={p.parkStroke}
            strokeWidth="1.5"
          />
          {/* Reflecting Pool / Campus Fountain Feature */}
          <rect x="445" y="472" width="44" height="18" rx="9" fill={p.water} />

          {/* Minor Campus Roads & Parking Lanes */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 120 185 L 440 285 L 680 205" stroke={p.roadCasing} strokeWidth="13" />
            <path d="M 120 185 L 440 285 L 680 205" stroke={p.roadMinor} strokeWidth="9" />

            <path d="M 270 430 L 560 462 L 730 390" stroke={p.roadCasing} strokeWidth="14" />
            <path d="M 270 430 L 560 462 L 730 390" stroke={p.roadMinor} strokeWidth="10" />

            <path d="M 650 195 L 725 585" stroke={p.roadCasing} strokeWidth="14" />
            <path d="M 650 195 L 725 585" stroke={p.roadMinor} strokeWidth="10" />

            {/* Pedestrian Walkways */}
            <path
              d="M 330 665 L 430 560 L 555 465"
              stroke={p.walkway}
              strokeWidth="4"
              strokeDasharray="6 6"
            />
          </g>

          {/* Main Campus Avenues */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Main Gate -> Uni Mall -> Block 34 Spine */}
            <path
              d="M 314 681 L 430 570 L 558 462 L 470 365 L 395 292"
              stroke={p.roadCasing}
              strokeWidth="22"
            />
            <path
              d="M 314 681 L 430 570 L 558 462 L 470 365 L 395 292"
              stroke={p.roadFill}
              strokeWidth="16"
            />

            {/* Uni Mall -> Unipolis Boulevard */}
            <path d="M 558 462 L 660 535 L 721 584" stroke={p.roadCasing} strokeWidth="20" />
            <path d="M 558 462 L 660 535 L 721 584" stroke={p.roadFill} strokeWidth="14" />

            {/* Campus Ring Road */}
            <path
              d="M 220 555 L 395 292 L 651 195 L 820 350 L 721 584 L 314 681"
              stroke={p.roadCasing}
              strokeWidth="18"
            />
            <path
              d="M 220 555 L 395 292 L 651 195 L 820 350 L 721 584 L 314 681"
              stroke={p.roadFill}
              strokeWidth="13"
            />
          </g>

          {/* NH-44 / Grand Trunk (GT) Road Highway along South-West */}
          <g fill="none" strokeLinecap="round">
            <path d="M -40 810 L 340 705 L 1040 530" stroke={p.highwayCasing} strokeWidth="30" />
            <path d="M -40 810 L 340 705 L 1040 530" stroke={p.highwayFill} strokeWidth="23" />
            <path
              d="M -40 810 L 340 705 L 1040 530"
              stroke={isDark ? '#423618' : '#E2B649'}
              strokeWidth="1.5"
              strokeDasharray="12 10"
            />
          </g>

          {/* Main Gate Entry Roundabout */}
          <circle cx="314" cy="681" r="19" fill={p.roadCasing} />
          <circle cx="314" cy="681" r="15" fill={p.roadFill} />
          <circle cx="314" cy="681" r="7" fill={p.park} />

          {/* Uni Mall Central Plaza Roundabout */}
          <circle cx="558" cy="462" r="16" fill={p.roadCasing} />
          <circle cx="558" cy="462" r="12" fill={p.roadFill} />
          <circle cx="558" cy="462" r="5" fill={p.park} />

          {/* 3D Extruded Google-Maps-Style LPU Building Footprints */}
          <g>
            {/* Main Gate Arch Structure */}
            <rect x="278" y="644" width="64" height="22" rx="4" fill={p.buildingShadow} />
            <rect
              x="275"
              y="640"
              width="64"
              height="22"
              rx="4"
              fill={p.buildingFill}
              stroke={p.buildingStroke}
              strokeWidth="1.5"
            />

            {/* Uni Mall Complex */}
            <rect x="524" y="400" width="84" height="50" rx="8" fill={p.buildingShadow} />
            <rect
              x="520"
              y="395"
              width="84"
              height="50"
              rx="8"
              fill={p.mallFill}
              stroke={p.buildingStroke}
              strokeWidth="1.5"
            />

            {/* Central Library */}
            <rect x="424" y="376" width="58" height="42" rx="6" fill={p.buildingShadow} />
            <rect
              x="420"
              y="372"
              width="58"
              height="42"
              rx="6"
              fill={p.buildingFill}
              stroke={p.buildingStroke}
              strokeWidth="1.5"
            />

            {/* Block 34 Engineering */}
            <rect x="348" y="250" width="84" height="36" rx="6" fill={p.buildingShadow} />
            <rect
              x="344"
              y="246"
              width="84"
              height="36"
              rx="6"
              fill={p.buildingFill}
              stroke={p.buildingStroke}
              strokeWidth="1.5"
            />

            {/* Block 32 & 38 */}
            <rect x="255" y="346" width="64" height="36" rx="5" fill={p.buildingShadow} />
            <rect
              x="251"
              y="342"
              width="64"
              height="36"
              rx="5"
              fill={p.buildingFill}
              stroke={p.buildingStroke}
              strokeWidth="1.5"
            />
            <rect x="332" y="192" width="56" height="30" rx="5" fill={p.buildingShadow} />
            <rect
              x="328"
              y="188"
              width="56"
              height="30"
              rx="5"
              fill={p.buildingFill}
              stroke={p.buildingStroke}
              strokeWidth="1.5"
            />

            {/* Unipolis Auditorium */}
            <rect x="692" y="544" width="76" height="46" rx="10" fill={p.buildingShadow} />
            <rect
              x="688"
              y="540"
              width="76"
              height="46"
              rx="10"
              fill={p.buildingFill}
              stroke={p.buildingStroke}
              strokeWidth="1.5"
            />

            {/* BH-1 Hostel Wing */}
            <rect x="614" y="152" width="78" height="38" rx="6" fill={p.buildingShadow} />
            <rect
              x="610"
              y="148"
              width="78"
              height="38"
              rx="6"
              fill={p.buildingFill}
              stroke={p.buildingStroke}
              strokeWidth="1.5"
            />

            {/* Uni Hospital */}
            <rect x="612" y="612" width="54" height="32" rx="5" fill={p.buildingShadow} />
            <rect
              x="608"
              y="608"
              width="54"
              height="32"
              rx="5"
              fill={p.buildingFill}
              stroke={p.buildingStroke}
              strokeWidth="1.5"
            />
          </g>

          {/* Road Name & NH-44 Highway Shield */}
          <g fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600">
            <text
              x="160"
              y="742"
              transform="rotate(-15 160 742)"
              fontSize="12"
              fill={p.roadLabel}
              letterSpacing="0.06em"
            >
              JALANDHAR - DELHI GT ROAD
            </text>
            <g transform="translate(808, 574)">
              <rect
                x="-22"
                y="-11"
                width="44"
                height="20"
                rx="4"
                fill={isDark ? '#1F2937' : '#FFFFFF'}
                stroke={isDark ? '#F59E0B' : '#D97706'}
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill={isDark ? '#FBBF24' : '#B45309'}
              >
                NH 44
              </text>
            </g>
          </g>

          {/* Crisp Google-Maps-Style Campus Landmark Labels */}
          <g
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontSize="12"
            fontWeight="700"
            textAnchor="middle"
            stroke={p.labelHalo}
            strokeWidth="3.5"
            paintOrder="stroke"
            fill={p.labelText}
          >
            <text x="562" y="388">Uni Mall</text>
            <text x="386" y="238">Block 34 · Engineering</text>
            <text x="449" y="364" fontSize="11">Central Library</text>
            <text x="726" y="532">Unipolis</text>
            <text x="649" y="140">BH-1 Hostel</text>
            <text x="307" y="716">LPU Main Gate</text>
            <text x="485" y="199" fontSize="11" fill={p.labelSub}>
              Sports Stadium
            </text>
            <text x="283" y="334" fontSize="11" fill={p.labelSub}>
              Block 32
            </text>
            <text x="635" y="656" fontSize="11" fill={p.labelSub}>
              Uni Hospital
            </text>
          </g>

          {/* Parking Bay Badges ('P') */}
          {[
            { x: 558, y: 462 },
            { x: 314, y: 650 },
            { x: 395, y: 292 },
            { x: 721, y: 584 },
          ].map((bay, i) => (
            <g key={i} transform={`translate(${bay.x}, ${bay.y})`}>
              <circle
                r="10"
                fill={isDark ? '#0D1F17' : '#FFFFFF'}
                stroke="#06C167"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fill="#06C167"
              >
                P
              </text>
            </g>
          ))}

          {/* Live Uber-Green Walking Route (Shown ONLY during Find My Vehicle) */}
          {isTracking && destPt && (
            <g>
              <line
                x1={userPt.x}
                y1={userPt.y}
                x2={destPt.x}
                y2={destPt.y}
                stroke="#06C167"
                strokeOpacity="0.28"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <line
                x1={userPt.x}
                y1={userPt.y}
                x2={destPt.x}
                y2={destPt.y}
                stroke="#06C167"
                strokeWidth="6"
                strokeLinecap="round"
                filter="url(#pf-route-glow)"
              />
            </g>
          )}

          {/* Pinned Parked Vehicle Destination Marker */}
          {destPt && (
            <g transform={`translate(${destPt.x}, ${destPt.y})`}>
              {isTracking && (
                <g transform="translate(0, -54)">
                  <rect
                    x="-28"
                    y="-12"
                    width="56"
                    height="22"
                    rx="9"
                    fill={isDark ? '#0D1410' : '#FFFFFF'}
                    stroke="rgba(6,193,103,0.45)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill={isDark ? '#FFFFFF' : '#09090B'}
                  >
                    {etaMinutes} min
                  </text>
                </g>
              )}
              <g transform="translate(0, -18)">
                <path
                  d="M0 18 L-6 10 L6 10 Z"
                  fill="#05A859"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <rect
                  x="-18"
                  y="-22"
                  width="36"
                  height="36"
                  rx="12"
                  fill="#06C167"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                <g
                  transform="translate(-10, -14) scale(0.833)"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="18.5" cy="17.5" r="3.5" />
                  <circle cx="5.5" cy="17.5" r="3.5" />
                  <circle cx="15" cy="5" r="1" />
                  <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
                </g>
              </g>
            </g>
          )}

          {/* Live User Marker: Pulsing Green Dot before tracking, Real-Time Rotating Arrow during Find My Vehicle */}
          <g transform={`translate(${userPt.x}, ${userPt.y})`}>
            <circle r="22" fill="#06C167" fillOpacity="0.22">
              <animate
                attributeName="r"
                values="14;28;14"
                dur="2.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="fill-opacity"
                values="0.32;0;0.32"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>

            {isTracking ? (
              <g
                transform={`rotate(${bearing})`}
                style={{ transition: 'transform 220ms ease-out' }}
              >
                <circle
                  r="17"
                  fill={isDark ? '#0D1410' : '#FFFFFF'}
                  stroke="#06C167"
                  strokeWidth="2.5"
                />
                <path d="M0 -9 L7 8 L0 4.5 L-7 8 Z" fill="#06C167" />
              </g>
            ) : (
              <g>
                <circle r="12" fill="#06C167" fillOpacity="0.25" />
                <circle r="7" fill="#06C167" stroke="#FFFFFF" strokeWidth="2.5" />
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Campus Badge + Map Zoom / Re-center Controls */}
      <div className="fixed right-3 sm:right-5 bottom-[250px] z-30 flex flex-col gap-2">
        {isTracking && (
          <button
            type="button"
            onClick={recenterCamera}
            aria-label="Re-center route on map"
            className="min-h-[42px] min-w-[42px] rounded-full bg-white/80 dark:bg-[#0D1410]/85 backdrop-blur-2xl border border-white/80 dark:border-[#06C167]/25 shadow-lg text-[#05A357] dark:text-[#06C167] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}

        <div className="hidden sm:flex flex-col rounded-2xl overflow-hidden bg-white/80 dark:bg-[#0D1410]/85 backdrop-blur-2xl border border-white/80 dark:border-[#06C167]/25 shadow-lg">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.18).toFixed(2))))}
            aria-label="Zoom in map"
            className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-emerald-100 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-px bg-black/10 dark:bg-white/10" />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.9, Number((z - 0.18).toFixed(2))))}
            aria-label="Zoom out map"
            className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-emerald-100 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
