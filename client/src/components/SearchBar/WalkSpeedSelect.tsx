import { ChangeEvent, useState } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { TripQueryVariables } from '../../gql/graphql.ts';

export const WALK_SPEED_PRESETS = [
  { value: '1.33', label: '🚶 Normal (4.8 km/h)' },
  { value: '0.83', label: '🐢 Leisurely / Slow (3.0 km/h)' },
  { value: '1.11', label: '🚶‍♂️ Moderate (4.0 km/h)' },
  { value: '1.67', label: '⚡ Brisk / Fast (6.0 km/h)' },
  { value: '2.22', label: '🏃 Jog (8.0 km/h)' },
  { value: 'custom', label: '⚙️ Custom speed...' },
];

export function WalkSpeedSelect({
  tripQueryVariables,
  setTripQueryVariables,
}: {
  tripQueryVariables: TripQueryVariables;
  setTripQueryVariables: (tripQueryVariables: TripQueryVariables) => void;
}) {
  const currentSpeed = tripQueryVariables.walkSpeed ?? 1.33;

  const [isCustom, setIsCustom] = useState(() => {
    return !WALK_SPEED_PRESETS.slice(0, -1).some(
      (opt) => Math.abs(parseFloat(opt.value) - currentSpeed) < 0.05,
    );
  });
  const [customKmH, setCustomKmH] = useState<string>(() => (currentSpeed * 3.6).toFixed(1));

  const applySpeedMs = (speedMs: number) => {
    const clamped = Math.max(0.3, Math.min(4.5, speedMs));
    setTripQueryVariables({
      ...tripQueryVariables,
      walkSpeed: Number(clamped.toFixed(2)),
    });
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustom(true);
      const parsed = parseFloat(customKmH);
      if (!isNaN(parsed) && parsed > 0) {
        applySpeedMs(parsed / 3.6);
      }
    } else {
      setIsCustom(false);
      const speed = parseFloat(val);
      setCustomKmH((speed * 3.6).toFixed(1));
      applySpeedMs(speed);
    }
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomKmH(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0.5 && parsed <= 15) {
      applySpeedMs(parsed / 3.6);
    }
  };

  const matchedPreset = WALK_SPEED_PRESETS.slice(0, -1).find(
    (opt) => Math.abs(parseFloat(opt.value) - currentSpeed) < 0.05,
  );
  const selectValue = isCustom || !matchedPreset ? 'custom' : matchedPreset.value;

  return (
    <Form.Group className="walk-speed-select-group">
      <Form.Label column="sm" htmlFor="walkSpeedSelect" title="Dynamic walking speed for ETA calculations">
        Walk Speed
      </Form.Label>
      <div className="d-flex align-items-center gap-1">
        <Form.Select
          id="walkSpeedSelect"
          size="sm"
          value={selectValue}
          onChange={handleSelectChange}
          style={{ minWidth: isCustom ? '120px' : '150px' }}
        >
          {WALK_SPEED_PRESETS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Form.Select>

        {isCustom && (
          <InputGroup size="sm" style={{ width: '100px' }}>
            <Form.Control
              type="number"
              step="0.5"
              min="1"
              max="15"
              value={customKmH}
              onChange={handleCustomChange}
              placeholder="km/h"
              title="Speed in km/h"
            />
            <InputGroup.Text>km/h</InputGroup.Text>
          </InputGroup>
        )}
      </div>
    </Form.Group>
  );
}

