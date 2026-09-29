"use client";

import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FireRiskData } from '../types';
import { FwiTier, bucketByTier, formatTierRange } from '../lib/fwi/tiers';

interface StatisticsPanelProps {
  data: FireRiskData[];
  tiers: FwiTier[];
  excludedTierIds: Set<string>;
  onToggleTier: (tierId: string) => void;
  shouldShowSkeleton: boolean;
}

/**
 * The tier key, the day's distribution, and the tier filter, in one place —
 * clicking a swatch isolates that tier on the map. Tiers are never
 * hardcoded here; they come from the registry (app/lib/fwi/tiers.ts), which
 * is itself seeded from /api/danger-classes.
 *
 * Collapsed by default to a single compact swatch row: the full panel sits
 * over the map, and a full breakdown was covering a good stretch of western
 * Canada. Expand for counts, ranges, and the per-tier distribution bars.
 *
 * Content only — no outer frame. It's meant to be embedded directly under
 * the title block inside one consolidated panel, not to stand alone.
 */
const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ data, tiers, excludedTierIds, onToggleTier, shouldShowSkeleton }) => {
  const [expanded, setExpanded] = useState(false);
  const buckets = useMemo(() => bucketByTier(data, (d) => d.riskProbability, tiers), [data, tiers]);
  const total = data.length;
  const anyExcluded = excludedTierIds.size > 0;
  const orderedTiers = useMemo(() => [...tiers].reverse(), [tiers]);

  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-4 pb-2" style={{ borderTop: '1px solid var(--hairline)' }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="-ml-2 flex items-center gap-1.5 rounded-sm py-1 pl-2 pr-2.5 transition-colors hover:[background:var(--accent-soft)]"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse fire danger class legend' : 'Expand fire danger class legend'}
        >
          <h2 className="font-display text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink)' }}>
            Fire Danger Class
          </h2>
          <span
            aria-hidden="true"
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-transform"
            style={{ background: 'var(--accent-soft)', transform: expanded ? 'rotate(180deg)' : undefined }}
          >
            <ChevronDown className="h-3 w-3" style={{ color: 'var(--accent)' }} />
          </span>
        </button>
        {anyExcluded && expanded && (
          <button
            type="button"
            onClick={() => tiers.forEach((t) => excludedTierIds.has(t.id) && onToggleTier(t.id))}
            className="font-display text-[10px] font-semibold tracking-[0.08em] uppercase underline underline-offset-2"
            style={{ color: 'var(--accent)' }}
          >
            Show all
          </button>
        )}
      </div>

      {expanded ? (
        <>
          <div role="list" className="divide-y" style={{ borderColor: 'var(--hairline)' }}>
            {orderedTiers.map((tier) => {
              const count = buckets.get(tier.id)?.length ?? 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const excluded = excludedTierIds.has(tier.id);
              return (
                <button
                  key={tier.id}
                  type="button"
                  role="listitem"
                  aria-pressed={!excluded}
                  onClick={() => onToggleTier(tier.id)}
                  className="group flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:[background:var(--accent-soft)]"
                  style={{ borderColor: 'var(--hairline)', opacity: excluded ? 0.4 : 1 }}
                >
                  <span aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" style={{ background: tier.color, border: '1px solid rgba(21,23,15,0.25)' }} />
                  <span className="font-display text-[14px] flex-1" style={{ color: 'var(--ink)' }}>
                    {tier.name}
                  </span>
                  <span className="font-mono tabular text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                    {shouldShowSkeleton ? '…' : count.toLocaleString()}
                  </span>
                  <span className="font-mono tabular text-[10px] w-16 text-right" style={{ color: 'var(--ink-muted)' }}>
                    {formatTierRange(tier)}
                  </span>
                  <span className="hidden sm:block h-1 w-10 flex-shrink-0" style={{ background: 'var(--hairline)' }} aria-hidden="true">
                    <span className="block h-full" style={{ width: `${pct}%`, background: excluded ? 'var(--ink-faint)' : tier.color }} />
                  </span>
                </button>
              );
            })}
          </div>
          <p className="px-5 py-3 text-[11px] leading-relaxed" style={{ color: 'var(--ink-muted)', borderTop: '1px solid var(--hairline)' }}>
            Machine-learned probability of a fire starting nearby, calibrated against historical fire records — cross-checked daily against the Canadian Forest Fire Weather Index, still tracked for every cell. Tap a class to isolate it on the map.
          </p>
        </>
      ) : (
        <div className="flex items-stretch gap-1 px-5 pb-4">
          {orderedTiers.map((tier) => {
            const count = buckets.get(tier.id)?.length ?? 0;
            const excluded = excludedTierIds.has(tier.id);
            return (
              <button
                key={tier.id}
                type="button"
                aria-pressed={!excluded}
                aria-label={`${tier.name}: ${count.toLocaleString()} cells`}
                title={`${tier.name}: ${count.toLocaleString()}`}
                onClick={() => onToggleTier(tier.id)}
                className="flex flex-1 flex-col items-center gap-1 py-1 transition-opacity"
                style={{ opacity: excluded ? 0.35 : 1 }}
              >
                <span aria-hidden="true" className="h-3.5 w-full" style={{ background: tier.color, border: '1px solid rgba(21,23,15,0.25)' }} />
                <span className="font-mono tabular text-[9px]" style={{ color: 'var(--ink-muted)' }}>
                  {shouldShowSkeleton ? '…' : count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StatisticsPanel;
