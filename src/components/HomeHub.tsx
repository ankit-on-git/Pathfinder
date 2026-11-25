import {
  Bike,
  Check,
  LayoutGrid,
  MapPin,
  Navigation,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { ParkedSpot } from '../types/parking';
import { formatClockTime, formatElapsedSince } from '../utils/geo';

interface HomeHubProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenGuard: () => void;
  activeSpot: ParkedSpot | null;
  lockingBusy: boolean;
  nowMs: number;
  onLockHere: () => void;
  onOpenDetails: () => void;
  onFindVehicle: () => void;
}

export function HalfMoonIcon({ isDark }: { isDark: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 0 0 12 21a9.003 9.003 0 0 0 8.354-5.646Z"
        fill={isDark ? '#06C167' : 'currentColor'}
        stroke={isDark ? '#06C167' : 'currentColor'}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PathFinderLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#0CE07A] to-[#05A859] border border-white/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.55),0_6px_16px_rgba(6,193,103,0.42)] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
          <path
            d="M3 7.5L9 4.5L15 7.5L21 4.5V16.5L15 19.5L9 16.5L3 19.5V7.5Z"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M9 4.5V16.5M15 7.5V19.5"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.2"
          />
          <path
            d="M16.5 7.5L10.8 17.5L10.1 13.4L6 12.7L16.5 7.5Z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap">
        PathFinder
      </span>
    </div>
  );
}

