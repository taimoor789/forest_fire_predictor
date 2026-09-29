"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MapPin, Layers, AlertTriangle, X, ChevronDown, ArrowDown } from 'lucide-react';
import MapComponent from './Map';
import StatisticsPanel from './StatisticsPanel';
import { useFireRiskData, API_BASE_URL } from '../lib/api';
import { FireRiskData } from '../types';
import { useFwiTiers, tierForFwi, formatTierRange, bucketByTier } from '../lib/fwi/tiers';
import { calculateDistance } from '../lib/utils/geo';
import { CANADIAN_STATIONS, nearestStation } from '../lib/constants/stations';
import { logger } from '../lib/utils/logger';
import { useInView } from '../lib/hooks/useInView';
import type { MapViewMode } from './LeafletMap';

const LOCATION_STORAGE_KEY = 'userLocation';
const LOCATION_TIMESTAMP_KEY = 'userLocationTimestamp';

type UserLocation = { lat: number; lon: number; city?: string };

/**
 * A grid cell's `location` field is an internal id ("Grid_1832"), not a real
 * place name; station aggregates (Stations view) carry a real one already,
 * distinguished by the "station_" id prefix createStationAggregates uses.
 *
 * City and province are always read from the SAME record (the station
 * aggregate's own fields, or one resolved nearestStation's own fields) and
 * never mixed with the cell's own `province` field — a cell near the BC/AB
 * border can have Kelowna (BC) as its nearest named station, and pairing
 * that city with the cell's own province produced a nonsensical "Kelowna, AB".
 */
function displayLocationFor(cell: FireRiskData): { city: string; province: string } {
  if (cell.id.startsWith('station_')) return { city: cell.location, province: cell.province };
  const station = nearestStation(cell.lat, cell.lon);
  return { city: station.name, province: station.province };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Small presentational pieces, styled to the plate world: flat paper
// surfaces, hairline borders, no shadows. The six tier colors classify data;
// --accent is the one signature color for the UI's own brand and
// interactivity (buttons, links, active states) — see globals.css.
// ---------------------------------------------------------------------------

const StatusDot: React.FC<{ status: 'loading' | 'error' | 'ok' }> = ({ status }) => (
  <span
    aria-hidden="true"
    className={`inline-block h-2 w-2 rounded-full ${status === 'loading' ? 'animate-pulse motion-reduce:animate-none' : ''}`}
    style={{
      background: status === 'ok' ? 'var(--accent)' : 'transparent',
      border: status === 'ok' ? 'none' : '1.5px solid var(--ink-muted)',
    }}
  />
);

const ModeToggle: React.FC<{ mode: MapViewMode; onChange: (m: MapViewMode) => void; disabled: boolean }> = ({
  mode,
  onChange,
  disabled,
}) => (
  <div className="flex divide-x" style={{ border: '1px solid var(--ink)', borderColor: 'var(--ink)' }}>
    {(['grid', 'stations'] as const).map((m) => {
      const active = mode === m;
      return (
        <button
          key={m}
          type="button"
          aria-pressed={active}
          disabled={disabled}
          onClick={() => onChange(m)}
          className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 font-display text-[11px] font-bold tracking-[0.08em] uppercase transition-colors active:scale-[0.97] disabled:opacity-50"
          style={{
            background: active ? 'var(--accent)' : 'var(--paper-raised)',
            color: active ? 'var(--accent-on)' : 'var(--ink)',
            borderColor: 'var(--ink)',
          }}
          onMouseEnter={(e) => {
            if (!active) e.currentTarget.style.background = 'var(--accent-soft)';
          }}
          onMouseLeave={(e) => {
            if (!active) e.currentTarget.style.background = 'var(--paper-raised)';
          }}
        >
          {m === 'grid' ? <Layers className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
          {m === 'grid' ? 'Grid' : 'Stations'}
        </button>
      );
    })}
  </div>
);

const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={className} style={{ background: 'var(--paper-raised)', border: '1px solid var(--hairline)' }}>
    {children}
  </div>
);

/** A section heading with the one recurring brand motif: a small accent tick
 * beside the type, never a text label riding above it. */
const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="flex items-center gap-3 font-display text-2xl font-bold uppercase tracking-[0.02em]" style={{ color: 'var(--ink)' }}>
    <span aria-hidden="true" className="h-6 w-1.5 flex-shrink-0" style={{ background: 'var(--accent)' }} />
    {children}
  </h2>
);

