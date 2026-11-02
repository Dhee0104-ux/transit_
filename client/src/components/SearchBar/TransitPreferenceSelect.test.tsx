import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TransitPreferenceSelect } from './TransitPreferenceSelect.tsx';
import { TransportMode, TripQueryVariables } from '../../gql/graphql.ts';

describe('TransitPreferenceSelect component', () => {
  afterEach(() => {
    cleanup();
  });
  it('defaults to balanced mode', () => {
    const vars: TripQueryVariables = { from: {}, to: {} };
    render(<TransitPreferenceSelect tripQueryVariables={vars} setTripQueryVariables={() => {}} />);
    const select = screen.getByLabelText('Select whether you prefer Metro, Bus, or Balanced routes') as HTMLSelectElement;
    expect(select.value).toBe('balanced');
  });

  it('selects prefer-bus and injects boardSlackList for metro', () => {
    const setTripQueryVariables = vi.fn();
    const vars: TripQueryVariables = { from: {}, to: {} };
    render(<TransitPreferenceSelect tripQueryVariables={vars} setTripQueryVariables={setTripQueryVariables} />);

    const select = screen.getByLabelText('Select whether you prefer Metro, Bus, or Balanced routes');
    fireEvent.change(select, { target: { value: 'prefer-bus' } });

    expect(setTripQueryVariables).toHaveBeenCalledWith(
      expect.objectContaining({
        boardSlackList: [{ modes: [TransportMode.Metro], slack: 1800 }],
        relaxTransitGroupPriority: undefined,
        modes: expect.objectContaining({
          transportModes: [
            { transportMode: TransportMode.Bus },
            { transportMode: TransportMode.Metro },
          ],
        }),
      }),
    );
  });

  it('selects prefer-metro and injects relaxTransitGroupPriority', () => {
    const setTripQueryVariables = vi.fn();
    const vars: TripQueryVariables = { from: {}, to: {} };
    render(<TransitPreferenceSelect tripQueryVariables={vars} setTripQueryVariables={setTripQueryVariables} />);

    const select = screen.getByLabelText('Select whether you prefer Metro, Bus, or Balanced routes');
    fireEvent.change(select, { target: { value: 'prefer-metro' } });

    expect(setTripQueryVariables).toHaveBeenCalledWith(
      expect.objectContaining({
        boardSlackList: undefined,
        relaxTransitGroupPriority: { constant: 900, ratio: 1.25 },
        modes: expect.objectContaining({
          transportModes: [
            { transportMode: TransportMode.Metro },
            { transportMode: TransportMode.Bus },
          ],
        }),
      }),
    );
  });

  it('selects metro-only', () => {
    const setTripQueryVariables = vi.fn();
    const vars: TripQueryVariables = { from: {}, to: {} };
    render(<TransitPreferenceSelect tripQueryVariables={vars} setTripQueryVariables={setTripQueryVariables} />);

    const select = screen.getByLabelText('Select whether you prefer Metro, Bus, or Balanced routes');
    fireEvent.change(select, { target: { value: 'metro-only' } });

    expect(setTripQueryVariables).toHaveBeenCalledWith(
      expect.objectContaining({
        boardSlackList: undefined,
        relaxTransitGroupPriority: undefined,
        modes: expect.objectContaining({
          transportModes: [{ transportMode: TransportMode.Metro }],
        }),
      }),
    );
  });

  it('selects bus-only', () => {
    const setTripQueryVariables = vi.fn();
    const vars: TripQueryVariables = { from: {}, to: {} };
    render(<TransitPreferenceSelect tripQueryVariables={vars} setTripQueryVariables={setTripQueryVariables} />);

    const select = screen.getByLabelText('Select whether you prefer Metro, Bus, or Balanced routes');
    fireEvent.change(select, { target: { value: 'bus-only' } });

    expect(setTripQueryVariables).toHaveBeenCalledWith(
      expect.objectContaining({
        boardSlackList: undefined,
        relaxTransitGroupPriority: undefined,
        modes: expect.objectContaining({
          transportModes: [{ transportMode: TransportMode.Bus }],
        }),
      }),
    );
  });
});

