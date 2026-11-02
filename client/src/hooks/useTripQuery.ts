import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from 'graphql-request';
import {
  Location,
  StreetMode,
  TransportMode,
  TransportModeSlack,
  TripQuery,
  TripQueryVariables,
  TripViaLocationInput,
} from '../gql/graphql.ts';
import { Leg, TripPattern } from '../static/query/tripQueryTypes';
import { getApiUrl } from '../util/getApiUrl.ts';
import { createPrunedQuery, createPrunedVariables } from '../util/queryPruning.ts';

// In-memory cache for resolved via locations to prevent duplicate network calls
const viaResolutionCache = new Map<string, TripViaLocationInput[]>();

// Fast LRU route response cache (TTL: 10 mins, Max 100 items) for instant sub-millisecond retrieval
const tripResponseCache = new Map<string, { data: TripQuery; timestamp: number }>();
const MAX_CACHE_ENTRIES = 100;
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Resolves via locations (coordinates or names) into valid feed-scoped stop IDs
 * using passThrough to ensure OTP routes seamlessly without street-edge exceptions.
 */
async function resolveViaLocations(
  via: NonNullable<TripQueryVariables['via']>,
): Promise<TripViaLocationInput[]> {
  const list: TripViaLocationInput[] = Array.isArray(via) ? via : [via];
  const cacheKey = JSON.stringify(list);
  if (viaResolutionCache.has(cacheKey)) {
    return viaResolutionCache.get(cacheKey)!;
  }

  const resolved = await Promise.all(
    list.map(async (item: TripViaLocationInput) => {
      // 1. If already passThrough with stop IDs, keep it
      if (item.passThrough?.stopLocationIds && item.passThrough.stopLocationIds.length > 0) {
        return item;
      }

      // 2. If visit has coordinate (e.g. right-clicked map or typed coordinates)
      const coord = item.visit?.coordinate;
      if (coord && typeof coord.latitude === 'number' && typeof coord.longitude === 'number') {
        try {
          const nearestRes = (await request(
            getApiUrl(),
            `query findNearbyQuay($lat: Float!, $lon: Float!) {
              quaysByRadius(latitude: $lat, longitude: $lon, radius: 1200) {
                edges {
                  node {
                    quay {
                      id
                    }
                  }
                }
              }
            }`,
            { lat: coord.latitude, lon: coord.longitude },
          )) as { quaysByRadius?: { edges?: Array<{ node?: { quay?: { id: string } } }> } };

          const edges = nearestRes?.quaysByRadius?.edges || [];
          if (edges.length > 0) {
            const stopIds = edges
              .slice(0, 2)
              .map((e) => e.node?.quay?.id)
              .filter((id): id is string => Boolean(id));

            if (stopIds.length > 0) {
              return {
                passThrough: {
                  stopLocationIds: stopIds,
                },
              };
            }
          }
        } catch (err) {
          console.warn('Failed to resolve via coordinates to quays', err);
        }
      }

      // 3. If visit has stopLocationIds (e.g. user typed a name or stop ID)
      if (item.visit?.stopLocationIds && item.visit.stopLocationIds.length > 0) {
        const rawId = item.visit.stopLocationIds[0];
        // If it's already a feed-scoped ID (e.g. "1:METRO_KGWA" or "2:20921")
        if (rawId.includes(':')) {
          return {
            passThrough: {
              stopLocationIds: item.visit.stopLocationIds,
            },
          };
        }

        // If user typed a station/stop name like "Indiranagar" or "Majestic"
        try {
          const searchRes = (await request(
            getApiUrl(),
            `query searchByName($name: String!) {
              quays(name: $name) {
                id
              }
            }`,
            { name: rawId },
          )) as { quays?: Array<{ id: string }> };

          const quays = searchRes?.quays || [];
          if (quays.length > 0) {
            return {
              passThrough: {
                stopLocationIds: quays.slice(0, 2).map((q) => q.id),
              },
            };
          }
        } catch (err) {
          console.warn('Failed to search quay by name', err);
        }
      }

      return item;
    }),
  );

  viaResolutionCache.set(cacheKey, resolved);
  return resolved;
}

