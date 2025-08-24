"use client" //Client component(runs in browser)
//Required for interactive components that use hooks, event handlers, or browser APIs

import { useEffect, useState } from 'react'; 
import dynamic from 'next/dynamic'; 
import { FireRiskData } from '../../types'; 
import { mockFireRiskData } from '../../mockData';

// Leaflet requires 'window' object which only exists in browsers, not during server-side rendering
// Dynamic import with ssr: false ensures this component only loads on the client side
const MapContainer = dynamic(() => import('react-leaflet').then(mod => ({default: mod.MapContainer})), {ssr: false});

const TileLayer = dynamic(() => import('react-leaflet').then(mod => ({default: mod.TileLayer})), {ssr: false});

const CircleMarker = dynamic(() => import('react-leaflet').then(mod => ({default: mod.CircleMarker})), {ssr: false});

const Popup = dynamic(() => import('react-leaflet').then(mod => ({default: mod.Popup})), {ssr: false});

//Define the shape of data this component expects to receive as props
interface MapProps {
  data?: FireRiskData[];
  height?: string; //Optional prop defaults to '500px'
  className?: string;
}

const getRiskColor = (riskLevel: number): string => {
  if (riskLevel >= 0.8) return '#d32f2f';
  if (riskLevel >= 0.6) return '#f57c00'; 
  if (riskLevel >= 0.4) return '#fbc02d'; 
  if (riskLevel >= 0.2) return '#689f38'; 
  return '#388e3c'; 
};

const Map: React.FC<MapProps> = ({
  data = mockFireRiskData,
  height = '500px',
  className = ''
}) => {
  //useState manages component state, triggers re-render when state changes
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); //Set to true once component mounts on client side
  }, []);

  //Handle loading states or conditions before rendering main content
  if (!isClient) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg"
      style={{height: height}} //Inline style using height prop
      >
        <p className="text-gray-600">
          Loading Map...
        </p>
      </div>
    );
  }
  return (
    //Template literal allows dynamic class combination
    <div className={`relative rounded-lg overflow-hidden shadow-lg ${className}`}>

      
    </div>


  )
