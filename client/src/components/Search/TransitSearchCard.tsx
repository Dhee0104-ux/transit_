import React, { useState, useRef, useEffect } from 'react';
import { TripQueryVariables, TransportMode, StreetMode } from '../../gql/graphql';
import { useCity } from '../../context/CityContext';

interface TransitSearchCardProps {
  tripQueryVariables: TripQueryVariables;
  setTripQueryVariables: (vars: TripQueryVariables) => void;
  onRoute: () => void;
  loading: boolean;
}

const WALK_SPEED_OPTIONS = [
  { value: 0.83, label: '🐢 Slow (3.0 km/h)' },
  { value: 1.11, label: '🚶 Moderate (4.0 km/h)' },
  { value: 1.33, label: '🚶 Normal (4.8 km/h)' },
  { value: 1.67, label: '⚡ Fast (6.0 km/h)' },
];

const ROUTE_COUNT_OPTIONS = [
  { value: 3, label: '3 Routes' },
  { value: 5, label: '5 Routes (Recommended)' },
  { value: 7, label: '7 Routes' },
  { value: 10, label: '10 Routes' },
];

const MAX_WALK_DISTANCE_OPTIONS = [
  { duration: 'PT10M', label: '500m (~8 min)' },
  { duration: 'PT15M', label: '1 km (~15 min)' },
  { duration: 'PT30M', label: '2 km (~30 min)' },
  { duration: 'PT45M', label: '3 km (~45 min)' },
  { duration: 'PT60M', label: '5 km (~1 hr)' },
  { duration: 'PT120M', label: 'Flexible (Max)' },
];

// Comprehensive Bengaluru Metro stations and BMTC major transit hubs
const BENGALURU_SEARCH_STATIONS: Array<{
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  type: string;
}> = [
  { name: 'Kempegowda (Majestic)', area: 'City Center Hub & Interchange', latitude: 12.9755, longitude: 77.5731, type: 'Metro & Bus Hub' },
  { name: 'MG Road', area: 'Brigade Rd / CBD', latitude: 12.9756, longitude: 77.6067, type: 'Purple Line' },
  { name: 'Indiranagar', area: '100ft Road / CMH Road', latitude: 12.9783, longitude: 77.6386, type: 'Purple Line' },
  { name: 'Whitefield (Kadugodi)', area: 'ITPB Tech Corridor', latitude: 12.9957, longitude: 77.7579, type: 'Purple Line' },
  { name: 'Attiguppe', area: 'Vijayanagar South', latitude: 12.9619, longitude: 77.5336, type: 'Purple Line' },
  { name: 'Yeshwanthpur', area: 'Railway Junction', latitude: 13.0232, longitude: 77.5497, type: 'Green Line' },
  { name: 'Jayanagar', area: '4th Block Complex', latitude: 12.9382, longitude: 77.5800, type: 'Green Line' },
  { name: 'Kempegowda Intl Airport (BLR)', area: 'Devanahalli (KIA Terminal)', latitude: 13.1986, longitude: 77.7066, type: 'Airport / Vayu Vajra' },
  { name: 'Silk Board Junction', area: 'Hosur Road / Outer Ring Rd', latitude: 12.9172, longitude: 77.6227, type: 'Major Bus Hub' },
  { name: 'Electronic City Phase 1', area: 'Toll Gate / Infosys', latitude: 12.8452, longitude: 77.6602, type: 'Tech Corridor' },
  { name: 'Marathahalli Bridge', area: 'Outer Ring Road', latitude: 12.9592, longitude: 77.6974, type: 'Major Bus Hub' },
  { name: 'Hebbal Flyover', area: 'Bellary Road / Airport Corridor', latitude: 13.0358, longitude: 77.5970, type: 'Major Bus Hub' },
  { name: 'Banashankari TTMC', area: 'Kanakapura Road Junction', latitude: 12.9156, longitude: 77.5736, type: 'Green Line & TTMC' },
  { name: 'Baiyappanahalli', area: 'Old Madras Road', latitude: 12.9908, longitude: 77.6527, type: 'Purple Line' },
  { name: 'Vijayanagar TTMC', area: 'Magadi Road / Chord Road', latitude: 12.9676, longitude: 77.5376, type: 'Purple Line & TTMC' },
  { name: 'Rajajinagar', area: '1st Block / ESI Hospital', latitude: 12.9984, longitude: 77.5557, type: 'Green Line' },
  { name: 'KR Puram Station', area: 'Old Madras Road / ORR', latitude: 13.0012, longitude: 77.6963, type: 'Purple Line / Rail' },
  { name: 'Koramangala', area: 'Sony World Signal / 80ft Rd', latitude: 12.9352, longitude: 77.6245, type: 'BMTC Hub' },
  { name: 'Malleshwaram', area: '8th Cross / Margosa Road', latitude: 13.0055, longitude: 77.5700, type: 'Green Line' },
  { name: 'Bellandur', area: 'EcoSpace / Outer Ring Road', latitude: 12.9260, longitude: 77.6762, type: 'BMTC Tech Hub' },
];

