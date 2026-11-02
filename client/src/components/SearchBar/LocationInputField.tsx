import { Button, Form, InputGroup } from 'react-bootstrap';
import { toString, parseLocation } from '../../util/locationConverter.ts';
import { TripQueryVariables } from '../../gql/graphql.ts';
import { useCallback, useState } from 'react';

interface Props {
  id: string;
  label: string;
  tripQueryVariables: TripQueryVariables;
  setTripQueryVariables: (tripQueryVariables: TripQueryVariables) => void;
  locationFieldKey: 'from' | 'to';
}

export function LocationInputField({ id, label, tripQueryVariables, setTripQueryVariables, locationFieldKey }: Props) {
  const currentLocation = tripQueryVariables[locationFieldKey];
  const locationString = toString(currentLocation) || '';
  const [value, setValue] = useState(locationString);
  const [copied, setCopied] = useState(false);

  const [prevLocation, setPrevLocation] = useState(currentLocation);
  if (prevLocation !== currentLocation) {
    setPrevLocation(currentLocation);
    setValue(locationString);
  }

  const onLocationChange = useCallback(
    (inputValue: string) => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
        // Explicitly cleared
        setTripQueryVariables({
          ...tripQueryVariables,
          [locationFieldKey]: {},
        });
        return;
      }

      const newLocation = parseLocation(trimmed);
      if (newLocation && (newLocation.coordinates || newLocation.place)) {
        setTripQueryVariables({
          ...tripQueryVariables,
          [locationFieldKey]: newLocation,
        });
      } else {
        // Revert to valid location string rather than deleting it
        setValue(locationString);
      }
    },
    [tripQueryVariables, setTripQueryVariables, locationFieldKey, locationString],
  );

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Form.Group>
      <Form.Label column="sm" htmlFor={id}>
        {label}
      </Form.Label>
      <InputGroup size="sm" style={{ minWidth: '185px' }}>
        <Form.Control
          type="text"
          id={id}
          size="sm"
          placeholder="[Click in map]"
          style={{ minWidth: '145px', fontFamily: 'monospace', fontSize: '12px' }}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onFocus={(e) => {
            // Auto-select text on click so user can copy immediately without text disappearing
            e.target.select();
          }}
          onBlur={(event) => {
            onLocationChange(event.target.value);
          }}
          value={value}
        />
        {value && (
          <Button
            variant="outline-secondary"
            size="sm"
            title={copied ? 'Copied to clipboard!' : 'Copy coordinates'}
            onClick={handleCopy}
            style={{ padding: '0 8px', fontSize: '13px' }}
          >
            {copied ? '✓' : '📋'}
          </Button>
        )}
      </InputGroup>
    </Form.Group>
  );
}
