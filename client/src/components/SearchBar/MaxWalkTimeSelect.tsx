import { ChangeEvent, useMemo, useState } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { StreetMode, TripQueryVariables } from '../../gql/graphql.ts';

export function minutesToIsoDuration(minutes: number): string {
  if (minutes < 60) {
    return `PT${minutes}M`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `PT${hours}H`;
  }
  return `PT${hours}H${remainingMins}M`;
}

export function isoDurationToMinutes(duration?: string | null): number {
  if (!duration) return 120;
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!match) return 120;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  const total = hours * 60 + mins;
  return total > 0 ? total : 120;
}

const PRESET_OPTIONS = [
  { value: '120', label: 'Flexible / Max (2 hr)' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min (Moderate)' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min (1 hr)' },
  { value: '90', label: '90 min (1.5 hr)' },
  { value: 'custom', label: 'Custom min...' },
];

export function MaxWalkTimeSelect({
  tripQueryVariables,
  setTripQueryVariables,
}: {
  tripQueryVariables: TripQueryVariables;
  setTripQueryVariables: (tripQueryVariables: TripQueryVariables) => void;
}) {
  const currentMinutes = useMemo(() => {
    const raw = tripQueryVariables.maxAccessEgressDurationForMode;
    const entry = Array.isArray(raw) ? raw[0] : raw;
    const duration = entry?.duration;
    return isoDurationToMinutes(duration);
  }, [tripQueryVariables.maxAccessEgressDurationForMode]);

  const [isCustom, setIsCustom] = useState(() => {
    return !PRESET_OPTIONS.slice(0, -1).some((opt) => parseInt(opt.value, 10) === currentMinutes);
  });
  const [customValue, setCustomValue] = useState<string>(currentMinutes.toString());

  const applyWalkDuration = (minutes: number) => {
    const safeMinutes = Math.max(1, Math.min(240, minutes));
    const isoDuration = minutesToIsoDuration(safeMinutes);

    setTripQueryVariables({
      ...tripQueryVariables,
      maxAccessEgressDurationForMode: [
        {
          streetMode: StreetMode.Foot,
          duration: isoDuration,
        },
      ],
      maxDirectDurationForMode: [
        {
          streetMode: StreetMode.Foot,
          duration: isoDuration,
        },
      ],
    });
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustom(true);
      applyWalkDuration(parseInt(customValue, 10) || 120);
    } else {
      setIsCustom(false);
      const minutes = parseInt(val, 10);
      setCustomValue(minutes.toString());
      applyWalkDuration(minutes);
    }
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomValue(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 240) {
      applyWalkDuration(parsed);
    }
  };

  const selectValue = isCustom ? 'custom' : currentMinutes.toString();

  return (
    <Form.Group>
      <Form.Label column="sm" htmlFor="maxWalkTimeSelect">
        Walk Limit
      </Form.Label>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <Form.Select
          id="maxWalkTimeSelect"
          size="sm"
          className="input-medium"
          style={{ minWidth: isCustom ? '120px' : '150px', fontWeight: 500 }}
          value={selectValue}
          onChange={handleSelectChange}
          aria-label="Select maximum walking duration"
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Form.Select>
        {isCustom && (
          <InputGroup size="sm" style={{ width: '85px' }}>
            <Form.Control
              type="number"
              min={1}
              max={240}
              size="sm"
              value={customValue}
              onChange={handleCustomChange}
              title="Enter custom walk minutes (1 - 240)"
              placeholder="Min"
              style={{ padding: '2px 6px', textAlign: 'center' }}
            />
            <InputGroup.Text style={{ padding: '2px 6px', fontSize: '11px' }}>m</InputGroup.Text>
          </InputGroup>
        )}
      </div>
    </Form.Group>
  );
}

