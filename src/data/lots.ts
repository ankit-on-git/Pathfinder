import { LatLngLiteral, ParkingLot, ParkingSection, SectionStatus } from '../types/parking';

// Lovely Professional University (LPU), Phagwara, Punjab, India
export const DEFAULT_3D_CENTER: LatLngLiteral = { lat: 31.2549, lng: 75.7046 };

export interface LpuDemoLocation {
  id: string;
  name: string;
  shortName: string;
  coords: LatLngLiteral;
  sectionId: string;
}

export const LPU_DEMO_LOCATIONS: LpuDemoLocation[] = [
  {
    id: 'lpu-main-gate',
    name: 'LPU Main Gate (GT Road)',
    shortName: 'Main Gate',
    coords: { lat: 31.2536, lng: 75.7037 },
    sectionId: 'lpu-sec-gate',
  },
  {
    id: 'lpu-uni-mall',
    name: 'LPU Uni Mall',
    shortName: 'Uni Mall',
    coords: { lat: 31.2554, lng: 75.7058 },
    sectionId: 'lpu-sec-unimall',
  },
  {
    id: 'lpu-block-34',
    name: 'LPU Block 34 (Engineering)',
    shortName: 'Block 34',
    coords: { lat: 31.2568, lng: 75.7044 },
    sectionId: 'lpu-sec-block34',
  },
  {
    id: 'lpu-unipolis',
    name: 'LPU Unipolis Arena',
    shortName: 'Unipolis',
    coords: { lat: 31.2544, lng: 75.7072 },
    sectionId: 'lpu-sec-unipolis',
  },
  {
    id: 'lpu-bh1-hostel',
    name: 'LPU BH-1 Hostel',
    shortName: 'BH-1 Hostel',
    coords: { lat: 31.2576, lng: 75.7066 },
    sectionId: 'lpu-sec-hostel',
  },
];

export const STATUS_META: Record<
  SectionStatus,
  {
    label: string;
    shortLabel: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    svgFill: string;
    svgStroke: string;
    svgText: string;
    pinBg: string;
    pinBorder: string;
    polyFill: string;
    polyStroke: string;
  }
> = {
  free: {
    label: 'Likely Free',
    shortLabel: 'Free',
    textClass: 'text-emerald-800',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    svgFill: '#ECFDF5',
    svgStroke: '#059669',
    svgText: '#065F46',
    pinBg: '#059669',
    pinBorder: '#064E3B',
    polyFill: 'rgba(16, 185, 129, 0.34)',
    polyStroke: '#059669',
  },
  filling: {
    label: 'Filling Fast',
    shortLabel: 'Filling',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    svgFill: '#FFFBEB',
    svgStroke: '#D97706',
    svgText: '#92400E',
    pinBg: '#D97706',
    pinBorder: '#78350F',
    polyFill: 'rgba(245, 158, 11, 0.36)',
    polyStroke: '#D97706',
  },
  full: {
    label: 'Full Now',
    shortLabel: 'Full',
    textClass: 'text-rose-800',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    svgFill: '#FFF1F2',
    svgStroke: '#E11D48',
    svgText: '#9F1239',
    pinBg: '#E11D48',
    pinBorder: '#881337',
    polyFill: 'rgba(244, 63, 94, 0.36)',
    polyStroke: '#E11D48',
  },
  restricted: {
    label: 'Fine / Tow Zone',
    shortLabel: 'No Park',
    textClass: 'text-red-900',
    bgClass: 'bg-red-100/70',
    borderClass: 'border-red-300',
    svgFill: '#FEE2E2',
    svgStroke: '#DC2626',
    svgText: '#991B1B',
    pinBg: '#DC2626',
    pinBorder: '#7F1D1D',
    polyFill: 'rgba(220, 38, 38, 0.42)',
    polyStroke: '#DC2626',
  },
};

export const ROW_CUES = [
  'Front Row',
  'Middle Row',
  'Back Wall',
  'Corner Slot',
  'Near Exit',
];