/** Counts up from 0 once the element scrolls into view; snaps instantly under reduced motion. */
const CountUp: React.FC<{ value: number; decimals?: number; suffix?: string }> = ({ value, decimals = 0, suffix = '' }) => {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    let raf: number;
    const start = performance.now();
    const duration = 900;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref} className="count-up">
      {display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
};

/** Reveals its children once they scroll into view (see globals.css [data-reveal]). */
const Reveal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} data-reveal={inView ? 'in' : undefined} className={className}>
      {children}
    </div>
  );
};

const CellRow: React.FC<{ cell: FireRiskData; onSelect: () => void; tiers: ReturnType<typeof useFwiTiers> }> = ({ cell, onSelect, tiers }) => {
  const tier = tierForFwi(cell.riskProbability, tiers);
  const location = displayLocationFor(cell);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:[background:var(--accent-soft)]"
      style={{ borderTop: '1px solid var(--hairline)' }}
    >
      <span aria-hidden="true" className="h-3 w-3 flex-shrink-0" style={{ background: tier.color, border: '1px solid rgba(21,23,15,0.25)' }} />
      <span className="flex-1 font-display text-[14px]" style={{ color: 'var(--ink)' }}>
        {location.city}, {location.province} · {Math.abs(cell.lat).toFixed(1)}°N, {Math.abs(cell.lon).toFixed(1)}°W
      </span>
      <span className="font-display text-[11px]" style={{ color: 'var(--ink-muted)' }}>
        {tier.name}
      </span>
      <span className="font-mono tabular text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
        {(cell.riskProbability * 100).toFixed(3)}%
      </span>
    </button>
  );
};

// ---------------------------------------------------------------------------

