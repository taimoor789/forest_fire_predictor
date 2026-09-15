/**
 * Thin wrappers over the tier registry (app/lib/fwi/tiers.ts) for call sites
 * that only need a color or label from an FWI value. The tiers themselves —
 * boundaries, colors, descriptions — live in exactly one place: tiers.ts.
 */
import { FALLBACK_TIERS, tierForFwi, formatTierRange } from '../fwi/tiers';

export function getRiskColor(fwi: number): string {
  if (typeof fwi !== 'number' || isNaN(fwi)) return FALLBACK_TIERS[0].color;
  return tierForFwi(fwi).color;
}

export function getRiskLabel(fwi: number): string {
  if (typeof fwi !== 'number' || isNaN(fwi)) return FALLBACK_TIERS[0].name;
  return tierForFwi(fwi).name;
}

export function getDangerClassInfo(fwi: number): {
  name: string;
  color: string;
  fwiRange: string;
  description: string;
} {
  const tier = tierForFwi(typeof fwi === 'number' && !isNaN(fwi) ? fwi : 0);
  return {
    name: tier.name,
    color: tier.color,
    fwiRange: formatTierRange(tier),
    description: tier.description,
  };
}

export function formatFWI(fwi: number): string {
  if (typeof fwi !== 'number' || isNaN(fwi)) return '0.0';
  return fwi.toFixed(1);
}