export const LANDMARK_CUES = [
  'Under Tree',
  'Near Pillar',
  'Under Shed',
  'By Guard Booth',
  'Near Stairs',
];

export function getBestSection(lot: ParkingLot): ParkingSection | null {
  const parkable = lot.sections.filter((s) => s.status !== 'restricted' && s.status !== 'full');
  if (parkable.length === 0) return null;

  const score = (s: ParkingSection) => {
    const statusWeight = s.status === 'free' ? 100 : 30;
    const openWeight = s.approxOpen;
    const walkPenalty = s.walkMinutes * 4;
    const shadeBonus = s.covered ? 6 : 0;
    return statusWeight + openWeight + shadeBonus - walkPenalty;
  };

  return [...parkable].sort((a, b) => score(b) - score(a))[0];
}

export const INITIAL_LOTS: ParkingLot[] = [
  {
    id: 'lpu-campus',
    name: 'LPU Campus (Phagwara)',
    shortName: 'LPU Campus',
    category: 'campus',
    areaLabel: 'Lovely Professional University · Two-Wheeler Lots',
    entranceLabel: 'LPU Main Gate',
    entrancePoint: { x: 84, y: 318 },
    mainBuildingLabel: 'Uni Mall & Academic Blocks',
    mainBuildingRect: { x: 215, y: 24, width: 230, height: 64 },
    orientationNote: 'Main Gate on GT Road · Uni Mall & Block 34 inside campus',
    guardAdvisory: 'Main Gate Bay fills by 9:15 AM. Use Uni Mall Rear or Block 34 Shed for open slots.',
    anchorCenter: { ...DEFAULT_3D_CENTER },
    sections: [
      {
        id: 'lpu-sec-gate',
        name: 'LPU Main Gate (GT Road)',
        shortCode: 'GATE 1',
        status: 'filling',
        capacity: 65,
        approxOpen: 11,
        walkMinutes: 2,
        walkMeters: 140,
        covered: true,
        fillsFirstNote: 'Fills first before 9:15 AM classes',
        walkDirections: [
          'Enter through Main Gate turnstiles.',
          'Follow the shaded two-wheeler lane beside the security booth.',
        ],
        rect: { x: 32, y: 152, width: 156, height: 96 },
        pinAnchor: { x: 110, y: 200 },
        routeFromEntrance: [
          { x: 84, y: 318 },
          { x: 110, y: 266 },
          { x: 110, y: 200 },
        ],
        geoOffset: { northMeters: -144, eastMeters: -86, halfWidthMeters: 22, halfLengthMeters: 16 },
        lastUpdatedAt: new Date(Date.now() - 8 * 60000).toISOString(),
        updatedBy: 'guard',
      },
      {
        id: 'lpu-sec-unimall',
        name: 'LPU Uni Mall',
        shortCode: 'UNI MALL',
        status: 'free',
        capacity: 90,
        approxOpen: 34,
        walkMinutes: 2,
        walkMeters: 125,
        covered: true,
        fillsFirstNote: 'Steady turnover near food court & shops',
        walkDirections: [
          'Walk south out of Uni Mall main plaza.',
          'Head to the marked scooter shed beside the central boulevard.',
        ],
        rect: { x: 224, y: 124, width: 174, height: 92 },
        pinAnchor: { x: 311, y: 170 },
        routeFromEntrance: [
          { x: 84, y: 318 },
          { x: 204, y: 276 },
          { x: 311, y: 170 },
        ],
        geoOffset: { northMeters: 55, eastMeters: 114, halfWidthMeters: 24, halfLengthMeters: 15 },
        lastUpdatedAt: new Date(Date.now() - 4 * 60000).toISOString(),
        updatedBy: 'guard',
      },
      {
        id: 'lpu-sec-block34',
        name: 'LPU Block 34 (Engineering)',
        shortCode: 'BLK 34',
        status: 'free',
        capacity: 80,
        approxOpen: 29,
        walkMinutes: 3,
        walkMeters: 210,
        covered: true,
        fillsFirstNote: 'Open bays behind Block 34 stairs',
        walkDirections: [
          'Exit Block 34 ground floor towards the east walkway.',
          'Two-wheeler rows are under the metal awning.',
        ],
        rect: { x: 434, y: 116, width: 174, height: 108 },
        pinAnchor: { x: 521, y: 170 },
        routeFromEntrance: [
          { x: 84, y: 318 },
          { x: 210, y: 282 },
          { x: 416, y: 244 },
          { x: 521, y: 170 },
        ],
        geoOffset: { northMeters: 211, eastMeters: -19, halfWidthMeters: 26, halfLengthMeters: 18 },
        lastUpdatedAt: new Date(Date.now() - 6 * 60000).toISOString(),
        updatedBy: 'guard',
      },
      {
        id: 'lpu-sec-unipolis',
        name: 'LPU Unipolis Arena',
        shortCode: 'UNIPOLIS',
        status: 'free',
        capacity: 110,
        approxOpen: 48,
        walkMinutes: 3,
        walkMeters: 240,
        covered: false,
        fillsFirstNote: 'Spacious open bay near Unipolis plaza',
        walkDirections: [
          'Walk toward Unipolis main entrance steps.',
          'Look for numbered bike bays along the outer ring road.',
        ],
        rect: { x: 396, y: 256, width: 212, height: 88 },
        pinAnchor: { x: 502, y: 300 },
        routeFromEntrance: [
          { x: 84, y: 318 },
          { x: 240, y: 306 },
          { x: 502, y: 300 },
        ],
        geoOffset: { northMeters: -55, eastMeters: 247, halfWidthMeters: 28, halfLengthMeters: 15 },
        lastUpdatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
        updatedBy: 'system',
      },
      {
        id: 'lpu-sec-hostel',
        name: 'LPU BH-1 Hostel',
        shortCode: 'BH-1',
        status: 'free',
        capacity: 75,
        approxOpen: 38,
        walkMinutes: 4,
        walkMeters: 310,
        covered: false,
        fillsFirstNote: 'Calm residential lot · usually open',
        walkDirections: [
          'Follow the hostel road north past the sports ground.',
          'Bike parking is right outside the BH-1 security gate.',
        ],
        rect: { x: 224, y: 256, width: 146, height: 68 },
        pinAnchor: { x: 297, y: 290 },
        routeFromEntrance: [
          { x: 84, y: 318 },
          { x: 297, y: 290 },
        ],
        geoOffset: { northMeters: 300, eastMeters: 190, halfWidthMeters: 24, halfLengthMeters: 14 },
        lastUpdatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
        updatedBy: 'guard',
      },
    ],
  },
  {
    id: 'lpu-law-gate',
    name: 'LPU Law Gate Market',
    shortName: 'Law Gate',
    category: 'market',
    areaLabel: 'Student Market & Cafes · Quick Stops',
    entranceLabel: 'Law Gate Arch',
    entrancePoint: { x: 96, y: 320 },
    mainBuildingLabel: 'Law Gate Food Street',
    mainBuildingRect: { x: 184, y: 24, width: 270, height: 62 },
    orientationNote: 'Law Gate Arch at campus boundary · Market lane ahead',
    guardAdvisory: 'Avoid parking in front of main road crossings during evening rush.',
    anchorCenter: { lat: 31.2582, lng: 75.7022 },
    sections: [
      {
        id: 'lg-entrance',
        name: 'Law Gate Entry Bay',
        shortCode: 'BAY 1',
        status: 'filling',
        capacity: 45,
        approxOpen: 8,
        walkMinutes: 1,
        walkMeters: 50,
        covered: false,
        fillsFirstNote: 'Busy after 5:00 PM',
        walkDirections: ['Park inside the paved bay right past the Law Gate arch.'],
        rect: { x: 32, y: 136, width: 158, height: 96 },
        pinAnchor: { x: 111, y: 184 },
        routeFromEntrance: [
          { x: 96, y: 320 },
          { x: 111, y: 184 },
        ],
        geoOffset: { northMeters: 15, eastMeters: -45, halfWidthMeters: 22, halfLengthMeters: 16 },
        lastUpdatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
        updatedBy: 'guard',
      },
      {
        id: 'lg-plaza',
        name: 'Law Gate Plaza Side',
        shortCode: 'BAY 2',
        status: 'free',
        capacity: 60,
        approxOpen: 26,
        walkMinutes: 2,
        walkMeters: 110,
        covered: false,
        fillsFirstNote: 'Open spots beside cafe lane',
        walkDirections: ['Walk 90m past the pharmacy corner to the open bike row.'],
        rect: { x: 224, y: 120, width: 186, height: 98 },
        pinAnchor: { x: 317, y: 169 },
        routeFromEntrance: [
          { x: 96, y: 320 },
          { x: 210, y: 268 },
          { x: 317, y: 169 },
        ],
        geoOffset: { northMeters: 42, eastMeters: 38, halfWidthMeters: 24, halfLengthMeters: 16 },
        lastUpdatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
        updatedBy: 'guard',
      },
    ],
  },
  {
    id: 'lpu-uni-hospital',
    name: 'LPU Uni Hospital',
    shortName: 'Uni Hospital',
    category: 'hospital',
    areaLabel: 'Campus Clinic & Visitor Lot',
    entranceLabel: 'Clinic Entry',
    entrancePoint: { x: 88, y: 320 },
    mainBuildingLabel: 'Uni Hospital & Pharmacy',
    mainBuildingRect: { x: 170, y: 24, width: 290, height: 64 },
    orientationNote: 'Emergency lane clear · Visitor two-wheeler shed on east',
    guardAdvisory: 'Keep ambulance entry completely unobstructed.',
    anchorCenter: { lat: 31.2539, lng: 75.7062 },
    sections: [
      {
        id: 'uh-visitor-shed',
        name: 'Uni Hospital Visitor Shed',
        shortCode: 'ZONE 1',
        status: 'free',
        capacity: 40,
        approxOpen: 19,
        walkMinutes: 1,
        walkMeters: 45,
        covered: true,
        fillsFirstNote: 'Shaded bays right beside clinic reception',
        walkDirections: ['Exit clinic lobby and turn east toward the covered shed.'],
        rect: { x: 32, y: 126, width: 168, height: 102 },
        pinAnchor: { x: 116, y: 177 },
        routeFromEntrance: [
          { x: 88, y: 320 },
          { x: 116, y: 177 },
        ],
        geoOffset: { northMeters: 20, eastMeters: 30, halfWidthMeters: 24, halfLengthMeters: 16 },
        lastUpdatedAt: new Date(Date.now() - 6 * 60000).toISOString(),
        updatedBy: 'guard',
      },
      {
        id: 'uh-ambulance',
        name: 'Ambulance Lane (No Park)',
        shortCode: 'NO PARK',
        status: 'restricted',
        capacity: 0,
        approxOpen: 0,
        walkMinutes: 1,
        walkMeters: 20,
        covered: false,
        fillsFirstNote: '24/7 Emergency Corridor',
        fineWarning: 'No two-wheeler parking allowed in emergency lane',
        walkDirections: ['Keep emergency ramp clear at all times.'],
        rect: { x: 230, y: 254, width: 378, height: 74 },
        pinAnchor: { x: 419, y: 291 },
        routeFromEntrance: [
          { x: 88, y: 320 },
          { x: 419, y: 291 },
        ],
        geoOffset: { northMeters: -25, eastMeters: -15, halfWidthMeters: 30, halfLengthMeters: 12 },
        lastUpdatedAt: new Date(Date.now() - 35 * 60000).toISOString(),
        updatedBy: 'guard',
      },
    ],
  },
];
