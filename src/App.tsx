import {
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Compass,
  LayoutGrid,
  MapPin,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GuardSheet } from './components/GuardSheet';
import { HalfMoonIcon, HomeHub, PathFinderLogo } from './components/HomeHub';
import { QuickMarkSheet } from './components/QuickMarkSheet';
import { UberMapStage } from './components/UberMapStage';
import { getBestSection, LPU_DEMO_LOCATIONS } from './data/lots';
import {
  LatLngLiteral,
  ParkedSpot,
  ParkingHistoryItem,
  ParkingLot,
  SectionStatus,
} from './types/parking';
import {
  bearingToCardinal,
  calculateBearingDegrees,
  formatClockTime,
  haversineDistanceMeters,
  offsetLatLngMeters,
} from './utils/geo';
import {
  loadActiveLotId,
  loadHistory,
  loadLots,
  loadTheme,
  loadVehicleLabel,
  resetAllDemoData,
  saveActiveLotId,
  saveActiveSpot,
  saveHistory,
  saveLots,
  saveTheme,
  saveVehicleLabel,
} from './utils/storage';

// Real LPU campus spots used behind the scenes for smooth demo
const DEMO_PARK_SPOT = LPU_DEMO_LOCATIONS[1]; // LPU Uni Mall Parking (31.2554, 75.7058)
const DEMO_RETURN_ORIGIN = LPU_DEMO_LOCATIONS[0]; // LPU Main Gate Walkway (31.2536, 75.7037)

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [lots, setLots] = useState<ParkingLot[]>(() => loadLots());
  const [activeLotId, setActiveLotId] = useState<string>(() => loadActiveLotId());
  // Always start on Stage 1 ("Park Here") on fresh demo load so "Find My Vehicle" never shows first
  const [activeSpot, setActiveSpot] = useState<ParkedSpot | null>(() => {
    saveActiveSpot(null);
    return null;
  });
  const [history, setHistory] = useState<ParkingHistoryItem[]>(() => loadHistory());
  const [vehicleLabel, setVehicleLabel] = useState<string>(() => loadVehicleLabel());

  const activeLot = lots.find((l) => l.id === activeLotId) ?? lots[0];
  const bestSection = getBestSection(activeLot);

  // Tracking overlay activates ONLY when user clicks "Find My Vehicle", while map stays mounted in background
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    bestSection?.id ?? activeLot.sections[0]?.id ?? null
  );

  // Live demo tracking position across LPU campus
  const [liveUserLocation, setLiveUserLocation] = useState<LatLngLiteral>(
    () => DEMO_PARK_SPOT.coords
  );
  const [walkProgress, setWalkProgress] = useState<number>(0);
  const [isSimulatingWalk, setIsSimulatingWalk] = useState<boolean>(false);

  const [lockingBusy, setLockingBusy] = useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [guardOpen, setGuardOpen] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);

  const isDark = theme === 'dark';

  // Sync .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme, isDark]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Refresh parked timer every 20s
  useEffect(() => {
    if (!activeSpot) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 20000);
    return () => window.clearInterval(id);
  }, [activeSpot]);

  useEffect(() => {
    if (!isTracking || !isSimulatingWalk || !activeSpot?.gps) return;
    const id = window.setInterval(() => {
      setWalkProgress((prev) => {
        if (prev >= 100) {
          setIsSimulatingWalk(false);
          return 100;
        }
        return Math.min(100, prev + 4);
      });
    }, 350);
    return () => window.clearInterval(id);
  }, [isTracking, isSimulatingWalk, activeSpot?.gps]);

  useEffect(() => {
    if (!isTracking || !activeSpot?.gps) return;
    const startOrigin = DEMO_RETURN_ORIGIN.coords;
    const t = walkProgress / 100;
    setLiveUserLocation({
      lat: startOrigin.lat + (activeSpot.gps.lat - startOrigin.lat) * t,
      lng: startOrigin.lng + (activeSpot.gps.lng - startOrigin.lng) * t,
    });
  }, [walkProgress, isTracking, activeSpot?.gps]);

  // "Park Here": plays pop animation & stores LPU parking coordinates cleanly without freezing
  const handleLockHere = useCallback(() => {
    if (lockingBusy) return;
    setLockingBusy(true);

    const matchedSection =
      activeLot.sections.find((s) => s.id === DEMO_PARK_SPOT.sectionId) ??
      bestSection ??
      activeLot.sections[0];

    window.setTimeout(() => {
      const newSpot: ParkedSpot = {
        id: `spot_${Date.now()}`,
        lotId: activeLot.id,
        lotName: activeLot.name,
        sectionId: matchedSection.id,
        sectionName: 'Parked Vehicle',
        rowCue: 'Saved Spot',
        landmarkCue: 'LPU Parking',
        note: '',
        vehicleLabel: vehicleLabel || 'My Scooter',
        gps: {
          lat: DEMO_PARK_SPOT.coords.lat,
          lng: DEMO_PARK_SPOT.coords.lng,
          accuracy: 4,
          isSimulated: true,
        },
        parkedAt: new Date().toISOString(),
      };
      setActiveSpot(newSpot);
      saveActiveSpot(newSpot);
      setSelectedSectionId(matchedSection.id);
      setLockingBusy(false);
      setToast('Location stored');
    }, 420);
  }, [lockingBusy, activeLot, bestSection, vehicleLabel]);

  // "Find My Vehicle": opens live tracking from current campus position to saved destination
  const handleStartFindVehicle = () => {
    if (!activeSpot) return;
    setWalkProgress(0);
    setIsSimulatingWalk(false);
    setLiveUserLocation(DEMO_RETURN_ORIGIN.coords);
    setIsTracking(true);
  };

  const handleClearSpot = () => {
    if (!activeSpot) return;
    const item: ParkingHistoryItem = {
      id: `hist_${Date.now()}`,
      lotId: activeSpot.lotId,
      lotName: activeSpot.lotName,
      sectionId: activeSpot.sectionId,
      sectionName: activeSpot.sectionName,
      rowCue: activeSpot.rowCue,
      landmarkCue: activeSpot.landmarkCue,
      note: activeSpot.note,
      vehicleLabel: activeSpot.vehicleLabel,
      parkedAt: activeSpot.parkedAt,
      clearedAt: new Date().toISOString(),
    };
    const nextHistory = [item, ...history].slice(0, 8);
    setHistory(nextHistory);
    saveHistory(nextHistory);
    setActiveSpot(null);
    saveActiveSpot(null);
    setIsTracking(false);
    setIsSimulatingWalk(false);
    setWalkProgress(0);
    setLiveUserLocation(DEMO_PARK_SPOT.coords);
    setToast('Vehicle found');
  };

  const handleSelectLot = (lotId: string) => {
    const target = lots.find((l) => l.id === lotId);
    setActiveLotId(lotId);
    saveActiveLotId(lotId);
    if (target) {
      setSelectedSectionId(getBestSection(target)?.id ?? target.sections[0]?.id ?? null);
    }
  };

  const handleUpdateSectionStatus = (
    lotId: string,
    sectionId: string,
    status: SectionStatus
  ) => {
    const nextLots = lots.map((lot) => {
      if (lot.id !== lotId) return lot;
      return {
        ...lot,
        sections: lot.sections.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const approxOpen =
            status === 'free'
              ? Math.max(12, Math.round(sec.capacity * 0.45))
              : status === 'filling'
              ? Math.max(4, Math.round(sec.capacity * 0.15))
              : 0;
          return {
            ...sec,
            status,
            approxOpen,
            updatedBy: 'guard' as const,
            lastUpdatedAt: new Date().toISOString(),
          };
        }),
      };
    });
    setLots(nextLots);
    saveLots(nextLots);
  };

  const handleApplyPreset = (lotId: string, preset: 'morning-rush' | 'all-free') => {
    const nextLots = lots.map((lot) => {
      if (lot.id !== lotId) return lot;
      return {
        ...lot,
        sections: lot.sections.map((sec, idx) => {
          if (sec.status === 'restricted') return sec;
          const status: SectionStatus =
            preset === 'all-free'
              ? 'free'
              : idx === 0
              ? 'full'
              : idx === 1
              ? 'filling'
              : 'free';
          const approxOpen =
            status === 'full'
              ? 0
              : status === 'filling'
              ? 6
              : Math.max(18, Math.round(sec.capacity * 0.5));
          return {
            ...sec,
            status,
            approxOpen,
            updatedBy: 'guard' as const,
            lastUpdatedAt: new Date().toISOString(),
          };
        }),
      };
    });
    setLots(nextLots);
    saveLots(nextLots);
    setToast(preset === 'morning-rush' ? 'Rush mode active' : 'All zones free');
  };

  const handleResetDemo = () => {
    const fresh = resetAllDemoData();
    setLots(fresh);
    setActiveSpot(null);
    saveActiveSpot(null);
    setHistory([]);
    setIsTracking(false);
    setActiveLotId(fresh[0].id);
    setLiveUserLocation(DEMO_PARK_SPOT.coords);
    setToast('Demo reset');
  };

  // Live tracking metrics
  const pinnedLoc: LatLngLiteral | null = activeSpot?.gps
    ? { lat: activeSpot.gps.lat, lng: activeSpot.gps.lng }
    : null;

  const liveDistanceMeters = useMemo(() => {
    if (!pinnedLoc) return 0;
    return haversineDistanceMeters(
      liveUserLocation.lat,
      liveUserLocation.lng,
      pinnedLoc.lat,
      pinnedLoc.lng
    );
  }, [pinnedLoc, liveUserLocation]);

  const liveEtaMinutes = Math.max(1, Math.ceil(liveDistanceMeters / 75));
  const arrived = isTracking && liveDistanceMeters <= 8;

  const liveBearing = pinnedLoc
    ? calculateBearingDegrees(
        liveUserLocation.lat,
        liveUserLocation.lng,
        pinnedLoc.lat,
        pinnedLoc.lng
      )
    : 0;

  const selectedSection =
    activeLot.sections.find((s) => s.id === selectedSectionId) ??
    bestSection ??
    activeLot.sections[0];

  const defaultPinCoord = offsetLatLngMeters(
    activeLot.anchorCenter,
    selectedSection.geoOffset.northMeters,
    selectedSection.geoOffset.eastMeters
  );

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#ECEFF1] dark:bg-[#121A17] text-slate-900 dark:text-slate-50 select-none">
      {/* PERSISTENT BACKGROUND LPU GOOGLE-MAPS-STYLE CLONE */}
      <div className="fixed inset-0 z-0">
        <UberMapStage
          isDark={isDark}
          lot={activeLot}
          activeSpot={activeSpot}
          isTracking={isTracking && Boolean(activeSpot)}
          liveUserLocation={liveUserLocation}
          etaMinutes={liveEtaMinutes}
        />
      </div>

      {/* VIEW 1 & 2: Floating "Park Here" (Always First) -> "Find My Vehicle" */}
      {(!isTracking || !activeSpot) && (
        <HomeHub
          isDark={isDark}
          onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
          onOpenGuard={() => setGuardOpen(true)}
          activeSpot={activeSpot}
          lockingBusy={lockingBusy}
          nowMs={nowMs}
          onLockHere={handleLockHere}
          onOpenDetails={() => setDetailsOpen(true)}
          onFindVehicle={handleStartFindVehicle}
        />
      )}

      {/* VIEW 3: Active Tracking Overlay over LPU Campus Map */}
      <AnimatePresence>
        {isTracking && activeSpot && (
          <motion.div
            key="live-tracking-overlay"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="pointer-events-none fixed inset-0 z-30"
          >
            {/* Floating Uber-Green Glass Top Bar */}
            <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 p-3 sm:p-4">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
                <div className="pointer-events-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTracking(false);
                      setIsSimulatingWalk(false);
                    }}
                    aria-label="Back to saved vehicle"
                    className="min-h-[44px] px-3.5 rounded-2xl bg-white/75 dark:bg-[#0D1410]/82 backdrop-blur-2xl border border-white/80 dark:border-[#06C167]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_28px_rgba(6,193,103,0.14)] text-slate-900 dark:text-white inline-flex items-center gap-2 font-semibold text-xs sm:text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <div className="hidden sm:flex min-h-[44px] px-3.5 rounded-2xl bg-white/75 dark:bg-[#0D1410]/82 backdrop-blur-2xl border border-white/80 dark:border-[#06C167]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_28px_rgba(6,193,103,0.14)] items-center">
                    <PathFinderLogo />
                  </div>
                </div>

                <div className="pointer-events-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="min-h-[44px] min-w-[44px] rounded-full bg-white/75 dark:bg-[#0D1410]/82 backdrop-blur-2xl border border-white/80 dark:border-[#06C167]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_28px_rgba(6,193,103,0.14)] text-slate-800 dark:text-[#06C167] flex items-center justify-center"
                  >
                    <HalfMoonIcon isDark={isDark} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setGuardOpen(true)}
                    aria-label="Open parking zones"
                    className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/75 dark:bg-[#0D1410]/82 backdrop-blur-2xl border border-white/80 dark:border-[#06C167]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_28px_rgba(6,193,103,0.14)] text-[#05A357] dark:text-[#06C167] flex items-center justify-center"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </header>

            {/* Bottom Floating Translucent 3D Uber-Green Glass Tracking Sheet */}
            <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-5 pb-safe">
              <div className="pointer-events-auto max-w-md mx-auto bg-white/78 dark:bg-[#0D1410]/86 backdrop-blur-2xl rounded-[28px] border border-white/85 dark:border-[#06C167]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_60px_-12px_rgba(6,193,103,0.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_28px_70px_-12px_rgba(0,0,0,0.8)] p-5 space-y-4">
                {/* Top Destination Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#0CE07A] to-[#05A859] text-white shadow-[0_6px_16px_rgba(6,193,103,0.42)] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-950 dark:text-white truncate">
                        {activeSpot.sectionName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-emerald-200/70 truncate">
                        {activeSpot.vehicleLabel || 'My Vehicle'} · {formatClockTime(activeSpot.parkedAt)}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                      arrived
                        ? 'bg-[#06C167]/20 border-[#06C167]/40 text-[#05A357] dark:text-[#06C167]'
                        : 'bg-[#06C167]/12 border-[#06C167]/25 text-[#05A357] dark:text-[#06C167]'
                    }`}
                    aria-hidden="true"
                  >
                    {arrived ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <ArrowUp
                        className="w-5 h-5 transition-transform duration-200"
                        style={{ transform: `rotate(${liveBearing}deg)` }}
                      />
                    )}
                  </div>
                </div>

                {/* Clean Metrics + Interactive Walk Test */}
                <div className="pt-3.5 border-t border-emerald-950/[0.08] dark:border-[#06C167]/[0.14] space-y-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                        {arrived ? '0 m' : `${liveDistanceMeters} m`}
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-emerald-200/70 tabular-nums">
                        {arrived
                          ? 'Arrived'
                          : `${liveEtaMinutes} min walk · ${bearingToCardinal(liveBearing)}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (walkProgress >= 100) setWalkProgress(0);
                        setIsSimulatingWalk((v) => !v);
                      }}
                      className="text-xs font-semibold text-[#05A357] dark:text-[#06C167] hover:underline inline-flex items-center gap-1"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>{isSimulatingWalk ? 'Pause' : 'Simulate Walk'}</span>
                    </button>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={walkProgress}
                    onChange={(e) => {
                      setIsSimulatingWalk(false);
                      setWalkProgress(Number(e.target.value));
                    }}
                    aria-label="Simulate live walking progress"
                    className="w-full accent-[#06C167] cursor-pointer"
                  />
                </div>

                {/* Uber-Green Glass Confirmation Button */}
                <button
                  type="button"
                  onClick={handleClearSpot}
                  className="w-full min-h-[52px] px-5 rounded-2xl bg-gradient-to-b from-[#0AD673] to-[#05A859] backdrop-blur-xl border border-white/45 dark:border-[#34D399]/35 hover:brightness-105 active:scale-[0.98] text-white font-semibold text-base inline-flex items-center justify-center gap-2 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_14px_30px_-8px_rgba(6,193,103,0.48)] transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <span>Found My Vehicle</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Spot Details Sheet */}
      <QuickMarkSheet
        key={`${activeLot.id}-${selectedSection?.id ?? 'sec'}-${
          detailsOpen ? 'open' : 'closed'
        }`}
        isOpen={detailsOpen}
        lot={activeLot}
        initialSection={selectedSection}
        initialGps={
          activeSpot?.gps ?? {
            lat: defaultPinCoord.lat,
            lng: defaultPinCoord.lng,
            accuracy: 8,
            isSimulated: true,
          }
        }
        savedVehicleLabel={vehicleLabel}
        onClose={() => setDetailsOpen(false)}
        onSaveSpot={(spot) => {
          setActiveSpot(spot);
          saveActiveSpot(spot);
          if (spot.vehicleLabel) {
            setVehicleLabel(spot.vehicleLabel);
            saveVehicleLabel(spot.vehicleLabel);
          }
          setDetailsOpen(false);
          setToast('Location stored');
        }}
      />

      {/* Guard Mode Sheet */}
      <GuardSheet
        isOpen={guardOpen}
        lots={lots}
        activeLot={activeLot}
        onSelectLot={handleSelectLot}
        onUpdateSectionStatus={handleUpdateSectionStatus}
        onApplyPreset={handleApplyPreset}
        onResetDemo={handleResetDemo}
        onClose={() => setGuardOpen(false)}
      />

      {/* Translucent Uber-Green Glass Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-white/85 dark:bg-[#0D1410]/90 backdrop-blur-xl border border-white/80 dark:border-[#06C167]/25 text-slate-900 dark:text-white text-xs font-semibold shadow-xl whitespace-nowrap"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
