"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { MapPin, Layers, AlertTriangle, TrendingUp, Database, ExternalLink } from 'lucide-react';
import MapComponent from './Map';
import { useFireRiskData } from '../lib/api';
import { FireRiskData } from '../types';

const CACHE_KEY = 'fireRiskDataCache';
const CACHE_TIMESTAMP_KEY = 'fireRiskDataCacheTimestamp';

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

const StatisticsPanel: React.FC<{ data: FireRiskData[]; modelInfo: any; loading: boolean; userLocation: { lat: number; lon: number; city?: string } | null }> = ({ data, modelInfo, loading, userLocation }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return { veryHigh: 0, high: 0, medium: 0, low: 0, veryLow: 0 };
    return {
      veryHigh: data.filter(d => d.riskLevel >= 0.8).length,
      high: data.filter(d => d.riskLevel >= 0.6 && d.riskLevel < 0.8).length,
      medium: data.filter(d => d.riskLevel >= 0.4 && d.riskLevel < 0.6).length,
      low: data.filter(d => d.riskLevel >= 0.2 && d.riskLevel < 0.4).length,
      veryLow: data.filter(d => d.riskLevel < 0.2).length
    };
  }, [data]);

  return (
    <div className="rounded-lg shadow-lg backdrop-blur-sm p-6 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
      <div className="flex items-center mb-4">
        <TrendingUp className="w-5 h-5 mr-2 text-orange-700" />
        <h3 className="text-lg font-semibold text-amber-900">Risk Statistics</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200 shadow-sm">
          <div className="text-2xl font-bold text-red-600">{loading ? '...' : stats.veryHigh}</div>
          <div className="text-sm text-red-800">Very High</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{loading ? '...' : stats.high}</div>
          <div className="text-sm text-orange-800">High</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm">
          <div className="text-2xl font-bold text-yellow-700">{loading ? '...' : stats.medium}</div>
          <div className="text-sm text-yellow-800">Medium</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{loading ? '...' : stats.low + stats.veryLow}</div>
          <div className="text-sm text-green-800">Low</div>
        </div>
      </div>
      {modelInfo && (
        <div className="border-t border-amber-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-amber-800">Grid Locations:</span>
            <span className="font-medium text-amber-900">{data?.length || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-800">Location Tracking:</span>
            <span className={`font-medium ${userLocation ? 'text-green-600' : 'text-gray-500'}`}>
              {userLocation ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const Legend: React.FC = () => {
  const riskLevels = [
    { label: 'Very High', color: '#d32f2f', range: '80-100%' },
    { label: 'High', color: '#f57c00', range: '60-80%' },
    { label: 'Medium', color: '#fbc02d', range: '40-60%' },
    { label: 'Low', color: '#689f38', range: '20-40%' },
    { label: 'Very Low', color: '#388e3c', range: '0-20%' }
  ];
  return (
    <div className="rounded-lg shadow-lg backdrop-blur-sm p-4 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
      <h3 className="text-sm font-semibold text-amber-900 mb-3">Fire Risk Level</h3>
      <div className="space-y-2">
        {riskLevels.map((level, index) => (
          <div key={index} className="flex items-center text-sm">
            <div className="w-4 h-4 rounded mr-3 shadow-sm" style={{ backgroundColor: level.color }} />
            <span className="flex-1 text-amber-900">{level.label}</span>
            <span className="text-amber-700 text-xs">{level.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const HeatmapLegend: React.FC = () => (
  <div className="rounded-lg shadow-lg backdrop-blur-sm p-4 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
    <h3 className="text-sm font-semibold text-amber-900 mb-3">Heatmap Intensity</h3>
    <div className="mb-3">
      <div className="h-4 rounded shadow-sm" style={{ background: 'linear-gradient(to right, #388e3c 0%, #689f38 25%, #fbc02d 50%, #f57c00 75%, #d32f2f 100%)' }} />
      <div className="flex justify-between mt-1 text-xs text-amber-800">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
    <div className="text-xs text-amber-800 space-y-1">
      <p><strong className="text-amber-900">Coverage:</strong> Fire risk density across regions</p>
      <p><strong className="text-amber-900">Color Scale:</strong> Green (low) to Red (high risk)</p>
    </div>
  </div>
);

const HighRiskAreas: React.FC<{ data: FireRiskData[]; loading: boolean }> = ({ data, loading }) => {
  const recentAlerts = useMemo(() => {
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

    const stationGroups = new Map<string, FireRiskData[]>();
    stations.forEach(station => stationGroups.set(station.name, []));
    
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
    
    const stationAverages = stations.map(station => {
      const gridCells = stationGroups.get(station.name) || [];
      const avgRisk = gridCells.length > 0 
        ? gridCells.reduce((sum, cell) => sum + cell.riskLevel, 0) / gridCells.length 
        : 0.1;
      
      const displayPercent = Math.round(avgRisk * 100);
      const roundedRisk = displayPercent / 100;
      
      let riskLevel: string;
      let color: string;
      if (roundedRisk >= 0.8) {
        riskLevel = 'V.HIGH';
        color = 'red';
      } else if (roundedRisk >= 0.6) {
        riskLevel = 'HIGH';
        color = 'orange';
      } else if (roundedRisk >= 0.4) {
        riskLevel = 'MED';
        color = 'yellow';
      } else {
        riskLevel = 'LOW';
        color = 'green';
      }
      
      return {
        id: station.name,
        location: station.name,
        province: station.province,
        avgRisk: roundedRisk,
        riskLevel: riskLevel,
        message: `Average risk ${displayPercent}%`,
        color: color
      };
    });
    
    return stationAverages
      .sort((a, b) => b.avgRisk - a.avgRisk)
      .slice(0, 3)
      .filter(s => s.avgRisk >= 0.2);
  }, [data]);

  return (
    <div className="rounded-lg shadow-lg backdrop-blur-sm p-6 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
      <div className="flex items-center mb-4">
        <AlertTriangle className="w-5 h-5 mr-2 text-orange-700" />
        <h3 className="text-lg font-semibold text-amber-900">High Risk Areas</h3>
      </div>
      <div className="space-y-3">
        {loading ? <div className="text-center text-amber-700 py-4">Loading...</div> : 
        recentAlerts.length > 0 ? recentAlerts.map(alert => (
          <div key={alert.id} className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 shadow-sm ${
            alert.color === 'red' ? 'bg-red-50 border-red-500' : 
            alert.color === 'orange' ? 'bg-orange-50 border-orange-500' : 
            alert.color === 'yellow' ? 'bg-yellow-50 border-yellow-500' : 
            'bg-green-50 border-green-500'}`}>
            <div className={`font-bold text-xs ${
              alert.color === 'red' ? 'text-red-600' : 
              alert.color === 'orange' ? 'text-orange-600' : 
              alert.color === 'yellow' ? 'text-yellow-600' : 
              'text-green-600'}`}>{alert.riskLevel}</div>
            <div>
              <div className="text-sm font-medium text-gray-900">{alert.location}</div>
              <div className="text-xs text-gray-700">{alert.province}</div>
              <div className="text-xs text-gray-700">{alert.message}</div>
            </div>
          </div>
        )) : (
          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500 shadow-sm">
            <div className="text-green-600 font-bold text-xs">LOW</div>
            <div><div className="text-sm font-medium text-gray-900">All Areas</div><div className="text-xs text-gray-700">No high-risk areas detected</div></div>
          </div>
        )}
      </div>
    </div>
  );
};

const FireRiskDashboard: React.FC = () => {
  const { data, loading, error, lastUpdated, modelInfo } = useFireRiskData();
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap'>('markers');
  const [stationCount, setStationCount] = useState<number>(0);
  const [pendingMode, setPendingMode] = useState<'markers' | 'heatmap' | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; city?: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearestStations, setNearestStations] = useState<Array<{ station: FireRiskData; distance: number }>>([]);
  const [cachedData, setCachedData] = useState<FireRiskData[] | null>(null);
  const [showCachedWarning, setShowCachedWarning] = useState(false);

  // Load cached data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY);
      const cacheTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cached) {
        try {
          const parsedData = JSON.parse(cached);
          setCachedData(parsedData);
          if (cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age > 2 * 60 * 60 * 1000) {
              setShowCachedWarning(true);
            }
          }
        } catch (e) {
          console.error('Failed to parse cached data:', e);
        }
      }
    }
  }, []);

  // Cache data when it updates (store only essential fields to save space)
  useEffect(() => {
    if (data && data.length > 0 && typeof window !== 'undefined') {
      try {
        // Compress data by storing only essential fields
        const compressedData = data.map(item => ({
          id: item.id,
          lat: item.lat,
          lon: item.lon,
          riskLevel: item.riskLevel,
          location: item.location,
          province: item.province,
          temperature: item.temperature,
          humidity: item.humidity,
          windSpeed: item.windSpeed
        }));
        
        const dataString = JSON.stringify(compressedData);
        
        // Check if data size is reasonable (< 4MB to be safe)
        if (dataString.length < 4 * 1024 * 1024) {
          localStorage.setItem(CACHE_KEY, dataString);
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          setCachedData(data);
          setShowCachedWarning(false);
        } else {
          console.warn('Data too large to cache, skipping localStorage');
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded, clearing old cache');
          // Clear cache and try with compressed data only
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        } else {
          console.error('Failed to cache data:', e);
        }
      }
    }
  }, [data]);

  const displayData = data && data.length > 0 ? data : cachedData;
  
  const handleModeSwitch = (mode: 'markers' | 'heatmap') => {
    if (mode === mapMode) return;
    setMapMode(mode);
    setPendingMode(mode);
    setTimeout(() => setPendingMode(null), 1000);
  };

  useEffect(() => {
    console.log('Requesting geolocation...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Geolocation success:', position.coords);
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
          setUserLocation({ lat: userLat, lon: userLon });
          setLocationError(null);
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLon}`)
            .then(res => res.json())
            .then(data => {
              const city = data.address?.city || data.address?.town || data.address?.county || 'Your Location';
              setUserLocation(prev => prev ? { ...prev, city } : null);
            })
            .catch(() => {
              setUserLocation(prev => prev ? { ...prev, city: 'Your Location' } : null);
            });
        },
        (error) => {
          if (error && typeof error === 'object' && 'code' in error && error.code) {
            console.error('Geolocation error:', error);
            if (error.code === 1) {
              setLocationError('Location access denied');
            } else if (error.code === 2) {
              setLocationError('Location unavailable');
            } else if (error.code === 3) {
              setLocationError('Location request timeout');
            }
          } else {
            setLocationError('Location access denied');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      console.log('Geolocation not supported');
      setLocationError('Geolocation not supported');
    }
  }, []);

  useEffect(() => {
    if (displayData && displayData.length > 0 && userLocation) {
      const stationMap = new Map<string, FireRiskData>();
      displayData.forEach(point => {
        const key = `${point.lat},${point.lon}`;
        if (!stationMap.has(key) || point.riskLevel > stationMap.get(key)!.riskLevel) {
          stationMap.set(key, point);
        }
      });

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

      const stationsWithDistance = Array.from(stationMap.values()).map(station => ({
        station,
        distance: calculateDistance(userLocation.lat, userLocation.lon, station.lat, station.lon)
      }));

      const nearest = stationsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, 2);
      setNearestStations(nearest);
    }
  }, [displayData, userLocation]);

  const getTimeAgo = () => {
    if (!lastUpdated) {
      return 'Loading...';
    }
    
    const now = new Date();
    const updated = new Date(lastUpdated);
    const diffMs = now.getTime() - updated.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 2) return 'Updated moments ago';
    if (diffMinutes < 60) return `Updated ${diffMinutes} min ago`;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours === 1 && minutes === 0) return 'Updated 1 hour ago';
    if (hours === 1) return `Updated 1 hr ${minutes} min ago`;
    if (minutes === 0) return `Updated ${hours} hrs ago`;
    return `Updated ${hours} hrs ${minutes} min ago`;
  };
  
  const getUpdateStatus = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Find the last scheduled 2-hour mark
    const lastScheduledHour = Math.floor(currentHour / 2) * 2;
    
    // Calculate minutes since last scheduled update
    const hoursSinceScheduled = currentHour - lastScheduledHour;
    const minutesSinceScheduled = hoursSinceScheduled * 60 + currentMinute;
    
    // If we're within 12 minutes of a scheduled update, show "updating soon" message
    if (minutesSinceScheduled <= 12 && loading) {
      return {
        status: 'updating',
        message: 'Processing latest data...'
      };
    }
    
    // Otherwise show normal status
    return {
      status: loading ? 'loading' : error ? 'error' : 'updated',
      message: error ? 'Connection issue' : getTimeAgo()
    };
  };
  
  const updateStatus = getUpdateStatus();

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return new Date().toLocaleDateString('en-CA');
    return new Date(timestamp).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FFF8DC 0%, #FFE4B5 50%, #FFDAB9 100%)' }}>
      <style jsx global>{`
        /* Custom scrollbar styling for sidebar */
        .sidebar-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: rgba(218, 165, 32, 0.1);
          border-radius: 10px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(218, 165, 32, 0.5);
          border-radius: 10px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(218, 165, 32, 0.7);
        }
      `}</style>
      <header className="shadow-md backdrop-blur-sm" style={{ backgroundColor: 'rgba(255, 218, 155, 0.7)', borderBottom: '2px solid rgba(218, 165, 32, 0.4)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4" style={{ color: '#8B4513', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
              Forest Fire Risk Predictor
            </h1>
            <p className="text-base sm:text-lg max-w-3xl mx-auto font-medium" style={{ color: '#A0522D' }}>
              Real-time fire risk monitoring across Canada
            </p>
            <div className="mt-6 flex items-center justify-center space-x-2">
              <Database className="w-5 h-5 text-amber-800" />
              <span className="text-sm text-amber-800">Environment and Climate Change Canada Data</span>
            </div>
            {showCachedWarning && (
              <div className="mt-4 inline-block bg-yellow-100 border border-yellow-300 rounded px-3 py-1 text-xs text-yellow-800">
                Showing cached data - refreshing...
              </div>
            )}
          </div>
        </div> 
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-lg shadow-lg backdrop-blur-sm p-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-amber-900">Canada Fire Risk Map</h2>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                        updateStatus.status === 'updating' ? 'bg-blue-500 animate-pulse' :
                        updateStatus.status === 'loading' ? 'bg-yellow-500 animate-pulse' : 
                        updateStatus.status === 'error' ? 'bg-red-500' : 
                        'bg-green-500'
                      }`}></div>
                      <span className="text-xs text-amber-900 font-medium leading-none flex items-center h-2.5">
                        {updateStatus.message}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center rounded-lg p-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                    <button onClick={() => handleModeSwitch('markers')} className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${mapMode === 'markers' || pendingMode === 'markers' ? 'bg-white text-blue-700 shadow-md' : 'text-amber-800 hover:text-amber-900'}`}>
                      <MapPin className="w-4 h-4 mr-1" />Markers
                    </button>
                    <button onClick={() => handleModeSwitch('heatmap')} className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${mapMode === 'heatmap' || pendingMode === 'heatmap' ? 'bg-white text-orange-700 shadow-md' : 'text-amber-800 hover:text-amber-900'}`}>
                      <Layers className="w-4 h-4 mr-1" />Heatmap
                    </button>
                  </div>
                </div>
                <p className="text-amber-800 text-sm">
                  {mapMode === 'markers' ? 'Click markers to view detailed station risk information and weather conditions.' : 'Heat zones show fire risk density and intensity across Canadian regions.'}
                </p>
              </div>
              <MapComponent height="600px" className="border-2 border-amber-300 rounded-lg shadow-md" data={displayData || []} mapMode={mapMode} onStationCountUpdate={setStationCount} userLocation={userLocation} />
            </div>

            <div className="rounded-lg shadow-lg backdrop-blur-sm p-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
              <h3 className="text-lg font-semibold text-amber-900 mb-4">National Risk Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="text-2xl font-bold text-amber-900">{displayData ? displayData.length.toLocaleString() : '0'}</div>
                  <div className="text-xs text-amber-800 mt-1">Grid Cells Monitored</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg shadow-sm border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{stationCount}</div>
                  <div className="text-xs text-blue-800 mt-1">Weather Stations</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg shadow-sm border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{displayData ? Math.round((displayData.filter(d => d.riskLevel < 0.4).length / displayData.length) * 100) : 0}%</div>
                  <div className="text-xs text-green-800 mt-1">Low Risk Areas</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg shadow-sm border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">{displayData ? Math.round((displayData.filter(d => d.riskLevel >= 0.6).length / displayData.length) * 100) : 0}%</div>
                  <div className="text-xs text-orange-800 mt-1">High Risk Areas</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg shadow-lg backdrop-blur-sm p-5" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
              <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center">
                <ExternalLink className="w-5 h-5 mr-2 text-orange-700" />
                Official Resources & Updates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a href="https://cwfis.cfs.nrcan.gc.ca/home" target="_blank" rel="noopener noreferrer"
                   className="group flex items-start p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl hover:shadow-lg transition-all duration-200 border border-red-200 hover:border-red-300">
                  <div className="flex-shrink-0 w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow mr-3">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-red-700 transition-colors">Canadian Wildland Fire Info</div>
                    <div className="text-xs text-gray-700 leading-relaxed">National fire maps, forecasts & satellite data</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors flex-shrink-0 ml-2 mt-1" />
                </a>

                <a href="https://natural-resources.canada.ca/forest-forestry/wildland-fires/wildland-fires" target="_blank" rel="noopener noreferrer"
                   className="group flex items-start p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl hover:shadow-lg transition-all duration-200 border border-orange-200 hover:border-orange-300">
                  <div className="flex-shrink-0 w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow mr-3">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-orange-700 transition-colors">Natural Resources Canada</div>
                    <div className="text-xs text-gray-700 leading-relaxed">Wildfire research & national coordination</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-colors flex-shrink-0 ml-2 mt-1" />
                </a>

                <a href="https://www.canada.ca/en/health-canada/services/publications/healthy-living/how-prepare-wildfire-smoke.html" target="_blank" rel="noopener noreferrer"
                   className="group flex items-start p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl hover:shadow-lg transition-all duration-200 border border-yellow-200 hover:border-yellow-300">
                  <div className="flex-shrink-0 w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow mr-3">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-amber-700 transition-colors">Government of Canada</div>
                    <div className="text-xs text-gray-700 leading-relaxed">National wildfire weather & safety info</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors flex-shrink-0 ml-2 mt-1" />
                </a>

                <a href="https://www.canada.ca/en/public-safety-canada/campaigns/wildfires/prov.html" target="_blank" rel="noopener noreferrer"
                   className="group flex items-start p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl hover:shadow-lg transition-all duration-200 border border-blue-200 hover:border-blue-300">
                  <div className="flex-shrink-0 w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow mr-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-blue-700 transition-colors">Provincial Wildfire Resources</div>
                    <div className="text-xs text-gray-700 leading-relaxed">Regional fire updates & local emergency info</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-2 mt-1" />
                </a>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-300 flex items-center justify-center">
                <div className="flex items-center space-x-2 text-sm bg-red-50 px-4 py-2 rounded-lg border border-red-300 shadow-sm">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 15.284 3 7V6z" />
                  </svg>
                  <span className="font-semibold text-red-900">Emergency: Dial 911</span>
                  <span className="text-gray-700">for immediate fire threats</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 sidebar-scroll" style={{ position: 'sticky', top: '20px', alignSelf: 'flex-start', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', paddingRight: '4px' }}>
            <div className="space-y-6">
            {userLocation && nearestStations.length > 0 && (
              <div className="rounded-lg shadow-lg backdrop-blur-sm p-6 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
                <div className="flex items-center mb-4">
                  <MapPin className="w-5 h-5 mr-2 text-orange-700" />
                  <h3 className="text-lg font-semibold text-amber-900">Nearest Stations</h3>
                </div>
                <div className="mb-3 pb-3 border-b border-amber-200">
                  <div className="text-sm text-amber-800">
                    <span className="font-medium">📍 {userLocation.city || 'Your Location'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {nearestStations.map((item, index) => {
                    const roundedRisk = Math.round(item.station.riskLevel * 100) / 100;
                    const riskColor = getRiskColor(roundedRisk);
                    return (
                      <div key={index} className="p-3 rounded-lg shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm text-amber-900">{item.station.location}</div>
                          <div className="text-xs text-orange-700 font-semibold">{Math.round(item.distance)} km</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-amber-800">{item.station.province}</div>
                          <div className="text-xs px-2 py-1 rounded" style={{ 
                            backgroundColor: riskColor + '20',
                            color: riskColor,
                            fontWeight: 600
                          }}>
                            {Math.round(item.station.riskLevel * 100)}% Risk
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {locationError && !userLocation && (
              <div className="rounded-lg shadow-lg backdrop-blur-sm p-4 mb-6" style={{ backgroundColor: 'rgba(254, 243, 199, 0.9)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div className="flex items-center text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Enable location to see nearest stations</span>
                </div>
              </div>
            )}
            <StatisticsPanel data={displayData || []} modelInfo={modelInfo} loading={loading} userLocation={userLocation} />
            {mapMode === 'heatmap' ? <HeatmapLegend /> : <Legend />}
            <HighRiskAreas data={displayData || []} loading={loading} />
            <div className="rounded-lg shadow-lg backdrop-blur-sm p-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
              <h3 className="text-lg font-semibold text-amber-900 mb-4">About the System</h3>
              <div className="text-sm text-amber-800 space-y-3">
                <p className="font-medium text-amber-900">Canadian Fire Weather Index</p>
                <p className="text-xs leading-relaxed">Official algorithm from Environment and Climate Change Canada using 45-day historical weather accumulation to calculate fire danger indices.</p>
                <div className="pt-3 border-t border-amber-200">
                  <p className="font-medium mb-2 text-amber-900">Key Components:</p>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-start"><span className="text-orange-600 mr-2">•</span><span>Fine Fuel Moisture Code (FFMC)</span></li>
                    <li className="flex items-start"><span className="text-orange-600 mr-2">•</span><span>Duff Moisture Code (DMC)</span></li>
                    <li className="flex items-start"><span className="text-orange-600 mr-2">•</span><span>Drought Code (DC)</span></li>
                    <li className="flex items-start"><span className="text-orange-600 mr-2">•</span><span>Buildup & Spread Indices</span></li>
                  </ul>
                </div>
                <div className="text-xs pt-3 border-t border-amber-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-amber-800">Grid Locations:</span>
                    <span className="font-medium text-amber-900">{displayData?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-800">Weather Stations:</span>
                    <span className="font-medium text-amber-900">{stationCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-800">Update Schedule:</span>
                    <span className="font-medium text-amber-900">Every 2 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-800">Processing Time:</span>
                    <span className="font-medium text-amber-900">5-12 minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      
      <footer className="shadow-inner mt-16" style={{ backgroundColor: 'rgba(139, 69, 19, 0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-amber-100">
              © 2025 Forest Fire Risk Predictor | Canadian Fire Weather Index System
            </p>
            <p className="text-xs text-amber-200 mt-2">
              Data: Environment and Climate Change Canada • Natural Resources Canada
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default FireRiskDashboard;