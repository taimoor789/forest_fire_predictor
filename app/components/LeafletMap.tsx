import React, { useEffect, useState, useRef } from 'react';
import { FireRiskData, getRiskCategory, HeatLayerOptions } from '../types';

// Proper Leaflet heat layer interface
interface HeatLayer extends L.Layer {
  setLatLngs(latlngs: [number, number, number][]): this;
  addLatLng(latlng: [number, number, number]): this;
  setOptions(options: HeatLayerOptions): this;
  redraw(): this;
}

// Global leaflet heat function
declare global {
  interface Window {
    L: typeof L & {
      heatLayer: (latlngs: [number, number, number][], options?: HeatLayerOptions) => HeatLayer;
    };
  }
}

interface LeafletHeatmapProps {
  data: FireRiskData[];
  height: string;
}

interface StationData {
  gridCells: FireRiskData[];
  avgRisk: number;
  maxRisk: number;
  minRisk: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  coordinates: [number, number];
  province: string;
  weather?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    pressure?: number;
  };
}

// Station coordinates - only these 38 stations should show as markers
const STATION_COORDS: Record<string, [number, number]> = {
  "Vancouver": [49.2827, -123.1207],
  "Kelowna": [49.8880, -119.4960],
  "Kamloops": [50.6745, -120.3273],
  "Calgary": [51.0447, -114.0719],
  "Edmonton": [53.5461, -113.4938],
  "Fort McMurray": [56.7266, -111.3790],
  "Saskatoon": [52.1579, -106.6702],
  "Regina": [50.4452, -104.6189],
  "Winnipeg": [49.8951, -97.1384],
  "Thunder Bay": [48.3809, -89.2477],
  "Ottawa": [45.4215, -75.6972],
  "Toronto": [43.6510, -79.3470],
  "Sudbury": [46.4917, -80.9930],
  "Montreal": [45.5019, -73.5674],
  "Quebec City": [46.8139, -71.2080],
  "Halifax": [44.6488, -63.5752],
  "Whitehorse": [60.7212, -135.0568],
  "Yellowknife": [62.4540, -114.3718],
  "Prince George": [53.9171, -122.7497],
  "Victoria": [48.4284, -123.3656],
  "Smithers": [54.7800, -127.1743],
  "Dease Lake": [58.4356, -130.0089],
  "Fort St. John": [56.2524, -120.8466],
  "High Level": [58.5169, -117.1360],
  "Peace River": [56.2333, -117.2833],
  "La Ronge": [55.1000, -105.3000],
  "Flin Flon": [54.7682, -101.8779],
  "Churchill": [58.7684, -94.1650],
  "Moosonee": [51.2794, -80.6463],
  "Timmins": [48.4758, -81.3305],
  "Val-d'Or": [48.1086, -77.7972],
  "Chibougamau": [49.9167, -74.3667],
  "Schefferville": [54.8000, -66.8167],
  "Goose Bay": [53.3019, -60.3267],
  "St. John's": [47.5615, -52.7126],
  "Iqaluit": [63.7467, -68.5170],
  "Rankin Inlet": [62.8090, -92.0853],
  "Cambridge Bay": [69.1167, -105.0667]
};

const getProvince = (stationName: string): string => {
  const provinceMap: Record<string, string> = {
    "Vancouver": "BC", "Kelowna": "BC", "Kamloops": "BC", "Prince George": "BC", 
    "Victoria": "BC", "Smithers": "BC", "Dease Lake": "BC", "Fort St. John": "BC",
    "Calgary": "AB", "Edmonton": "AB", "Fort McMurray": "AB", "High Level": "AB", "Peace River": "AB",
    "Saskatoon": "SK", "Regina": "SK", "La Ronge": "SK",
    "Winnipeg": "MB", "Flin Flon": "MB", "Churchill": "MB",
    "Thunder Bay": "ON", "Ottawa": "ON", "Toronto": "ON", "Sudbury": "ON", "Moosonee": "ON", "Timmins": "ON",
    "Montreal": "QC", "Quebec City": "QC", "Val-d'Or": "QC", "Chibougamau": "QC", "Schefferville": "QC",
    "Halifax": "NS", "Goose Bay": "NL", "St. John's": "NL",
    "Whitehorse": "YT", "Yellowknife": "NT", "Iqaluit": "NU", 
    "Rankin Inlet": "NU", "Cambridge Bay": "NU"
  };
  return provinceMap[stationName] || "Canada";
};

