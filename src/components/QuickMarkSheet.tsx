import { Camera, Check, LocateFixed, MapPin, Trash2, X } from 'lucide-react';
import { ChangeEvent, useState } from 'react';
import { LANDMARK_CUES, ROW_CUES, STATUS_META } from '../data/lots';
import { GpsCoordinate, ParkedSpot, ParkingLot, ParkingSection } from '../types/parking';
import { compressImageToDataUrl } from '../utils/geo';

interface QuickMarkSheetProps {
  isOpen: boolean;
  lot: ParkingLot;
  initialSection: ParkingSection | null;
  initialGps?: GpsCoordinate;
  savedVehicleLabel: string;
  onClose: () => void;
  onSaveSpot: (spot: ParkedSpot) => void;
}

export function QuickMarkSheet({
  isOpen,
  lot,
  initialSection,
  initialGps,
  savedVehicleLabel,
  onClose,
  onSaveSpot,
}: QuickMarkSheetProps) {
  const parkableSections = lot.sections.filter((s) => s.status !== 'restricted');
  const defaultSection =
    initialSection && initialSection.status !== 'restricted'
      ? initialSection
      : parkableSections[0] ?? lot.sections[0];

  const [sectionId, setSectionId] = useState<string>(defaultSection.id);
  const [rowCue, setRowCue] = useState<string>(ROW_CUES[0]);
  const [landmarkCue, setLandmarkCue] = useState<string>(LANDMARK_CUES[0]);
  const [note, setNote] = useState<string>('');
  const [vehicleLabel, setVehicleLabel] = useState<string>(savedVehicleLabel);
  const [gps, setGps] = useState<GpsCoordinate | undefined>(initialGps);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsMessage, setGpsMessage] = useState<string>(
    initialGps ? 'Pinned from 3D Google Map tap' : ''
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState<boolean>(false);

  if (!isOpen) return null;

  const chosenSection =
    lot.sections.find((s) => s.id === sectionId) ?? defaultSection;

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGps({
        lat: 28.6139 + (Math.random() - 0.5) * 0.0004,
        lng: 77.209 + (Math.random() - 0.5) * 0.0004,
        accuracy: 12,
        isSimulated: true,
      });
      setGpsMessage('GPS unavailable in browser — saved lot-gate pin instead.');
      return;
    }

    setGpsLoading(true);
    setGpsMessage('Getting GPS pin...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          isSimulated: false,
        });
        setGpsLoading(false);
        setGpsMessage(`GPS locked (±${Math.round(pos.coords.accuracy)}m)`);
      },
      () => {
        setGps({
          lat: 28.6139 + (Math.random() - 0.5) * 0.0004,
          lng: 77.209 + (Math.random() - 0.5) * 0.0004,
          accuracy: 10,
          isSimulated: true,
        });
        setGpsLoading(false);
        setGpsMessage('Location blocked — saved section anchor pin for walk-back.');
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
    );
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setPhotoDataUrl(compressed);
    } catch {
      // Ignore invalid image
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleConfirm = () => {
    const newSpot: ParkedSpot = {
      id: `spot_${Date.now()}`,
      lotId: lot.id,
      lotName: lot.name,
      sectionId: chosenSection.id,
      sectionName: chosenSection.name,
      rowCue,
      landmarkCue,
      note: note.trim(),
      vehicleLabel: vehicleLabel.trim() || 'My Two-Wheeler',
      photoDataUrl,
      gps,
      parkedAt: new Date().toISOString(),
    };
    onSaveSpot(newSpot);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-mark-title"
    >
      <div className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{lot.shortName}</p>
            <h2 id="quick-mark-title" className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50">
              Lock Spot Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Quick Taps */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* 1. Section Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              1. Which section?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {parkableSections.map((sec) => {
                const active = sec.id === chosenSection.id;
                const meta = STATUS_META[sec.status];
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSectionId(sec.id)}
                    className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 ring-1 ring-blue-600 dark:ring-blue-500'
                        : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {sec.name}
                      </span>
                      {active && (
                        <Check className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    <p className={`text-xs font-medium mt-0.5 ${meta.textClass} dark:opacity-90`}>
                      {meta.shortLabel} · {sec.walkMinutes}m walk
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Row / Position */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              2. Row or position
            </label>
            <div className="flex flex-wrap gap-2">
              {ROW_CUES.map((cue) => (
                <button
                  key={cue}
                  type="button"
                  onClick={() => setRowCue(cue)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    rowCue === cue
                      ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                      : 'bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {cue}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Nearest Landmark */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              3. Nearest landmark
            </label>
            <div className="flex flex-wrap gap-2">
              {LANDMARK_CUES.map((cue) => (
                <button
                  key={cue}
                  type="button"
                  onClick={() => setLandmarkCue(cue)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    landmarkCue === cue
                      ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                      : 'bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {cue}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Optional GPS + Photo + Quick Note */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Optional note & photo
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={gpsLoading}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  gps
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                    : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <LocateFixed className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{gps ? 'GPS Pin Saved' : 'Refresh GPS'}</span>
              </button>

              <label className="min-h-[44px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {photoBusy ? 'Saving...' : photoDataUrl ? 'Retake Photo' : 'Snap Photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>
            </div>

            {gpsMessage && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{gpsMessage}</p>
            )}

            {photoDataUrl && (
              <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
                <img
                  src={photoDataUrl}
                  alt="Parked spot reference"
                  className="w-full h-36 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(undefined)}
                  aria-label="Remove photo"
                  className="absolute top-2 right-2 min-h-[36px] min-w-[36px] rounded-lg bg-zinc-900/80 text-white flex items-center justify-center hover:bg-zinc-900"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="quick-note" className="sr-only">
                  Optional landmark note
                </label>
                <input
                  id="quick-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (e.g. Pillar B3)"
                  maxLength={80}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label htmlFor="vehicle-label" className="sr-only">
                  Your two-wheeler
                </label>
                <input
                  id="vehicle-label"
                  type="text"
                  value={vehicleLabel}
                  onChange={(e) => setVehicleLabel(e.target.value)}
                  placeholder="Vehicle (e.g. Blue Activa)"
                  maxLength={40}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Confirmation */}
        <div className="p-4 border-t border-emerald-950/[0.06] dark:border-emerald-300/[0.12] bg-white/65 dark:bg-[#08120E]/75 backdrop-blur-xl">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-gradient-to-b from-emerald-400/85 to-emerald-600/90 dark:from-emerald-500/80 dark:to-emerald-700/90 backdrop-blur-xl border border-white/50 dark:border-emerald-300/30 hover:brightness-105 active:scale-[0.98] text-white font-semibold text-base inline-flex items-center justify-center gap-2 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_12px_28px_-8px_rgba(16,185,129,0.45)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <MapPin className="w-5 h-5" aria-hidden="true" />
            <span>Park Here</span>
          </button>
        </div>
      </div>
    </div>
  );
}