export function HomeHub({
  isDark,
  onToggleTheme,
  onOpenGuard,
  activeSpot,
  lockingBusy,
  nowMs,
  onLockHere,
  onOpenDetails,
  onFindVehicle,
}: HomeHubProps) {
  const [popping, setPopping] = useState<boolean>(false);

  const handleParkClick = () => {
    if (lockingBusy || popping) return;
    setPopping(true);
    window.setTimeout(() => {
      setPopping(false);
    }, 450);
    onLockHere();
  };

  return (
    <div className="pointer-events-none relative z-20 min-h-[100dvh] w-full flex flex-col">
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-6 sm:pb-8 pb-safe">
        {/* Floating Translucent Glass Header over Live LPU Background Map */}
        <header className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-white/75 dark:bg-[#0B120E]/78 backdrop-blur-2xl border border-white/80 dark:border-[#06C167]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_12px_32px_rgba(6,193,103,0.14)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_38px_rgba(0,0,0,0.6)]">
          <PathFinderLogo />

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="min-h-[42px] min-w-[42px] rounded-full bg-white/70 dark:bg-[#101814]/85 backdrop-blur-xl border border-white/85 dark:border-[#06C167]/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] text-slate-800 dark:text-[#06C167] flex items-center justify-center hover:scale-[1.04] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167]"
            >
              <HalfMoonIcon isDark={isDark} />
            </button>

            <button
              type="button"
              onClick={onOpenGuard}
              aria-label="Open parking zones"
              className="min-h-[42px] min-w-[42px] rounded-xl bg-white/70 dark:bg-[#101814]/85 backdrop-blur-xl border border-white/85 dark:border-[#06C167]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] text-[#05A357] dark:text-[#06C167] flex items-center justify-center hover:scale-[1.04] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167]"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Bottom-Floating 3D Perspective Stage (keeps live LPU Vector Map visible above & behind) */}
        <main
          className="flex flex-col items-center justify-end"
          style={{ perspective: '1200px' }}
        >
          <AnimatePresence mode="wait">
            {!activeSpot ? (
              <motion.section
                key="park-here-stage"
                initial={{ opacity: 0, rotateX: 14, scale: 0.92, y: 28 }}
                animate={{ opacity: 1, rotateX: 0, scale: 1, y: 0 }}
                exit={{ opacity: 0, rotateX: -14, scale: 0.9, y: -18 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                style={{ transformStyle: 'preserve-3d' }}
                aria-label="Park here"
                className="pointer-events-auto w-full relative overflow-hidden rounded-[32px] bg-white/70 dark:bg-[#0B120E]/78 backdrop-blur-2xl border border-white/85 dark:border-[#06C167]/22 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.9),0_26px_65px_-14px_rgba(6,193,103,0.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_32px_80px_-14px_rgba(0,0,0,0.82)] px-6 py-7 flex flex-col items-center justify-center gap-5"
              >
                {/* Soft Translucent Glass Sheen */}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-[#06C167]/10 dark:from-[#06C167]/[0.07] dark:via-transparent dark:to-[#06C167]/[0.04]"
                  aria-hidden="true"
                />

                {/* Animated 3D Translucent Uber-Green Glass Medallion */}
                <div className="relative z-10 w-32 h-32 flex items-center justify-center">
                  <span
                    className="absolute inset-1 rounded-full border border-[#06C167]/30 dark:border-[#06C167]/25 bg-[#06C167]/10 dark:bg-[#06C167]/[0.04] animate-apple-ripple"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute inset-1 rounded-full border border-[#06C167]/20 dark:border-[#06C167]/15 animate-apple-ripple-delayed"
                    aria-hidden="true"
                  />

                  <AnimatePresence>
                    {(popping || lockingBusy) && (
                      <motion.span
                        initial={{ scale: 0.72, opacity: 0.85 }}
                        animate={{ scale: 1.65, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-3 rounded-full border-2 border-[#06C167] bg-[#06C167]/18"
                        aria-hidden="true"
                      />
                    )}
                  </AnimatePresence>

                  <motion.div
                    role="button"
                    tabIndex={0}
                    onClick={handleParkClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleParkClick();
                      }
                    }}
                    aria-label="Park here and save location"
                    whileHover={{ scale: 1.06, rotateX: -4 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{ scale: popping || lockingBusy ? 1.14 : 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 16,
                    }}
                    className="cursor-pointer relative w-20 h-20 rounded-full bg-gradient-to-b from-white/95 via-[#ECFAF2]/90 to-[#D7F5E5]/80 dark:from-[#0C2016]/85 dark:via-[#08150E]/90 dark:to-[#050C08]/95 backdrop-blur-2xl border border-white dark:border-[#06C167]/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.95),0_16px_34px_-8px_rgba(6,193,103,0.4)] dark:shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.18),0_20px_42px_-8px_rgba(0,0,0,0.8)] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167]"
                  >
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#0CE07A] to-[#06C167] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_8px_18px_-4px_rgba(6,193,103,0.55)] flex items-center justify-center animate-apple-pin">
                      {lockingBusy || popping ? (
                        <Check className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <MapPin className="w-5 h-5" aria-hidden="true" />
                      )}
                    </span>
                  </motion.div>
                </div>

                {/* Primary Uber-Green "Park Here" Button */}
                <motion.button
                  type="button"
                  onClick={handleParkClick}
                  disabled={lockingBusy}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  animate={{ scale: popping || lockingBusy ? 1.03 : 1 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  className="relative z-10 w-full min-h-[54px] px-6 rounded-2xl bg-gradient-to-b from-[#0AD673] to-[#05A859] backdrop-blur-xl border border-white/45 dark:border-[#34D399]/35 text-white font-semibold text-base inline-flex items-center justify-center gap-2 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_16px_34px_-8px_rgba(6,193,103,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167] focus-visible:ring-offset-2"
                >
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  <span>{lockingBusy || popping ? 'Saving Spot...' : 'Park Here'}</span>
                </motion.button>
              </motion.section>
            ) : (
              /* STATE 2: Clean 3D Translucent Glass Card -> Find My Vehicle */
              <motion.section
                key="found-stage"
                initial={{ opacity: 0, rotateX: 16, rotateY: -6, scale: 0.88, y: 28 }}
                animate={{ opacity: 1, rotateX: 0, rotateY: 0, scale: 1, y: 0 }}
                exit={{ opacity: 0, rotateX: -14, rotateY: 6, scale: 0.9, y: -20 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                style={{ transformStyle: 'preserve-3d' }}
                aria-label="Parked vehicle"
                className="pointer-events-auto w-full relative overflow-hidden rounded-[32px] bg-white/70 dark:bg-[#0B120E]/78 backdrop-blur-2xl border border-white/85 dark:border-[#06C167]/22 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.9),0_26px_65px_-14px_rgba(6,193,103,0.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_32px_80px_-14px_rgba(0,0,0,0.82)] p-6 space-y-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#0CE07A] to-[#05A859] border border-white/40 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_10px_22px_-6px_rgba(6,193,103,0.5)] flex items-center justify-center shrink-0">
                      <Bike className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-emerald-200/70">
                        <span className="text-[#05A357] dark:text-[#06C167] font-semibold">
                          Location Stored
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {formatElapsedSince(activeSpot.parkedAt, nowMs)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {formatClockTime(activeSpot.parkedAt)}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-950 dark:text-white truncate mt-0.5">
                        {activeSpot.sectionName}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenDetails}
                    className="min-h-[40px] px-3.5 rounded-xl bg-white/75 dark:bg-[#06C167]/12 border border-white/85 dark:border-[#06C167]/25 text-xs font-semibold text-[#05A357] dark:text-[#06C167] shrink-0 hover:bg-white dark:hover:bg-[#06C167]/20 transition-colors"
                  >
                    Edit Note
                  </button>
                </div>

                <div>
                  <motion.button
                    type="button"
                    onClick={onFindVehicle}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                    className="w-full min-h-[54px] px-6 rounded-2xl bg-gradient-to-b from-[#0AD673] to-[#05A859] backdrop-blur-xl border border-white/45 dark:border-[#34D399]/35 text-white font-semibold text-base inline-flex items-center justify-center gap-2 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_16px_34px_-8px_rgba(6,193,103,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167] focus-visible:ring-offset-2"
                  >
                    <Navigation className="w-4 h-4" aria-hidden="true" />
                    <span>Find My Vehicle</span>
                  </motion.button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
