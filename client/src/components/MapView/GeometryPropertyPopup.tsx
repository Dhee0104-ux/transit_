import { LngLat, Popup } from 'react-map-gl/maplibre';
import { Button, Table } from 'react-bootstrap';
import { useState } from 'react';

export function GeometryPropertyPopup({
  coordinates,
  properties,
  onClose,
}: {
  coordinates: LngLat;
  properties: { [s: string]: string };
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
    <Popup
      latitude={coordinates.lat}
      longitude={coordinates.lng}
      closeButton={true}
      onClose={() => onClose()}
      maxWidth="500px"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '2px' }}
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
            📍 {formattedCoords}
          </span>
          <Button
            variant={copied ? 'success' : 'outline-primary'}
            size="sm"
            onClick={handleCopy}
            title="Copy coordinates to clipboard"
            style={{ padding: '1px 6px', fontSize: '11px' }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </Button>
        </div>

        <Table bordered size="sm" style={{ marginBottom: '6px', fontSize: '12px' }}>
          <tbody>
            {Object.entries(properties).map(([key, value]) => (
              <tr key={key}>
                <th scope="row" style={{ padding: '2px 6px' }}>{key}</th>
                <td style={{ padding: '2px 6px', wordBreak: 'break-all' }}>{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="geometry-popup-osm-link" style={{ textAlign: 'right' }}>
          <a
            href={`https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lng}#map=18/${coordinates.lat}/${coordinates.lng}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '12px', textDecoration: 'none' }}
          >
            ↗️ Open in osm.org
          </a>
        </div>
      </div>
    </Popup>
  );
}
