export type SectionStatus = 'free' | 'filling' | 'full' | 'restricted';

export type LotCategory = 'campus' | 'market' | 'hospital';

export type AppTab = 'find' | 'my-bike' | 'guard';

export interface MapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface GeoZoneOffset {
  northMeters: number;
  eastMeters: number;
  halfWidthMeters: number;
  halfLengthMeters: number;
}

export interface ParkingSection {
  id: string;
  name: string;
  shortCode: string;
  status: SectionStatus;
  capacity: number;
  approxOpen: number;
  walkMinutes: number;
  walkMeters: number;
  covered: boolean;
  fillsFirstNote: string;
  fineWarning?: string;
  walkDirections: string[];
  rect: MapRect;
  pinAnchor: MapPoint;
  routeFromEntrance: MapPoint[];
  geoOffset: GeoZoneOffset;
  lastUpdatedAt: string;
  updatedBy: 'guard' | 'rider' | 'system';
}

export interface ParkingLot {
  id: string;
  name: string;
  shortName: string;
  category: LotCategory;
  areaLabel: string;
  entranceLabel: string;
  entrancePoint: MapPoint;
  mainBuildingLabel: string;
  mainBuildingRect: MapRect;
  orientationNote: string;
  guardAdvisory: string;
  anchorCenter: LatLngLiteral;
  anchoredPlaceName?: string;
  anchoredAddress?: string;
  sections: ParkingSection[];
}

export interface GpsCoordinate {
  lat: number;
  lng: number;
  accuracy?: number;
  isSimulated?: boolean;
}

export interface ParkedSpot {
  id: string;
  lotId: string;
  lotName: string;
  sectionId: string;
  sectionName: string;
  rowCue: string;
  landmarkCue: string;
  note: string;
  vehicleLabel: string;
  photoDataUrl?: string;
  gps?: GpsCoordinate;
  parkedAt: string;
}

export interface ParkingHistoryItem {
  id: string;
  lotId: string;
  lotName: string;
  sectionId: string;
  sectionName: string;
  rowCue: string;
  landmarkCue: string;
  note: string;
  vehicleLabel: string;
  parkedAt: string;
  clearedAt: string;
}
