/**
 * The Canadian Forest Fire Weather Index danger-class registry.
 *
 * This is the single place the six official danger tiers are defined. Every
 * other part of the app — the map field, the legend, the distribution
 * summary, the tier filter — reads from here rather than hardcoding the
 * classification. If the tier system ever changes (a boundary moves, a tier
 * is renamed, the count changes), that is a data change in this file (or,
 * live, in the API's own /api/danger-classes), never a UI rewrite.
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
  /** Inclusive lower bound of this tier's FWI range. */
  min: number;
  /** Exclusive upper bound; the top tier's is Infinity. */
  max: number;
  color: string;
  description: string;
}

export const FALLBACK_TIERS: FwiTier[] = [
  { id: 'very-low', name: 'Very Low', min: 0, max: 2, color: '#4CAF50', description: 'Fires start easily but spread slowly' },
  { id: 'low', name: 'Low', min: 2, max: 4, color: '#8BC34A', description: 'Fires start easily and spread at low to moderate rates' },
  { id: 'moderate', name: 'Moderate', min: 4, max: 8, color: '#FFEB3B', description: 'Fires start easily and spread at moderate rates' },
  { id: 'high', name: 'High', min: 8, max: 18, color: '#FF9800', description: 'Fires start easily and spread at high rates' },
  { id: 'very-high', name: 'Very High', min: 18, max: 30, color: '#F44336', description: 'Fires start very easily and spread at very high rates' },
  { id: 'extreme', name: 'Extreme', min: 30, max: Infinity, color: '#9C27B0', description: 'Fires start very easily and spread at extreme rates' },
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

export function formatTierRange(tier: FwiTier): string {
  return tier.max === Infinity ? `${tier.min}+` : `${tier.min}–${tier.max}`;
}
