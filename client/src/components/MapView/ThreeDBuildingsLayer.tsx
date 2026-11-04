import React, { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useTheme } from '../../context/ThemeContext';
import { useCity } from '../../context/CityContext';

/**
 * 3D Building Extrusion Layer for MapLibre GL
 * Provides authentic 3D building blocks matching ASTraM 3D digital twins in both Light and Dark themes.
 * 1. Vector 3D extrusions directly from Carto's vector tiles (`protomaps` -> `buildings`)
 * 2. Dense procedural building extrusions along major transit corridors as guaranteed 3D fallback
 */

export const ThreeDBuildingsLayer: React.FC = () => {
  const { theme, is3D } = useTheme();
  const { cityConfig } = useCity();

  // Dense procedural 3D building blocks along transit corridors and urban centers
  const proceduralBuildingsGeoJson = useMemo(() => {
    const features: Array<{
      type: 'Feature';
      id: string;
      properties: { height: number; base_height: number; color_variant: number };
      geometry: { type: 'Polygon'; coordinates: [number, number][][] };
    }> = [];

    // Corridor centers across Bengaluru and Chennai
    const hubCenters = [
      ...cityConfig.presets.map((p) => ({ lat: p.latitude, lon: p.longitude, radius: 0.016, clusterDensity: 36 })),
      // Additional dense hubs to ensure continuous 3D skyline
      { lat: cityConfig.center[1], lon: cityConfig.center[0], radius: 0.022, clusterDensity: 50 },
    ];

    let buildingId = 1;

    for (const hub of hubCenters) {
      for (let i = 0; i < hub.clusterDensity; i++) {
        const angle = (i * 137.5 * Math.PI) / 180;
        const dist = 0.0012 + ((i % 6) + 1) * (hub.radius / 7);
        const centerLat = hub.lat + Math.sin(angle) * dist;
        const centerLon = hub.lon + Math.cos(angle) * dist * 1.1;

        const w = 0.00032 + ((i * 7) % 5) * 0.00007; // ~35m - 65m
        const h = 0.00028 + ((i * 11) % 4) * 0.00006;

        // Heights: 24m to 90m (commercial high-rises and residential complexes)
        const baseHeight = 20;
        const heightMultiplier = ((i * 13) % 8) + 1;
        const height = baseHeight + heightMultiplier * 8.5 + (i % 3 === 0 ? 25 : 0);

        const polygon: [number, number][][] = [
          [
            [centerLon - w / 2, centerLat - h / 2],
            [centerLon + w / 2, centerLat - h / 2],
            [centerLon + w / 2, centerLat + h / 2],
            [centerLon - w / 2, centerLat + h / 2],
            [centerLon - w / 2, centerLat - h / 2],
          ],
        ];

        features.push({
          type: 'Feature',
          id: `bldg-${buildingId++}`,
          properties: {
            height,
            base_height: 0,
            color_variant: i % 3,
          },
          geometry: {
            type: 'Polygon',
            coordinates: polygon,
          },
        });
      }
    }

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [cityConfig]);

  if (!is3D) return null;

  // Exact color matching from user's uploaded ASTraM 3D digital-twin images
  const extrusionColor =
    theme === 'dark'
      ? '#1E2538' // Deep obsidian/slate in dark theme (left image)
      : '#DFD7CB'; // Warm cream/ivory sandstone in light theme (right image)

  return (
    <>
      {/* 1. Real Vector Tile 3D Extrusion from Carto Protomaps Vector Tiles */}
      <Layer
        id="carto-vector-3d-buildings"
        type="fill-extrusion"
        source="protomaps"
        source-layer="buildings"
        minzoom={13}
        paint={{
          'fill-extrusion-color': extrusionColor,
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            13,
            ['coalesce', ['get', 'height'], 20],
            16,
            ['coalesce', ['get', 'height'], ['*', ['coalesce', ['get', 'levels'], 1], 4.5], 28],
          ],
          'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
          'fill-extrusion-opacity': theme === 'dark' ? 0.92 : 0.95,
        }}
      />

      {/* 2. Guaranteed Procedural 3D Building Skyblocks along Transit Corridors */}
      <Source id="procedural-3d-buildings-source" type="geojson" data={proceduralBuildingsGeoJson}>
        <Layer
          id="procedural-3d-buildings-extrusion"
          type="fill-extrusion"
          paint={{
            'fill-extrusion-color': extrusionColor,
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'base_height'],
            'fill-extrusion-opacity': theme === 'dark' ? 0.88 : 0.92,
          }}
        />
      </Source>
    </>
  );
};
