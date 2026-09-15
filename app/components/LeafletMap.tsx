"use client";

import React, { useEffect, useLayoutEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import { FireRiskData } from '../types';
import { FwiTier, tierForFwi } from '../lib/fwi/tiers';
import { CANADIAN_STATIONS } from '../lib/constants/stations';
import { calculateDistance } from '../lib/utils/geo';
import { logger } from '../lib/utils/logger';

// Must match app/globals.css's --ink / --graticule; Leaflet's vector
// renderer paints to canvas and cannot read CSS custom properties.
const PLATE_INK = '#15170f';
const PLATE_GRATICULE_STROKE = 'rgba(21, 23, 15, 0.18)';
const PLATE_PAPER = '#fafaf6';

/** The live grid is a perfectly regular 0.5° lattice (verified against the
 * production payload: 7,537 of 14,596 possible 0.5°-step cells over Canada
 * are populated). That regularity is what makes hit-testing exact and O(1):
 * round the query point to the nearest half-degree and look it up. */
const GRID_STEP = 0.5;
const HALF_STEP = GRID_STEP / 2;

function cellKey(lat: number, lon: number): string {
  return `${Math.round(lat / GRID_STEP)}:${Math.round(lon / GRID_STEP)}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const BASE_FILL_OPACITY = 0.92;
const DIMMED_FILL_OPACITY = 0.1;

interface CellEntry {
  cell: FireRiskData;
  tierId: string;
  rect: L.Rectangle;
}

export type MapViewMode = 'grid' | 'stations';

interface LeafletMapProps {
  data: FireRiskData[];
  tiers: FwiTier[];
  height?: string;
  mode: MapViewMode;
  /** null means "show every tier"; otherwise only these tier ids render at full strength. */
  activeTierIds: Set<string> | null;
  /** Controlled: which cell (by id) should show the selected-cell outline. */
  selectedCellId?: string | null;
  onCellSelect?: (cell: FireRiskData | null) => void;
  userLocation?: { lat: number; lon: number; city?: string } | null;
}

function createStationAggregates(data: FireRiskData[]): FireRiskData[] {
  if (!data || data.length === 0) return [];

  const groups = new Map<string, FireRiskData[]>();
  CANADIAN_STATIONS.forEach((s) => groups.set(s.name, []));

  data.forEach((cell) => {
    let nearest = CANADIAN_STATIONS[0];
    let minDist = calculateDistance(cell.lat, cell.lon, nearest.lat, nearest.lon);
    for (const station of CANADIAN_STATIONS) {
      const d = calculateDistance(cell.lat, cell.lon, station.lat, station.lon);
      if (d < minDist) {
        minDist = d;
        nearest = station;
      }
    }
    groups.get(nearest.name)!.push(cell);
  });

  return CANADIAN_STATIONS.map((station) => {
    const cells = groups.get(station.name) || [];
    const avg = (pick: (c: FireRiskData) => number | undefined, fallback: number) =>
      cells.length > 0
        ? cells.reduce((sum, c) => sum + (pick(c) ?? fallback), 0) / cells.length
        : fallback;

    return {
      id: `station_${station.name.replace(/\s+/g, '_').toLowerCase()}`,
      lat: station.lat,
      lon: station.lon,
      location: station.name,
      province: station.province,
      riskLevel: Math.round(avg((c) => c.riskLevel, 0) * 10) / 10,
      temperature: Math.round(avg((c) => c.temperature, 15) * 10) / 10,
      humidity: Math.round(avg((c) => c.humidity, 60) * 10) / 10,
      windSpeed: Math.round(avg((c) => c.windSpeed, 10) * 10) / 10,
    } as FireRiskData;
  });
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  data,
  tiers,
  height = '700px',
  mode,
  activeTierIds,
  selectedCellId = null,
  onCellSelect,
  userLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const fieldGroupRef = useRef<L.LayerGroup | null>(null);
  const cellsRef = useRef<Map<string, CellEntry>>(new Map());
  const stationLayerRef = useRef<L.LayerGroup | null>(null);
  const highlightRectRef = useRef<L.Rectangle | null>(null);
  const selectedRectRef = useRef<L.Rectangle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasEverPopulatedRef = useRef(false);
  const hoveredKeyRef = useRef<string | null>(null);

  const tooltipElRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<FireRiskData | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [ready, setReady] = useState(false);

  // The tooltip div only exists in the DOM while tooltipVisible is true, so
  // tooltipElRef isn't attached yet on the mousemove that first shows it —
  // without this, its first paint defaults to the top-left corner until the
  // next pixel of mouse movement corrects it. Apply the last known point as
  // soon as the node mounts.
  useLayoutEffect(() => {
    if (tooltipVisible && tooltipElRef.current) {
      tooltipElRef.current.style.transform = `translate(${lastPointRef.current.x + 14}px, ${lastPointRef.current.y + 14}px)`;
    }
  }, [tooltipVisible]);

  const tiersRef = useRef(tiers);
  tiersRef.current = tiers;

  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const targetOpacityFor = useCallback(
    (tierId: string) => (activeTierIds === null || activeTierIds.has(tierId) ? BASE_FILL_OPACITY : DIMMED_FILL_OPACITY),
    [activeTierIds]
  );

  // --- Map + base layers, created once. ---------------------------------
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const canadaBounds = L.latLngBounds(L.latLng(41.5, -141.1), L.latLng(83.6, -52.5));

    const map = L.map(mapContainerRef.current, {
      center: [60, -100],
      zoom: 4,
      minZoom: 3,
      maxZoom: 12,
      maxBounds: canadaBounds,
      maxBoundsViscosity: 1.0,
      // The map is the hero, full viewport, on a page the visitor scrolls
      // through — a plain wheel gesture has to scroll the page, not zoom the
      // map, or scrolling past the hero becomes impossible whenever the
      // cursor happens to sit over the map (i.e. almost always). Zoom is
      // still reachable via the small control below, double-click, a
      // keyboard-focused map, or touch pinch.
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Substituted for the direction contract's originally-named CARTO
    // Positron pair: basemaps.cartocdn.com now requires an API key we don't
    // have (verified live — every tile renders an "API KEY REQUIRED"
    // watermark without one). Esri's Community Basemaps are the free,
    // no-key equivalent register — see the surface brief's FIRST VIEWPORT
    // line. World_Light_Gray_Base carries the muted terrain plus sparse
    // country/water names; the Reference layer (finer place names,
    // boundaries) sits in its own pane above the thematic field so labels
    // read over the color, not under it.
    const esriAttribution =
      'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS community';

    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: esriAttribution,
      maxZoom: 16,
    }).addTo(map);

    map.createPane('labelsPane');
    const labelsPane = map.getPane('labelsPane')!;
    labelsPane.style.zIndex = '450';
    labelsPane.style.pointerEvents = 'none';

    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      pane: 'labelsPane',
      maxZoom: 16,
    }).addTo(map);

    mapRef.current = map;
    setReady(true);

    return () => {
      cancelAnimation();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Hover + click hit-testing (O(1) via the regular grid lookup). -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const handleMove = (e: L.LeafletMouseEvent) => {
      if (mode !== 'grid') return;
      const key = cellKey(e.latlng.lat, e.latlng.lng);
      const entry = cellsRef.current.get(key);

      lastPointRef.current = { x: e.containerPoint.x, y: e.containerPoint.y };
      if (tooltipElRef.current) {
        tooltipElRef.current.style.transform = `translate(${e.containerPoint.x + 14}px, ${e.containerPoint.y + 14}px)`;
      }

      if (key !== hoveredKeyRef.current) {
        hoveredKeyRef.current = key;
        setHoveredCell(entry ? entry.cell : null);
        setTooltipVisible(!!entry);

        const highlight = highlightRectRef.current;
        if (highlight) {
          if (entry) {
            highlight.setBounds([
              [entry.cell.lat - HALF_STEP, entry.cell.lon - HALF_STEP],
              [entry.cell.lat + HALF_STEP, entry.cell.lon + HALF_STEP],
            ]);
            highlight.setStyle({ opacity: 1 });
          } else {
            highlight.setStyle({ opacity: 0 });
          }
        }
      }
    };

    const handleLeave = () => {
      hoveredKeyRef.current = null;
      setHoveredCell(null);
      setTooltipVisible(false);
      highlightRectRef.current?.setStyle({ opacity: 0 });
    };

    // Selection is controlled from outside (selectedCellId prop) so a clear
    // button in the readout panel can reset the map's outline too; a click
    // here only reports the choice upward.
    const handleClick = (e: L.LeafletMouseEvent) => {
      if (mode !== 'grid') return;
      const key = cellKey(e.latlng.lat, e.latlng.lng);
      const entry = cellsRef.current.get(key);
      onCellSelect?.(entry ? entry.cell : null);
    };

    map.on('mousemove', handleMove);
    map.on('mouseout', handleLeave);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleMove);
      map.off('mouseout', handleLeave);
      map.off('click', handleClick);
    };
  }, [ready, mode, onCellSelect]);

  // --- The thematic field: every grid cell, rebuilt when data changes. ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    fieldGroupRef.current?.remove();
    cellsRef.current.clear();

    const renderer = L.canvas({ padding: 0.2 });
    const rects: L.Rectangle[] = [];
    const isFirstPopulation = !hasEverPopulatedRef.current && data.length > 0;

    data.forEach((cell) => {
      const lat = Number(cell.lat);
      const lon = Number(cell.lon);
      if (isNaN(lat) || isNaN(lon)) return;

      const tier = tierForFwi(cell.riskLevel, tiersRef.current);
      const bounds: L.LatLngBoundsExpression = [
        [lat - HALF_STEP, lon - HALF_STEP],
        [lat + HALF_STEP, lon + HALF_STEP],
      ];

      const rect = L.rectangle(bounds, {
        renderer,
        fillColor: tier.color,
        fillOpacity: isFirstPopulation ? 0 : targetOpacityFor(tier.id),
        stroke: true,
        color: PLATE_GRATICULE_STROKE,
        weight: 1,
        interactive: false,
      });

      rects.push(rect);
      cellsRef.current.set(cellKey(lat, lon), { cell, tierId: tier.id, rect });
    });

    const group = L.layerGroup(rects);
    group.addTo(map);
    fieldGroupRef.current = group;

    // Highlight (hover) and selected-cell outline rectangles, redrawn above the field.
    const highlight = L.rectangle([[0, 0], [0, 0]], {
      fill: false,
      stroke: true,
      color: PLATE_INK,
      weight: 2,
      opacity: 0,
      interactive: false,
    }).addTo(map);
    highlightRectRef.current = highlight;

    const selected = L.rectangle([[0, 0], [0, 0]], {
      fill: false,
      stroke: true,
      color: PLATE_INK,
      weight: 3,
      opacity: 0,
      interactive: false,
    }).addTo(map);
    selectedRectRef.current = selected;

    if (isFirstPopulation) {
      hasEverPopulatedRef.current = true;

      if (prefersReducedMotion()) {
        rects.forEach((rect, i) => {
          const entry = [...cellsRef.current.values()][i];
          rect.setStyle({ fillOpacity: targetOpacityFor(entry.tierId) });
        });
      } else {
        // Staged emergence: a north-to-south sweep, banded and staggered, so
        // the initial load resolves like a print developing rather than a
        // spinner snapping to a finished field.
        const entries = [...cellsRef.current.values()];
        const sorted = [...entries].sort((a, b) => b.cell.lat - a.cell.lat);
        const BANDS = 28;
        const SWEEP_MS = 900;
        const FADE_MS = 260;
        const bandOf = (i: number) => Math.floor((i / sorted.length) * BANDS);
        const startOf = (band: number) => (band / BANDS) * SWEEP_MS;

        const bandStart = new Map<CellEntry, number>();
        sorted.forEach((entry, i) => bandStart.set(entry, startOf(bandOf(i))));

        const t0 = performance.now();
        const tick = () => {
          const elapsed = performance.now() - t0;
          let stillAnimating = false;
          for (const entry of entries) {
            const start = bandStart.get(entry) ?? 0;
            const progress = Math.min(Math.max((elapsed - start) / FADE_MS, 0), 1);
            if (progress < 1) stillAnimating = true;
            entry.rect.setStyle({ fillOpacity: easeOutCubic(progress) * targetOpacityFor(entry.tierId) });
          }
          if (stillAnimating) {
            animationFrameRef.current = requestAnimationFrame(tick);
          } else {
            animationFrameRef.current = null;
          }
        };
        cancelAnimation();
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    }

    return () => {
      cancelAnimation();
      group.remove();
      highlight.remove();
      selected.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data]);

  // --- Selected-cell outline: controlled by selectedCellId. --------------
  useEffect(() => {
    const selected = selectedRectRef.current;
    if (!selected) return;

    if (!selectedCellId) {
      selected.setStyle({ opacity: 0 });
      return;
    }

    const entry = [...cellsRef.current.values()].find((e) => e.cell.id === selectedCellId);
    if (entry) {
      selected.setBounds([
        [entry.cell.lat - HALF_STEP, entry.cell.lon - HALF_STEP],
        [entry.cell.lat + HALF_STEP, entry.cell.lon + HALF_STEP],
      ]);
      selected.setStyle({ opacity: 1 });
    } else {
      selected.setStyle({ opacity: 0 });
    }
  }, [selectedCellId, data]);

  // --- Tier filter: animate opacity of already-built cells, no rebuild. --
  useEffect(() => {
    if (!ready || cellsRef.current.size === 0 || !hasEverPopulatedRef.current) return;
    cancelAnimation();

    const entries = [...cellsRef.current.values()];
    const startOpacities = new Map(entries.map((e) => [e, e.rect.options.fillOpacity ?? BASE_FILL_OPACITY]));
    const DURATION = prefersReducedMotion() ? 0 : 260;

    if (DURATION === 0) {
      entries.forEach((e) => e.rect.setStyle({ fillOpacity: targetOpacityFor(e.tierId) }));
      return;
    }

    const t0 = performance.now();
    const tick = () => {
      const t = Math.min((performance.now() - t0) / DURATION, 1);
      const eased = easeOutCubic(t);
      for (const entry of entries) {
        const from = startOpacities.get(entry) ?? BASE_FILL_OPACITY;
        const to = targetOpacityFor(entry.tierId);
        entry.rect.setStyle({ fillOpacity: from + (to - from) * eased });
      }
      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };
    animationFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTierIds]);

  // --- Stations view: aggregated markers, shown instead of the field. ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    stationLayerRef.current?.remove();
    stationLayerRef.current = null;

    if (mode !== 'stations') return;

    const aggregates = createStationAggregates(data);
    const markers = aggregates.map((station) => {
      const tier = tierForFwi(station.riskLevel, tiersRef.current);
      // Same tier filter as the grid field (targetOpacityFor), so isolating a
      // class from the legend dims non-matching stations too, not just cells.
      const isActive = activeTierIds === null || activeTierIds.has(tier.id);
      const marker = L.circleMarker([station.lat, station.lon], {
        radius: 9,
        fillColor: tier.color,
        color: PLATE_PAPER,
        weight: 2,
        opacity: isActive ? 1 : DIMMED_FILL_OPACITY,
        fillOpacity: isActive ? 0.95 : DIMMED_FILL_OPACITY,
      });

      const popup = `
        <div class="font-display" style="min-width:200px">
          <div class="text-[13px] font-semibold" style="color:${PLATE_INK}">${station.location}, ${station.province}</div>
          <div class="mt-1.5 flex items-center gap-1.5 text-xs" style="color:${PLATE_INK}">
            <span style="display:inline-block;width:9px;height:9px;background:${tier.color};border:1px solid ${PLATE_INK}22"></span>
            <span>FWI ${station.riskLevel.toFixed(1)}: ${tier.name}</span>
          </div>
          <div class="mt-2 pt-2 text-[11px] tabular" style="border-top:1px solid ${PLATE_INK}22;color:${PLATE_INK}99">
            <div>Temperature: ${station.temperature?.toFixed(1)}°C</div>
            <div>Humidity: ${station.humidity?.toFixed(0)}%</div>
            <div>Wind: ${station.windSpeed?.toFixed(1)} km/h</div>
          </div>
        </div>
      `;
      marker.bindPopup(popup, { maxWidth: 260, className: 'plate-popup' });
      marker.on('click', () => onCellSelect?.(station));
      return marker;
    });

    const group = L.layerGroup(markers).addTo(map);
    stationLayerRef.current = group;

    return () => {
      group.remove();
    };
  }, [ready, mode, data, onCellSelect, activeTierIds]);

  // --- Only one of {field, stations} is ever shown at a time. ------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const field = fieldGroupRef.current;
    const highlight = highlightRectRef.current;
    const selected = selectedRectRef.current;
    const showField = mode === 'grid';

    [field, highlight, selected].forEach((layer) => {
      if (!layer) return;
      const has = map.hasLayer(layer);
      if (showField && !has) layer.addTo(map);
      if (!showField && has) map.removeLayer(layer);
    });
  }, [ready, mode, data]);

  // --- User location: an achromatic pulsing marker, not a colored radar. -
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!userLocation) return;

    const icon = L.divIcon({
      className: '',
      html: '<span class="user-location-marker" aria-hidden="true"></span>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    // interactive: false is load-bearing, not cosmetic: this marker's pulsing
    // ring visually (and, without this, clickably) overlaps whatever cell or
    // station sits under the visitor's real location — Calgary's station dot
    // was unclickable for anyone located near it. The "Near You" reading
    // already carries this same info in the Readings section below.
    const marker = L.marker([userLocation.lat, userLocation.lon], { icon, zIndexOffset: 500, interactive: false });
    marker.addTo(map);
    userMarkerRef.current = marker;
  }, [ready, userLocation]);

  const tooltipTier = hoveredCell ? tierForFwi(hoveredCell.riskLevel, tiers) : null;

  return (
    <div style={{ height, width: '100%', position: 'relative' }} className="overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" style={{ background: 'var(--paper)' }} suppressHydrationWarning />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--paper)' }}>
          <p className="font-display text-xs tracking-[0.14em] uppercase" style={{ color: 'var(--ink-muted)' }}>
            Preparing plate…
          </p>
        </div>
      )}

      {tooltipVisible && hoveredCell && tooltipTier && (
        <div
          ref={tooltipElRef}
          className="pointer-events-none absolute top-0 left-0 z-[1000] px-2.5 py-1.5 font-display text-xs"
          style={{
            background: 'var(--paper-raised)',
            border: '1px solid var(--hairline)',
            color: 'var(--ink)',
            willChange: 'transform',
          }}
        >
          <span className="tabular font-semibold">FWI {hoveredCell.riskLevel.toFixed(1)}</span>
          <span style={{ color: 'var(--ink-muted)' }}>: {tooltipTier.name}</span>
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
