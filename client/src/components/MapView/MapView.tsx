import {
  LngLat,
  Map,
  MapEvent,
  MapGeoJSONFeature,
  MapMouseEvent,
  NavigationControl,
  MapRef,
  ViewStateChangeEvent,
} from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

// maplibre-gl resolves its worker script relative to `import.meta.url` at runtime, which Vite
// cannot statically detect and therefore never copies into the build output. Point it at the
// worker asset Vite does bundle instead.
maplibregl.setWorkerUrl(maplibreWorkerUrl);
import { TripPattern, TripQuery, TripQueryVariables } from '../../gql/graphql.ts';
import { NavigationMarkers } from './NavigationMarkers.tsx';
import { LegLines } from './LegLines.tsx';
import { useMapDoubleClick } from './useMapDoubleClick.ts';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ContextMenuPopup } from './ContextMenuPopup.tsx';
import { GeometryPropertyPopup } from './GeometryPropertyPopup.tsx';
import { FeatureSelectPopup } from './FeatureSelectPopup.tsx';
import { useCity } from '../../context/CityContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ThreeDBuildingsLayer } from './ThreeDBuildingsLayer.tsx';

// 3D Digital Twin basemaps matching ASTraM 3D twins (Light and Dark)
const DARK_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

type PopupData = { coordinates: LngLat; feature: MapGeoJSONFeature };
type FeatureSelectData = { coordinates: LngLat; features: MapGeoJSONFeature[] };

export function MapView({
  tripQueryVariables,
  setTripQueryVariables,
  tripQueryResult,
  selectedTripPatternIndexes,
  loading,
}: {
  tripQueryVariables: TripQueryVariables;
  setTripQueryVariables: (variables: TripQueryVariables) => void;
  tripQueryResult: TripQuery | null;
  selectedTripPatternIndexes: number[];
  loading: boolean;
}) {
  const onMapDoubleClick = useMapDoubleClick({ tripQueryVariables, setTripQueryVariables });
  const [showContextPopup, setShowContextPopup] = useState<LngLat | null>(null);
  const [showPropsPopup, setShowPropsPopup] = useState<PopupData | null>(null);
  const [showFeatureSelectPopup, setShowFeatureSelectPopup] = useState<FeatureSelectData | null>(null);
  const [interactiveLayerIds] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string>('auto');
  const onMouseEnter = useCallback(() => setCursor('pointer'), []);
  const onMouseLeave = useCallback(() => setCursor('auto'), []);

  const { cityConfig } = useCity();
  const { theme, is3D } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const attributionAddedRef = useRef(false);

  // Controlled camera view state for robust 3D pitch/bearing persistence
  const [viewState, setViewState] = useState({
    longitude: cityConfig.center[0],
    latitude: cityConfig.center[1],
    zoom: cityConfig.zoom,
    pitch: is3D ? 58 : 0,
    bearing: is3D ? -17 : 0,
  });

  const activeMapStyle = theme === 'dark' ? DARK_STYLE_URL : LIGHT_STYLE_URL;

  const showFeaturePropPopup = (
    e: MapMouseEvent & {
      features?: MapGeoJSONFeature[] | undefined;
    },
  ) => {
    if (e.features) {
      if (e.features.length == 1) {
        const feature = e.features[0];
        setShowPropsPopup({ coordinates: e.lngLat, feature: feature });
      }
      if (e.features.length > 1) {
        setShowFeatureSelectPopup({ coordinates: e.lngLat, features: e.features });
      }
    }
  };

  const onLoad = (e: MapEvent) => {
    const map = e.target;
    if (!attributionAddedRef.current) {
      attributionAddedRef.current = true;
      map.addControl(new maplibregl.AttributionControl(), 'bottom-left');
    }
    // Set 3D directional light for realistic building roof and facade shading
    try {
      // @ts-ignore
      map.setLight?.({
        anchor: 'viewport',
        color: theme === 'dark' ? '#C8D6EF' : '#FFFFFF',
        intensity: theme === 'dark' ? 0.42 : 0.65,
        position: [1.5, 90, 80],
      });
    } catch {
      // Ignore if not supported by current GL renderer
    }
  };

  function handleMapLoad(e: MapEvent) {
    onLoad(e);
  }

  // Smoothly update 3D / 2D perspective when user clicks 3D toggle
  useEffect(() => {
    const targetPitch = is3D ? 58 : 0;
    const targetBearing = is3D ? -17 : 0;

    setViewState((prev) => ({
      ...prev,
      pitch: targetPitch,
      bearing: targetBearing,
    }));

    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: targetPitch,
        bearing: targetBearing,
        duration: 800,
      });
    }
  }, [is3D]);

  const handleMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  }, []);

  return (
    <div className={`map-container below-content ${theme}-theme-container`}>
      <Map
        attributionControl={false}
        // @ts-ignore
        mapLib={maplibregl}
        // @ts-ignore
        mapStyle={activeMapStyle}
        {...viewState}
        onMove={handleMove}
        maxPitch={85}
        touchPitch={true}
        dragRotate={true}
        pitchWithRotate={true}
        onDblClick={onMapDoubleClick}
        onContextMenu={(e) => {
          setShowContextPopup(e.lngLat);
        }}
        interactiveLayerIds={interactiveLayerIds}
        cursor={cursor}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={showFeaturePropPopup}
        hash={true}
        onLoad={handleMapLoad}
        ref={mapRef}
      >
        <NavigationControl position="top-left" visualizePitch={true} />

        <NavigationMarkers
          setCursor={setCursor}
          tripQueryVariables={tripQueryVariables}
          setTripQueryVariables={setTripQueryVariables}
          loading={loading}
        />

        {/* 3D Buildings Extrusion Layer (Vector tiles & procedural skyblocks) */}
        <ThreeDBuildingsLayer />

        {/* Transit Route Polylines */}
        {tripQueryResult?.trip.tripPatterns.length &&
          selectedTripPatternIndexes.map((index) => {
            const tripPattern = tripQueryResult.trip.tripPatterns[index];
            return tripPattern ? (
              <LegLines key={`trippattern-${index}`} patternIndex={index} tripPattern={tripPattern as TripPattern} />
            ) : null;
          })}

        {showContextPopup && (
          <ContextMenuPopup
            tripQueryVariables={tripQueryVariables}
            setTripQueryVariables={setTripQueryVariables}
            coordinates={showContextPopup}
            onClose={() => setShowContextPopup(null)}
          />
        )}
        {showPropsPopup?.feature?.properties && (
          <GeometryPropertyPopup
            coordinates={showPropsPopup?.coordinates}
            properties={showPropsPopup?.feature?.properties}
            onClose={() => setShowPropsPopup(null)}
          />
        )}
        {showFeatureSelectPopup && (
          <FeatureSelectPopup
            {...showFeatureSelectPopup}
            setShowPropsPopup={setShowPropsPopup}
            onClose={() => setShowFeatureSelectPopup(null)}
          />
        )}
      </Map>
    </div>
  );
}
