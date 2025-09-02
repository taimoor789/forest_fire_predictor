"use client" //Client component(runs in browser)
//Required for interactive components that use hooks, event handlers, or browser APIs

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { FireRiskData } from '../types';
import { mockFireRiskData } from '../lib/mockData';

//Dynamic import for the heatmap component - make sure the file name matches exactly
const LeafletHeatmap = dynamic(
  () => import('./LeafletMap'), // Change this to match your actual file name
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading Map...</p>
        </div>
      </div>
    )
  }
);

//Define the shape of data this component expects to receive as props
interface MapProps {
  data?: FireRiskData[];
  height?: string; //Optional prop defaults to '500px'
  className?: string;
}

const Map: React.FC<MapProps> = ({
  data = mockFireRiskData,
  height = '700px',
  className = ''
}) => {
  //useState manages component state, triggers re-render when state changes
  const [mounted, setMounted] = useState(false);
  
  // Debug logging to track data flow
  useEffect(() => {
    console.log('Map component received data:', data?.length || 0, 'items');
    if (data && data.length > 0) {
      console.log('First data item:', data[0]);
    }
  }, [data]);

  useEffect(() => {
    setMounted(true); //Set to true once component mounts on client side
  }, []);

  //Handle loading states or conditions before rendering main content
  if (!mounted) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{height: height}} //Inline style using height prop
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2">
          </div>
          <p className="text-gray-600">Loading Map...</p>
        </div>
      </div>
    );
  }
  
  // Ensure we have valid data before rendering
  const validData = data?.filter(item => 
    item && 
    typeof item.lat === 'number' && 
    typeof item.lon === 'number' && 
    typeof item.riskLevel === 'number'
  ) || [];

  console.log('Rendering map with', validData.length, 'valid data points');
  
  return (
    <div className={`relative rounded-lg overflow-hidden shadow-lg ${className}`}>
      {/* Data Stats Overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1001] bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm">
        {validData.length} locations • Last updated: {new Date().toLocaleDateString()}
      </div>

      {/* Render the heatmap component with both heatmap and markers - fix component props */}
      <LeafletHeatmap data={validData} height={height} />
    </div>
  );
};

export default Map;