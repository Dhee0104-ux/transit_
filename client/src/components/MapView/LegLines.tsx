import { TripPattern } from '../../gql/graphql.ts';
import { Layer, Source } from 'react-map-gl/maplibre';
import { decode } from '@googlemaps/polyline-codec';
import { getColorForLeg } from '../../util/getColorForLeg.ts';

export function LegLines({
  tripPattern,
  patternIndex = 0,
}: {
  tripPattern?: TripPattern;
  patternIndex?: number;
}) {
  return (
    <>
      {tripPattern?.legs.map((leg, i) => {
        let coords: [number, number][] = [];

        if (leg.pointsOnLink?.points) {
          try {
            coords = decode(leg.pointsOnLink.points as string, 5).map((value) => [value[1], value[0]]);
          } catch (e) {
            console.warn('Failed to decode pointsOnLink:', e);
          }
        }

        // Guaranteed fallback if pointsOnLink is empty: connect fromPlace to toPlace coordinates
        if (coords.length === 0) {
          const fromLat = leg.fromPlace?.latitude;
          const fromLon = leg.fromPlace?.longitude;
          const toLat = leg.toPlace?.latitude;
          const toLon = leg.toPlace?.longitude;

          if (
            typeof fromLat === 'number' &&
            typeof fromLon === 'number' &&
            typeof toLat === 'number' &&
            typeof toLon === 'number'
          ) {
            coords = [
              [fromLon, fromLat],
              [toLon, toLat],
            ];
          }
        }

        if (coords.length === 0) return null;

        const isFoot = leg.mode?.toLowerCase() === 'foot';
        const sourceId = `source-pat${patternIndex}-leg${i}-${leg.mode || 'leg'}`;
        const casingLayerId = `layer-casing-pat${patternIndex}-leg${i}-${leg.mode || 'leg'}`;
        const lineLayerId = `layer-line-pat${patternIndex}-leg${i}-${leg.mode || 'leg'}`;

        return (
          <Source
            key={sourceId}
            id={sourceId}
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coords,
              },
            }}
          >
            {/* Base casing / contrast shadow */}
            <Layer
              id={casingLayerId}
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round',
              }}
              paint={{
                'line-color': isFoot ? '#111111' : '#000000',
                'line-width': isFoot ? 6 : 6,
                ...(isFoot ? { 'line-dasharray': [1.5, 2] } : {}),
              }}
            />
            {/* Primary Colored Route Line */}
            <Layer
              id={lineLayerId}
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round',
              }}
              paint={{
                'line-color': isFoot ? '#0066FF' : getColorForLeg(leg),
                'line-width': isFoot ? 4 : 4.5,
                ...(isFoot ? { 'line-dasharray': [1.5, 2] } : {}),
              }}
            />
          </Source>
        );
      })}
    </>
  );
}
