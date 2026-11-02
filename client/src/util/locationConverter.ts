import { COORDINATE_PRECISION } from '../components/SearchBar/constants.ts';
import { Location, TripViaLocationInput } from '../gql/graphql.ts';

const DOUBLE_PATTERN = '-{0,1}\\d+(\\.\\d+){0,1}';

const LAT_LON_PATTERN = '(' + DOUBLE_PATTERN + ')([,\\s]+)(' + DOUBLE_PATTERN + ')';

export function parseLocation(value: string): Location | null {
  if (!value) return null;
  const clean = value.replace(/[()[\]{}]/g, '').trim();
  const latLonMatch = clean.match(LAT_LON_PATTERN);

  if (latLonMatch) {
    return {
      coordinates: {
        latitude: +latLonMatch[1],
        longitude: +latLonMatch[3],
      },
    };
  }

  return {
    place: value.trim(),
  };
}

export function toString(location: Location): string | null {
  if (location?.coordinates) {
    return `${location.coordinates?.latitude.toPrecision(
      COORDINATE_PRECISION,
    )} ${location.coordinates?.longitude.toPrecision(COORDINATE_PRECISION)}`;
  }

  if (location?.place) {
    return location.place;
  }

  return null;
}

export function parseViaLocation(value: string): TripViaLocationInput | null {
  if (!value || value.trim() === '') {
    return null;
  }

  const clean = value.replace(/[()[\]{}]/g, '').trim();
  const latLonMatch = clean.match(LAT_LON_PATTERN);

  if (latLonMatch) {
    return {
      visit: {
        coordinate: {
          latitude: +latLonMatch[1],
          longitude: +latLonMatch[3],
        },
      },
    };
  }

  return {
    visit: {
      stopLocationIds: [value.trim()],
    },
  };
}

export function viaToString(via: TripViaLocationInput | null | undefined): string | null {
  if (!via) {
    return null;
  }

  if (via.visit?.coordinate) {
    return `${via.visit.coordinate.latitude.toPrecision(
      COORDINATE_PRECISION,
    )} ${via.visit.coordinate.longitude.toPrecision(COORDINATE_PRECISION)}`;
  }

  if (via.visit?.stopLocationIds && via.visit.stopLocationIds.length > 0) {
    return via.visit.stopLocationIds.join(', ');
  }

  if (via.visit?.label) {
    return via.visit.label;
  }

  if (via.passThrough?.stopLocationIds && via.passThrough.stopLocationIds.length > 0) {
    return via.passThrough.stopLocationIds.join(', ');
  }

  return null;
}
