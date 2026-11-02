import { Form } from 'react-bootstrap';
import { StreetMode, TransportMode, TransportModeSlack, TripQueryVariables } from '../../gql/graphql.ts';
import { useMemo } from 'react';

export type TransitPreferenceType = 'balanced' | 'prefer-metro' | 'prefer-bus' | 'metro-only' | 'bus-only';

export function TransitPreferenceSelect({
  tripQueryVariables,
  setTripQueryVariables,
}: {
  tripQueryVariables: TripQueryVariables;
  setTripQueryVariables: (tripQueryVariables: TripQueryVariables) => void;
}) {
  const currentPreference = useMemo<TransitPreferenceType>(() => {
    const modes = tripQueryVariables.modes?.transportModes
      ?.map((m) => m?.transportMode)
      .filter((v): v is TransportMode => Boolean(v));

    if (!modes || modes.length === 0) return 'balanced';

    const hasMetro = modes.includes(TransportMode.Metro);
    const hasBus = modes.includes(TransportMode.Bus);

    if (hasMetro && !hasBus) return 'metro-only';
    if (hasBus && !hasMetro) return 'bus-only';

    // Prefer bus: checks if metro has boarding penalty slack
    const rawSlack = tripQueryVariables.boardSlackList;
    const slackList: (TransportModeSlack | null | undefined)[] = Array.isArray(rawSlack)
      ? rawSlack
      : rawSlack
        ? [rawSlack]
        : [];
    const hasMetroSlack = slackList.some(
      (entry) => entry?.modes?.includes(TransportMode.Metro) && (entry.slack ?? 0) > 0,
    );
    if (hasMetroSlack) {
      return 'prefer-bus';
    }

    // Prefer metro: checks if metro group priority relaxation is active
    if (
      tripQueryVariables.relaxTransitGroupPriority?.constant &&
      Number(tripQueryVariables.relaxTransitGroupPriority.constant) > 0
    ) {
      return 'prefer-metro';
    }

    return 'balanced';
  }, [
    tripQueryVariables.modes?.transportModes,
    tripQueryVariables.relaxTransitGroupPriority,
    tripQueryVariables.boardSlackList,
  ]);

  const onChange = (pref: TransitPreferenceType) => {
    const accessMode = tripQueryVariables.modes?.accessMode || StreetMode.Foot;
    const egressMode = tripQueryVariables.modes?.egressMode || StreetMode.Foot;

    let newTransportModes: Array<{ transportMode: TransportMode }> = [
      { transportMode: TransportMode.Metro },
      { transportMode: TransportMode.Bus },
    ];
    let newRelax = undefined;
    let newBoardSlackList: Array<TransportModeSlack> | undefined = undefined;

    switch (pref) {
      case 'metro-only':
        newTransportModes = [{ transportMode: TransportMode.Metro }];
        newRelax = undefined;
        newBoardSlackList = undefined;
        break;
      case 'bus-only':
        newTransportModes = [{ transportMode: TransportMode.Bus }];
        newRelax = undefined;
        newBoardSlackList = undefined;
        break;
      case 'prefer-metro':
        newTransportModes = [
          { transportMode: TransportMode.Metro },
          { transportMode: TransportMode.Bus },
        ];
        // 900s (15 min) relaxation priority for Metro over Bus
        newRelax = { constant: 900, ratio: 1.25 };
        newBoardSlackList = undefined;
        break;
      case 'prefer-bus':
        newTransportModes = [
          { transportMode: TransportMode.Bus },
          { transportMode: TransportMode.Metro },
        ];
        newRelax = undefined;
        // Penalize metro boarding by 1800s (30m) so bus is preferred across all corridors,
        // while keeping metro as fallback if no bus route exists
        newBoardSlackList = [{ modes: [TransportMode.Metro], slack: 1800 }];
        break;
      case 'balanced':
      default:
        newTransportModes = [
          { transportMode: TransportMode.Metro },
          { transportMode: TransportMode.Bus },
        ];
        newRelax = undefined;
        newBoardSlackList = undefined;
        break;
    }

    setTripQueryVariables({
      ...tripQueryVariables,
      modes: {
        ...tripQueryVariables.modes,
        transportModes: newTransportModes,
        accessMode,
        egressMode,
      },
      relaxTransitGroupPriority: newRelax,
      boardSlackList: newBoardSlackList,
      transferPenalty: undefined,
    });
  };

  return (
    <Form.Group>
      <Form.Label column="sm" htmlFor="transitPreferenceSelect">
        Transit Preference
      </Form.Label>
      <Form.Select
        id="transitPreferenceSelect"
        size="sm"
        className="input-large"
        style={{ minWidth: '160px', verticalAlign: 'bottom', fontWeight: 600 }}
        value={currentPreference}
        onChange={(e) => onChange(e.target.value as TransitPreferenceType)}
        aria-label="Select whether you prefer Metro, Bus, or Balanced routes"
      >
        <option value="balanced">🔄 Both (Metro &amp; Bus)</option>
        <option value="prefer-metro">🚇 Prefer Metro</option>
        <option value="prefer-bus">🚌 Prefer Bus</option>
        <option value="metro-only">⚡ Metro Only</option>
        <option value="bus-only">🚍 Bus Only</option>
      </Form.Select>
    </Form.Group>
  );
}