const FireRiskDashboard: React.FC = () => {
  const { data, loading, error, lastUpdated, isStaleCache } = useFireRiskData();
  const tiers = useFwiTiers(API_BASE_URL);
  const shouldShowSkeleton = loading && data.length === 0;

  const [mode, setMode] = useState<MapViewMode>('grid');
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [excludedTierIds, setExcludedTierIds] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<FireRiskData | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const prevLastUpdatedRef = useRef<string | null>(null);
  const readingsRef = useRef<HTMLDivElement>(null);

  const handleModeSwitch = useCallback(
    (next: MapViewMode) => {
      if (next === mode || isSwitchingMode) return;
      setIsSwitchingMode(true);
      setMode(next);
      setTimeout(() => setIsSwitchingMode(false), 600);
    },
    [mode, isSwitchingMode]
  );

  const toggleTier = useCallback((tierId: string) => {
    setExcludedTierIds((prev) => {
      const next = new Set(prev);
      if (next.has(tierId)) next.delete(tierId);
      else next.add(tierId);
      return next;
    });
  }, []);

  // Clicking a cell on the map both selects it and carries the visitor down
  // to its full reading — the one signature interaction tying the map to the
  // scroll experience, rather than a floating panel nobody notices updated.
  const handleCellSelect = useCallback((cell: FireRiskData | null) => {
    setSelectedCell(cell);
    if (cell) {
      readingsRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }, []);

  const scrollToReadings = useCallback(() => {
    readingsRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, []);

  const activeTierIds = useMemo(
    () => (excludedTierIds.size === 0 ? null : new Set(tiers.filter((t) => !excludedTierIds.has(t.id)).map((t) => t.id))),
    [excludedTierIds, tiers]
  );

  const highestCells = useMemo(() => [...data].sort((a, b) => b.riskProbability - a.riskProbability).slice(0, 5), [data]);

  // A single-row read of today's national distribution for the title block —
  // the legend below carries the same breakdown per-tier with counts.
  const distributionSegments = useMemo(() => {
    if (data.length === 0) return [];
    const buckets = bucketByTier(data, (d) => d.riskProbability, tiers);
    return tiers
      .map((tier) => ({ tierId: tier.id, color: tier.color, pct: ((buckets.get(tier.id)?.length ?? 0) / data.length) * 100 }))
      .filter((seg) => seg.pct > 0);
  }, [data, tiers]);

  const nearestCell = useMemo(() => {
    if (!userLocation || data.length === 0) return null;
    let best: { cell: FireRiskData; distanceKm: number } | null = null;
    for (const cell of data) {
      const d = calculateDistance(userLocation.lat, userLocation.lon, cell.lat, cell.lon);
      if (!best || d < best.distanceKm) best = { cell, distanceKm: d };
    }
    return best;
  }, [userLocation, data]);

  const lowDangerPct = data.length > 0 ? (data.filter((d) => d.riskLevel < 4).length / data.length) * 100 : 0;
  const highDangerPct = data.length > 0 ? (data.filter((d) => d.riskLevel >= 8).length / data.length) * 100 : 0;

  // --- Geolocation: cached (7-day TTL) -> browser geolocation -> reverse geocode. ---
  useEffect(() => {
    const loadCached = () => {
      try {
        const cached = localStorage.getItem(LOCATION_STORAGE_KEY);
        const timestamp = localStorage.getItem(LOCATION_TIMESTAMP_KEY);
        if (cached && timestamp && Date.now() - parseInt(timestamp, 10) < 7 * 24 * 60 * 60 * 1000) {
          setUserLocation(JSON.parse(cached));
          return true;
        }
      } catch (e) {
        logger.warn('Failed to load cached location:', e);
      }
      return false;
    };

    if (loadCached()) return;
    if (!navigator.geolocation) {
      setLocationError('Location unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        let city = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
            headers: { 'User-Agent': 'FireRiskDashboard/1.0' },
          });
          if (res.ok) {
            const json = await res.json();
            const town = json.address?.city || json.address?.town || json.address?.county;
            const province = json.address?.state;
            if (town) city = province ? `${town}, ${province}` : town;
          }
        } catch (e) {
          logger.warn('Reverse geocoding failed, using coordinates:', e);
        }
        const location = { lat, lon, city };
        setUserLocation(location);
        setLocationError(null);
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
        localStorage.setItem(LOCATION_TIMESTAMP_KEY, Date.now().toString());
      },
      () => setLocationError('Location unavailable'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // --- "Data updated" toast on refresh. ---
  useEffect(() => {
    if (!lastUpdated || loading) return;
    if (prevLastUpdatedRef.current && prevLastUpdatedRef.current !== lastUpdated) {
      setShowUpdateNotification(true);
      const t = setTimeout(() => setShowUpdateNotification(false), 3000);
      return () => clearTimeout(t);
    }
    prevLastUpdatedRef.current = lastUpdated;
  }, [lastUpdated, loading]);

  // "Updated 9:12 a.m." with no date is ambiguous once it's read past midnight
  // and into the next day, before the day's real update has landed — it looks
  // like this morning's update when it's actually yesterday's. Name the day
  // explicitly whenever it isn't today.
  const updateTimeDisplay = useMemo(() => {
    if (!lastUpdated) return '';
    const d = new Date(lastUpdated);
    if (isNaN(d.getTime())) return '';
    const time = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(d);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return time;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const day =
      d.toDateString() === yesterday.toDateString()
        ? 'yesterday'
        : new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(d);
    return `${day}, ${time}`;
  }, [lastUpdated]);

  const today = useMemo(() => new Intl.DateTimeFormat('en-CA', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase(), []);

  const status: 'loading' | 'error' | 'ok' = loading ? 'loading' : error ? 'error' : 'ok';
  const statusMessage = loading
    ? 'Loading latest data…'
    : error
      ? isStaleCache || data.length > 0
        ? 'Connection issue: showing last known data'
        : 'Unable to reach the live system'
      : updateTimeDisplay
        ? `Updated ${updateTimeDisplay}`
        : 'Ready';

  return (
    <main style={{ background: 'var(--paper)' }}>
      {showUpdateNotification && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-[1200] -translate-x-1/2 px-4 py-2 font-display text-[12px] transition-all duration-300 motion-reduce:transition-none"
          style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
        >
          Data updated with the latest FWI calculations
        </div>
      )}

      {/* ===================== HERO: the map, full viewport =====================
          Desktop/tablet (md+): one fixed h-dvh viewport, map full-bleed behind
          an overlay panel. Mobile: there is no height this content and a full
          hero map could both fit in, so the panel flows in normal document
          order above a shorter map instead of overlaying it — verified against
          a 375x667 viewport, where the overlay approach clipped the panel's
          own footnote text under a fixed hero height. */}
      <section className="relative w-full md:h-dvh md:overflow-hidden">
        {/* md:z-0 (not just relative) is load-bearing at md+: without an
            explicit z-index there, .leaflet-container never becomes its own
            stacking context, and Leaflet's internal panes (z-index up to 700)
            paint above the md:z-10 overlay below regardless of DOM order. On
            mobile the map sits in normal flow, so no stacking fix is needed. */}
        <div className="relative h-[56vh] w-full md:absolute md:inset-0 md:z-0 md:h-full">
          <MapComponent
            data={data}
            tiers={tiers}
            height="100%"
            mode={mode}
            activeTierIds={activeTierIds}
            selectedCellId={selectedCell?.id ?? null}
            onCellSelect={handleCellSelect}
            userLocation={userLocation}
          />
        </div>

        {/* The one consolidated panel — title, status, toggle, and the tier
            legend/filter together, with real room to breathe. Floats over the
            map at md+; flows below it on mobile. */}
        <div className="w-full p-4 md:pointer-events-none md:absolute md:inset-0 md:z-10">
          <div className="pointer-events-auto w-full md:w-[380px]" style={{ background: 'var(--paper-raised)', border: '1px solid var(--hairline)' }}>
            <div className="px-5 pt-4">
              <h1 className="font-display text-xl font-bold uppercase tracking-[0.03em]" style={{ color: 'var(--ink)' }}>
                Forest Fire Risk Predictor
              </h1>
              <p className="mt-1 font-display text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                ML Fire Risk · FWI Tracked · {today}
              </p>
            </div>
            <div className="flex items-center justify-between px-5 pt-3">
              <div className="flex items-center gap-2">
                <StatusDot status={status} />
                <span className="font-display text-[11px] tracking-[0.02em]" style={{ color: 'var(--ink-muted)' }}>
                  {statusMessage}
                </span>
              </div>
              <span className="font-mono tabular text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                {data.length.toLocaleString()} cells
              </span>
            </div>
            {data.length > 0 && (
              <div className="mt-3 flex h-1.5 w-full" role="img" aria-label="Today's national danger distribution">
                {distributionSegments.map((seg) => (
                  <span key={seg.tierId} style={{ width: `${seg.pct}%`, background: seg.color }} />
                ))}
              </div>
            )}
            <div className="px-5 py-4">
              <ModeToggle mode={mode} onChange={handleModeSwitch} disabled={isSwitchingMode} />
            </div>
            {locationError && !userLocation && (
              <div className="flex items-center gap-2 px-5 py-2.5 text-[11px]" style={{ borderTop: '1px solid var(--hairline)', color: 'var(--ink-muted)' }}>
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Enable location to see readings near you</span>
              </div>
            )}

            <StatisticsPanel data={data} tiers={tiers} excludedTierIds={excludedTierIds} onToggleTier={toggleTier} shouldShowSkeleton={shouldShowSkeleton} />
          </div>
        </div>

        {/* Scroll cue: the hero's own invitation to keep going. Desktop/tablet
            only — on mobile the panel already flows straight into the next
            section, so the cue would just be redundant chrome. */}
        <button
          type="button"
          onClick={scrollToReadings}
          className="pointer-events-auto absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1 font-display text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors md:flex"
          style={{ color: 'var(--accent)' }}
        >
          Today&rsquo;s Readings
          <ArrowDown className="scroll-cue h-4 w-4" />
        </button>
      </section>

      {/* ===================== READINGS ===================== */}
      <section ref={readingsRef} className="w-full" style={{ borderTop: '1px solid var(--hairline)' }}>
        <Reveal className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
          {selectedCell ? (
            <SelectedCellDetail cell={selectedCell} tiers={tiers} onClear={() => setSelectedCell(null)} />
          ) : (
            <HighestReadings highestCells={highestCells} nearestCell={nearestCell} tiers={tiers} shouldShowSkeleton={shouldShowSkeleton} onSelect={handleCellSelect} />
          )}
        </Reveal>
      </section>

      {/* ===================== NATIONAL OVERVIEW ===================== */}
      <section className="w-full" style={{ borderTop: '1px solid var(--hairline)', background: 'var(--paper-raised)' }}>
        <Reveal className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
          <SectionHeading>National Overview</SectionHeading>
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { label: 'Grid Cells Monitored', value: data.length, decimals: 0 },
              { label: 'Weather Stations', value: CANADIAN_STATIONS.length, decimals: 0 },
              { label: 'Low Danger (FWI < 4)', value: lowDangerPct, decimals: 0, suffix: '%' },
              { label: 'High Danger (FWI ≥ 8)', value: highDangerPct, decimals: 0, suffix: '%' },
            ].map((tile) => (
              <div key={tile.label}>
                <div className="font-mono text-4xl font-bold" style={{ color: 'var(--accent)' }}>
                  <CountUp value={tile.value} decimals={tile.decimals} suffix={tile.suffix} />
                </div>
                <div className="mt-1 font-display text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                  {tile.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ===================== EMERGENCY & ABOUT ===================== */}
      <section className="w-full" style={{ borderTop: '1px solid var(--hairline)' }}>
        <Reveal className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
          <div className="flex items-center gap-3 px-4 py-3" style={{ border: '2px solid var(--ink)' }}>
            <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--ink)' }} />
            <span className="font-display text-[14px] font-bold tracking-[0.02em]" style={{ color: 'var(--ink)' }}>
              EMERGENCY: DIAL 911
            </span>
            <span className="font-display text-[13px]" style={{ color: 'var(--ink-muted)' }}>
              for immediate fire threats
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--hairline)' }}>
            <button
              type="button"
              onClick={() => setAboutOpen((v) => !v)}
              className="flex w-full items-center justify-between py-4 font-display text-[13px] font-semibold tracking-[0.06em] uppercase"
              style={{ color: 'var(--ink)' }}
              aria-expanded={aboutOpen}
            >
              About the Fire Weather Index
              <ChevronDown className={`h-4 w-4 transition-transform ${aboutOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--accent)' }} />
            </button>
            {aboutOpen && (
              <div className="pb-6 text-[13px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
                <p>
                  The Canadian Forest Fire Weather Index (FWI1987, Van Wagner 1987) tracks fuel moisture and fire spread
                  potential from daily weather. It is not a probability of a fire starting: it measures how a fire would
                  behave if one did.
                </p>
                <ul className="mt-3 space-y-1">
                  <li>FFMC: Fine Fuel Moisture Code</li>
                  <li>DMC: Duff Moisture Code</li>
                  <li>DC: Drought Code</li>
                  <li>BUI &amp; ISI: Buildup and Spread Indices</li>
                </ul>
                <p className="mt-3">Recomputed daily across 7,537 grid cells from live weather data.</p>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      <footer style={{ borderTop: '1px solid var(--hairline)', background: 'var(--paper-raised)' }}>
        <div className="mx-auto w-full max-w-4xl px-6 py-8 text-center">
          <p className="font-display text-[11px]" style={{ color: 'var(--ink-muted)' }}>
            Data: Environment and Climate Change Canada · Natural Resources Canada
          </p>
        </div>
      </footer>
    </main>
  );
};

const HighestReadings: React.FC<{
  highestCells: FireRiskData[];
  nearestCell: { cell: FireRiskData; distanceKm: number } | null;
  tiers: ReturnType<typeof useFwiTiers>;
  shouldShowSkeleton: boolean;
  onSelect: (cell: FireRiskData) => void;
}> = ({ highestCells, nearestCell, tiers, shouldShowSkeleton, onSelect }) => (
  <div>
    <SectionHeading>Today&rsquo;s Readings</SectionHeading>

    {nearestCell && (
      <div className="mt-8">
        <h3 className="font-display text-[12px] font-semibold tracking-[0.1em] uppercase" style={{ color: 'var(--ink-muted)' }}>
          Near You · {Math.round(nearestCell.distanceKm)} km away
        </h3>
        <Panel className="mt-2">
          <CellRow cell={nearestCell.cell} onSelect={() => onSelect(nearestCell.cell)} tiers={tiers} />
        </Panel>
      </div>
    )}

    <div className="mt-8">
      <h3 className="font-display text-[12px] font-semibold tracking-[0.1em] uppercase" style={{ color: 'var(--ink-muted)' }}>
        Highest Today
      </h3>
      {shouldShowSkeleton ? (
        <p className="mt-3 font-display text-[13px]" style={{ color: 'var(--ink-muted)' }}>
          Loading…
        </p>
      ) : (
        <Panel className="mt-2">
          {highestCells.map((cell) => (
            <CellRow key={cell.id} cell={cell} onSelect={() => onSelect(cell)} tiers={tiers} />
          ))}
        </Panel>
      )}
    </div>
  </div>
);

const SelectedCellDetail: React.FC<{ cell: FireRiskData; tiers: ReturnType<typeof useFwiTiers>; onClear: () => void }> = ({ cell, tiers, onClear }) => {
  const tier = tierForFwi(cell.riskProbability, tiers);
  const location = displayLocationFor(cell);
  const fwi = cell.fireWeatherIndices;
  const wf = cell.weatherFeatures;
  const flags: string[] = [];
  if (wf?.isHot) flags.push('HOT');
  if (wf?.isDry) flags.push('DRY');
  if (wf?.isWindy) flags.push('WINDY');
  if (wf?.hasRecentPrecip) flags.push('RECENT PRECIP');

  return (
    <div>
      <button
        type="button"
        onClick={onClear}
        className="flex items-center gap-1.5 font-display text-[12px] font-semibold tracking-[0.06em] uppercase"
        style={{ color: 'var(--accent)' }}
      >
        <X className="h-3.5 w-3.5" /> All Readings
      </button>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
        <SectionHeading>
          {location.city}, {location.province}
        </SectionHeading>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-5 w-5 flex-shrink-0" style={{ background: tier.color, border: '1px solid rgba(21,23,15,0.25)' }} />
          <span className="font-mono tabular text-4xl font-bold" style={{ color: 'var(--ink)' }}>
            {(cell.riskProbability * 100).toFixed(3)}%
          </span>
          <span className="font-display text-[14px]" style={{ color: 'var(--ink-muted)' }}>
            {tier.name} · {formatTierRange(tier)}
          </span>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* Conditions leads and reads larger — what a visitor actually feels
            outside — while the FWI components are reference detail below. */}
        {wf && (
          <div>
            <h3 className="font-display text-[13px] font-semibold tracking-[0.06em] uppercase" style={{ color: 'var(--ink)' }}>
              Conditions
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
              {(
                [
                  [`${wf.temperature.toFixed(1)}°C`, 'Temperature'],
                  [`${wf.humidity.toFixed(0)}%`, 'Humidity'],
                  [`${wf.windSpeed.toFixed(1)} km/h`, 'Wind'],
                  [`${wf.precip24h.toFixed(1)} mm`, 'Precip / 24h'],
                ] as const
              ).map(([value, label]) => (
                <div key={label}>
                  <dd className="font-mono tabular text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
                    {value}
                  </dd>
                  <dt className="font-display text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                    {label}
                  </dt>
                </div>
              ))}
            </div>
            {flags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {flags.map((flag) => (
                  <span key={flag} className="font-display text-[10px] font-semibold tracking-[0.08em] px-2 py-1" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {fwi && (
          <div>
            <h3 className="font-display text-[11px] font-semibold tracking-[0.1em] uppercase" style={{ color: 'var(--ink-muted)' }}>
              Fire Weather Indices
            </h3>
            <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3">
              {(
                [
                  ['FFMC', fwi.ffmc],
                  ['DMC', fwi.dmc],
                  ['DC', fwi.dc],
                  ['ISI', fwi.isi],
                  ['BUI', fwi.bui],
                  ['DSR', fwi.dsr],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="font-display text-[9px] tracking-[0.08em] uppercase" style={{ color: 'var(--ink-muted)' }}>
                    {label}
                  </dt>
                  <dd className="font-mono tabular text-[15px]" style={{ color: 'var(--ink-muted)' }}>
                    {value.toFixed(1)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};

export default FireRiskDashboard;