export const TransitSearchCard: React.FC<TransitSearchCardProps> = ({
  tripQueryVariables,
  setTripQueryVariables,
  onRoute,
  loading,
}) => {
  const { setCity } = useCity();
  const [activeMode, setActiveMode] = useState<'all' | 'metro' | 'bus'>('all');

  // Search input state
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [activeFocus, setActiveFocus] = useState<'from' | 'to' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentSpeed = tripQueryVariables.walkSpeed ?? 1.33;
  const currentNumRoutes = tripQueryVariables.numTripPatterns ?? 5;
  const currentDuration =
    (Array.isArray(tripQueryVariables.maxAccessEgressDurationForMode)
      ? tripQueryVariables.maxAccessEgressDurationForMode[0]?.duration
      : tripQueryVariables.maxAccessEgressDurationForMode?.duration) || 'PT30M';

  // Format existing coordinate label
  const getLocationName = (loc: TripQueryVariables['from']): string => {
    if (!loc) return '';
    if (loc.coordinates) {
      const match = BENGALURU_SEARCH_STATIONS.find(
        (p) =>
          Math.abs(p.latitude - loc.coordinates!.latitude) < 0.005 &&
          Math.abs(p.longitude - loc.coordinates!.longitude) < 0.005,
      );
      if (match) return match.name;
      return `${loc.coordinates.latitude.toFixed(4)}, ${loc.coordinates.longitude.toFixed(4)}`;
    }
    if (loc.place) return loc.place;
    return '';
  };

  // Sync displayed search text when tripQueryVariables change from map clicks
  useEffect(() => {
    if (tripQueryVariables.from) {
      setFromQuery(getLocationName(tripQueryVariables.from));
    } else {
      setFromQuery('');
    }
  }, [tripQueryVariables.from]);

  useEffect(() => {
    if (tripQueryVariables.to) {
      setToQuery(getLocationName(tripQueryVariables.to));
    } else {
      setToQuery('');
    }
  }, [tripQueryVariables.to]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveFocus(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter stations based on user typing
  const getFilteredStations = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return BENGALURU_SEARCH_STATIONS.slice(0, 8);
    return BENGALURU_SEARCH_STATIONS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.area.toLowerCase().includes(q) || s.type.toLowerCase().includes(q),
    ).slice(0, 8);
  };

  const handleSelectStation = (station: typeof BENGALURU_SEARCH_STATIONS[0], target: 'from' | 'to') => {
    setCity('bengaluru');
    if (target === 'from') {
      setFromQuery(station.name);
      setTripQueryVariables({
        ...tripQueryVariables,
        from: {
          coordinates: {
            latitude: station.latitude,
            longitude: station.longitude,
          },
        },
      });
    } else {
      setToQuery(station.name);
      setTripQueryVariables({
        ...tripQueryVariables,
        to: {
          coordinates: {
            latitude: station.latitude,
            longitude: station.longitude,
          },
        },
      });
    }
    setActiveFocus(null);
  };

  // Mode Selection handler
  const handleModeChange = (mode: 'all' | 'metro' | 'bus') => {
    setActiveMode(mode);
    const transportModes =
      mode === 'metro'
        ? [{ transportMode: TransportMode.Metro }]
        : mode === 'bus'
          ? [{ transportMode: TransportMode.Bus }]
          : [{ transportMode: TransportMode.Metro }, { transportMode: TransportMode.Bus }];

    setTripQueryVariables({
      ...tripQueryVariables,
      modes: {
        accessMode: StreetMode.Foot,
        directMode: StreetMode.Foot,
        egressMode: StreetMode.Foot,
        transportModes,
      },
    });
  };

  // Number of Routes handler
  const handleNumRoutesChange = (count: number) => {
    setTripQueryVariables({
      ...tripQueryVariables,
      numTripPatterns: count,
    });
  };

  // Walk Speed handler
  const handleWalkSpeedChange = (speedVal: number) => {
    setTripQueryVariables({
      ...tripQueryVariables,
      walkSpeed: speedVal,
    });
  };

  // Max Walk Distance handler
  const handleMaxWalkDurationChange = (durationIso: string) => {
    setTripQueryVariables({
      ...tripQueryVariables,
      maxAccessEgressDurationForMode: [{ streetMode: StreetMode.Foot, duration: durationIso }],
      maxDirectDurationForMode: [{ streetMode: StreetMode.Foot, duration: 'PT15M' }],
    });
  };

  const handleSwap = () => {
    setTripQueryVariables({
      ...tripQueryVariables,
      from: tripQueryVariables.to,
      to: tripQueryVariables.from,
    });
    const temp = fromQuery;
    setFromQuery(toQuery);
    setToQuery(temp);
  };

  return (
    <div className="transit-search-card" ref={containerRef}>
      <div className="journey-inputs-container">
        {/* Origin Input with Search Dropdown */}
        <div className="journey-input-row origin-row">
          <div className="input-icon-col">
            <span className="dot-indicator origin-dot" />
            <div className="vertical-journey-line" />
          </div>
          <div className="input-field-col">
            <label className="field-label" htmlFor="search-origin-input">
              Origin (From)
            </label>
            <input
              id="search-origin-input"
              type="text"
              className="journey-text-input"
              placeholder="Search station or tap on map"
              value={fromQuery}
              onChange={(e) => {
                setFromQuery(e.target.value);
                setActiveFocus('from');
              }}
              onFocus={() => setActiveFocus('from')}
              autoComplete="off"
            />
          </div>
          {tripQueryVariables.from && (
            <button
              type="button"
              className="clear-input-btn"
              title="Clear Origin"
              onClick={() => {
                const next = { ...tripQueryVariables };
                delete (next as { from?: unknown }).from;
                setTripQueryVariables(next as TripQueryVariables);
                setFromQuery('');
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Swap Button */}
        <div className="journey-swap-row">
          <button
            type="button"
            className="swap-locations-btn"
            onClick={handleSwap}
            title="Swap Origin and Destination"
            aria-label="Swap Origin and Destination"
          >
            ⇅
          </button>
        </div>

        {/* Destination Input with Search Dropdown */}
        <div className="journey-input-row destination-row">
          <div className="input-icon-col">
            <span className="dot-indicator destination-dot" />
          </div>
          <div className="input-field-col">
            <label className="field-label" htmlFor="search-destination-input">
              Destination (To)
            </label>
            <input
              id="search-destination-input"
              type="text"
              className="journey-text-input"
              placeholder="Search destination or tap on map"
              value={toQuery}
              onChange={(e) => {
                setToQuery(e.target.value);
                setActiveFocus('to');
              }}
              onFocus={() => setActiveFocus('to')}
              autoComplete="off"
            />
          </div>
          {tripQueryVariables.to && (
            <button
              type="button"
              className="clear-input-btn"
              title="Clear Destination"
              onClick={() => {
                const next = { ...tripQueryVariables };
                delete (next as { to?: unknown }).to;
                setTripQueryVariables(next as TripQueryVariables);
                setToQuery('');
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Search Autocomplete Suggestions Dropdown */}
      {activeFocus && (
        <div className="search-autocomplete-dropdown">
          <div className="autocomplete-header">
            <span>Select Bengaluru Station ({activeFocus === 'from' ? 'Origin' : 'Destination'})</span>
            <span className="micro-hint">Tap station name</span>
          </div>
          <div className="autocomplete-items-list">
            {getFilteredStations(activeFocus === 'from' ? fromQuery : toQuery).map((station) => (
              <div
                key={station.name}
                className="autocomplete-item"
                onMouseDown={() => handleSelectStation(station, activeFocus)}
              >
                <div className="item-text-group">
                  <span className="item-title">{station.name}</span>
                  <span className="item-subtitle">
                    {station.area} • {station.type}
                  </span>
                </div>
                <span className="city-mini-tag tag-blr">
                  BLR
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transit Mode Selector */}
      <div className="control-group">
        <span className="control-label">Transit Mode</span>
        <div className="segmented-control mode-selector">
          <button
            type="button"
            className={`segment-btn ${activeMode === 'all' ? 'active' : ''}`}
            onClick={() => handleModeChange('all')}
          >
            All Transit
          </button>
          <button
            type="button"
            className={`segment-btn ${activeMode === 'metro' ? 'active' : ''}`}
            onClick={() => handleModeChange('metro')}
          >
            Metro
          </button>
          <button
            type="button"
            className={`segment-btn ${activeMode === 'bus' ? 'active' : ''}`}
            onClick={() => handleModeChange('bus')}
          >
            Bus (Red)
          </button>
        </div>
      </div>

      {/* Routing Parameters, Speed & Walking Distance Controls */}
      <div className="search-controls-grid">
        {/* Number of Routes to Show */}
        <div className="control-group">
          <span className="control-label">Routes to Show</span>
          <select
            className="styled-select-control"
            value={currentNumRoutes}
            onChange={(e) => handleNumRoutesChange(parseInt(e.target.value, 10))}
          >
            {ROUTE_COUNT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Walking Speed */}
        <div className="control-group">
          <span className="control-label">Walking Speed</span>
          <select
            className="styled-select-control"
            value={currentSpeed}
            onChange={(e) => handleWalkSpeedChange(parseFloat(e.target.value))}
          >
            {WALK_SPEED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Max Walk Distance */}
        <div className="control-group full-width-field">
          <span className="control-label">Max Walk Distance</span>
          <select
            className="styled-select-control"
            value={currentDuration}
            onChange={(e) => handleMaxWalkDurationChange(e.target.value)}
          >
            {MAX_WALK_DISTANCE_OPTIONS.map((opt) => (
              <option key={opt.duration} value={opt.duration}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Route Button */}
      <button
        type="button"
        className="primary-route-btn"
        onClick={() => onRoute()}
        disabled={loading || !tripQueryVariables.from || !tripQueryVariables.to}
      >
        {loading ? (
          <span className="btn-loading-state">
            <span className="spinner-dot" />
            Calculating 3D Route...
          </span>
        ) : (
          <span>Find Routes</span>
        )}
      </button>
    </div>
  );
};
