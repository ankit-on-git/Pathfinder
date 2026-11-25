import { DEFAULT_3D_CENTER, INITIAL_LOTS } from '../data/lots';
import { ParkedSpot, ParkingHistoryItem, ParkingLot } from '../types/parking';

const KEYS = {
  LOTS: 'pathfinder_lots_v2',
  ACTIVE_LOT_ID: 'pathfinder_active_lot_v2',
  ACTIVE_SPOT: 'pathfinder_active_spot_v2',
  HISTORY: 'pathfinder_history_v2',
  VEHICLE_LABEL: 'pathfinder_vehicle_v2',
} as const;

export function loadLots(): ParkingLot[] {
  try {
    const raw = localStorage.getItem(KEYS.LOTS);
    if (!raw) return INITIAL_LOTS;
    const parsed = JSON.parse(raw) as ParkingLot[];
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_LOTS;

    // Migrate older cached lots cleanly to include anchorCenter and section geoOffset
    return parsed.map((lot) => {
      const templateLot = INITIAL_LOTS.find((t) => t.id === lot.id) ?? INITIAL_LOTS[0];
      return {
        ...templateLot,
        ...lot,
        anchorCenter: lot.anchorCenter ?? { ...DEFAULT_3D_CENTER },
        sections: (lot.sections ?? templateLot.sections).map((sec, idx) => {
          const templateSec =
            templateLot.sections.find((ts) => ts.id === sec.id) ??
            templateLot.sections[idx] ??
            templateLot.sections[0];
          return {
            ...templateSec,
            ...sec,
            geoOffset: sec.geoOffset ?? templateSec.geoOffset,
          };
        }),
      };
    });
  } catch {
    return INITIAL_LOTS;
  }
}

export function saveLots(lots: ParkingLot[]): void {
  try {
    localStorage.setItem(KEYS.LOTS, JSON.stringify(lots));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadActiveLotId(): string {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_LOT_ID);
    return raw || INITIAL_LOTS[0].id;
  } catch {
    return INITIAL_LOTS[0].id;
  }
}

export function saveActiveLotId(lotId: string): void {
  try {
    localStorage.setItem(KEYS.ACTIVE_LOT_ID, lotId);
  } catch {
    // Ignore
  }
}

export function loadActiveSpot(): ParkedSpot | null {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_SPOT);
    if (!raw) return null;
    return JSON.parse(raw) as ParkedSpot;
  } catch {
    return null;
  }
}

export function saveActiveSpot(spot: ParkedSpot | null): void {
  try {
    if (!spot) {
      localStorage.removeItem(KEYS.ACTIVE_SPOT);
    } else {
      localStorage.setItem(KEYS.ACTIVE_SPOT, JSON.stringify(spot));
    }
  } catch {
    if (spot && spot.photoDataUrl) {
      try {
        const { photoDataUrl: _, ...withoutPhoto } = spot;
        localStorage.setItem(KEYS.ACTIVE_SPOT, JSON.stringify(withoutPhoto));
      } catch {
        // Ignore
      }
    }
  }
}

export function loadHistory(): ParkingHistoryItem[] {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: ParkingHistoryItem[]): void {
  try {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history.slice(0, 8)));
  } catch {
    // Ignore
  }
}

export function loadVehicleLabel(): string {
  try {
    return localStorage.getItem(KEYS.VEHICLE_LABEL) || '';
  } catch {
    return '';
  }
}

export function saveVehicleLabel(label: string): void {
  try {
    localStorage.setItem(KEYS.VEHICLE_LABEL, label);
  } catch {
    // Ignore
  }
}

export function resetAllDemoData(): ParkingLot[] {
  try {
    localStorage.removeItem(KEYS.LOTS);
    localStorage.removeItem(KEYS.ACTIVE_SPOT);
    localStorage.removeItem(KEYS.HISTORY);
  } catch {
    // Ignore
  }
  return INITIAL_LOTS;
}

export function loadTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('parkmark_theme_v1');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem('parkmark_theme_v1', theme);
  } catch {
    // Ignore
  }
}
