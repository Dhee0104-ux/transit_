import { TripQueryVariables } from '../../gql/graphql.ts';
import { LngLat, Popup } from 'react-map-gl/maplibre';
import { Button, ButtonGroup } from 'react-bootstrap';
import { useState } from 'react';

export function ContextMenuPopup({
  tripQueryVariables,
  setTripQueryVariables,
  coordinates,
  onClose,
}: {
  tripQueryVariables: TripQueryVariables;
  setTripQueryVariables: (variables: TripQueryVariables) => void;
  coordinates: LngLat;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const formattedCoords = `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(formattedCoords);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popup longitude={coordinates.lng} latitude={coordinates.lat} anchor="bottom" onClose={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: '160px', padding: '2px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8f9fa',
            padding: '4px 6px',
            borderRadius: '4px',
            marginBottom: '6px',
            border: '1px solid #e9ecef',
          }}
        >
          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, color: '#333' }}>
            {formattedCoords}
          </span>
          <Button
            variant={copied ? 'success' : 'outline-primary'}
            size="sm"
            onClick={handleCopy}
            title="Copy coordinates to clipboard"
            style={{ padding: '1px 6px', fontSize: '11px', marginLeft: '6px' }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </Button>
        </div>

        <ButtonGroup vertical style={{ width: '100%' }}>
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => {
              setTripQueryVariables({
                ...tripQueryVariables,
                from: {
                  coordinates: {
                    latitude: coordinates.lat,
                    longitude: coordinates.lng,
                  },
                },
              });
              onClose();
            }}
          >
            📍 Start here
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => {
              setTripQueryVariables({
                ...tripQueryVariables,
                via: [
                  {
                    visit: {
                      coordinate: {
                        latitude: coordinates.lat,
                        longitude: coordinates.lng,
                      },
                    },
                  },
                ],
              });
              onClose();
            }}
          >
            🚩 Via here
          </Button>
          <Button
            size="sm"
            variant="outline-success"
            onClick={() => {
              setTripQueryVariables({
                ...tripQueryVariables,
                to: {
                  coordinates: {
                    latitude: coordinates.lat,
                    longitude: coordinates.lng,
                  },
                },
              });
              onClose();
            }}
          >
            🎯 End here
          </Button>
        </ButtonGroup>
      </div>
    </Popup>
  );
}
