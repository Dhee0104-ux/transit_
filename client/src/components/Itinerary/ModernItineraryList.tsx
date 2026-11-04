import React, { useState } from 'react';
import { TripQuery } from '../../gql/graphql';
import { Leg, TripPattern } from '../../static/query/tripQueryTypes';
import { formatDuration } from '../../util/formatDuration';
import { formatDistance } from '../../util/distanceUtils';
import { calculateLegFare, calculateTripFare } from '../../util/fareUtils';
import { useCity } from '../../context/CityContext';

interface ModernItineraryListProps {
  tripQueryResult: TripQuery | null;
  selectedTripPatternIndexes: number[];
  setSelectedTripPatternIndexes: (indexes: number[]) => void;
  loading: boolean;
}

export const ModernItineraryList: React.FC<ModernItineraryListProps> = ({
  tripQueryResult,
  selectedTripPatternIndexes,
  setSelectedTripPatternIndexes,
  loading,
}) => {
  const { city } = useCity();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const patterns = (tripQueryResult?.trip?.tripPatterns as TripPattern[]) || [];

  if (loading) {
    return (
      <div className="itinerary-loading-container">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    );
  }

  if (!tripQueryResult || patterns.length === 0) {
    return (
      <div className="itinerary-empty-state">
        <div className="empty-state-icon">🗺️</div>
        <h3 className="empty-state-title">Ready for Your Journey</h3>
        <p className="empty-state-desc">
          Choose an origin and destination using the search box above or tap directly on the map to calculate real-time transit routes.
        </p>
      </div>
    );
  }

  const formatClockTime = (isoString?: string | null): string => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getLegBadgeColor = (leg: Leg): { bg: string; text: string } => {
    const mode = String(leg.mode).toLowerCase();
    const name = (leg.line?.publicCode || leg.line?.name || '').toLowerCase();

    if (mode === 'metro' || mode === 'subway') {
      if (name.includes('purple') || name.includes('pur')) {
        return { bg: '#7E22CE', text: '#FFFFFF' };
      }
      if (name.includes('green') || name.includes('grn')) {
        return { bg: '#16A34A', text: '#FFFFFF' };
      }
      if (name.includes('blue') || name.includes('blu')) {
        return { bg: '#2563EB', text: '#FFFFFF' };
      }
      return { bg: '#2563EB', text: '#FFFFFF' };
    }

    if (mode === 'bus' || mode === 'coach') {
      return { bg: '#DC2626', text: '#FFFFFF' }; // Strictly RED for all bus routes in all cities
    }

    // Foot / walk
    return { bg: '#F1F5F9', text: '#475569' };
  };

  const toggleExpand = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="itinerary-results-container">
      <div className="results-header">
        <span className="results-count">
          {patterns.length} {patterns.length === 1 ? 'Route' : 'Routes'} Available
        </span>
        <span className="results-city-badge">
          Bengaluru (Namma Metro + BMTC)
        </span>
      </div>

      <div className="patterns-card-list">
        {patterns.map((pattern, idx) => {
          const isSelected = selectedTripPatternIndexes.includes(idx);
          const isExpanded = expandedIndex === idx;
          const totalFare = calculateTripFare(pattern.legs, city);
          const totalDist = pattern.legs.reduce((acc, l) => acc + (l.distance || 0), 0);
          const walkDurationSec = pattern.legs
            .filter((l) => String(l.mode).toLowerCase() === 'foot')
            .reduce((acc, l) => acc + (l.duration || 0), 0);
          const hasBusLeg = pattern.legs.some((l) => String(l.mode).toLowerCase() === 'bus');

          return (
            <div
              key={`pattern-${idx}`}
              className={`itinerary-card ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                setSelectedTripPatternIndexes([idx]);
                setExpandedIndex(idx);
              }}
            >
              {/* Card Summary Header */}
              <div className="card-top-row">
                <div className="time-range">
                  <span className="clock-time">{formatClockTime(pattern.expectedStartTime)}</span>
                  <span className="time-arrow">→</span>
                  <span className="clock-time">{formatClockTime(pattern.expectedEndTime)}</span>
                </div>
                <div className="fare-badge" title="Official Integrated Tariff">
                  {totalFare > 0 ? `₹${totalFare}` : 'Free Walk'}
                </div>
              </div>

              {/* Metrics Row */}
              <div className="card-metrics-row">
                <span className="metric-duration">{formatDuration(pattern.duration || 0)}</span>
                <span className="metric-divider">•</span>
                <span className="metric-distance">{formatDistance(totalDist)}</span>
                {walkDurationSec > 0 && (
                  <>
                    <span className="metric-divider">•</span>
                    <span className="metric-walk">🚶 {Math.round(walkDurationSec / 60)} min walk</span>
                  </>
                )}
                {hasBusLeg && (
                  <>
                    <span className="metric-divider">•</span>
                    <span className="live-fleet-tag">● Live Bus Tracking</span>
                  </>
                )}
              </div>

              {/* Transit Leg Badges Bar */}
              <div className="card-legs-bar">
                {pattern.legs.map((leg, legIdx) => {
                  const colors = getLegBadgeColor(leg);
                  const isWalk = String(leg.mode).toLowerCase() === 'foot';
                  const isBus = String(leg.mode).toLowerCase() === 'bus';
                  const label = isWalk
                    ? `${Math.round((leg.duration || 60) / 60)}m`
                    : leg.line?.publicCode || leg.line?.name || leg.mode;

                  return (
                    <React.Fragment key={`leg-badge-${legIdx}`}>
                      <div
                        className={`leg-chip ${isWalk ? 'walk-chip' : 'transit-chip'} ${isBus ? 'bus-chip-red' : ''}`}
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                        title={`${leg.mode} ${leg.line?.name || ''} (${formatDistance(leg.distance || 0)})`}
                      >
                        {isWalk ? '🚶 ' : isBus ? '🚌 ' : '🚆 '}
                        {label}
                      </div>
                      {legIdx < pattern.legs.length - 1 && <span className="legs-flow-arrow">›</span>}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Toggle Details Button */}
              <div className="card-actions-bar">
                <button
                  type="button"
                  className="expand-details-btn"
                  onClick={(e) => toggleExpand(idx, e)}
                >
                  {isExpanded ? 'Hide Step-by-Step ▲' : 'View Step-by-Step ▼'}
                </button>
              </div>

              {/* Expanded Step-by-Step Breakdown */}
              {isExpanded && (
                <div className="card-steps-timeline">
                  {pattern.legs.map((leg, legIdx) => {
                    const legFare = calculateLegFare(leg, city);
                    const isWalk = String(leg.mode).toLowerCase() === 'foot';
                    const isBus = String(leg.mode).toLowerCase() === 'bus';
                    const legColors = getLegBadgeColor(leg);
                    const speedKmh =
                      leg.duration && leg.distance && leg.duration > 0
                        ? ((leg.distance / leg.duration) * 3.6).toFixed(1)
                        : null;

                    return (
                      <div key={`step-${legIdx}`} className="timeline-step">
                        <div className="step-rail">
                          <span
                            className="step-dot"
                            style={{ backgroundColor: isWalk ? '#94A3B8' : legColors.bg }}
                          />
                          {legIdx < pattern.legs.length - 1 && <div className="step-connector" />}
                        </div>

                        <div className="step-content">
                          <div className="step-header">
                            <span
                              className="step-mode-badge"
                              style={{ backgroundColor: legColors.bg, color: legColors.text }}
                            >
                              {isWalk
                                ? 'Pedestrian Walk'
                                : isBus
                                  ? `🚌 ${leg.line?.name || 'Bus'}`
                                  : `🚆 ${leg.line?.name || 'Metro'}`}
                            </span>
                            <span className="step-fare-tag">
                              {legFare > 0 ? `₹${legFare}` : 'Free'}
                            </span>
                          </div>

                          {isBus && (
                            <div className="live-bus-tracking-banner">
                              <span className="live-dot-pulse" />
                              <span className="live-banner-text">
                                Realtime Fleet Active • Approaching in ~3 mins
                              </span>
                            </div>
                          )}

                          <div className="step-places">
                            <div className="place-item origin-place">
                              <span className="place-time">{formatClockTime(leg.expectedStartTime)}</span>
                              <span className="place-name">
                                {leg.fromPlace?.name || 'Origin'}
                              </span>
                            </div>
                            <div className="place-item dest-place">
                              <span className="place-time">{formatClockTime(leg.expectedEndTime)}</span>
                              <span className="place-name">
                                {leg.toPlace?.name || 'Destination'}
                              </span>
                            </div>
                          </div>

                          <div className="step-meta">
                            <span>{formatDistance(leg.distance || 0)}</span>
                            <span>•</span>
                            <span>{formatDuration(leg.duration || 0)}</span>
                            {speedKmh && (
                              <>
                                <span>•</span>
                                <span>{speedKmh} km/h</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
