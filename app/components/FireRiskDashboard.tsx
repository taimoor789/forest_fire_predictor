"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, Layers, AlertTriangle, TrendingUp, ExternalLink } from 'lucide-react';
import MapComponent from './Map';
import { useFireRiskData } from '../lib/api';
import { FireRiskData } from '../types';
import Image from 'next/image';
import { CANADIAN_STATIONS } from '../lib/constants/stations';
import { getRiskColor, getRiskLabel } from '../lib/utils/colours';
import { calculateDistance } from '../lib/utils/geo';
import { theme } from '../lib/constants/theme';
import { logger } from '../lib/utils/logger';


const StatisticsPanel: React.FC<{ data: FireRiskData[]; modelInfo: any; shouldShowSkeleton: boolean; userLocation: { lat: number; lon: number; city?: string } | null }> = ({ data, modelInfo, shouldShowSkeleton, userLocation }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return { extreme: 0, veryHigh: 0, high: 0, moderate: 0, low: 0, veryLow: 0 }; 
    
    return {
      extreme: data.filter(d => d.riskLevel >= 30).length,
      veryHigh: data.filter(d => d.riskLevel >= 18 && d.riskLevel < 30).length,
      high: data.filter(d => d.riskLevel >= 8 && d.riskLevel < 18).length,
      moderate: data.filter(d => d.riskLevel >= 4 && d.riskLevel < 8).length,
      low: data.filter(d => d.riskLevel >= 2 && d.riskLevel < 4).length,
      veryLow: data.filter(d => d.riskLevel < 2).length
    };
  }, [data]);

  return (
    <div className="rounded-lg shadow-lg backdrop-blur-sm p-6 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
      <div className="flex items-center mb-4">
        <TrendingUp className="w-5 h-5 mr-2 text-orange-700" />
        <h3 className="text-lg font-semibold text-amber-900">FWI Distribution</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200 shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{shouldShowSkeleton ? '...' : stats.extreme}</div>
          <div className="text-sm text-purple-800">Extreme</div>
          <div className="text-xs text-purple-600 mt-1">FWI 30+</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200 shadow-sm">
          <div className="text-2xl font-bold text-red-600">{shouldShowSkeleton ? '...' : stats.veryHigh}</div>
          <div className="text-sm text-red-800">Very High</div>
          <div className="text-xs text-red-600 mt-1">FWI 18-30</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{shouldShowSkeleton ? '...' : stats.high}</div>
          <div className="text-sm text-orange-800">High</div>
          <div className="text-xs text-orange-600 mt-1">FWI 8-18</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm">
          <div className="text-2xl font-bold text-yellow-700">{shouldShowSkeleton ? '...' : stats.moderate}</div>
          <div className="text-sm text-yellow-800">Moderate</div>
          <div className="text-xs text-yellow-700 mt-1">FWI 4-8</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{shouldShowSkeleton ? '...' : stats.low + stats.veryLow}</div>
          <div className="text-sm text-green-800">Low</div>
          <div className="text-xs text-green-600 mt-1">FWI 0-4</div>
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
  const dangerClasses = [
    { label: 'Extreme', color: '#9C27B0', range: 'FWI 30+' },
    { label: 'Very High', color: '#F44336', range: 'FWI 18-30' },
    { label: 'High', color: '#FF9800', range: 'FWI 8-18' },
    { label: 'Moderate', color: '#FFEB3B', range: 'FWI 4-8' },
    { label: 'Low', color: '#8BC34A', range: 'FWI 2-4' },
    { label: 'Very Low', color: '#4CAF50', range: 'FWI 0-2' }
  ];
  
  return (
    <div className="rounded-lg shadow-lg backdrop-blur-sm p-4 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
      <h3 className="text-sm font-semibold text-amber-900 mb-3">Fire Danger Class</h3>
      <div className="space-y-2">
        {dangerClasses.map((level, index) => (
        <div key={index} className="flex items-center text-sm" role="listitem">
          <div 
            className="w-4 h-4 rounded mr-3 shadow-sm" 
            style={{ backgroundColor: level.color }}
            aria-label={`Danger class color: ${level.color}`}
          />
          <span className="flex-1 text-amber-900">{level.label}</span>
          <span className="text-amber-700 text-xs">{level.range}</span>
        </div>
      ))}
      </div>
      <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-amber-800">
        <strong>Note:</strong> FWI measures fire behavior potential (spread rate, intensity) if ignition occurs
      </div>
    </div>
  );
};

