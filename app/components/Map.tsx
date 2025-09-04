"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { FireRiskData } from '../types';
import { mockFireRiskData } from '../lib/mockData';

// Leaflet CSS is imported in globals.css

const UnifiedLeafletMap = dynamic(
  () => import('./UnifiedLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading Map...</p>
        </div>
      </div>
    )
  }
);

interface MapProps {
  data?: FireRiskData[];
  height?: string;
  className?: string;
}

const Map: React.FC<MapProps> = ({
  data = mockFireRiskData,
  height = '700px',
  className = ''
}) => {
  const [mounted, setMounted] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    console.log('Map component mounted, data length:', data?.length);
    
    // Ensure we're in browser environment
    if (typeof window !== 'undefined') {
      setMounted(true);
      
      // Pre-load Leaflet CSS if not already loaded
      const existingLink = document.querySelector('link[href*="leaflet"]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.onload = () => {
          console.log('Leaflet CSS loaded');
          setLeafletReady(true);
        };
        link.onerror = () => {
          console.error('Failed to load Leaflet CSS');
          setLeafletReady(true); // Continue anyway
        };
        document.head.appendChild(link);
      } else {
        setLeafletReady(true);
      }
    }
  }, [data]);

  if (!mounted || !leafletReady) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} 
        style={{ height, minHeight: '400px' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
          <p className="text-gray-600">
            {!mounted ? 'Initializing...' : 'Loading Map Resources...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative rounded-lg overflow-hidden shadow-lg ${className}`} 
      style={{ height, minHeight: '400px' }}
    >
      <UnifiedLeafletMap data={data || []} height={height} />
    </div>
  );
};

export default Map;