/**
 * Rapid spatial index fallback: resolves latitude/longitude to the nearest valid Quay ID
 * via quaysByBbox so disconnected street vertices never fail a journey.
 */
async function findNearestQuayGeo(lat: number, lon: number): Promise<string | null> {
  const delta = 0.015; // ~1.6 km bbox
  try {
    const res = (await request(
      getApiUrl(),
      `query findNearby($minLat: Float!, $maxLat: Float!, $minLon: Float!, $maxLon: Float!) {
        quaysByBbox(
          minimumLatitude: $minLat
          maximumLatitude: $maxLat
          minimumLongitude: $minLon
          maximumLongitude: $maxLon
        ) {
          id
          latitude
          longitude
        }
      }`,
      {
        minLat: lat - delta,
        maxLat: lat + delta,
        minLon: lon - delta,
        maxLon: lon + delta,
      },
    )) as { quaysByBbox?: Array<{ id: string; latitude: number; longitude: number }> };

    const quays = res?.quaysByBbox || [];
    if (quays.length === 0) return null;

    quays.sort((a, b) => {
      const distA = Math.hypot(a.latitude - lat, a.longitude - lon);
      const distB = Math.hypot(b.latitude - lat, b.longitude - lon);
      return distA - distB;
    });

    return quays[0].id;
  } catch (err) {
    console.warn('Failed to find nearest quay by bbox', err);
    return null;
  }
}

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function ensureAccessAndEgressWalkingLegs(
  patterns: TripPattern[],
  fromCoord?: { latitude: number; longitude: number } | null,
  toCoord?: { latitude: number; longitude: number } | null,
  walkSpeed: number = 1.33,
): Promise<TripPattern[]> {
  if (!patterns || patterns.length === 0) return patterns;

  const directWalkCache = new Map<string, Leg | null>();

  const getDirectWalk = async (fLat: number, fLon: number, tLat: number, tLon: number): Promise<Leg | null> => {
    const key = `${fLat.toFixed(5)},${fLon.toFixed(5)}->${tLat.toFixed(5)},${tLon.toFixed(5)}`;
    if (directWalkCache.has(key)) return directWalkCache.get(key) || null;

    try {
      const walkQuery = `
        query DirectWalk($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!) {
          trip(
            from: { coordinates: { latitude: $fromLat, longitude: $fromLon } }
            to: { coordinates: { latitude: $toLat, longitude: $toLon } }
            modes: { directMode: foot }
          ) {
            tripPatterns {
              legs {
                mode
                duration
                distance
                pointsOnLink { points length }
                fromPlace { name latitude longitude }
                toPlace { name latitude longitude }
              }
            }
          }
        }
      `;
      const res = (await request(getApiUrl(), walkQuery, {
        fromLat: fLat,
        fromLon: fLon,
        toLat: tLat,
        toLon: tLon,
      })) as {
        trip?: {
          tripPatterns?: Array<{
            legs?: Array<Leg>;
          }>;
        };
      };
      const leg = res?.trip?.tripPatterns?.[0]?.legs?.[0] || null;
      directWalkCache.set(key, leg);
      return leg;
    } catch (e) {
      console.warn('Failed to fetch direct walk leg:', e);
      directWalkCache.set(key, null);
      return null;
    }
  };

  const updatedPatterns: TripPattern[] = [];

  for (const p of patterns) {
    let legs = [...p.legs];
    let duration = p.duration || 0;
    let expectedStartTime = p.expectedStartTime;
    let expectedEndTime = p.expectedEndTime;

    // 1. Check Origin: If start coordinates given, ensure pattern starts with walking from them
    if (fromCoord && typeof fromCoord.latitude === 'number' && typeof fromCoord.longitude === 'number' && legs.length > 0) {
      const firstLeg = legs[0];
      const firstLat = firstLeg.fromPlace?.latitude;
      const firstLon = firstLeg.fromPlace?.longitude;

      const isFirstFoot = String(firstLeg.mode).toLowerCase() === 'foot';
      const originDist = firstLat && firstLon ? haversineDistanceMeters(fromCoord.latitude, fromCoord.longitude, firstLat, firstLon) : 9999;
      const hasFirstFootGeometry = Boolean(firstLeg.pointsOnLink?.points && firstLeg.pointsOnLink.points.trim().length > 5);

      if (!isFirstFoot || originDist > 40) {
        const targetLat = firstLat ?? fromCoord.latitude;
        const targetLon = firstLon ?? fromCoord.longitude;
        const walkLeg = await getDirectWalk(fromCoord.latitude, fromCoord.longitude, targetLat, targetLon);

        if (walkLeg) {
          const walkDuration = Math.round(walkLeg.distance / walkSpeed);
          const adjustedWalkLeg: Leg = {
            ...walkLeg,
            duration: walkDuration,
            expectedStartTime: new Date(new Date(firstLeg.expectedStartTime).getTime() - walkDuration * 1000).toISOString(),
            expectedEndTime: firstLeg.expectedStartTime,
            fromPlace: {
              ...walkLeg.fromPlace,
              name: 'Origin',
              latitude: fromCoord.latitude,
              longitude: fromCoord.longitude,
            },
          };
          legs = [adjustedWalkLeg, ...legs];
          expectedStartTime = adjustedWalkLeg.expectedStartTime;
          duration += walkDuration;
        }
      } else if (isFirstFoot && !hasFirstFootGeometry) {
        // First leg is foot but missing street curves - fetch road path and enrich geometry
        const toLat = firstLeg.toPlace?.latitude;
        const toLon = firstLeg.toPlace?.longitude;
        if (typeof toLat === 'number' && typeof toLon === 'number') {
          const walkLeg = await getDirectWalk(fromCoord.latitude, fromCoord.longitude, toLat, toLon);
          if (walkLeg?.pointsOnLink?.points) {
            legs[0] = {
              ...firstLeg,
              pointsOnLink: walkLeg.pointsOnLink,
              distance: walkLeg.distance || firstLeg.distance,
              duration: Math.round((walkLeg.distance || firstLeg.distance) / walkSpeed),
            };
          }
        }
      }
    }

    // 2. Check Destination: If end coordinates given, ensure pattern ends with walking to them
    if (toCoord && typeof toCoord.latitude === 'number' && typeof toCoord.longitude === 'number' && legs.length > 0) {
      const lastLeg = legs[legs.length - 1];
      const lastLat = lastLeg.toPlace?.latitude;
      const lastLon = lastLeg.toPlace?.longitude;

      const isLastFoot = String(lastLeg.mode).toLowerCase() === 'foot';
      const destDist = lastLat && lastLon ? haversineDistanceMeters(toCoord.latitude, toCoord.longitude, lastLat, lastLon) : 9999;
      const hasLastFootGeometry = Boolean(lastLeg.pointsOnLink?.points && lastLeg.pointsOnLink.points.trim().length > 5);

      if (!isLastFoot || destDist > 40) {
        const sourceLat = lastLat ?? toCoord.latitude;
        const sourceLon = lastLon ?? toCoord.longitude;
        const walkLeg = await getDirectWalk(sourceLat, sourceLon, toCoord.latitude, toCoord.longitude);

        if (walkLeg) {
          const walkDuration = Math.round(walkLeg.distance / walkSpeed);
          const adjustedWalkLeg: Leg = {
            ...walkLeg,
            duration: walkDuration,
            expectedStartTime: lastLeg.expectedEndTime,
            expectedEndTime: new Date(new Date(lastLeg.expectedEndTime).getTime() + walkDuration * 1000).toISOString(),
            toPlace: {
              ...walkLeg.toPlace,
              name: 'Destination',
              latitude: toCoord.latitude,
              longitude: toCoord.longitude,
            },
          };
          legs = [...legs, adjustedWalkLeg];
          expectedEndTime = adjustedWalkLeg.expectedEndTime;
          duration += walkDuration;
        }
      } else if (isLastFoot && !hasLastFootGeometry) {
        // Last leg is foot but missing street curves - fetch road path and enrich geometry
        const fromLat = lastLeg.fromPlace?.latitude;
        const fromLon = lastLeg.fromPlace?.longitude;
        if (typeof fromLat === 'number' && typeof fromLon === 'number') {
          const walkLeg = await getDirectWalk(fromLat, fromLon, toCoord.latitude, toCoord.longitude);
          if (walkLeg?.pointsOnLink?.points) {
            legs[legs.length - 1] = {
              ...lastLeg,
              pointsOnLink: walkLeg.pointsOnLink,
              distance: walkLeg.distance || lastLeg.distance,
              duration: Math.round((walkLeg.distance || lastLeg.distance) / walkSpeed),
            };
          }
        }
      }
    }

    // 3. For any intermediate foot leg that might be missing geometry, enrich it
    for (let li = 0; li < legs.length; li++) {
      const leg = legs[li];
      if (String(leg.mode).toLowerCase() === 'foot' && (!leg.pointsOnLink?.points || leg.pointsOnLink.points.trim().length <= 5)) {
        const fLat = leg.fromPlace?.latitude;
        const fLon = leg.fromPlace?.longitude;
        const tLat = leg.toPlace?.latitude;
        const tLon = leg.toPlace?.longitude;
        if (typeof fLat === 'number' && typeof fLon === 'number' && typeof tLat === 'number' && typeof tLon === 'number') {
          const walkLeg = await getDirectWalk(fLat, fLon, tLat, tLon);
          if (walkLeg?.pointsOnLink?.points) {
            legs[li] = {
              ...leg,
              pointsOnLink: walkLeg.pointsOnLink,
              distance: walkLeg.distance || leg.distance,
              duration: Math.round((walkLeg.distance || leg.distance) / walkSpeed),
            };
          }
        }
      }
    }

    updatedPatterns.push({
      ...p,
      legs,
      duration,
      expectedStartTime,
      expectedEndTime,
    });
  }

  return updatedPatterns;
}

