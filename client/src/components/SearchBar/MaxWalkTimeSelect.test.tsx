import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  MaxWalkTimeSelect,
  minutesToIsoDuration,
  isoDurationToMinutes,
} from './MaxWalkTimeSelect.tsx';
import { StreetMode, TripQueryVariables } from '../../gql/graphql.ts';

describe('MaxWalkTimeSelect utilities', () => {
  it('converts minutes to ISO duration correctly', () => {
    expect(minutesToIsoDuration(15)).toBe('PT15M');
    expect(minutesToIsoDuration(30)).toBe('PT30M');
    expect(minutesToIsoDuration(60)).toBe('PT1H');
    expect(minutesToIsoDuration(90)).toBe('PT1H30M');
    expect(minutesToIsoDuration(120)).toBe('PT2H');
  });

  it('converts ISO duration to minutes correctly', () => {
    expect(isoDurationToMinutes('PT15M')).toBe(15);
    expect(isoDurationToMinutes('PT30M')).toBe(30);
    expect(isoDurationToMinutes('PT1H')).toBe(60);
    expect(isoDurationToMinutes('PT1H30M')).toBe(90);
    expect(isoDurationToMinutes('PT2H')).toBe(120);
    expect(isoDurationToMinutes(null)).toBe(120);
    expect(isoDurationToMinutes('')).toBe(120);
  });
});

describe('MaxWalkTimeSelect component', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders default flexible 120 min when no duration specified', () => {
    const vars: TripQueryVariables = { from: {}, to: {} };
    render(<MaxWalkTimeSelect tripQueryVariables={vars} setTripQueryVariables={() => {}} />);
    const select = screen.getByLabelText('Select maximum walking duration') as HTMLSelectElement;
    expect(select.value).toBe('120');
  });

  it('calls setTripQueryVariables when changing preset duration', () => {
    const setTripQueryVariables = vi.fn();
    const vars: TripQueryVariables = { from: {}, to: {} };
    render(
      <MaxWalkTimeSelect
        tripQueryVariables={vars}
        setTripQueryVariables={setTripQueryVariables}
      />,
    );

    const select = screen.getByLabelText('Select maximum walking duration');
    fireEvent.change(select, { target: { value: '30' } });

    expect(setTripQueryVariables).toHaveBeenCalledWith(
      expect.objectContaining({
        maxAccessEgressDurationForMode: [
          {
            streetMode: StreetMode.Foot,
            duration: 'PT30M',
          },
        ],
        maxDirectDurationForMode: [
          {
            streetMode: StreetMode.Foot,
            duration: 'PT30M',
          },
        ],
      }),
    );
  });

  it('allows custom minute input when custom is selected', () => {
    const setTripQueryVariables = vi.fn();
    const vars: TripQueryVariables = { from: {}, to: {} };
    render(
      <MaxWalkTimeSelect
        tripQueryVariables={vars}
        setTripQueryVariables={setTripQueryVariables}
      />,
    );

    const select = screen.getByLabelText('Select maximum walking duration');
    fireEvent.change(select, { target: { value: 'custom' } });

    const customInput = screen.getByPlaceholderText('Min') as HTMLInputElement;
    expect(customInput).toBeDefined();

    fireEvent.change(customInput, { target: { value: '42' } });

    expect(setTripQueryVariables).toHaveBeenLastCalledWith(
      expect.objectContaining({
        maxAccessEgressDurationForMode: [
          {
            streetMode: StreetMode.Foot,
            duration: 'PT42M',
          },
        ],
        maxDirectDurationForMode: [
          {
            streetMode: StreetMode.Foot,
            duration: 'PT42M',
          },
        ],
      }),
    );
  });
});

