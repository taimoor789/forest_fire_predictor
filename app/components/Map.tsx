"use client"; //Ensures leaflet map only renders on the client 

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { FireRiskData } from '../types';

//Dynamic import - Load LeafletMap only on client-side
const LeafletMap = dynamic(
  () => import('./LeafletMap'),
  {
    ssr: false, //Don't render on server
    loading: () => (
      // Loading placeholder while LeafletMap code is being downloaded
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
  userLocation?: { lat: number; lon: number; city?: string } | null;
}

const Map: React.FC<MapProps> = ({
  data = [],
  height = '700px',
  className = '',
  onLocationClick,
  mapMode = 'markers',
  onStationCountUpdate,
  userLocation
}) => {
  // Track whether we're in browser or server
  // Prevents hydration mismatches between server and client rendering
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // useMemo prevents recalculation on every render
  const memoizedData = useMemo(() => {
    if (data && data.length > 0) {
      return data.map(location => ({
        ...location,
        // Ensure coordinates are numbers
        lat: typeof location.lat === 'number' ? location.lat : parseFloat(location.lat as string),
        lon: typeof location.lon === 'number' ? location.lon : parseFloat(location.lon as string)
      })).filter(location => 
        // Remove invalid coordinates
        !isNaN(location.lat) &&
        !isNaN(location.lon) &&
        location.lat >= -90 && location.lat <= 90 &&
        location.lon >= -180 && location.lon <= 180
      );
    }
    return [];
  }, [data]); // Only recalculate when data array changes

  // useCallback prevents function recreation on every render
  const handleStationCountUpdate = useCallback((count: number) => {
    if (onStationCountUpdate) {
      onStationCountUpdate(count);
    }
  }, [onStationCountUpdate]);

  // SSR guard - show loading state until client-side
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

  //Render leafletMap only on client side
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
        userLocation={userLocation}
      />
    </div>
  );
};

export default Map;