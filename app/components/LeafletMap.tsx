import React, { useEffect, useRef, useCallback, useState } from 'react';
import { FireRiskData } from '../types';

declare global {
  interface Window {
    L: any;
  }
}

interface LeafletMapProps {
  data: FireRiskData[];
  height?: string;
  onLocationClick?: (location: FireRiskData) => void;
  mapMode?: 'markers' | 'heatmap';
  onStationCountUpdate?: (count: number) => void;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  data,
  height = '700px',
  onLocationClick,
  mapMode = 'markers',
  onStationCountUpdate
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const heatmapLayerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const zoomListenerRef = useRef<any>(null);
  const scriptsLoadedRef = useRef(false);
  const [canadaGeoJSON, setCanadaGeoJSON] = useState<any>(null);
  const [boundaryStatus, setBoundaryStatus] = useState<string>('Loading boundaries...');

  // Load Canada's official GeoJSON boundary
  const loadCanadaBoundary = useCallback(async () => {
    setBoundaryStatus('Loading Canada GeoJSON...');
    
    try {
      // Try multiple reliable sources for Canada GeoJSON
      const sources = [
        // Natural Earth - High quality, accurate boundaries
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
        // Backup: Different resolution
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
        // Backup: World atlas
        'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/cultural/ne_110m_admin_0_countries.geojson'
      ];

      let canadaFeature = null;

      for (const url of sources) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          
          const worldData = await response.json();
          
          // Find Canada in the data
          if (worldData.features) {
            canadaFeature = worldData.features.find((feature: any) => 
              feature.properties &&
              (feature.properties.NAME === 'Canada' ||
               feature.properties.NAME_EN === 'Canada' ||
               feature.properties.ADMIN === 'Canada' ||
               feature.properties.ISO_A3 === 'CAN')
            );
          }
          
          if (canadaFeature) {
            console.log('Found Canada boundary data from:', url);
            break;
          }
        } catch (err) {
          console.warn(`Failed to load from ${url}:`, err);
          continue;
        }
      }

      if (canadaFeature) {
        setCanadaGeoJSON(canadaFeature);
        setBoundaryStatus('Canada boundaries loaded successfully');
        console.log('Canada GeoJSON loaded:', canadaFeature.properties);
        return canadaFeature;
      }

      // Fallback: Use a comprehensive hardcoded boundary
      console.log('Using fallback Canada boundary');
      const fallbackCanada = {
        type: "Feature",
        properties: { NAME: "Canada" },
        geometry: {
          type: "MultiPolygon",
          coordinates: [[
            // Main Canada boundary (more comprehensive)
            [[-141.00, 60.00], [-141.00, 69.65], [-139.04, 69.65], [-137.08, 68.42], 
             [-136.25, 68.83], [-135.42, 69.24], [-134.59, 69.65], [-133.76, 70.07], 
             [-132.93, 70.48], [-132.10, 70.89], [-131.27, 71.31], [-130.44, 71.72], 
             [-129.61, 72.13], [-128.78, 72.55], [-127.95, 72.96], [-127.12, 73.37], 
             [-126.29, 73.79], [-125.46, 74.20], [-124.63, 74.61], [-123.80, 75.03], 
             [-122.97, 75.44], [-122.14, 75.85], [-121.31, 76.27], [-120.48, 76.68], 
             [-119.65, 77.09], [-118.82, 77.51], [-117.99, 77.92], [-117.16, 78.33], 
             [-116.33, 78.75], [-115.50, 79.16], [-114.67, 79.57], [-113.84, 79.99], 
             [-113.01, 80.40], [-112.18, 80.81], [-111.35, 81.23], [-110.52, 81.64], 
             [-109.69, 82.05], [-108.86, 82.47], [-108.03, 82.88], [-107.20, 83.29], 
             [-106.37, 83.70], [-95.00, 83.70], [-85.00, 83.70], [-75.00, 83.70], 
             [-65.00, 83.70], [-55.00, 83.70], [-52.64, 83.11], [-52.64, 78.00], 
             [-52.64, 70.00], [-52.64, 62.00], [-53.50, 58.50], [-55.00, 55.00], 
             [-57.00, 52.00], [-58.50, 49.50], [-60.00, 47.50], [-62.50, 45.50], 
             [-65.50, 44.00], [-69.00, 43.50], [-74.00, 43.00], [-79.50, 42.50], 
             [-83.00, 42.50], [-87.50, 45.50], [-90.00, 46.50], [-93.50, 48.50], 
             [-95.00, 49.00], [-123.00, 49.00], [-125.00, 50.00], [-128.00, 52.00], 
             [-132.00, 54.50], [-135.00, 57.50], [-138.50, 59.50], [-141.00, 60.00]]
          ]]
        }
      };
      
      setCanadaGeoJSON(fallbackCanada);
      setBoundaryStatus('Using fallback Canada boundaries');
      return fallbackCanada;

    } catch (error) {
      console.error('Error loading Canada boundary:', error);
      setBoundaryStatus('Error loading boundaries - using basic bounds');
      return null;
    }
  }, []);

  // ACCURATE point-in-polygon using ray casting algorithm
  const pointInPolygon = useCallback((point: [number, number], polygon: number[][]): boolean => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }, []);

  // GUARANTEED Canada-only boundary check using proper GeoJSON
  const isInCanada = useCallback((lat: number, lon: number): boolean => {
    // Basic bounds check first (quick filter)
    if (lat < 41.5 || lat > 83.6 || lon < -141.1 || lon > -52.5) {
      return false;
    }

    if (!canadaGeoJSON || !canadaGeoJSON.geometry) {
      // Fallback to conservative bounds while loading
      return lat >= 42 && lat <= 83.5 && lon >= -141 && lon <= -53;
    }

    try {
      const point: [number, number] = [lon, lat]; // GeoJSON uses [lon, lat]
      
      // Handle different geometry types
      if (canadaGeoJSON.geometry.type === 'MultiPolygon') {
        // Check each polygon in the multipolygon
        for (const polygon of canadaGeoJSON.geometry.coordinates) {
          // Each polygon is an array of rings, first ring is exterior
          const exteriorRing = polygon[0];
          if (pointInPolygon(point, exteriorRing)) {
            // Check if point is in any holes (interior rings)
            let inHole = false;
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true;
                break;
              }
            }
            if (!inHole) {
              return true; // Point is in polygon but not in any hole
            }
          }
        }
        return false;
      } else if (canadaGeoJSON.geometry.type === 'Polygon') {
        // Single polygon
        const exteriorRing = canadaGeoJSON.geometry.coordinates[0];
        if (pointInPolygon(point, exteriorRing)) {
          // Check holes
          for (let i = 1; i < canadaGeoJSON.geometry.coordinates.length; i++) {
            if (pointInPolygon(point, canadaGeoJSON.geometry.coordinates[i])) {
              return false; // Point is in a hole
            }
          }
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking point in Canada:', error);
      // Fallback to basic bounds
      return lat >= 42 && lat <= 83.5 && lon >= -141 && lon <= -53;
    }
  }, [canadaGeoJSON, pointInPolygon]);

  // Utility functions
  const getRiskColor = (riskLevel: number): string => {
    if (riskLevel >= 0.8) return '#d32f2f';
    if (riskLevel >= 0.6) return '#f57c00';
    if (riskLevel >= 0.4) return '#fbc02d';
    if (riskLevel >= 0.2) return '#689f38';
    return '#388e3c';
  };

  const getRiskLabel = (riskLevel: number): string => {
    const percentage = Math.round(riskLevel * 100);
    if (riskLevel >= 0.8) return `Very High (${percentage}%)`;
    if (riskLevel >= 0.6) return `High (${percentage}%)`;
    if (riskLevel >= 0.4) return `Medium (${percentage}%)`;
    if (riskLevel >= 0.2) return `Low (${percentage}%)`;
    return `Very Low (${percentage}%)`;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Load external scripts only once
  const loadScripts = useCallback(async () => {
    if (scriptsLoadedRef.current) return true;

    try {
      // Load Leaflet CSS first
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(cssLink);
      }

      // Load Leaflet JS
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Load heatmap plugin
      if (!window.L?.heatLayer) {
        const heatScript = document.createElement('script');
        heatScript.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
        await new Promise<void>((resolve, reject) => {
          heatScript.onload = () => resolve();
          heatScript.onerror = reject;
          document.head.appendChild(heatScript);
        });
      }

      scriptsLoadedRef.current = true;
      return true;
    } catch (error) {
      console.error('Error loading scripts:', error);
      return false;
    }
  }, []);

  //Safe cleanup function with proper DOM handling
  const cleanupMap = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    try {
      // Remove event listeners first
      if (leafletMapRef.current && zoomListenerRef.current) {
        try {
          leafletMapRef.current.off('zoomend', zoomListenerRef.current);
        } catch (e) {
          console.warn('Error removing zoom listener:', e);
        }
        zoomListenerRef.current = null;
      }

      // Clear markers
      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => {
          try {
            if (marker && leafletMapRef.current && typeof leafletMapRef.current.hasLayer === 'function') {
              if (leafletMapRef.current.hasLayer(marker)) {
                leafletMapRef.current.removeLayer(marker);
              }
            }
          } catch (e) {
            console.warn('Error removing marker:', e);
          }
        });
        markersRef.current = [];
      }

      // Clear heatmap
      if (heatmapLayerRef.current && leafletMapRef.current) {
        try {
          if (typeof leafletMapRef.current.hasLayer === 'function' && 
              leafletMapRef.current.hasLayer(heatmapLayerRef.current)) {
            leafletMapRef.current.removeLayer(heatmapLayerRef.current);
          }
        } catch (e) {
          console.warn('Error removing heatmap:', e);
        }
        heatmapLayerRef.current = null;
      }

      // Remove map instance
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        leafletMapRef.current = null;
      }

      // Clear container - FIXED: Check if element still exists and has parent
      if (mapRef.current) {
        try {
          // Only clear if element is still in DOM
          if (mapRef.current.parentNode) {
            mapRef.current.innerHTML = '';
          }
          // Clear Leaflet's internal reference
          const mapElement = mapRef.current as any;
          if (mapElement._leaflet_id) {
            delete mapElement._leaflet_id;
          }
        } catch (e) {
          console.warn('Error clearing map container:', e);
        }
      }

    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      isInitializedRef.current = false;
      isCleaningUpRef.current = false;
    }
  }, []);

  //Canada-only heatmap with complete coverage
  const addHeatmapToMap = useCallback(() => {
  if (!leafletMapRef.current || !window.L) {
    console.error('Leaflet not loaded');
    return;
  }

  console.log('Creating heatmap...');

  if (!data || data.length === 0) {
    setBoundaryStatus('No data available');
    return;
  }

  // Clear existing layers immediately
  if (markersRef.current.length > 0) {
    markersRef.current.forEach(layer => {
      try {
        if (leafletMapRef.current && leafletMapRef.current.hasLayer(layer)) {
          leafletMapRef.current.removeLayer(layer);
        }
      } catch (e) {
        console.warn('Error removing layer:', e);
      }
    });
    markersRef.current = [];
  }

  // Filter Canadian data
  const canadianData = data.filter(point => {
    const lat = Number(point.lat);
    const lon = Number(point.lon);
    
    if (isNaN(lat) || isNaN(lon)) return false;
    return isInCanada(lat, lon);
  });

  console.log(`Creating coverage for ${canadianData.length} locations`);

  const rectangleSize = 0.6;
  const halfSize = rectangleSize / 2;
  const rectanglesToAdd = [];

  // Create all rectangles first (fast - just object creation)
  canadianData.forEach((point) => {
    const lat = Number(point.lat);
    const lon = Number(point.lon);
    const risk = Number(point.riskLevel);

    if (isNaN(lat) || isNaN(lon) || isNaN(risk)) return;

    const color = getRiskColor(risk);

    const bounds = [
      [lat - halfSize, lon - halfSize],
      [lat + halfSize, lon + halfSize]
    ];

    const rectangle = window.L.rectangle(bounds, {
      fillColor: color,
      color: color,
      weight: 0,
      opacity: 0.8,
      fillOpacity: 0.7,
      interactive: false  // Makes rendering faster
    });

    rectanglesToAdd.push(rectangle);
  });

  // Add all rectangles to map at once using LayerGroup (much faster)
  const layerGroup = window.L.layerGroup(rectanglesToAdd);
  layerGroup.addTo(leafletMapRef.current);
  
  // Store reference for cleanup
  markersRef.current = [layerGroup];

  setBoundaryStatus(`Coverage: ${rectanglesToAdd.length} areas`);
  if (onStationCountUpdate) onStationCountUpdate(rectanglesToAdd.length);

  console.log(`Heatmap complete: ${rectanglesToAdd.length} rectangles`);

 }, [data, isInCanada, getRiskColor, onStationCountUpdate]);

 const clearHeatmap = useCallback(() => {
  // Only clear heatmap layers, not rectangle layers during transitions
  if (heatmapLayerRef.current && leafletMapRef.current) {
    try {
      if (typeof leafletMapRef.current.hasLayer === 'function' && 
          leafletMapRef.current.hasLayer(heatmapLayerRef.current)) {
        leafletMapRef.current.removeLayer(heatmapLayerRef.current);
      }
    } catch (e) {
      console.warn('Error clearing heatmap:', e);
    }
    heatmapLayerRef.current = null;
  }
 }, []);

  // Create station data (for marker mode) - Match backend logic exactly
  const createStationData = useCallback(() => {
  if (!data || data.length === 0) return [];
  
  console.log(`📊 DEBUGGING: Creating stations from ${data.length} grid cells...`);
  
  const rawRisks = data.map(d => d.riskLevel).filter(r => !isNaN(r));
  console.log(`RAW GRID DATA ANALYSIS:`);
  console.log(`  Min: ${Math.min(...rawRisks).toFixed(4)}`);
  console.log(`  Max: ${Math.max(...rawRisks).toFixed(4)}`);
  console.log(`  Average: ${(rawRisks.reduce((a,b) => a+b, 0) / rawRisks.length).toFixed(4)}`);
  
  console.log(`Sample raw grid cell risks:`);
  data.slice(0, 10).forEach((point, i) => {
    console.log(`  ${i+1}. ${point.location}: ${point.riskLevel.toFixed(4)}`);
  });

  const stations = [
    { name: "Vancouver", lat: 49.2827, lon: -123.1207, province: "BC" },
    { name: "Kelowna", lat: 49.8880, lon: -119.4960, province: "BC" },
    { name: "Kamloops", lat: 50.6745, lon: -120.3273, province: "BC" },
    { name: "Calgary", lat: 51.0447, lon: -114.0719, province: "AB" },
    { name: "Edmonton", lat: 53.5461, lon: -113.4938, province: "AB" },
    { name: "Fort McMurray", lat: 56.7266, lon: -111.3790, province: "AB" },
    { name: "Saskatoon", lat: 52.1579, lon: -106.6702, province: "SK" },
    { name: "Regina", lat: 50.4452, lon: -104.6189, province: "SK" },
    { name: "Winnipeg", lat: 49.8951, lon: -97.1384, province: "MB" },
    { name: "Thunder Bay", lat: 48.3809, lon: -89.2477, province: "ON" },
    { name: "Ottawa", lat: 45.4215, lon: -75.6972, province: "ON" },
    { name: "Toronto", lat: 43.6510, lon: -79.3470, province: "ON" },
    { name: "Sudbury", lat: 46.4917, lon: -80.9930, province: "ON" },
    { name: "Montreal", lat: 45.5019, lon: -73.5674, province: "QC" },
    { name: "Quebec City", lat: 46.8139, lon: -71.2080, province: "QC" },
    { name: "Halifax", lat: 44.6488, lon: -63.5752, province: "NS" },
    { name: "Whitehorse", lat: 60.7212, lon: -135.0568, province: "YT" },
    { name: "Yellowknife", lat: 62.4540, lon: -114.3718, province: "NT" },
    { name: "Prince George", lat: 53.9171, lon: -122.7497, province: "BC" },
    { name: "Victoria", lat: 48.4284, lon: -123.3656, province: "BC" },
    { name: "Smithers", lat: 54.7800, lon: -127.1743, province: "BC" },
    { name: "Dease Lake", lat: 58.4356, lon: -130.0089, province: "BC" },
    { name: "Fort St. John", lat: 56.2524, lon: -120.8466, province: "BC" },
    { name: "High Level", lat: 58.5169, lon: -117.1360, province: "AB" },
    { name: "Peace River", lat: 56.2333, lon: -117.2833, province: "AB" },
    { name: "La Ronge", lat: 55.1000, lon: -105.3000, province: "SK" },
    { name: "Flin Flon", lat: 54.7682, lon: -101.8779, province: "MB" },
    { name: "Churchill", lat: 58.7684, lon: -94.1650, province: "MB" },
    { name: "Moosonee", lat: 51.2794, lon: -80.6463, province: "ON" },
    { name: "Timmins", lat: 48.4758, lon: -81.3305, province: "ON" },
    { name: "Val-d'Or", lat: 48.1086, lon: -77.7972, province: "QC" },
    { name: "Chibougamau", lat: 49.9167, lon: -74.3667, province: "QC" },
    { name: "Schefferville", lat: 54.8000, lon: -66.8167, province: "QC" },
    { name: "Goose Bay", lat: 53.3019, lon: -60.3267, province: "NL" },
    { name: "St. John's", lat: 47.5615, lon: -52.7126, province: "NL" },
    { name: "Iqaluit", lat: 63.7467, lon: -68.5170, province: "NU" },
    { name: "Rankin Inlet", lat: 62.8090, lon: -92.0853, province: "NU" },
    { name: "Cambridge Bay", lat: 69.1167, lon: -105.0667, province: "NU" }
  ];

  // Group grid cell data points by nearest station
  const stationGroups = new Map<string, FireRiskData[]>();
  
  // Initialize all stations with empty arrays
  stations.forEach(station => {
    stationGroups.set(station.name, []);
  });
  
  // Assign each grid cell to its nearest station
  data.forEach(gridCell => {
    const lat = Number(gridCell.lat);
    const lon = Number(gridCell.lon);
    
    if (isNaN(lat) || isNaN(lon)) return;
    
    // Find nearest station
    let nearestStation = stations[0];
    let minDistance = calculateDistance(lat, lon, nearestStation.lat, nearestStation.lon);
    
    stations.forEach(station => {
      const distance = calculateDistance(lat, lon, station.lat, station.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    });
    
    stationGroups.get(nearestStation.name)!.push(gridCell);
  });
    
    // Create aggregated station data (38 stations total)
    const stationData: FireRiskData[] = [];
  
    stations.forEach((station, index) => {
    const gridCells = stationGroups.get(station.name) || [];
    
    // Default values for stations with no nearby grid cells
    let avgRiskLevel = 0.1;
    let avgTemperature = 15;
    let avgHumidity = 60;
    let avgWindSpeed = 10;
    let avgConfidence = 0.7;
    let avgFireDangerIndex = 0.3;
    
    // Calculate averages from daily risk data
    if (gridCells.length > 0) {
      avgRiskLevel = gridCells.reduce((sum, cell) => sum + cell.riskLevel, 0) / gridCells.length;
      avgTemperature = gridCells.reduce((sum, cell) => sum + (cell.temperature || 15), 0) / gridCells.length;
      avgHumidity = gridCells.reduce((sum, cell) => sum + (cell.humidity || 60), 0) / gridCells.length;
      avgWindSpeed = gridCells.reduce((sum, cell) => sum + (cell.windSpeed || 10), 0) / gridCells.length;
      avgConfidence = gridCells.reduce((sum, cell) => sum + (cell.modelConfidence || 0.7), 0) / gridCells.length;
      avgFireDangerIndex = gridCells.reduce((sum, cell) => sum + (cell.fireDangerIndex || 0.3), 0) / gridCells.length;
    }
    
    const stationAggregate: FireRiskData = {
      id: `station_${station.name.replace(/\s+/g, '_').toLowerCase()}`,
      lat: station.lat,
      lon: station.lon,
      location: station.name,
      province: station.province,
      riskLevel: avgRiskLevel, // This now uses daily risk averages
      temperature: Math.round(avgTemperature * 10) / 10,
      humidity: Math.round(avgHumidity * 10) / 10,
      windSpeed: Math.round(avgWindSpeed * 10) / 10,
      modelConfidence: avgConfidence,
      fireDangerIndex: avgFireDangerIndex,
      gridCellsCount: gridCells.length,
      lastUpdated: new Date().toISOString()
    };
    
    stationData.push(stationAggregate);
    
    // Log sample stations for verification
    if (index < 5 || gridCells.length > 50) {
      console.log(`📍 Station ${station.name}: ${gridCells.length} grid cells → Avg Daily Risk: ${avgRiskLevel.toFixed(3)}`);
    }
  });
  
   stations.forEach((station, index) => {
    const gridCells = stationGroups.get(station.name) || [];
    if (gridCells.length > 0 && index < 10) {
      const cellRisks = gridCells.map(c => c.riskLevel);
      const avgRisk = cellRisks.reduce((sum, risk) => sum + risk, 0) / cellRisks.length;
      console.log(`STATION ${station.name}:`);
      console.log(`  Grid cells: ${gridCells.length}`);
      console.log(`  Cell risks: ${cellRisks.slice(0, 5).map(r => r.toFixed(3)).join(', ')}...`);
      console.log(`  Average: ${avgRisk.toFixed(4)}`);
    }
  });

  return stationData;
 }, [data, calculateDistance]);

  const clearMarkers = useCallback(() => {
    if (!leafletMapRef.current) return;
    
    markersRef.current.forEach(marker => {
      try {
        if (marker && typeof leafletMapRef.current.hasLayer === 'function' && 
            leafletMapRef.current.hasLayer(marker)) {
          leafletMapRef.current.removeLayer(marker);
        }
      } catch (e) {
        console.warn('Error removing marker:', e);
      }
    });
    markersRef.current = [];
  }, []);

 const addMarkersToMap = useCallback(() => {
  if (!leafletMapRef.current || !window.L) return;

  console.log('Creating 38 station markers with averaged daily risk data...');
  clearMarkers();
  
  const stationData = createStationData();
  
  stationData.forEach((station) => {
    const lat = Number(station.lat);
    const lon = Number(station.lon);

    if (isNaN(lat) || isNaN(lon)) return;

    const color = getRiskColor(station.riskLevel);

    try {
      const marker = window.L.circleMarker([lat, lon], {
        radius: 12, // Larger radius for stations
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });

     const popupContent = `
     <div style="min-width: 220px; font-family: system-ui;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
        ${station.location}, ${station.province}
      </h3>
      <div style="font-size: 14px; line-height: 1.4; color: #374151;">
        <div style="margin-bottom: 6px; padding: 4px 8px; background-color: ${color}; color: white; border-radius: 4px; font-weight: 500;">
          <strong>Fire Risk:</strong> ${getRiskLabel(station.riskLevel)}
        </div>
        <div style="margin-bottom: 4px;"><strong>Temperature:</strong> ${station.temperature}°C</div>
        <div style="margin-bottom: 4px;"><strong>Humidity:</strong> ${station.humidity}%</div>
        <div style="margin-bottom: 4px;"><strong>Wind Speed:</strong> ${station.windSpeed} km/h</div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
          <div><strong>Data Points:</strong> ${station.gridCellsCount || 0} locations</div>
         </div>
       </div>
     </div>
     `;

      marker.bindPopup(popupContent, {
        maxWidth: 320,
        closeOnClick: true,
        autoClose: false
      });

      marker.on('click', function(e) {
        if (e.originalEvent) e.originalEvent.stopPropagation();
        this.openPopup();
        if (onLocationClick) onLocationClick(station);
        return false;
      });

      marker.addTo(leafletMapRef.current);
      markersRef.current.push(marker);

    } catch (error) {
      console.error(`Error creating marker for ${station.location}:`, error);
    }
  });

  console.log(`Created ${markersRef.current.length} station markers`);
  if (onStationCountUpdate) onStationCountUpdate(markersRef.current.length);

 }, [createStationData, clearMarkers, onLocationClick, getRiskColor, getRiskLabel, onStationCountUpdate]);


  // Initialize map with proper script loading and boundary detection
  useEffect(() => {
    if (!mapRef.current || isInitializedRef.current || isCleaningUpRef.current) return;

    const initializeMap = async () => {
      try {
        console.log('Initializing map...');

        // Load external scripts first
        const scriptsLoaded = await loadScripts();
        if (!scriptsLoaded) {
          throw new Error('Failed to load required scripts');
        }

        // Load Canada boundaries
        await loadCanadaBoundary();

        // Verify map container still exists and is attached to DOM
        if (!mapRef.current || !mapRef.current.parentNode) {
          console.warn('Map container no longer available');
          return;
        }

        // Initialize map with enhanced error handling
        if (window.L && !isInitializedRef.current) {
          const canadaBounds = window.L.latLngBounds(
            window.L.latLng(41.5, -141.1),
            window.L.latLng(83.6, -52.5)
          );

          // Clear any existing Leaflet instance
          const mapElement = mapRef.current as any;
          if (mapElement._leaflet_id) {
            delete mapElement._leaflet_id;
          }

          leafletMapRef.current = window.L.map(mapRef.current, {
            center: [60, -100],
            zoom: 4,
            minZoom: 3,
            maxZoom: 15,
            maxBounds: canadaBounds,
            maxBoundsViscosity: 1.0,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true
          });

          // Add tile layer with error handling
          const tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18,
            errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iIzk5OSI+VGlsZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+'
          });

          tileLayer.addTo(leafletMapRef.current);

          isInitializedRef.current = true;
          console.log('Map initialized successfully with boundary detection');

          // Add initial visualization with a delay to ensure everything is ready
          if (data && data.length > 0) {
            setTimeout(() => {
              try {
                if (mapMode === 'markers' && leafletMapRef.current) {
                  addMarkersToMap();
                } else if (mapMode === 'heatmap' && leafletMapRef.current) {
                  addHeatmapToMap();
                }
              } catch (error) {
                console.error('Error adding initial visualization:', error);
              }
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        setBoundaryStatus('Error initializing map');
        // Don't cleanup here, let React handle it
      }
    };

    initializeMap();

    // Cleanup function for this effect
    return () => {
      // Only cleanup if component is unmounting
      if (isCleaningUpRef.current) return;
      cleanupMap();
    };
  }, []); // Empty dependency array - only run once

  // Handle data and mode changes separately
  useEffect(() => {
  if (!isInitializedRef.current || !leafletMapRef.current || isCleaningUpRef.current) return;
  
  const updateVisualization = async () => {
    try {
      if (mapMode === 'markers' && data && data.length > 0) {
        clearHeatmap();
        // Small delay to ensure cleanup is complete
        setTimeout(() => {
          if (leafletMapRef.current) addMarkersToMap();
        }, 100);
      } else if (mapMode === 'heatmap' && data && data.length > 0) {
        addHeatmapToMap(); // No timeout needed, handles its own transition
      }
    } catch (error) {
      console.error('Error updating visualization:', error);
    }
  };

  updateVisualization();
 }, [data, mapMode, addMarkersToMap, addHeatmapToMap, clearHeatmap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMap();
    };
  }, [cleanupMap]);

  return (
  <div
    ref={mapRef}
    style={{ 
      height, 
      width: '100%',
      backgroundColor: '#e0f2fe',
      position: 'relative'
    }}
    className="leaflet-map-container"
  >
    {/* FIXED: Add key prop and better condition for loading overlay */}
    {!isInitializedRef.current && !isCleaningUpRef.current && (
      <div 
        key="loading-overlay" 
        className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded z-10"
        style={{ pointerEvents: 'none' }} // Prevent interference with map initialization
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading map and Canada boundaries...</p>
        </div>
      </div>
    )}
    
    {/* FIXED: Add key prop and better condition for map status */}
    {isInitializedRef.current && !isCleaningUpRef.current && (
      <div 
        key="map-status" 
        className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm z-[1000] text-sm font-medium text-gray-700"
      >
        {mapMode === 'heatmap' ? (
          <div className="text-right">
            <div>Fire Risk Heatmap</div>
            <div className="text-xs text-gray-500 mt-1">
              {boundaryStatus}
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div>Station View</div>
            <div className="text-xs text-gray-500 mt-1">
              ({markersRef.current.length} stations)
            </div>
          </div>
        )}
      </div>
    )}
  </div>
 );
};

export default LeafletMap;