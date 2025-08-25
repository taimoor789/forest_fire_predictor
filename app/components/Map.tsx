"use client" //Client component(runs in browser)
//Required for interactive components that use hooks, event handlers, or browser APIs

import { useEffect, useState } from 'react'; 
import dynamic from 'next/dynamic'; 
import { FireRiskData } from '../types'; 
import { mockFireRiskData } from '../lib/mockData';

const LeafletMap = dynamic(
  () => import('./LeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg h-full">
        <p className="text-gray-600">Loading Map...</p>
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

  useEffect(() => {
    setMounted(true); //Set to true once component mounts on client side
  }, []);

  //Handle loading states or conditions before rendering main content
  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
      style={{height: height}} //Inline style using height prop
      >
        <p className="text-gray-600">
          Loading Map...
        </p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden shadow-lg ${className}`}>
      <LeafletMap data={data} height={height} />
    </div>
  );
};
  
export default Map;