const HeatmapLegend: React.FC = () => (
  <div className="rounded-lg shadow-lg backdrop-blur-sm p-4 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
    <h3 className="text-sm font-semibold text-amber-900 mb-3">Heatmap Intensity</h3>
    <div className="mb-3">
      <div className="h-4 rounded shadow-sm" style={{ background: 'linear-gradient(to right, #4CAF50 0%, #8BC34A 17%, #FFEB3B 33%, #FF9800 50%, #F44336 67%, #9C27B0 100%)' }} />
      <div className="flex justify-between mt-1 text-xs text-amber-800">
        <span>Low FWI</span>
        <span>Moderate FWI</span>
        <span>High FWI</span>
      </div>
    </div>
    <div className="text-xs text-amber-800 space-y-1">
      <p><strong className="text-amber-900">Coverage:</strong> Fire danger density across regions</p>
      <p><strong className="text-amber-900">Color Scale:</strong> Green (FWI 0-2) to Purple (FWI 30+)</p>
    </div>
  </div>
);

const HighRiskAreas: React.FC<{ data: FireRiskData[]; shouldShowSkeleton: boolean }> = ({ data, shouldShowSkeleton }) => {
  const recentAlerts = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const stations = CANADIAN_STATIONS;

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
      const avgFWI = gridCells.length > 0 
        ? gridCells.reduce((sum, cell) => sum + cell.riskLevel, 0) / gridCells.length 
        : 0;
      
      // Round FWI to 1 decimal place
      const roundedFWI = Math.round(avgFWI * 10) / 10;
      
      // Determine danger class from FWI
      let dangerClass: string;
      let color: string;
      if (roundedFWI >= 30) {
        dangerClass = 'EXTREME';
        color = 'purple';
      } else if (roundedFWI >= 18) {
        dangerClass = 'V.HIGH';
        color = 'red';
      } else if (roundedFWI >= 8) {
        dangerClass = 'HIGH';
        color = 'orange';
      } else if (roundedFWI >= 4) {
        dangerClass = 'MOD';
        color = 'yellow';
      } else if (roundedFWI >= 2) {
        dangerClass = 'LOW';
        color = 'lightgreen';
      } else {
        dangerClass = 'V.LOW';
        color = 'green';
      }
      
      return {
        id: station.name,
        location: station.name,
        province: station.province,
        avgFWI: roundedFWI,
        dangerClass: dangerClass,
        message: `Average FWI ${roundedFWI.toFixed(1)}`,
        color: color
      };
    });
    
    return stationAverages
      .sort((a, b) => b.avgFWI - a.avgFWI)
      .slice(0, 3)
      .filter(s => s.avgFWI >= 4);  // Only show Moderate or higher
  }, [data]);

  return (
    <div className="rounded-lg shadow-lg backdrop-blur-sm p-6 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
      <div className="flex items-center mb-4">
        <AlertTriangle className="w-5 h-5 mr-2 text-orange-700" />
        <h3 className="text-lg font-semibold text-amber-900">High Danger Areas</h3>
      </div>
      <div className="space-y-3">
        {shouldShowSkeleton ? <div className="text-center text-amber-700 py-4">Loading...</div> : 
        recentAlerts.length > 0 ? recentAlerts.map(alert => (
          <div key={alert.id} className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 shadow-sm ${
            alert.color === 'purple' ? 'bg-purple-50 border-purple-500' :
            alert.color === 'red' ? 'bg-red-50 border-red-500' : 
            alert.color === 'orange' ? 'bg-orange-50 border-orange-500' : 
            alert.color === 'yellow' ? 'bg-yellow-50 border-yellow-500' : 
            alert.color === 'lightgreen' ? 'bg-green-50 border-green-400' :
            'bg-green-50 border-green-500'}`}>
            <div className={`font-bold text-xs ${
              alert.color === 'purple' ? 'text-purple-600' :
              alert.color === 'red' ? 'text-red-600' : 
              alert.color === 'orange' ? 'text-orange-600' : 
              alert.color === 'yellow' ? 'text-yellow-600' : 
              alert.color === 'lightgreen' ? 'text-green-500' :
              'text-green-600'}`}>{alert.dangerClass}</div>
            <div>
              <div className="text-sm font-medium text-gray-900">{alert.location}</div>
              <div className="text-xs text-gray-700">{alert.province}</div>
              <div className="text-xs text-gray-700">{alert.message}</div>
            </div>
          </div>
        )) : (
          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500 shadow-sm">
            <div className="text-green-600 font-bold text-xs">V.LOW</div>
            <div><div className="text-sm font-medium text-gray-900">All Areas</div><div className="text-xs text-gray-700">No high danger areas detected</div></div>
          </div>
        )}
      </div>
    </div>
  );
};

const FireRiskDashboard: React.FC = () => {
  const { data, loading, error, lastUpdated, modelInfo } = useFireRiskData();
  const shouldShowSkeleton = loading && (!data || data.length === 0);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const prevLastUpdatedRef = useRef<string | null>(null);

  const LOCATION_STORAGE_KEY = 'userLocation';
  const LOCATION_TIMESTAMP_KEY = 'userLocationTimestamp';

  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; city?: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap'>('markers');
  const [stationCount, setStationCount] = useState<number>(0);
  const [pendingMode, setPendingMode] = useState<'markers' | 'heatmap' | null>(null);

  const [nearestStations, setNearestStations] = useState<Array<{ station: FireRiskData; distance: number }>>([]);
  const locationRequestedRef = useRef(false);
  const hasSetLocationRef = useRef(false);

  const displayData = useMemo(() => {
   return data && data.length > 0 ? data : [];
  }, [data]);
  
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const handleModeSwitch = (mode: 'markers' | 'heatmap') => {
  if (mode === mapMode || isSwitchingMode) return;
    setIsSwitchingMode(true);
    setMapMode(mode);
    setPendingMode(mode);
    setTimeout(() => {
      setPendingMode(null);
      setIsSwitchingMode(false);
    }, 2000); 
  };

 useEffect(() => {
  const loadCachedLocation = () => {
    try {
      const cached = localStorage.getItem(LOCATION_STORAGE_KEY);
      const timestamp = localStorage.getItem(LOCATION_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < 7 * 24 * 60 * 60 * 1000) {
          const loc = JSON.parse(cached);
          if (loc.city && loc.city !== 'Your Location') {
            setUserLocation(loc);
            logger.info('Using cached location:', loc.city);
            return true;
          }
        }
      }
    } catch (e) {
      logger.warn('Failed to load cached location:', e);
    }
    return false;
  };

  if (loadCachedLocation()) {
    return;
  }

  if (!navigator.geolocation) {
    setLocationError('Geolocation not supported');
    setLocationEnabled(false);
    return;
  }

  logger.info('Requesting fresh location...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;
      
      logger.info(`Location: ${userLat}, ${userLon}`);
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLon}`,
          { headers: { 'User-Agent': 'FireRiskDashboard/1.0' } }
        );
        
        if (!response.ok) throw new Error('Geocoding failed');
        
        const data = await response.json();
        const city = data.address?.city || data.address?.town || data.address?.county || 'Unknown';
        const province = data.address?.state || '';
        const displayName = province ? `${city}, ${province}` : city;
        
        const location = { lat: userLat, lon: userLon, city: displayName };
        
        setUserLocation(location);
        setLocationError(null);
        setLocationEnabled(true);
        
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
        localStorage.setItem(LOCATION_TIMESTAMP_KEY, Date.now().toString());
        
        logger.info(`Location set: ${displayName}`);
      } catch (err) {
        logger.warn('Geocoding failed, using coordinates:', err);
        
        const location = { 
          lat: userLat, 
          lon: userLon, 
          city: `${userLat.toFixed(2)}°, ${userLon.toFixed(2)}°` 
        };
        
        setUserLocation(location);
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
        localStorage.setItem(LOCATION_TIMESTAMP_KEY, Date.now().toString());
      }
    },
    (error) => {
      logger.error('Geolocation error:', error);
      setLocationError('Location unavailable');
      setLocationEnabled(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0 
    }
  );
 }, []);  

 useEffect(() => {
  if (displayData && displayData.length > 0 && userLocation) {
    const stationsWithDistance = displayData.map(gridCell => ({
      station: gridCell,
      distance: calculateDistance(userLocation.lat, userLocation.lon, gridCell.lat, gridCell.lon)
    }));
    const nearest = stationsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);
    
    setNearestStations(nearest);
  } else {
    setNearestStations([]); 
  }
 }, [displayData, userLocation]);

 const formatUpdateTime = (lastUpdatedTime: string | null): string => {
  if (!lastUpdatedTime) return '';
  
  try {
    const updated = new Date(lastUpdatedTime);
    
    if (isNaN(updated.getTime())) return '';
    
    const hours = updated.getHours();
    const minutes = updated.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
  } catch {
    return '';
  }
};

 const [updateTimeDisplay, setUpdateTimeDisplay] = useState<string>(() => formatUpdateTime(lastUpdated));

 useEffect(() => {
  setUpdateTimeDisplay(formatUpdateTime(lastUpdated));
}, [lastUpdated]);

 const getUpdateStatus = () => {
  if (loading) {
    return { status: 'loading', message: 'Loading latest data...' };
  }
  
  if (error) {
    return { status: 'error', message: 'Connection issue' };
  }
  
  if (!lastUpdated || !updateTimeDisplay) {
    return { status: 'updated', message: 'Ready' };
  }
  
  return {
    status: 'updated',
    message: `Last updated: ${updateTimeDisplay}`
  };
};