// Function to find nearest station for each grid cell
const findNearestStation = (gridCell: FireRiskData): string => {
  let nearestStation = '';
  let minDistance = Infinity;

  Object.entries(STATION_COORDS).forEach(([stationName, [stationLat, stationLon]]) => {
    const distance = Math.sqrt(
      Math.pow(gridCell.lat - stationLat, 2) + Math.pow(gridCell.lon - stationLon, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = stationName;
    }
  });

  return nearestStation;
};

// Aggregate grid data by station
const aggregateDataByStation = (gridData: FireRiskData[]): Map<string, StationData> => {
  const stationData = new Map<string, StationData>();

  // Initialize all stations
  Object.entries(STATION_COORDS).forEach(([stationName, coordinates]) => {
    stationData.set(stationName, {
      gridCells: [],
      avgRisk: 0,
      maxRisk: 0,
      minRisk: 1,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      coordinates,
      province: getProvince(stationName),
      weather: undefined
    });
  });

  // Assign grid cells to nearest stations
  gridData.forEach(cell => {
    const nearestStation = cell.nearest_station || findNearestStation(cell);
    const station = stationData.get(nearestStation);
    
    if (station) {
      station.gridCells.push(cell);
      // Use weather data from the first cell with data
      if (!station.weather && (cell.temperature !== undefined || cell.humidity !== undefined)) {
        station.weather = {
          temperature: cell.temperature,
          humidity: cell.humidity,
          windSpeed: cell.windSpeed,
          pressure: cell.pressure
        };
      }
    }
  });

  // Calculate statistics for each station
  stationData.forEach((station) => {
    if (station.gridCells.length > 0) {
      const risks = station.gridCells.map(cell => cell.riskLevel);
      station.avgRisk = risks.reduce((sum, risk) => sum + risk, 0) / risks.length;
      station.maxRisk = Math.max(...risks);
      station.minRisk = Math.min(...risks);

      station.highRiskCount = risks.filter(r => r >= 0.6).length;
      station.mediumRiskCount = risks.filter(r => r >= 0.4 && r < 0.6).length;
      station.lowRiskCount = risks.filter(r => r < 0.4).length;
    }
  });

  return stationData;
};

const getHeatIntensity = (riskLevel: number): number => {
  return Math.pow(riskLevel, 0.7);
};

const getRiskColor = (riskLevel: number): string => {
  if (riskLevel >= 0.8) return '#d32f2f';
  if (riskLevel >= 0.6) return '#f57c00';
  if (riskLevel >= 0.4) return '#fbc02d';
  if (riskLevel >= 0.2) return '#689f38';
  return '#388e3c';
};

const LeafletHeatmap: React.FC<LeafletHeatmapProps> = ({ data, height }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<HeatLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
  // State to toggle between heatmap and markers
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Debug logging
  useEffect(() => {
    console.log('LeafletHeatmap received data:', data?.length || 0, 'items');
    console.log('First few data items:', data?.slice(0, 3));
  }, [data]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeMap = async () => {
      setIsLoading(true);
      
      try {
        // Import Leaflet
        const L = await import('leaflet');
        
        // Fix Leaflet default markers
        const DefaultIcon = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => string };
        delete DefaultIcon._getIconUrl;
        
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Load the heatmap plugin
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load leaflet.heat'));
          document.head.appendChild(script);
        });

        // Wait a bit for the plugin to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize map if not already created
        if (mapRef.current && !mapInstanceRef.current) {
          const canadaBounds: L.LatLngBoundsExpression = [
            [41.6765559, -141.00187],
            [83.23324, -52.6480987]
          ];

          const map = L.map(mapRef.current, {
            center: [56.1304, -106.3468],
            zoom: 4,
            minZoom: 3,
            maxZoom: 12,
            maxBounds: canadaBounds,
            maxBoundsViscosity: 1.0,
            zoomControl: true,
            scrollWheelZoom: true,
            preferCanvas: true
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
          }).addTo(map);

          mapInstanceRef.current = map;
          console.log('Map initialized successfully');
        }

        // Update layers if we have data
        if (mapInstanceRef.current && data && data.length > 0) {
          updateMapLayers(L, mapInstanceRef.current, data);
        } else if (mapInstanceRef.current) {
          // Show all station markers even without data
          showAllStationMarkers(L, mapInstanceRef.current);
        }

      } catch (error) {
        console.error('Failed to initialize map:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        heatLayerRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Update layers when data, showHeatmap, or showMarkers change
  useEffect(() => {
    if (mapInstanceRef.current && !isLoading) {
      const L = window.L;
      if (L) {
        if (data && data.length > 0) {
          updateMapLayers(L, mapInstanceRef.current, data);
        } else {
          showAllStationMarkers(L, mapInstanceRef.current);
        }
      }
    }
  }, [data, showHeatmap, showMarkers, isLoading]);

  const showAllStationMarkers = (L: typeof import('leaflet'), map: L.Map) => {
    // Remove existing layers
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
      markersLayerRef.current = null;
    }

    if (showMarkers) {
      const markers: L.CircleMarker[] = [];

      Object.entries(STATION_COORDS).forEach(([stationName, [lat, lon]]) => {
        const marker = L.circleMarker([lat, lon], {
          radius: 8,
          fillColor: '#666666',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7
        });

        const popupContent = `
          <div style="font-family: Arial, sans-serif; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
              📍 ${stationName}
            </h3>
            <p style="margin: 0; color: #666;">
              ${getProvince(stationName)} • No data available
            </p>
          </div>
        `;

        marker.bindPopup(popupContent);
        markers.push(marker);
      });

      if (markers.length > 0) {
        markersLayerRef.current = L.layerGroup(markers).addTo(map);
        console.log(`Created ${markers.length} station markers`);
      }
    }
  };

  const updateMapLayers = (L: typeof import('leaflet'), map: L.Map, gridData: FireRiskData[]) => {
    console.log('Updating map layers with', gridData.length, 'data points');
    
    // Remove existing layers
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
      markersLayerRef.current = null;
    }

    // Create heatmap layer if enabled and window.L.heatLayer is available
    if (showHeatmap && window.L && window.L.heatLayer && gridData.length > 0) {
      const heatmapData: [number, number, number][] = gridData.map(location => [
        location.lat,
        location.lon,
        getHeatIntensity(location.riskLevel)
      ]);

      console.log('Creating heatmap with', heatmapData.length, 'points');
      console.log('Sample heatmap data:', heatmapData.slice(0, 3));

      try {
        heatLayerRef.current = window.L.heatLayer(heatmapData, {
          radius: 35,
          blur: 25,
          maxZoom: 10,
          max: 1.0,
          gradient: {
            0.0: '#388e3c',
            0.2: '#689f38',
            0.4: '#fbc02d',
            0.6: '#f57c00',
            0.8: '#ff5722',
            1.0: '#d32f2f'
          }
        });

        heatLayerRef.current.addTo(map);
        console.log('Heatmap layer added successfully');
      } catch (error) {
        console.error('Failed to create heatmap layer:', error);
      }
    }

    // Create station markers if enabled
    if (showMarkers) {
      const stationData = aggregateDataByStation(gridData);
      const markers: L.CircleMarker[] = [];

      stationData.forEach((stationInfo, stationName) => {
        const [lat, lon] = stationInfo.coordinates;
        let markerColor = '#666666';
        let markerSize = 8;

        // If station has data, use risk-based styling
        if (stationInfo.gridCells.length > 0) {
          markerColor = getRiskColor(stationInfo.maxRisk);
          markerSize = 12 + (stationInfo.maxRisk * 8);
        }

        const marker = L.circleMarker([lat, lon], {
          radius: markerSize,
          fillColor: markerColor,
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8
        });

        const popupContent = stationInfo.gridCells.length > 0 
          ? createStationPopup(stationName, stationInfo)
          : createEmptyStationPopup(stationName, stationInfo.province);
        
        marker.bindPopup(popupContent, {
          maxWidth: 320,
          className: 'station-popup'
        });

        markers.push(marker);
      });

      if (markers.length > 0) {
        markersLayerRef.current = L.layerGroup(markers).addTo(map);
        console.log(`Created ${markers.length} station markers`);
      }
    }
  };

  const createEmptyStationPopup = (stationName: string, province: string): string => {
    return `
      <div style="font-family: Arial, sans-serif; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
          📍 ${stationName}
        </h3>
        <p style="margin: 0; color: #666;">
          ${province} • No fire risk data available
        </p>
      </div>
    `;
  };

  const createStationPopup = (stationName: string, stationInfo: StationData): string => {
    return `
      <div style="font-family: Arial, sans-serif; min-width: 280px;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #333; display: flex; align-items: center;">
          <span style="margin-right: 8px;">📍</span>
          ${stationName}
        </h3>
        <p style="margin: 0 0 12px 0; color: #666; font-size: 14px;">
          ${stationInfo.province} • ${stationInfo.gridCells.length} grid cells monitored
        </p>
        
        <div style="margin: 12px 0; padding: 12px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 1px solid #dee2e6;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #495057;">Risk Assessment</h4>
          
          <div style="display: flex; justify-content: space-between; margin: 6px 0;">
            <strong>Maximum Risk:</strong>
            <span style="
              padding: 3px 10px; 
              border-radius: 12px; 
              font-weight: 600; 
              font-size: 12px;
              color: white;
              background-color: ${getRiskColor(stationInfo.maxRisk)};
            ">
              ${getRiskCategory(stationInfo.maxRisk)} (${Math.round(stationInfo.maxRisk * 100)}%)
            </span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px;">
            <span>Average Risk:</span>
            <span style="font-weight: 600;">${Math.round(stationInfo.avgRisk * 100)}%</span>
          </div>
        </div>

        <div style="margin: 12px 0; padding: 12px; background: #fff; border-radius: 8px; border: 1px solid #e9ecef;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #495057;">Area Breakdown</h4>
          
          <div style="font-size: 13px; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between; margin: 4px 0;">
              <span style="color: #d32f2f;">● High Risk Areas:</span>
              <strong>${stationInfo.highRiskCount}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 4px 0;">
              <span style="color: #f57c00;">● Medium Risk Areas:</span>
              <strong>${stationInfo.mediumRiskCount}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 4px 0;">
              <span style="color: #689f38;">● Low Risk Areas:</span>
              <strong>${stationInfo.lowRiskCount}</strong>
            </div>
          </div>
        </div>

        ${stationInfo.weather ? `
          <div style="margin: 12px 0; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #495057;">Current Weather</h4>
            <div style="font-size: 13px; line-height: 1.4; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              <div><strong>Temperature:</strong> ${stationInfo.weather.temperature?.toFixed(1) || 'N/A'}°C</div>
              <div><strong>Humidity:</strong> ${stationInfo.weather.humidity?.toFixed(0) || 'N/A'}%</div>
              <div><strong>Wind Speed:</strong> ${stationInfo.weather.windSpeed?.toFixed(1) || 'N/A'} m/s</div>
              <div><strong>Pressure:</strong> ${stationInfo.weather.pressure?.toFixed(0) || 'N/A'} hPa</div>
            </div>
          </div>
        ` : ''}
        
        <p style="margin: 12px 0 0 0; color: #6c757d; font-size: 11px; border-top: 1px solid #dee2e6; padding-top: 8px; text-align: center;">
          Weather Station • Coverage: ${stationInfo.gridCells.length} grid cells
        </p>
      </div>
    `;
  };

  if (isLoading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <link 
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
        integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
        crossOrigin=""
      />

      <div style={{position: 'relative', height}}>
        <div
          ref={mapRef}
          style={{height: '100%', width: '100%'}}
        />

        {/* Layer Controls */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <label style={{display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer'}}>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              style={{marginRight: '8px'}}
            />
            Show Heatmap
          </label>
          <label style={{display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer'}}>
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => setShowMarkers(e.target.checked)}
              style={{marginRight: '8px'}}
            />
            Show Stations ({Object.keys(STATION_COORDS).length})
          </label>
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.1)',
          maxWidth: '220px'
        }}>
          <h4 style={{
            fontSize: '15px',
            fontWeight: '700',
            margin: '0 0 12px 0',
            color: '#333'
          }}>
            Fire Risk Levels
          </h4>
          
          {[
            { level: 'Extreme', color: '#d32f2f', min: 80 },
            { level: 'High', color: '#f57c00', min: 60 },
            { level: 'Moderate', color: '#fbc02d', min: 40 },
            { level: 'Low', color: '#689f38', min: 20 },
            { level: 'Minimal', color: '#388e3c', min: 0 }
          ].map((item) => (
            <div 
              key={item.level}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px'
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  marginRight: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  border: '2px solid white'
                }}
              />
              <span style={{
                fontSize: '13px',
                color: '#333',
                fontWeight: '500'
              }}>
                {item.level} ({item.min}%+)
              </span>
            </div>
          ))}
        </div>

        {/* Data Info */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          {data?.length?.toLocaleString() || 0} grid points • {Object.keys(STATION_COORDS).length} weather stations
        </div>
      </div>

      <style>{`
        .station-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .station-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
    </>
  );
};

export default LeafletHeatmap;