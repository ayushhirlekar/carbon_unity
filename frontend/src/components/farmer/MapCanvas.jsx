import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
// maplibre-gl ships named exports only — there is no default.
import { Map as MapLibreMap, NavigationControl, GeolocateControl, LngLatBounds } from 'maplibre-gl';
import area from '@turf/area';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Parcel drawing canvas.
 *
 * Drawing is implemented directly against MapLibre rather than
 * through terra-draw. The adapter's event handling worked but its
 * rendering did not against this MapLibre version, so a farmer
 * could tap out a boundary, get a correct area, and never see a
 * line. Owning the ~40 lines removes both the dependency and the
 * version coupling.
 *
 * The shape closes itself: three or more points make a polygon,
 * updated on every tap. There is no separate "close the shape"
 * step to discover or get wrong.
 *
 * Area here is for immediate feedback only. The server recomputes
 * it from the polygon and that value is authoritative.
 */

const SATELLITE = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'esri', type: 'raster', source: 'esri' }],
};

const FALLBACK_CENTER = [74.5815, 16.8524];
const EMPTY = { type: 'FeatureCollection', features: [] };

const positionsOf = (geometry) => {
  if (!geometry?.coordinates) return [];
  const depth = geometry.type === 'MultiPolygon' ? 2 : 1;
  return geometry.coordinates
    .flat(depth)
    .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
};

const centerOf = (geometry) => {
  const pts = positionsOf(geometry);
  if (!pts.length) return null;
  const s = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [s[0] / pts.length, s[1] / pts.length];
};

/** Closed ring from the tapped points, as GeoJSON wants it. */
const ringFrom = (pts) => (pts.length >= 3 ? [[...pts, pts[0]]] : null);

const MapCanvas = forwardRef(function MapCanvas(
  { onChange, initialBoundary = null, readOnly = false, height = 320 },
  ref
) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const pointsRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(0);

  /** Repaint vertices, edges and fill from the current points. */
  const repaint = useCallback(() => {
    const map = mapRef.current;
    const src = map?.getSource('sketch');
    if (!src) return;

    const pts = pointsRef.current;
    if (pts.length === 0) {
      src.setData(EMPTY);
      onChange?.(null);
      return;
    }

    const features = pts.map((p, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p },
      properties: { first: i === 0 },
    }));

    if (pts.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: pts.length >= 3 ? [...pts, pts[0]] : pts,
        },
        properties: {},
      });
    }

    const ring = ringFrom(pts);
    let geometry = null;
    if (ring) {
      geometry = { type: 'Polygon', coordinates: ring };
      features.push({ type: 'Feature', geometry, properties: {} });
    }

    src.setData({ type: 'FeatureCollection', features });

    onChange?.(
      geometry
        ? { geometry, hectares: area({ type: 'Feature', geometry, properties: {} }) / 10000 }
        : null
    );
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    startDraw() {
      pointsRef.current = [];
      setCount(0);
      repaint();
    },
    clear() {
      pointsRef.current = [];
      setCount(0);
      repaint();
    },
    undo() {
      pointsRef.current = pointsRef.current.slice(0, -1);
      setCount(pointsRef.current.length);
      repaint();
    },
  }));

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: container.current,
      style: SATELLITE,
      center: centerOf(initialBoundary) || FALLBACK_CENTER,
      zoom: initialBoundary ? 15 : 16,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    if (!readOnly) {
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(
        new GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }),
        'top-right'
      );
    }

    map.on('load', () => {
      // Saved boundary (read-only cards and parcel previews)
      if (initialBoundary) {
        map.addSource('parcel', {
          type: 'geojson',
          data: { type: 'Feature', geometry: initialBoundary, properties: {} },
        });
        map.addLayer({
          id: 'parcel-fill', type: 'fill', source: 'parcel',
          paint: { 'fill-color': '#8fca6a', 'fill-opacity': 0.35 },
        });
        map.addLayer({
          id: 'parcel-line', type: 'line', source: 'parcel',
          paint: { 'line-color': '#ffffff', 'line-width': 2.5 },
        });

        // Padding must fit the container: on a 150px card, 40px top
        // and bottom leaves 70px and fitBounds silently gives up.
        const pad = Math.max(8, Math.min(32, Math.floor(height * 0.12)));
        const pts = positionsOf(initialBoundary);
        if (pts.length) {
          try {
            map.fitBounds(
              pts.reduce((b, p) => b.extend(p), new LngLatBounds(pts[0], pts[0])),
              { padding: pad, duration: 0, maxZoom: 17 }
            );
          } catch { /* keep the centre already set */ }
        }
      }

      if (!readOnly) {
        map.addSource('sketch', { type: 'geojson', data: EMPTY });

        map.addLayer({
          id: 'sketch-fill', type: 'fill', source: 'sketch',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: { 'fill-color': '#8fca6a', 'fill-opacity': 0.3 },
        });
        map.addLayer({
          id: 'sketch-line', type: 'line', source: 'sketch',
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: { 'line-color': '#ffffff', 'line-width': 3 },
        });
        map.addLayer({
          id: 'sketch-points', type: 'circle', source: 'sketch',
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            // The first corner is larger, so it is obvious where
            // the outline began and where it will close back to.
            'circle-radius': ['case', ['get', 'first'], 8, 6],
            'circle-color': ['case', ['get', 'first'], '#ffd166', '#ffffff'],
            'circle-stroke-color': '#2d5016',
            'circle-stroke-width': 2,
          },
        });

        map.on('click', (e) => {
          pointsRef.current = [...pointsRef.current, [e.lngLat.lng, e.lngLat.lat]];
          setCount(pointsRef.current.length);
          repaint();
        });

        map.getCanvas().style.cursor = 'crosshair';
      }

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Built once per mount; callers remount with a key to change boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-surface-200/80 shadow-inner">
      <div ref={container} style={{ height }} className="w-full bg-[#dfe9df]" />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-xs font-semibold text-surface-600 bg-surface-100/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            Loading satellite map…
          </div>
        </div>
      )}

      {ready && !readOnly && (
        <div className="absolute top-2 left-2 bg-surface-900/85 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white shadow-lg pointer-events-none flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">
            {count === 0 && 'Tap the first corner of your field'}
            {count === 1 && '1 corner — tap the next one'}
            {count === 2 && '2 corners — one more makes a shape'}
            {count >= 3 && `${count} corners · tap more or register`}
          </span>
        </div>
      )}
    </div>
  );
});

export default MapCanvas;
