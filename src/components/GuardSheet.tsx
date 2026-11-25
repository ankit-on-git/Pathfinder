import { RotateCcw, ShieldCheck, X } from 'lucide-react';
import { STATUS_META } from '../data/lots';
import { ParkingLot, SectionStatus } from '../types/parking';

interface GuardSheetProps {
  isOpen: boolean;
  lots: ParkingLot[];
  activeLot: ParkingLot;
  onSelectLot: (lotId: string) => void;
  onUpdateSectionStatus: (lotId: string, sectionId: string, status: SectionStatus) => void;
  onApplyPreset: (lotId: string, preset: 'morning-rush' | 'all-free') => void;
  onResetDemo: () => void;
  onClose: () => void;
}

export function GuardSheet({
  isOpen,
  lots,
  activeLot,
  onSelectLot,
  onUpdateSectionStatus,
  onApplyPreset,
  onResetDemo,
  onClose,
}: GuardSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/35 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Guard Zone Status"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white/80 dark:bg-[#08120E]/88 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/80 dark:border-emerald-300/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_60px_rgba(6,78,59,0.22)] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-emerald-900/60" />
        </div>

        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-emerald-300/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
            <h2 className="text-base font-bold text-zinc-950 dark:text-emerald-50">
              Guard Mode · {activeLot.shortName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Guard Mode"
            className="min-h-[40px] min-w-[40px] rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Lot Switcher */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            {lots.map((lot) => (
              <button
                key={lot.id}
                type="button"
                onClick={() => onSelectLot(lot.id)}
                className={`flex-1 min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  lot.id === activeLot.id
                    ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {lot.shortName}
              </button>
            ))}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onApplyPreset(activeLot.id, 'morning-rush')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold"
            >
              Rush Hour
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset(activeLot.id, 'all-free')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-bold"
            >
              All Free
            </button>
            <button
              type="button"
              onClick={onResetDemo}
              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold inline-flex items-center gap-1.5 ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Section Rows */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {activeLot.sections.map((sec) => (
              <div key={sec.id} className="py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                    {sec.name}
                  </span>
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                    {sec.shortCode}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['free', 'filling', 'full', 'restricted'] as SectionStatus[]).map((st) => {
                    const active = sec.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onUpdateSectionStatus(activeLot.id, sec.id, st)}
                        className={`min-h-[40px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                          active
                            ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                            : 'bg-white dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {STATUS_META[st].shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
