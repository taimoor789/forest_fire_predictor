"use client"; // Leaflet must only ever render on the client

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { FireRiskData } from '../types';
import { FwiTier } from '../lib/fwi/tiers';
import type { MapViewMode } from './LeafletMap';

const PlateLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex h-full items-center justify-center" style={{ background: 'var(--paper)' }}>
    <p className="font-display text-xs tracking-[0.14em] uppercase" style={{ color: 'var(--ink-muted)' }}>
      {label}
    </p>
  </div>
);

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <PlateLoading label="Loading map engine…" />,
});

interface MapProps {
  data: FireRiskData[];
  tiers: FwiTier[];
  height?: string;
  className?: string;
  mode: MapViewMode;
  activeTierIds: Set<string> | null;
  selectedCellId?: string | null;
  onCellSelect?: (cell: FireRiskData | null) => void;
  userLocation?: { lat: number; lon: number; city?: string } | null;
}

const Map: React.FC<MapProps> = ({
  data,
  tiers,
  height = '700px',
  className = '',
  mode,
  activeTierIds,
  selectedCellId,
  onCellSelect,
  userLocation,
}) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const validData = useMemo(
    () =>
      (data || [])
        .map((d) => ({ ...d, lat: Number(d.lat), lon: Number(d.lon) }))
        .filter((d) => !isNaN(d.lat) && !isNaN(d.lon) && d.lat >= -90 && d.lat <= 90 && d.lon >= -180 && d.lon <= 180),
    [data]
  );

  if (!isClient) {
    return (
      <div className={className} style={{ height, minHeight: '400px' }}>
        <PlateLoading label="Initializing map…" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ height, minHeight: '400px' }}>
      <LeafletMap
        data={validData}
        tiers={tiers}
        height={height}
        mode={mode}
        activeTierIds={activeTierIds}
        selectedCellId={selectedCellId}
        onCellSelect={onCellSelect}
        userLocation={userLocation}
      />
    </div>
  );
};

export default Map;
