import { TripQueryVariables, TripViaLocationInput } from '../../gql/graphql.ts';
import { Marker } from 'react-map-gl/maplibre';
import markerFlagStart from '../../static/img/marker-flag-start-shadowed.png';
import markerFlagEnd from '../../static/img/marker-flag-end-shadowed.png';
import { useCoordinateResolver } from './useCoordinateResolver.ts';

const ViaMarkerIcon = () => (
  <svg
    width="34"
    height="42"
    viewBox="0 0 36 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ cursor: 'pointer' }}
  >
    <path
      d="M18 2C10.268 2 4 8.268 4 16C4 26 18 40 18 40C18 40 32 26 32 16C32 8.268 25.732 2 18 2Z"
      fill="#F59E0B"
      stroke="#FFFFFF"
      strokeWidth="2"
    />
    <circle cx="18" cy="16" r="6.5" fill="#FFFFFF" />
    <text x="18" y="19.5" textAnchor="middle" fill="#B45309" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
      V
    </text>
  </svg>
);

export function NavigationMarkers({
  setCursor,
  tripQueryVariables,
  setTripQueryVariables,
  loading,
}: {
  setCursor: (cursor: string) => void;
  tripQueryVariables: TripQueryVariables;
  setTripQueryVariables: (variables: TripQueryVariables) => void;
  loading: boolean;
}) {
  const fromCoordinates = useCoordinateResolver(tripQueryVariables.from);
  const toCoordinates = useCoordinateResolver(tripQueryVariables.to);

  const viaLocations: TripViaLocationInput[] = Array.isArray(tripQueryVariables.via)
    ? tripQueryVariables.via
    : tripQueryVariables.via
      ? [tripQueryVariables.via]
      : [];

  return (
    <>
      {fromCoordinates && (
        <Marker
          draggable
          latitude={fromCoordinates.latitude}
          longitude={fromCoordinates.longitude}
          onDragStart={() => setCursor('grabbing')}
          onDragEnd={(e) => {
            setCursor('auto');
            if (!loading) {
              setTripQueryVariables({
                ...tripQueryVariables,
                from: { coordinates: { latitude: e.lngLat.lat, longitude: e.lngLat.lng } },
              });
            }
          }}
          anchor="bottom-right"
        >
          <img alt="" src={markerFlagStart} height={48} width={49} />
        </Marker>
      )}
      {viaLocations.map((viaLoc, idx) => {
        const coord = viaLoc.visit?.coordinate;
        if (!coord) return null;
        return (
          <Marker
            key={`via-${idx}`}
            draggable
            latitude={coord.latitude}
            longitude={coord.longitude}
            onDragStart={() => setCursor('grabbing')}
            onDragEnd={(e) => {
              setCursor('auto');
              if (!loading) {
                const updatedVia: TripViaLocationInput[] = [...viaLocations];
                const currentVisit = viaLoc.visit;
                if (currentVisit) {
                  updatedVia[idx] = {
                    visit: {
                      ...currentVisit,
                      coordinate: {
                        latitude: e.lngLat.lat,
                        longitude: e.lngLat.lng,
                      },
                    },
                  };
                  setTripQueryVariables({
                    ...tripQueryVariables,
                    via: updatedVia,
                  });
                }
              }
            }}
            anchor="bottom"
          >
            <ViaMarkerIcon />
          </Marker>
        );
      })}
      {toCoordinates && (
        <Marker
          draggable
          latitude={toCoordinates.latitude}
          longitude={toCoordinates.longitude}
          onDragStart={() => setCursor('grabbing')}
          onDragEnd={(e) => {
            setCursor('auto');
            if (!loading) {
              setTripQueryVariables({
                ...tripQueryVariables,
                to: { coordinates: { latitude: e.lngLat.lat, longitude: e.lngLat.lng } },
              });
            }
          }}
          anchor="bottom-right"
        >
          <img alt="" src={markerFlagEnd} height={48} width={49} />
        </Marker>
      )}
    </>
  );
}