type TripQueryHook = (
  variables?: TripQueryVariables,
) => [TripQuery | null, boolean, (pageCursor?: string) => Promise<void>, unknown];

export const useTripQuery: TripQueryHook = (variables) => {
  const [data, setData] = useState<TripQuery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const activeRequestIdRef = useRef<number>(0);

  const callback = useCallback(
    async (pageCursor?: string) => {
      if (!variables) {
        console.warn("Can't search without variables");
        return;
      }

      const requestId = ++activeRequestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        // Resolve any coordinates or names in `via` to passThrough stop IDs
        let effectiveVia = variables.via;
        if (variables.via && (Array.isArray(variables.via) ? variables.via.length > 0 : Boolean(variables.via))) {
          effectiveVia = await resolveViaLocations(variables.via);
        }

        // Check user preferences
        const prefModes = variables.modes?.transportModes?.map((m) => m?.transportMode);
        const hasMetro = prefModes ? prefModes.includes(TransportMode.Metro) : true;
        const hasBus = prefModes ? prefModes.includes(TransportMode.Bus) : true;
        const isMetroOnly = hasMetro && !hasBus;
        const isBusOnly = hasBus && !hasMetro;

        const rawSlack = variables.boardSlackList;
        const slackArray: (TransportModeSlack | null | undefined)[] = Array.isArray(rawSlack)
          ? rawSlack
          : rawSlack
            ? [rawSlack]
            : [];
        const isPreferBus = slackArray.some(
          (b) => b?.modes?.includes(TransportMode.Metro) && (b.slack ?? 0) > 0,
        );
        const isPreferMetro =
          !isBusOnly &&
          !isPreferBus &&
          (isMetroOnly ||
            Boolean(variables.relaxTransitGroupPriority?.constant && Number(variables.relaxTransitGroupPriority.constant) > 0));

        const effectiveModes = variables.modes ?? {
          accessMode: StreetMode.Foot,
          directMode: StreetMode.Foot,
          egressMode: StreetMode.Foot,
          transportModes: [
            { transportMode: TransportMode.Metro },
            { transportMode: TransportMode.Bus },
          ],
        };

        const effectiveMaxAccessEgress = variables.maxAccessEgressDurationForMode ?? [
          { streetMode: StreetMode.Foot, duration: 'PT30M' },
        ];
        const effectiveMaxDirect = variables.maxDirectDurationForMode ?? [
          { streetMode: StreetMode.Foot, duration: 'PT15M' },
        ];

        // Ultra-fast balanced defaults for full citywide coverage (Metro + Bus) in milliseconds
        const mergedVariables: TripQueryVariables = {
          ...variables,
          dateTime: variables.dateTime ?? new Date().toISOString(),
          modes: effectiveModes,
          walkSpeed: variables.walkSpeed ?? 1.33,
          maxAccessEgressDurationForMode: effectiveMaxAccessEgress,
          maxDirectDurationForMode: effectiveMaxDirect,
          numTripPatterns: variables.numTripPatterns ?? 4,
          searchWindow: variables.searchWindow ?? 30,
          maximumTransfers: variables.maximumTransfers ?? 3,
          maximumAdditionalTransfers: variables.maximumAdditionalTransfers ?? 1,
          walkReluctance: variables.walkReluctance ?? 1.25,
          transferPenalty: variables.transferPenalty ?? 60,
          ...(effectiveVia ? { via: effectiveVia } : {}),
        };

        // Check instant cache
        const cacheKey = JSON.stringify({
          v: mergedVariables,
          cursor: pageCursor,
        });
        const cached = tripResponseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          if (requestId === activeRequestIdRef.current) {
            setData(cached.data);
            setLoading(false);
          }
          return;
        }

        let result: TripQuery;

        // Standard query executed directly through OTP router engine
        const baseVariables = pageCursor ? { ...mergedVariables, pageCursor } : mergedVariables;
        const prunedVariables = createPrunedVariables(baseVariables);
        const prunedQuery = createPrunedQuery(baseVariables);
        try {
          result = (await request(getApiUrl(), prunedQuery, prunedVariables)) as TripQuery;
        } catch (stdErr) {
          console.warn('Standard query failed:', stdErr);
          result = { trip: { tripPatterns: [], routingErrors: [] } } as unknown as TripQuery;
        }

        // Intelligent geographic snap fallback if no routes found or street reachability error occurred
        const tripPatterns = result?.trip?.tripPatterns || [];
        const rawErrors = (result as unknown as { trip?: { routingErrors?: Array<{ code?: string }> } })?.trip?.routingErrors || [];
        const hasConnectivityError = rawErrors.some(
          (err: { code?: string }) => err?.code === 'noStopsInRange' || err?.code === 'noTransitConnection',
        );

        if (
          (tripPatterns.length === 0 || hasConnectivityError) &&
          (mergedVariables.from?.coordinates || mergedVariables.to?.coordinates)
        ) {
          let fallbackFrom = mergedVariables.from;
          let fallbackTo = mergedVariables.to;
          let neededFallback = false;

          if (mergedVariables.from?.coordinates) {
            const nearestFrom = await findNearestQuayGeo(
              mergedVariables.from.coordinates.latitude,
              mergedVariables.from.coordinates.longitude,
            );
            if (nearestFrom) {
              fallbackFrom = { place: nearestFrom };
              neededFallback = true;
            }
          }

          if (mergedVariables.to?.coordinates) {
            const nearestTo = await findNearestQuayGeo(
              mergedVariables.to.coordinates.latitude,
              mergedVariables.to.coordinates.longitude,
            );
            if (nearestTo) {
              fallbackTo = { place: nearestTo };
              neededFallback = true;
            }
          }

          if (neededFallback) {
            const fallbackVars = { ...mergedVariables, from: fallbackFrom, to: fallbackTo };
            const fallbackPrunedVars = createPrunedVariables(fallbackVars);
            const fallbackPrunedQuery = createPrunedQuery(fallbackVars);
            try {
              const fallbackResult = (await request(getApiUrl(), fallbackPrunedQuery, fallbackPrunedVars)) as TripQuery;
              if (fallbackResult?.trip?.tripPatterns?.length) {
                result = fallbackResult;
              }
            } catch (fallbackErr) {
              console.warn('Fallback routing error', fallbackErr);
            }
          }
        }

        // Filter and sort routes based on transit preference
        if (result?.trip?.tripPatterns?.length) {
          // Ensure inside access/egress walking legs are fully included with turn-by-turn road geometry
          const completePatterns = await ensureAccessAndEgressWalkingLegs(
            result.trip.tripPatterns,
            mergedVariables.from?.coordinates,
            mergedVariables.to?.coordinates,
            mergedVariables.walkSpeed ?? 1.33,
          );

          // Deduplicate patterns
          const seen = new Set<string>();
          let uniquePatterns = completePatterns.filter((p: TripPattern) => {
            const signature = p.legs
              .map(
                (l: Leg) =>
                  `${l.mode}:${l.line?.publicCode || l.line?.name || ''}:${l.fromPlace?.name || ''}->${l.toPlace?.name || ''}`,
              )
              .join('|');
            if (seen.has(signature)) return false;
            seen.add(signature);
            return true;
          });

          // Strict filtering for metro-only / bus-only
          if (isMetroOnly) {
            const strictlyMetro = uniquePatterns.filter((p: TripPattern) =>
              p.legs.every((l: Leg) => {
                const m = String(l.mode).toLowerCase();
                return m === 'foot' || m === 'metro';
              }),
            );
            if (strictlyMetro.length > 0) uniquePatterns = strictlyMetro;
          } else if (isBusOnly) {
            const strictlyBus = uniquePatterns.filter((p: TripPattern) =>
              p.legs.every((l: Leg) => {
                const m = String(l.mode).toLowerCase();
                return m === 'foot' || m === 'bus';
              }),
            );
            if (strictlyBus.length > 0) uniquePatterns = strictlyBus;
          }

          // Preference-based sorting
          uniquePatterns.sort((a: TripPattern, b: TripPattern) => {
            const aBuses = a.legs.filter((l: Leg) => String(l.mode).toLowerCase() === 'bus').length;
            const bBuses = b.legs.filter((l: Leg) => String(l.mode).toLowerCase() === 'bus').length;
            const aMetro = a.legs.filter((l: Leg) => String(l.mode).toLowerCase() === 'metro').length;
            const bMetro = b.legs.filter((l: Leg) => String(l.mode).toLowerCase() === 'metro').length;

            if (isPreferBus) {
              // Routes with buses come first
              const aHasBus = aBuses > 0 ? 1 : 0;
              const bHasBus = bBuses > 0 ? 1 : 0;
              if (aHasBus !== bHasBus) return bHasBus - aHasBus;
              if (aMetro !== bMetro) return aMetro - bMetro; // fewer metros preferred
            } else if (isPreferMetro || !isBusOnly) {
              // Direct pure Metro (0 buses) comes FIRST!
              const aPureMetro = aMetro > 0 && aBuses === 0 ? 1 : 0;
              const bPureMetro = bMetro > 0 && bBuses === 0 ? 1 : 0;
              if (aPureMetro !== bPureMetro) return bPureMetro - aPureMetro;

              // Any Metro route over all-bus
              const aHasMetro = aMetro > 0 ? 1 : 0;
              const bHasMetro = bMetro > 0 ? 1 : 0;
              if (aHasMetro !== bHasMetro) return bHasMetro - aHasMetro;

              // Fewer buses preferred
              if (aBuses !== bBuses) return aBuses - bBuses;
            }

            return (a.duration ?? 0) - (b.duration ?? 0);
          });

          result.trip.tripPatterns = uniquePatterns;
        }

        if (requestId === activeRequestIdRef.current) {
          // Update cache with LRU eviction
          if (tripResponseCache.size >= MAX_CACHE_ENTRIES) {
            const firstKey = tripResponseCache.keys().next().value;
            if (firstKey) tripResponseCache.delete(firstKey);
          }
          tripResponseCache.set(cacheKey, { data: result, timestamp: Date.now() });

          setData(result);
          setLoading(false);
        }
      } catch (e) {
        if (requestId === activeRequestIdRef.current) {
          console.error('Error at useTripQuery', e);
          setError(e);
          setData(null);
          setLoading(false);
        }
      }
    },
    [variables],
  );

  const variablesKey = JSON.stringify(variables);
  useEffect(() => {
    if (validLocation(variables?.from) && validLocation(variables?.to)) {
      const timer = setTimeout(() => {
        callback();
      }, 120);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variablesKey]);

  return [data, loading, callback, error];
};

function validLocation(location: Location | undefined) {
  return location && (location.coordinates || location.place);
}
