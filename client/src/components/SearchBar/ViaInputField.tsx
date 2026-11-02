import { Form, Button, InputGroup } from 'react-bootstrap';
import { viaToString, parseViaLocation } from '../../util/locationConverter.ts';
import { TripQueryVariables } from '../../gql/graphql.ts';
import { useCallback, useState } from 'react';

interface Props {
  id?: string;
  label?: string;
  tripQueryVariables: TripQueryVariables;
  setTripQueryVariables: (tripQueryVariables: TripQueryVariables) => void;
}

export function ViaInputField({
  id = 'viaInputField',
  label = 'Via',
  tripQueryVariables,
  setTripQueryVariables,
}: Props) {
  const currentVia =
    Array.isArray(tripQueryVariables.via) && tripQueryVariables.via.length > 0
      ? tripQueryVariables.via[0]
      : !Array.isArray(tripQueryVariables.via) && tripQueryVariables.via
        ? tripQueryVariables.via
        : null;

  const viaString = viaToString(currentVia) || '';
  const [value, setValue] = useState(viaString);
  const [copied, setCopied] = useState(false);

  const [prevVia, setPrevVia] = useState(currentVia);
  if (prevVia !== currentVia) {
    setPrevVia(currentVia);
    setValue(viaString);
  }

  const onViaChange = useCallback(
    (inputValue: string) => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
        setTripQueryVariables({
          ...tripQueryVariables,
          via: undefined,
        });
        return;
      }

      const newVia = parseViaLocation(trimmed);
      if (newVia) {
        setTripQueryVariables({
          ...tripQueryVariables,
          via: [newVia],
        });
      } else {
        setValue(viaString);
      }
    },
    [tripQueryVariables, setTripQueryVariables, viaString],
  );

  const onClear = useCallback(() => {
    setValue('');
    setTripQueryVariables({
      ...tripQueryVariables,
      via: undefined,
    });
  }, [tripQueryVariables, setTripQueryVariables]);

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
    <Form.Group className="position-relative">
      <Form.Label column="sm" htmlFor={id}>
        {label}
      </Form.Label>
      <InputGroup size="sm" style={{ minWidth: '185px' }}>
        <Form.Control
          type="text"
          id={id}
          size="sm"
          placeholder="[Optional via / map]"
          style={{ minWidth: '145px', fontFamily: 'monospace', fontSize: '12px' }}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onFocus={(e) => {
            e.target.select();
          }}
          onBlur={(event) => {
            onViaChange(event.target.value);
          }}
          value={value}
        />
        {value && (
          <>
            <Button
              variant="outline-secondary"
              size="sm"
              title={copied ? 'Copied to clipboard!' : 'Copy coordinates'}
              onClick={handleCopy}
              style={{ padding: '0 8px', fontSize: '13px' }}
            >
              {copied ? '✓' : '📋'}
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              title="Clear via location"
              onClick={onClear}
              style={{ padding: '0 8px', fontSize: '13px' }}
            >
              ×
            </Button>
          </>
        )}
      </InputGroup>
    </Form.Group>
  );
}