useEffect(() => {
  if (!lastUpdated || loading) {
    return;
  }

  if (prevLastUpdatedRef.current && prevLastUpdatedRef.current !== lastUpdated) {
    logger.info(prevLastUpdatedRef.current, lastUpdated);
    setShowUpdateNotification(true);
    setTimeout(() => setShowUpdateNotification(false), 3000);
  }

  prevLastUpdatedRef.current = lastUpdated;
}, [lastUpdated, loading]);

const updateStatus = getUpdateStatus();

  return (
    <main className="min-h-screen" style={{ background: theme.gradients.pageBackground }}>
      {showUpdateNotification && (
      <div 
        className="fixed top-24 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in"
        style={{ 
          animation: 'slideIn 0.3s ease-out',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)'
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">Data updated with latest FWI calculations</span>
      </div>
    )}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
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

      <header className="shadow-md backdrop-blur-sm" style={theme.styles.header}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center">
            <div className="hidden sm:flex items-center justify-self-start" style={theme.styles.logo}>
              <Image 
                src="/assets/logo/ffp-logo.svg" 
                alt="FFP Logo" 
                width={180}
                height={50}
                className="h-22 w-auto"
                priority
                style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))' }}
              />
            </div>
            <div className="text-center justify-self-center mt-2 sm:mt-0 sm:col-start-2 sm:flex sm:flex-col sm:justify-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight whitespace-nowrap leading-tight mb-3" style={theme.styles.title}>
                Canadian Fire Weather Index
              </h1>
              <p className="text-xs sm:text-sm md:text-base font-medium max-w-3xl mx-auto" style={theme.styles.subtitle}>
                Real-time fire danger monitoring across Canada
              </p>
            </div>
            <div className="hidden sm:block sm:col-start-3" />
          </div>
        </div>
      </header>
            
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-lg shadow-lg backdrop-blur-sm p-6 mb-6" style={theme.styles.panel}>
              <div className="mb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3 gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-amber-900">Canada Fire Danger Map</h2>
                  <div className="flex items-center space-x-2">
                    {updateTimeDisplay && (
                      <div 
                        className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                          updateStatus.status === 'loading' ? 'bg-yellow-500 animate-pulse' : 
                          updateStatus.status === 'error' ? 'bg-red-500' : 
                          'bg-green-500'
                        }`}
                        role="status"
                        aria-label={`Data status: ${updateStatus.message}`}
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs text-amber-800 font-medium">
                        {updateStatus.message}
                      </span>
                      {!loading && lastUpdated && (
                        <span className="text-xs text-amber-600 italic">
                          Updates hourly (~:05)
                        </span>
                      )}
                    </div>
                  </div>
                  </div>
                  <div className="flex items-center rounded-lg p-1" style={theme.styles.mapControlsBg}>
                    <button 
                    onClick={() => handleModeSwitch('markers')}
                    aria-label="Switch to marker view"
                    aria-pressed={mapMode === 'markers'}
                    className={`flex items-center px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${mapMode === 'markers' || pendingMode === 'markers' ? 'bg-white text-blue-700 shadow-md' : 'text-amber-800 hover:text-amber-900'}`}
                  >
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span>Markers</span>
                  </button>

                  <button 
                    onClick={() => handleModeSwitch('heatmap')}
                    disabled={isSwitchingMode}
                    aria-label="Switch to heatmap view"
                    aria-pressed={mapMode === 'heatmap'}
                    className={`flex items-center px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      mapMode === 'heatmap' || pendingMode === 'heatmap' 
                        ? 'bg-white text-orange-700 shadow-md' 
                        : 'text-amber-800 hover:text-amber-900'
                    } ${isSwitchingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span>{isSwitchingMode && pendingMode === 'heatmap' ? 'Loading...' : 'Heatmap'}</span>
                  </button>
                  </div>
                </div>
                <p className="text-amber-800 text-sm">
                  {mapMode === 'markers' ? 'Click markers to view FWI values and danger classifications.' : 'Heat zones show fire danger intensity across Canadian regions.'}
                </p>
              </div>
             <MapComponent 
                key={`map-${lastUpdated || 'initial'}`} 
                height="600px" 
                className="border-2 border-amber-300 rounded-lg shadow-md" 
                data={displayData || []} 
                mapMode={mapMode} 
                onStationCountUpdate={setStationCount} 
                userLocation={userLocation} 
              />
            </div>

            <div className="rounded-lg shadow-lg backdrop-blur-sm p-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
              <h3 className="text-lg font-semibold text-amber-900 mb-4">National FWI Overview</h3>
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
                  <div className="text-2xl font-bold text-green-600">{displayData ? Math.round((displayData.filter(d => d.riskLevel < 4).length / displayData.length) * 100) : 0}%</div>
                  <div className="text-xs text-green-800 mt-1">Low Danger (FWI &lt;4)</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg shadow-sm border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">{displayData ? Math.round((displayData.filter(d => d.riskLevel >= 8).length / displayData.length) * 100) : 0}%</div>
                  <div className="text-xs text-orange-800 mt-1">High Danger (FWI ≥8)</div>
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

          <div className="lg:col-span-1 sidebar-scroll" style={theme.styles.sidebarScroll}>
            <div className="space-y-6">
            {userLocation && nearestStations.length > 0 && (
            <div className="rounded-lg shadow-lg backdrop-blur-sm p-6 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
              <div className="flex items-center mb-4">
                <MapPin className="w-5 h-5 mr-2 text-orange-700" />
                <h3 className="text-lg font-semibold text-amber-900">Nearest Stations</h3>
              </div>
              <div className="mb-3 pb-3 border-b border-amber-200">
                <div className="text-sm text-amber-800">
                  <div className="font-medium flex items-center">
                    <span className="mr-1">📍</span>
                    {userLocation.city && userLocation.city !== 'Your Location' ? (
                      <span>{userLocation.city}</span>
                    ) : (
                      <span className="italic text-amber-600">Locating...</span>
                    )}
                  </div>
                  {userLocation.city === 'Your Location' && (
                    <div className="text-xs text-amber-600 mt-1">
                      {userLocation.lat.toFixed(2)}°N, {Math.abs(userLocation.lon).toFixed(2)}°W
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {nearestStations.map((item, index) => {
                  const fwi = item.station.riskLevel;
                  const riskColor = getRiskColor(fwi);
                  const dangerClass = getRiskLabel(fwi);
                  return (
                    <div key={index} className="p-3 rounded-lg shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm text-amber-900">{item.station.location}</div>
                        <div className="text-xs text-orange-700 font-semibold">{Math.round(item.distance)} km</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-amber-800">{item.station.province}</div>
                        <div 
                          className="text-xs px-2 py-1 rounded flex items-center gap-1" 
                          style={{ 
                            backgroundColor: riskColor + '20',
                            color: riskColor,
                            fontWeight: 600
                          }}
                          role="status"
                          aria-label={`Fire danger: ${dangerClass}, FWI ${fwi.toFixed(1)}`}
                        >
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: riskColor }}
                            aria-hidden="true"
                          />
                          FWI {fwi.toFixed(1)} - {dangerClass}
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
            <StatisticsPanel data={displayData || []} modelInfo={modelInfo} shouldShowSkeleton={shouldShowSkeleton} userLocation={userLocation} />
            {mapMode === 'heatmap' ? <HeatmapLegend /> : <Legend />}
            <HighRiskAreas data={displayData || []} shouldShowSkeleton={shouldShowSkeleton} />
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
                    <span className="font-medium text-amber-900">Every hour</span>
                  </div>
                </div>
                <div className="text-xs pt-3 border-t border-amber-200 bg-blue-50 p-3 rounded">
                  <p className="font-semibold text-blue-900 mb-1">What is FWI?</p>
                  <p className="text-blue-800 leading-relaxed">The Fire Weather Index measures fire behavior potential (spread rate and intensity) if a fire starts. It does NOT predict the probability of ignition.</p>
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
              © 2026 Canadian Fire Weather Index Dashboard
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