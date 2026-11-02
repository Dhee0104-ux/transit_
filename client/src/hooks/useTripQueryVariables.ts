import { useEffect, useState } from 'react';
import { StreetMode, TransportMode, TripQueryVariables } from '../gql/graphql.ts';

const DEFAULT_VARIABLES: TripQueryVariables = {
  from: {},
  to: {},
  dateTime: new Date().toISOString(),
  numTripPatterns: 4,
  searchWindow: 30,
  maxAccessEgressDurationForMode: [
    {
      streetMode: StreetMode.Foot,
      duration: 'PT30M',
    },
  ],
  maxDirectDurationForMode: [
    {
      streetMode: StreetMode.Foot,
      duration: 'PT15M',
    },
  ],
  modes: {
    accessMode: StreetMode.Foot,
    directMode: StreetMode.Foot,
    egressMode: StreetMode.Foot,
    transportModes: [
      { transportMode: TransportMode.Metro },
      { transportMode: TransportMode.Bus },
    ],
  },
};

const getInitialVariables = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const variablesJson = urlParams.get('variables');
  if (variablesJson) {
    try {
      const parsed = JSON.parse(decodeURIComponent(variablesJson));
      // Refresh stale dateTime if more than 15 minutes in past
      if (parsed.dateTime && new Date(parsed.dateTime).getTime() < Date.now() - 15 * 60 * 1000) {
        parsed.dateTime = new Date().toISOString();
      }
      return {
        ...DEFAULT_VARIABLES,
        ...parsed,
        numTripPatterns: parsed.numTripPatterns ?? 4,
        searchWindow: parsed.searchWindow ?? 30,
      };
    } catch {
      return DEFAULT_VARIABLES;
    }
  }
  return DEFAULT_VARIABLES;
};

const updateUrlWithVariables = (variables: TripQueryVariables) => {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set('variables', encodeURIComponent(JSON.stringify(variables)));
  history.pushState({}, '', '?' + urlParams.toString() + window.location.hash);
};

export const useTripQueryVariables = () => {
  const [tripQueryVariables, setTripQueryVariables] = useState<TripQueryVariables>(getInitialVariables());

  useEffect(() => {
    updateUrlWithVariables(tripQueryVariables);
  }, [tripQueryVariables]);

  return {
    tripQueryVariables,
    setTripQueryVariables,
  };
};
