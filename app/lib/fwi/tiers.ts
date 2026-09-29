/**
 * The active fire-danger tier registry.
 *
 * This is the single place the tiers are defined. Every other part of the
 * app — the map field, the legend, the distribution summary, the tier
 * filter — reads from here rather than hardcoding the classification. If
 * the tier system ever changes (a boundary moves, a tier is renamed, the
 * count changes), that is a data change in this file (or, live, in the
 * API's own /api/danger-classes), never a UI rewrite.
 *
 * Tiers are classified against riskProbability (the ML model's calibrated
 * probability, 0-1) since the 2026-09-28 promotion decision — see
 * docs/PREREGISTRATION.md in the backend repo. Despite the field names
 * below (min/max, "Fwi" in helper names), tiers are no longer bucketed by
 * the raw FWI number; tierForFwi/bucketByTier are generic over whatever
 * numeric value a caller passes in.
 *
 * FALLBACK_TIERS mirrors what GET /api/danger-classes returns today and is
 * used until that endpoint has been reached at least once, and afterwards
 * only if it becomes unreachable.
 */
import { useEffect, useState } from 'react';

export interface FwiTier {
  /** Stable slug, e.g. "very-low". Derived from the tier name. */
  id: string;
  name: string;
  /** Inclusive lower bound of this tier's range. */
  min: number;
  /** Exclusive upper bound; the top tier's is Infinity. */
  max: number;
  color: string;
  description: string;
}

// Mirrors model_components/tiers.json (backend repo) as of the 2026-09-28
// promotion. Bounds are calibrated probabilities, not FWI values.
export const FALLBACK_TIERS: FwiTier[] = [
  { id: 'very-low', name: 'Very Low', min: 0, max: 0.0000742, color: '#4CAF50', description: 'Current conditions and fire history indicate a very low chance of a fire starting nearby' },
  { id: 'low', name: 'Low', min: 0.0000742, max: 0.0008383, color: '#8BC34A', description: 'Current conditions and fire history indicate a low chance of a fire starting nearby' },
  { id: 'moderate', name: 'Moderate', min: 0.0008383, max: 0.0105609, color: '#FFEB3B', description: 'Current conditions and fire history indicate a moderate chance of a fire starting nearby' },
  { id: 'high', name: 'High', min: 0.0105609, max: Infinity, color: '#FF9800', description: 'Current conditions and fire history indicate an elevated chance of a fire starting nearby' },
];

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

/** Parses "0-2 FWI" or "30+ FWI" as returned by /api/danger-classes. */
function parseRange(range: string): { min: number; max: number } | null {
  const cleaned = range.replace(/fwi/i, '').trim();
  if (cleaned.endsWith('+')) {
    const min = parseFloat(cleaned);
    return isNaN(min) ? null : { min, max: Infinity };
  }
  const parts = cleaned.split('-').map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some((n) => isNaN(n))) return null;
  return { min: parts[0], max: parts[1] };
}

interface RawDangerClass {
  name: string;
  range: string;
  color: string;
  description: string;
}

/** Fetches the live tier definitions; falls back to FALLBACK_TIERS on any failure. */
export async function fetchTiers(apiBaseUrl: string): Promise<FwiTier[]> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/danger-classes`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const raw: RawDangerClass[] | undefined = json?.danger_classes;
    if (!Array.isArray(raw) || raw.length === 0) throw new Error('empty danger_classes');

    const tiers: FwiTier[] = [];
    for (const entry of raw) {
      const parsed = parseRange(String(entry.range ?? ''));
      if (!parsed || typeof entry.color !== 'string' || typeof entry.name !== 'string') continue;
      tiers.push({
        id: slugify(entry.name),
        name: entry.name,
        min: parsed.min,
        max: parsed.max,
        color: entry.color,
        description: entry.description ?? '',
      });
    }
    if (tiers.length === 0) throw new Error('no parseable tiers');
    tiers.sort((a, b) => a.min - b.min);
    return tiers;
  } catch {
    return FALLBACK_TIERS;
  }
}

/** React hook: starts with FALLBACK_TIERS, swaps in the live definitions once fetched. */
export function useFwiTiers(apiBaseUrl: string): FwiTier[] {
  const [tiers, setTiers] = useState<FwiTier[]>(FALLBACK_TIERS);
  useEffect(() => {
    let cancelled = false;
    fetchTiers(apiBaseUrl).then((fetched) => {
      if (!cancelled) setTiers(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);
  return tiers;
}

/** Finds the tier an FWI value falls into. Half-open intervals: [min, max). */
export function tierForFwi(fwi: number, tiers: FwiTier[] = FALLBACK_TIERS): FwiTier {
  if (typeof fwi !== 'number' || isNaN(fwi)) return tiers[0];
  for (const tier of tiers) {
    if (fwi >= tier.min && fwi < tier.max) return tier;
  }
  return tiers[tiers.length - 1];
}

/** Groups items into a Map keyed by tier id, in tier order. */
export function bucketByTier<T>(
  items: T[],
  fwiOf: (item: T) => number,
  tiers: FwiTier[] = FALLBACK_TIERS
): Map<string, T[]> {
  const buckets = new Map<string, T[]>(tiers.map((t) => [t.id, [] as T[]]));
  for (const item of items) {
    const tier = tierForFwi(fwiOf(item), tiers);
    buckets.get(tier.id)?.push(item);
  }
  return buckets;
}

/** Probability-scale bounds (the normal case since 2026-09-28) format as a
 * percentage; anything >= 1 is treated as a plain-number scale (e.g. a
 * possible future reversion to FWI's own 0-30ish range) and left as-is. */
export function formatTierRange(tier: FwiTier): string {
  const referenceValue = tier.max === Infinity ? tier.min : tier.max;
  const isProbabilityScale = referenceValue < 1;
  const fmt = (n: number) => (isProbabilityScale ? `${(n * 100).toFixed(3)}%` : `${n}`);
  return tier.max === Infinity ? `${fmt(tier.min)}+` : `${fmt(tier.min)}–${fmt(tier.max)}`;
}
