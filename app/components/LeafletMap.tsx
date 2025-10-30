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
  userLocation?: { lat: number; lon: number; city?: string } | null;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  data,
  height = '700px',
  onLocationClick,
  mapMode = 'markers',
  onStationCountUpdate,
  userLocation
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const heatmapLayerRef = useRef<any>(null);
  const userLocationMarkerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const zoomListenerRef = useRef<any>(null);
  const scriptsLoadedRef = useRef(false);
  const [canadaGeoJSON, setCanadaGeoJSON] = useState<any>(null);
  const [boundaryStatus, setBoundaryStatus] = useState<string>('Loading boundaries...');

  const loadCanadaBoundary = useCallback(async () => {
    setBoundaryStatus('Loading Canada GeoJSON...');
    
    try {
      const sources = [
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
        'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/cultural/ne_110m_admin_0_countries.geojson'
      ];

      let canadaFeature = null;

      for (const url of sources) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          
          const worldData = await response.json();
          
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
        return canadaFeature;
      }

      const fallbackCanada = {
        type: "Feature",
        properties: { NAME: "Canada" },
        geometry: {
          type: "MultiPolygon",
          coordinates: [[
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

  const isInCanada = useCallback((lat: number, lon: number): boolean => {
    if (lat < 41.5 || lat > 83.6 || lon < -141.1 || lon > -52.5) {
      return false;
    }

    if (!canadaGeoJSON || !canadaGeoJSON.geometry) {
      return lat >= 42 && lat <= 83.5 && lon >= -141 && lon <= -53;
    }

    try {
      const point: [number, number] = [lon, lat];
      
      if (canadaGeoJSON.geometry.type === 'MultiPolygon') {
        for (const polygon of canadaGeoJSON.geometry.coordinates) {
          const exteriorRing = polygon[0];
          if (pointInPolygon(point, exteriorRing)) {
            let inHole = false;
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true;
                break;
              }
            }
            if (!inHole) {
              return true;
            }
          }
        }
        return false;
      } else if (canadaGeoJSON.geometry.type === 'Polygon') {
        const exteriorRing = canadaGeoJSON.geometry.coordinates[0];
        if (pointInPolygon(point, exteriorRing)) {
          for (let i = 1; i < canadaGeoJSON.geometry.coordinates.length; i++) {
            if (pointInPolygon(point, canadaGeoJSON.geometry.coordinates[i])) {
              return false;
            }
          }
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking point in Canada:', error);
      return lat >= 42 && lat <= 83.5 && lon >= -141 && lon <= -53;
    }
  }, [canadaGeoJSON, pointInPolygon]);

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

  const addUserLocationMarker = useCallback(() => {
    if (!leafletMapRef.current || !window.L || !userLocation) return;

    if (userLocationMarkerRef.current) {
      try {
        if (leafletMapRef.current.hasLayer(userLocationMarkerRef.current)) {
          leafletMapRef.current.removeLayer(userLocationMarkerRef.current);
        }
      } catch (e) {
        console.warn('Error removing user location marker:', e);
      }
      userLocationMarkerRef.current = null;
    }

    try {
      const userLocationGroup = window.L.layerGroup();

      const radarCircle = window.L.circle([userLocation.lat, userLocation.lon], {
        radius: 80000,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        color: '#2563eb',
        weight: 3,
        opacity: 0.7,
        interactive: false
      });

      const innerCircle = window.L.circle([userLocation.lat, userLocation.lon], {
        radius: 40000,
        fillColor: '#60a5fa',
        fillOpacity: 0.25,
        color: '#3b82f6',
        weight: 2,
        opacity: 0.8,
        interactive: false
      });

      const userMarker = window.L.circleMarker([userLocation.lat, userLocation.lon], {
        radius: 12,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 4,
        opacity: 1,
        fillOpacity: 1,
        zIndexOffset: 10000
      });

      userMarker.bindPopup(`
        <div style="min-width: 180px; font-family: system-ui;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
            📍 Your Location
          </h3>
          <div style="font-size: 12px; color: #374151;">
            <div style="margin-bottom: 4px;">${userLocation.city || 'Current Position'}</div>
          </div>
        </div>
      `);

      radarCircle.addTo(userLocationGroup);
      innerCircle.addTo(userLocationGroup);
      userMarker.addTo(userLocationGroup);

      userLocationGroup.addTo(leafletMapRef.current);
      userLocationMarkerRef.current = userLocationGroup;
    } catch (error) {
      console.error('Error adding user location marker:', error);
    }
  }, [userLocation]);

  const loadScripts = useCallback(async () => {
    if (scriptsLoadedRef.current) return true;

    try {
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(cssLink);
      }

      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

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

  const cleanupMap = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    try {
      if (leafletMapRef.current && zoomListenerRef.current) {
        try {
          leafletMapRef.current.off('zoomend', zoomListenerRef.current);
        } catch (e) {
          console.warn('Error removing zoom listener:', e);
        }
        zoomListenerRef.current = null;
      }

      if (userLocationMarkerRef.current && leafletMapRef.current) {
        try {
          if (leafletMapRef.current.hasLayer && leafletMapRef.current.hasLayer(userLocationMarkerRef.current)) {
            leafletMapRef.current.removeLayer(userLocationMarkerRef.current);
          }
        } catch (e) {
          console.warn('Error removing user location marker:', e);
        }
        userLocationMarkerRef.current = null;
      }

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

      if (leafletMapRef.current) {
        try {
          if (leafletMapRef.current.remove) {
            leafletMapRef.current.remove();
          }
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        leafletMapRef.current = null;
      }

      if (mapRef.current) {
        try {
          const mapElement = mapRef.current as any;
          if (mapElement._leaflet_id) {
            delete mapElement._leaflet_id;
          }
          if (mapRef.current.parentNode) {
            mapRef.current.innerHTML = '';
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

  const addHeatmapToMap = useCallback(() => {
    if (!leafletMapRef.current || !window.L) return;

    if (!data || data.length === 0) {
      setBoundaryStatus('No data available');
      return;
    }

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

    const canadianData = data.filter(point => {
      const lat = Number(point.lat);
      const lon = Number(point.lon);
      
      if (isNaN(lat) || isNaN(lon)) return false;
      return isInCanada(lat, lon);
    });

    const rectangleSize = 0.6;
    const halfSize = rectangleSize / 2;
    const rectanglesToAdd = [];

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
        interactive: false
      });

      rectanglesToAdd.push(rectangle);
    });

    requestAnimationFrame(() => {
      const layerGroup = window.L.layerGroup(rectanglesToAdd);
      layerGroup.addTo(leafletMapRef.current);
      
      markersRef.current = [layerGroup];

      setBoundaryStatus(`Coverage: ${rectanglesToAdd.length} areas`);
      if (onStationCountUpdate) onStationCountUpdate(rectanglesToAdd.length);
      
      if (userLocation) {
        requestAnimationFrame(() => addUserLocationMarker());
      }
    });
  }, [data, isInCanada, getRiskColor, onStationCountUpdate, userLocation, addUserLocationMarker]);

  const clearHeatmap = useCallback(() => {
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

  const createStationData = useCallback(() => {
    if (!data || data.length === 0) return [];
    
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

    const stationGroups = new Map<string, FireRiskData[]>();
    
    stations.forEach(station => {
      stationGroups.set(station.name, []);
    });
    
    data.forEach(gridCell => {
      const lat = Number(gridCell.lat);
      const lon = Number(gridCell.lon);
      
      if (isNaN(lat) || isNaN(lon)) return;
      
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
    
    const stationData: FireRiskData[] = [];
  
    stations.forEach((station) => {
      const gridCells = stationGroups.get(station.name) || [];
      
      let avgRiskLevel = 0.1;
      let avgTemperature = 15;
      let avgHumidity = 60;
      let avgWindSpeed = 10;
      let avgConfidence = 0.7;
      let avgFireDangerIndex = 0.3;
      
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
        riskLevel: Math.round(avgRiskLevel * 100) / 100, 
        temperature: Math.round(avgTemperature * 10) / 10,
        humidity: Math.round(avgHumidity * 10) / 10,
        windSpeed: Math.round(avgWindSpeed * 10) / 10,
        modelConfidence: avgConfidence,
        fireDangerIndex: avgFireDangerIndex,
        gridCellsCount: gridCells.length,
        lastUpdated: new Date().toISOString()
      };
      
      stationData.push(stationAggregate);
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

    clearMarkers();
    
    const stationData = createStationData();
    
    stationData.forEach((station) => {
      const lat = Number(station.lat);
      const lon = Number(station.lon);

      if (isNaN(lat) || isNaN(lon)) return;

      const color = getRiskColor(station.riskLevel);

      try {
        const marker = window.L.circleMarker([lat, lon], {
          radius: 10,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
          zIndexOffset: 100
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

    if (onStationCountUpdate) onStationCountUpdate(markersRef.current.length);
    
    if (userLocation) {
      requestAnimationFrame(() => addUserLocationMarker());
    }
  }, [createStationData, clearMarkers, onLocationClick, getRiskColor, getRiskLabel, onStationCountUpdate, userLocation, addUserLocationMarker]);

  useEffect(() => {
    if (!mapRef.current || isInitializedRef.current || isCleaningUpRef.current) return;

    const initializeMap = async () => {
      try {
        const scriptsLoaded = await loadScripts();
        if (!scriptsLoaded) {
          throw new Error('Failed to load required scripts');
        }

        await loadCanadaBoundary();

        if (!mapRef.current || !mapRef.current.parentNode) {
          return;
        }

        if (window.L && !isInitializedRef.current) {
          const canadaBounds = window.L.latLngBounds(
            window.L.latLng(41.5, -141.1),
            window.L.latLng(83.6, -52.5)
          );

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

          const tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
          });

          tileLayer.addTo(leafletMapRef.current);

          isInitializedRef.current = true;

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
      }
    };

    initializeMap();

    return () => {
      const cleanup = async () => {
        if (!isCleaningUpRef.current && leafletMapRef.current) {
          cleanupMap();
        }
      };
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isInitializedRef.current || !leafletMapRef.current || isCleaningUpRef.current) return;
    
    const updateVisualization = async () => {
      try {
        if (mapMode === 'markers' && data && data.length > 0) {
          clearHeatmap();
          setTimeout(() => {
            if (leafletMapRef.current) addMarkersToMap();
          }, 100);
        } else if (mapMode === 'heatmap' && data && data.length > 0) {
          addHeatmapToMap();
        }
      } catch (error) {
        console.error('Error updating visualization:', error);
      }
    };

    updateVisualization();
  }, [data, mapMode, addMarkersToMap, addHeatmapToMap, clearHeatmap]);

  useEffect(() => {
    if (isInitializedRef.current && leafletMapRef.current && userLocation) {
      setTimeout(() => {
        addUserLocationMarker(); 
      }, 200);
    }
  }, [userLocation, addUserLocationMarker, mapMode]);

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
      {!isInitializedRef.current && !isCleaningUpRef.current && (
        <div 
          key="loading-overlay" 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded z-10"
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading map and Canada boundaries...</p>
          </div>
        </div>
      )}
      
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