import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FireRiskData, getRiskCategory } from '../types';

// Global window declaration
declare global {
  interface Window {
    L: any;
  }
}

interface UnifiedMapProps {
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
  };
}

type MapViewType = 'markers' | 'heatmap';

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

const getRiskColor = (riskLevel: number): string => {
  if (riskLevel >= 0.8) return '#d32f2f';
  if (riskLevel >= 0.6) return '#f57c00';
  if (riskLevel >= 0.4) return '#fbc02d';
  if (riskLevel >= 0.2) return '#689f38';
  return '#388e3c';
};

const UnifiedMap: React.FC<UnifiedMapProps> = ({ data, height }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<MapViewType>('heatmap');
  const [heatmapReady, setHeatmapReady] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet library
  const loadLeaflet = useCallback(async () => {
    try {
      // Check if Leaflet is already loaded
      if (window.L) {
        console.log('Leaflet already available');
        setLeafletLoaded(true);
        return true;
      }

      // Load Leaflet from CDN
      const leafletScript = document.createElement('script');
      leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      leafletScript.async = true;
      
      return new Promise<boolean>((resolve) => {
        leafletScript.onload = () => {
          console.log('Leaflet script loaded successfully');
          if (window.L) {
            // Fix default icon paths
            const L = window.L;
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
            setLeafletLoaded(true);
            resolve(true);
          } else {
            console.error('Leaflet object not available after script load');
            resolve(false);
          }
        };
        
        leafletScript.onerror = () => {
          console.error('Failed to load Leaflet script');
          resolve(false);
        };
        
        document.head.appendChild(leafletScript);
      });
    } catch (error) {
      console.error('Error loading Leaflet:', error);
      return false;
    }
  }, []);

  // Load heatmap plugin
  const loadHeatmapPlugin = useCallback(async () => {
    if (!window.L) {
      console.log('Leaflet not loaded, skipping heatmap plugin');
      return false;
    }

    const L = window.L;
    if (L.heatLayer) {
      console.log('Heatmap plugin already available');
      setHeatmapReady(true);
      return true;
    }

    try {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
      script.async = true;
      
      return new Promise<boolean>((resolve) => {
        script.onload = () => {
          console.log('Heatmap plugin loaded successfully');
          setHeatmapReady(true);
          resolve(true);
        };
        script.onerror = () => {
          console.error('Failed to load heatmap plugin');
          resolve(false);
        };
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Error loading heatmap plugin:', error);
      return false;
    }
  }, []);

  // Initialize map - runs once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeMap = async () => {
      console.log('Starting map initialization');
      setIsLoading(true);
      setMapError(null);
      
      try {
        // Load Leaflet first
        const leafletLoaded = await loadLeaflet();
        if (!leafletLoaded) {
          throw new Error('Failed to load Leaflet library');
        }

        // Load heatmap plugin
        const heatmapLoaded = await loadHeatmapPlugin();
        console.log('Heatmap plugin loaded:', heatmapLoaded);
        
        // Initialize map
        if (mapRef.current && !mapInstanceRef.current && window.L) {
          console.log('Creating map instance');
          
          const L = window.L;
          
          const canadaBounds: [[number, number], [number, number]] = [
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
            maxZoom: 18,
            opacity: 0.8
          }).addTo(map);

          mapInstanceRef.current = map;
          setMapInitialized(true);
          console.log('Map instance created successfully');
          
          // Force resize and invalidate
          setTimeout(() => {
            if (map) {
              map.invalidateSize();
              console.log('Map size invalidated');
            }
          }, 100);
        }

      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError(`Map initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        console.log('Cleaning up map instance');
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.error('Error during map cleanup:', error);
        }
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        heatLayerRef.current = null;
        setMapInitialized(false);
      }
    };
  }, []); // Only run once on mount

  // Find nearest station for each grid cell
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
        if (!station.weather && (cell.temperature !== undefined || cell.humidity !== undefined)) {
          station.weather = {
            temperature: cell.temperature,
            humidity: cell.humidity,
            windSpeed: cell.windSpeed,
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

  // Create station markers
  const createStationMarkers = useCallback((map: any) => {
    console.log('Creating station markers with data length:', data?.length);
    
    if (!window.L) {
      console.error('Leaflet not available for markers');
      return;
    }

    const L = window.L;
    
    // Clear existing markers
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
      markersLayerRef.current = null;
    }

    const markers: any[] = [];
    
    // Aggregate data by station if we have data
    let stationData: Map<string, StationData> | null = null;
    if (data && data.length > 0) {
      stationData = aggregateDataByStation(data);
    }

    // Create markers for all 38 stations
    Object.entries(STATION_COORDS).forEach(([stationName, [lat, lon]]) => {
      const stationInfo = stationData?.get(stationName);
      
      let markerColor = '#666666'; // Default gray
      let markerSize = 10;
      const strokeColor = '#ffffff';
      let strokeWidth = 2;

      if (stationInfo && stationInfo.gridCells.length > 0) {
        markerColor = getRiskColor(stationInfo.maxRisk);
        markerSize = 8 + Math.min(stationInfo.maxRisk * 12, 12);
        strokeWidth = 3;
      }

      const marker = L.circleMarker([lat, lon], {
        radius: markerSize,
        fillColor: markerColor,
        color: strokeColor,
        weight: strokeWidth,
        opacity: 1,
        fillOpacity: 0.8
      });

      // Create popup content
      const popupContent = stationInfo && stationInfo.gridCells.length > 0 
        ? createStationPopup(stationName, stationInfo)
        : createEmptyStationPopup(stationName, getProvince(stationName));
      
      marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'station-popup'
      });

      markers.push(marker);
    });

    // Add all markers to map
    if (markers.length > 0) {
      markersLayerRef.current = L.layerGroup(markers);
      markersLayerRef.current.addTo(map);
    }
  }, [data]);

  // Preprocess heatmap data
  const preprocessHeatmapData = useCallback((gridData: FireRiskData[]) => {
    const validData = gridData.filter(location => 
      location.lat >= 41.6 && location.lat <= 83.3 &&
      location.lon >= -141.0 && location.lon <= -52.6 &&
      location.riskLevel >= 0 && location.riskLevel <= 1 &&
      !isNaN(location.lat) && !isNaN(location.lon) && !isNaN(location.riskLevel)
    );

    return validData
      .filter(location => location.riskLevel > 0.1)
      .map(location => {
        let normalizedRisk: number;
        
        if (location.riskLevel <= 0.2) {
          normalizedRisk = Math.max(0.05, location.riskLevel * 0.3);
        } else if (location.riskLevel <= 0.4) {
          normalizedRisk = 0.15 + (location.riskLevel - 0.2) * 0.5;
        } else if (location.riskLevel <= 0.7) {
          normalizedRisk = 0.35 + (location.riskLevel - 0.4) * 0.8;
        } else {
          normalizedRisk = 0.6 + (location.riskLevel - 0.7) * 1.0;
        }

        normalizedRisk = Math.max(0.05, Math.min(0.95, normalizedRisk));
        return [location.lat, location.lon, normalizedRisk] as [number, number, number];
      });
  }, []);

  // Create heatmap layer
  const createHeatmapLayer = useCallback((map: any) => {
    console.log('Creating heatmap layer with data length:', data?.length);
    
    // Clear existing heatmap
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!window.L || !window.L.heatLayer) {
      console.log('Heatmap plugin not available');
      return;
    }

    const L = window.L;
    
    if (data && data.length > 0) {
      const heatmapData = preprocessHeatmapData(data);
      console.log('Processed heatmap data points:', heatmapData.length);

      try {
        heatLayerRef.current = L.heatLayer(heatmapData, {
          radius: 35,
          blur: 25,
          maxZoom: 8,
          max: 0.8,
          minOpacity: 0.05,
          gradient: {
            0.0: 'rgba(0, 100, 0, 0)',
            0.1: 'rgba(0, 150, 0, 0.2)',
            0.2: 'rgba(50, 200, 50, 0.3)',
            0.3: 'rgba(150, 200, 0, 0.4)',
            0.4: 'rgba(255, 255, 0, 0.5)',
            0.5: 'rgba(255, 200, 0, 0.6)',
            0.6: 'rgba(255, 150, 0, 0.7)',
            0.7: 'rgba(255, 100, 0, 0.8)',
            0.8: 'rgba(255, 50, 0, 0.9)',
            1.0: 'rgba(200, 0, 0, 1.0)'
          }
        });

        heatLayerRef.current.addTo(map);
        console.log('Heatmap layer added to map successfully');
      } catch (error) {
        console.error('Failed to create heatmap layer:', error);
      }
    }
  }, [data, preprocessHeatmapData]);

  // Switch between view types
  const switchViewType = useCallback(async (newViewType: MapViewType): Promise<void> => {
    if (!mapInstanceRef.current || !mapInitialized) {
      console.log('Map not ready for view switch');
      return;
    }

    console.log('Switching view to:', newViewType);
    const map = mapInstanceRef.current;

    // Clear current layers
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
      markersLayerRef.current = null;
    }
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Add appropriate layer
    if (newViewType === 'markers') {
      createStationMarkers(map);
      setViewType(newViewType);
    } else if (newViewType === 'heatmap' && heatmapReady) {
      createHeatmapLayer(map);
      setViewType(newViewType);
    }
  }, [createStationMarkers, createHeatmapLayer, heatmapReady, mapInitialized]);

  // Update layers when data changes
  useEffect(() => {
    if (mapInstanceRef.current && mapInitialized && leafletLoaded && !isLoading) {
      console.log('Data effect triggered with:', data?.length, 'points, view type:', viewType);
      
      const timeoutId = setTimeout(() => {
        switchViewType(viewType).catch(error => {
          console.error('Error updating data layers:', error);
        });
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [data, mapInitialized, leafletLoaded, isLoading, viewType, switchViewType]);

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
            </div>
          </div>
        ` : ''}
        
        <p style="margin: 12px 0 0 0; color: #6c757d; font-size: 11px; border-top: 1px solid #dee2e6; padding-top: 8px; text-align: center;">
          Weather Station • Coverage: ${stationInfo.gridCells.length} grid cells
        </p>
      </div>
    `;
  };

  if (mapError) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '18px', color: '#d32f2f', marginBottom: '8px' }}>Map Error</div>
          <div style={{ fontSize: '14px', color: '#666' }}>{mapError}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#f57c00',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !mapInitialized) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #f57c00',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }}></div>
          <div style={{ fontSize: '18px', color: '#666' }}>
            {!leafletLoaded ? 'Loading Leaflet...' : !mapInitialized ? 'Initializing map...' : 'Loading map...'}
          </div>
          <div style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>
            {data?.length > 0 ? `Processing ${data.length.toLocaleString()} data points` : 'Waiting for data...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .station-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .station-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
      
      <div style={{position: 'relative', height, width: '100%', minHeight: '400px'}}>
        {/* View Toggle Controls */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '60px',
          zIndex: 1001,
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #ddd',
          display: 'flex'
        }}>
          <button
            onClick={() => switchViewType('heatmap')}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '8px 0 0 8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: viewType === 'heatmap' ? '#dc2626' : 'white',
              color: viewType === 'heatmap' ? 'white' : '#374151',
              transition: 'all 0.2s ease'
            }}
          >
            🔥 Heatmap
          </button>
          <button
            onClick={() => switchViewType('markers')}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '0 8px 8px 0',
              border: 'none',
              borderLeft: '1px solid #ddd',
              cursor: 'pointer',
              backgroundColor: viewType === 'markers' ? '#dc2626' : 'white',
              color: viewType === 'markers' ? 'white' : '#374151',
              transition: 'all 0.2s ease'
            }}
          >
            📍 Stations
          </button>
        </div>

        <div
          ref={mapRef}
          style={{
            height: '100%', 
            width: '100%', 
            position: 'relative',
            minHeight: '400px',
            backgroundColor: '#f0f0f0'
          }}
        />

        {/* Legend - Dynamic based on view type */}
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
          maxWidth: '240px'
        }}>
          <h4 style={{
            fontSize: '15px',
            fontWeight: '700',
            margin: '0 0 12px 0',
            color: '#333'
          }}>
            {viewType === 'heatmap' ? 'Fire Risk Heatmap' : 'Fire Risk Levels'}
          </h4>
          
          {viewType === 'heatmap' ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  height: '20px',
                  background: 'linear-gradient(to right, rgba(0,150,0,0.3) 0%, rgba(50,200,50,0.4) 20%, rgba(255,255,0,0.5) 40%, rgba(255,150,0,0.7) 60%, rgba(255,50,0,0.9) 80%, rgba(200,0,0,1.0) 100%)',
                  borderRadius: '10px',
                  border: '1px solid #ddd'
                }} />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#666',
                  marginTop: '4px'
                }}>
                  <span>Minimal</span>
                  <span>Extreme</span>
                </div>
              </div>
              
              {[
                { level: 'Extreme Risk', color: '#c80000', min: 80 },
                { level: 'High Risk', color: '#ff5722', min: 60 },
                { level: 'Moderate Risk', color: '#ff9800', min: 40 },
                { level: 'Low Risk', color: '#cddc39', min: 20 },
                { level: 'Minimal Risk', color: '#4caf50', min: 0 }
              ].map((item) => (
                <div 
                  key={item.level}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      marginRight: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      border: '1px solid white'
                    }}
                  />
                  <span style={{
                    fontSize: '12px',
                    color: '#333',
                    fontWeight: '500'
                  }}>
                    {item.level} ({item.min}%+)
                  </span>
                </div>
              ))}
              
              <div style={{
                fontSize: '10px',
                color: '#888',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #eee'
              }}>
                Intensity represents relative fire risk across monitored areas
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Data Info */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div>{data?.length?.toLocaleString() || 0} grid points • {Object.keys(STATION_COORDS).length} weather stations</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
            {viewType === 'heatmap' ? 'Heatmap visualization' : 'Station markers view'}
          </div>
        </div>
      </div>
    </>
  );
};

export default UnifiedMap;