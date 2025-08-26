import { useEffect, useRef } from 'react';
import { FireRiskData } from '../types';
import type { Map as LeafletMapType } from 'leaflet';

interface LeafletMapProps {
  data: FireRiskData[];
  height: string;
}

const getRiskColor = (riskLevel: number): string => {
  if (riskLevel >= 0.8) return '#d32f2f';
  if (riskLevel >= 0.6) return '#f57c00';
  if (riskLevel >= 0.4) return '#fbc02d';
  if (riskLevel >= 0.2) return '#689f38';
  return '#388e3c';
};

const LeafletMap: React.FC<LeafletMapProps> = ({ data, height }) => {
  //Ref for the map container DOM element
  const mapRef = useRef<HTMLDivElement>(null);
  //Ref to store Leaflet map instance (persists across re-renders)
  const mapInstanceRef = useRef<LeafletMapType | null>(null);

  useEffect(() => {
    //Skip execution during server-side rendering
    if (typeof window === 'undefined') return;

    //Dynamic import function to load Leaflet only on client
    const initializeMap = async () => {
      const L = await import('leaflet');
      
       //Fix for Next.js: Remove internal icon URL method that causes SSR issues
      const DefaultIcon = L.Icon.Default.prototype as {
        _getIconUrl?: () => string;
      };
      delete DefaultIcon._getIconUrl;
      
      //Explicitly set marker icon URLs to prevent broken images in production
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      //Only initialize map if container exists and no map instance exists (prevents re-creation)
      if (mapRef.current && !mapInstanceRef.current) {

        //Canada's approximate bounds
        const canadaBounds: [[number, number], [number, number]] = [
          [41.6765559, -141.00187], // Southwest corner
          [83.23324, -52.6480987]   // Northeast corner
        ];

        // Initialize the map
        const map = L.map(mapRef.current, {
          center: [56.1304, -106.3468], //Center of Canada
          zoom: 4,
          minZoom: 3, //Prevent zooming out too far
          maxZoom: 12,  //Prevent zooming in too close
          maxBounds: canadaBounds,
          maxBoundsViscosity: 1.0, //Prevents panning outside bounds
          zoomControl: true,
          scrollWheelZoom: true,
          preferCanvas: true //Better performance with many markers
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18
        }).addTo(map);

        //Iterate through each location data point to create map markers
        data.forEach((location) => {
          const circle = L.circleMarker([location.lat, location.lng], {
            radius: 15,
            fillColor: getRiskColor(location.riskLevel),
            color: '#ffffff', //White border
            weight: 2,      //Border thickness
            opacity: 1.0,
            fillOpacity: 0.8
          }).addTo(map);

          // Create popup content
          const popupContent = `
            <div style="font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">
                ${location.location}
              </h3>
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                ${location.province}
              </p>
              <p style="margin: 0 0 5px 0; font-size: 14px;">
                Risk Level: 
                <span style="
                  margin-left: 4px; 
                  padding: 2px 8px; 
                  border-radius: 3px; 
                  font-size: 12px; 
                  font-weight: 600; 
                  color: white;
                  background-color: ${getRiskColor(location.riskLevel)};
                ">
                  ${Math.round(location.riskLevel * 100)}%
                </span>
              </p>
              <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">
                Last Updated: ${location.lastUpdated}
              </p>
            </div>
          `;

          //Bind the popup content to the circle marker
          circle.bindPopup(popupContent);
        });

        //Store the map instance in ref to prevent re-initialization on re-renders
        mapInstanceRef.current = map;

        if (data.length > 0) {
          //Create a feature group containing all marker positions for bounds calculation
          const group = L.featureGroup(
            data.map(location => 
              L.circleMarker([location.lat, location.lng])
            )
          );
            //Get the geographical bounds that contain all markers with 10% padding
          const bounds = group.getBounds().pad(0.1);
          
          //Ensure bounds don't exceed Canada
          const constrainedBounds = L.latLngBounds(
            [
              Math.max(bounds.getSouth(), canadaBounds[0][0]),
              Math.max(bounds.getWest(), canadaBounds[0][1])
            ],
            [
              Math.min(bounds.getNorth(), canadaBounds[1][0]),
              Math.min(bounds.getEast(), canadaBounds[1][1])
            ]
          );
          
            //Zoom and pan map to show all markers within constrained Canadian bounds
          map.fitBounds(constrainedBounds);
        } else {
            //If no data, default to showing all of Canada
          map.fitBounds(canadaBounds);
        }
      }
    };

    initializeMap();

    //Cleanup function: runs when component unmounts or data changes
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove(); //Properly destroy Leaflet map to prevent memory leaks
        mapInstanceRef.current = null; //Clear reference to allow re-initialization
      }
    };
  }, [data]); //effect re-runs only when data changes

  return (
    <>
      {/* Dynamically load Leaflet CSS for map styling (avoids SSR issues) */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
        integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
        crossOrigin=""
      />
      
      <div style={{ position: 'relative', height }}>
         {/* Map container div - Leaflet will render into this element */}
        <div
          ref={mapRef}
          style={{ height: '100%', width: '100%' }}
        />
        
        {/* Legend overlay positioned absolutely over the map */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '6px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000 //Ensure legend appears above map elements
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            Fire Risk Legend
          </h4>
          {[
            { level: 'Very High', color: '#d32f2f', min: 80 },
            { level: 'High', color: '#f57c00', min: 60 },
            { level: 'Medium', color: '#fbc02d', min: 40 },
            { level: 'Low', color: '#689f38', min: 20 },
            { level: 'Very Low', color: '#388e3c', min: 0 }
          ].map((item) => (
            <div
              key={item.level}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '4px'
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '2px',
                  backgroundColor: item.color,
                  marginRight: '8px'
                }}
              />
                {/* Legend text with risk level name and minimum percentage */}
              <span style={{ fontSize: '12px' }}>
                {item.level} ({item.min}%+)
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default LeafletMap;