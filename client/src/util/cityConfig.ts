export type CityKey = 'bengaluru';

export interface LocationPreset {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  category: 'metro' | 'bus' | 'hub' | 'airport' | 'landmark';
}

export interface CityConfig {
  key: CityKey;
  name: string;
  state: string;
  subtitle: string;
  center: [number, number]; // [lon, lat] for MapLibre
  zoom: number;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  presets: LocationPreset[];
  metroLines: {
    name: string;
    code: string;
    color: string;
    textColor: string;
    terminus: string;
  }[];
  busAgencies: {
    name: string;
    code: string;
    color: string;
  }[];
}

export const CITIES: Record<CityKey, CityConfig> = {
  bengaluru: {
    key: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    subtitle: 'Namma Metro (BMRCL) & BMTC Bus',
    center: [77.5946, 12.9716],
    zoom: 12.5,
    bbox: [77.40, 12.75, 77.85, 13.20],
    presets: [
      { id: 'blr-majestic', name: 'Kempegowda (Majestic)', area: 'City Center Hub', latitude: 12.9755, longitude: 77.5731, category: 'hub' },
      { id: 'blr-indiranagar', name: 'Indiranagar', area: '100ft Road / CMH', latitude: 12.9783, longitude: 77.6386, category: 'metro' },
      { id: 'blr-mgroad', name: 'MG Road', area: 'Brigade Rd / CBD', latitude: 12.9756, longitude: 77.6067, category: 'metro' },
      { id: 'blr-whitefield', name: 'Whitefield (Kadugodi)', area: 'ITPB Tech Corridor', latitude: 12.9957, longitude: 77.7579, category: 'metro' },
      { id: 'blr-attiguppe', name: 'Attiguppe', area: 'Vijayanagar South', latitude: 12.9619, longitude: 77.5336, category: 'metro' },
      { id: 'blr-yeshwanthpur', name: 'Yeshwanthpur', area: 'Railway Junction', latitude: 13.0232, longitude: 77.5497, category: 'hub' },
      { id: 'blr-jayanagar', name: 'Jayanagar', area: '4th Block Complex', latitude: 12.9382, longitude: 77.5800, category: 'metro' },
      { id: 'blr-airport', name: 'Kempegowda Intl Airport', area: 'Devanahalli (KIA)', latitude: 13.1986, longitude: 77.7066, category: 'airport' },
      { id: 'blr-silkboard', name: 'Silk Board Junction', area: 'Hosur Road / HSR', latitude: 12.9172, longitude: 77.6227, category: 'hub' },
      { id: 'blr-ecity', name: 'Electronic City Phase 1', area: 'Toll Gate / Infosys', latitude: 12.8452, longitude: 77.6602, category: 'hub' },
      { id: 'blr-marathahalli', name: 'Marathahalli Bridge', area: 'Outer Ring Road', latitude: 12.9592, longitude: 77.6974, category: 'hub' },
      { id: 'blr-hebbal', name: 'Hebbal Flyover', area: 'Bellary Road', latitude: 13.0358, longitude: 77.5970, category: 'hub' },
      { id: 'blr-banashankari', name: 'Banashankari TTMC', area: 'Kanakapura Road', latitude: 12.9156, longitude: 77.5736, category: 'hub' },
      { id: 'blr-koramangala', name: 'Koramangala', area: 'Sony World Signal', latitude: 12.9352, longitude: 77.6245, category: 'landmark' },
      { id: 'blr-krpuram', name: 'KR Puram Station', area: 'Old Madras Road', latitude: 13.0012, longitude: 77.6963, category: 'hub' },
    ],
    metroLines: [
      { name: 'Purple Line', code: 'PUR', color: '#7E22CE', textColor: '#FFFFFF', terminus: 'Whitefield ⟷ Challaghatta' },
      { name: 'Green Line', code: 'GRN', color: '#16A34A', textColor: '#FFFFFF', terminus: 'Madavara ⟷ Silk Institute' },
    ],
    busAgencies: [
      { name: 'BMTC Ordinary', code: 'BMTC', color: '#DC2626' },
      { name: 'BMTC Vajra Volvo AC', code: 'VAJRA', color: '#DC2626' },
      { name: 'Vayu Vajra Airport', code: 'KIA', color: '#DC2626' },
    ],
  },
};

export function detectCityFromCoordinates(_lat?: number | null, _lon?: number | null): CityKey {
  return 'bengaluru';
}
