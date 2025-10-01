"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { FireRiskData } from '../types';

// Dynamically import the actual leaflet map component
const LeafletMap = dynamic(
  () => import('./LeafletMap'),
  {
     ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map component...</p>
        </div>
      </div>
    )
  }
);

interface MapProps {
  data?: FireRiskData[];
  height?: string;
  className?: string;
  onLocationClick?: (location: FireRiskData) => void;
  mapMode?: 'markers' | 'heatmap';
  onStationCountUpdate?: (count: number) => void;
}

const Map: React.FC<MapProps> = ({
  data = [],
  height = '700px',
  className = '',
  onLocationClick,
  mapMode = 'markers',
  onStationCountUpdate
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Memoize data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => {
    if (data && data.length > 0) {
      return data.map(location => ({
        ...location,
        // Ensure we have valid coordinates
        lat: typeof location.lat === 'number' ? location.lat : parseFloat(location.lat as string),
        lon: typeof location.lon === 'number' ? location.lon : parseFloat(location.lon as string)
      })).filter(location => 
        !isNaN(location.lat) &&
        !isNaN(location.lon) &&
        location.lat >= -90 && location.lat <= 90 &&
        location.lon >= -180 && location.lon <= 180
      );
    }
    return [];
  }, [data]);

  // Handle station count updates from LeafletMap
  const handleStationCountUpdate = useCallback((count: number) => {
    if (onStationCountUpdate) {
      onStationCountUpdate(count);
    }
  }, [onStationCountUpdate]);

  // Show loading until we're definitely on the client
  if (!isClient) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height, minHeight: '400px' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Initializing Map...</p>
        </div>
      </div>
    );
  }

  // Render the map component only when we have stable client-side mounting
  return (
    <div 
      className={`relative rounded-lg overflow-hidden ${className}`}
      style={{ height, minHeight: '400px' }}
    >
      <LeafletMap 
        data={memoizedData}
        height={height}
        onLocationClick={onLocationClick}
        mapMode={mapMode}
        onStationCountUpdate={handleStationCountUpdate}
      />
    </div>
  );
};

export default Map;