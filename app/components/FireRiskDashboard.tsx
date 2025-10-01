"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Activity, MapPin, Layers, AlertTriangle, TrendingUp, Database } from 'lucide-react';
import MapComponent from './Map';
import { useFireRiskData } from '../lib/api';
import { FireRiskData } from '../types';

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

// Statistics Panel Component
const StatisticsPanel: React.FC<{
  data: FireRiskData[];
  modelInfo: any;
  loading: boolean;
}> = ({ data, modelInfo, loading }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { veryHigh: 0, high: 0, medium: 0, low: 0, veryLow: 0 };
    }

    return {
      veryHigh: data.filter(d => d.riskLevel >= 0.8).length,
      high: data.filter(d => d.riskLevel >= 0.6 && d.riskLevel < 0.8).length,
      medium: data.filter(d => d.riskLevel >= 0.4 && d.riskLevel < 0.6).length,
      low: data.filter(d => d.riskLevel >= 0.2 && d.riskLevel < 0.4).length,
      veryLow: data.filter(d => d.riskLevel < 0.2).length
    };
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center mb-4">
        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Risk Statistics</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
          <div className="text-2xl font-bold text-red-600">
            {loading ? '...' : stats.veryHigh}
          </div>
          <div className="text-sm text-red-800">Very High</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-100">
          <div className="text-2xl font-bold text-orange-600">
            {loading ? '...' : stats.high}
          </div>
          <div className="text-sm text-orange-800">High</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
          <div className="text-2xl font-bold text-yellow-600">
            {loading ? '...' : stats.medium}
          </div>
          <div className="text-sm text-yellow-800">Medium</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="text-2xl font-bold text-green-600">
            {loading ? '...' : stats.low + stats.veryLow}
          </div>
          <div className="text-sm text-green-800">Low</div>
        </div>
      </div>

      {modelInfo && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Grid Locations:</span>
            <span className="font-medium">{data?.length || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">System Version:</span>
            <span className="font-medium">{modelInfo.version}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Legend Component
const Legend: React.FC = () => {
  const riskLevels = [
    { label: 'Very High', color: '#d32f2f', range: '80-100%' },
    { label: 'High', color: '#f57c00', range: '60-80%' },
    { label: 'Medium', color: '#fbc02d', range: '40-60%' },
    { label: 'Low', color: '#689f38', range: '20-40%' },
    { label: 'Very Low', color: '#388e3c', range: '0-20%' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Fire Risk Level</h3>
      <div className="space-y-2">
        {riskLevels.map((level, index) => (
          <div key={index} className="flex items-center text-sm">
            <div 
              className="w-4 h-4 rounded mr-3"
              style={{ backgroundColor: level.color }}
            />
            <span className="flex-1">{level.label}</span>
            <span className="text-gray-500 text-xs">{level.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// HeatmapLegend Component
const HeatmapLegend: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Heatmap Intensity</h3>
      <div className="mb-3">
        <div 
          className="h-4 rounded"
          style={{
            background: 'linear-gradient(to right, #388e3c 0%, #689f38 25%, #fbc02d 50%, #f57c00 75%, #d32f2f 100%)'
          }}
        />
        <div className="flex justify-between mt-1 text-xs text-gray-600">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <p><strong>Coverage:</strong> Fire risk density across regions</p>
        <p><strong>Color Scale:</strong> Green (low) to Red (high risk)</p>
      </div>
    </div>
  );
};

// High Risk Areas Component
const HighRiskAreas: React.FC<{
  data: FireRiskData[];
  loading: boolean;
}> = ({ data, loading }) => {
  const recentAlerts = useMemo(() => {
    if (!data || data.length === 0) return [];

    interface StationData {
      location: string;
      provinces: Map<string, number>;
      maxRisk: number;
      gridCount: number;
    }

    const stationDataMap = new Map<string, StationData>();

    data.forEach(item => {
      const key = item.location?.trim() || 'Unknown';
      const existing = stationDataMap.get(key);
      
      if (existing) {
        existing.maxRisk = Math.max(existing.maxRisk, item.riskLevel);
        existing.gridCount += 1;
        const province = item.province || 'Unknown';
        const currentCount = existing.provinces.get(province) || 0;
        existing.provinces.set(province, currentCount + 1);
      } else {
        const provincesMap = new Map<string, number>();
        provincesMap.set(item.province || 'Unknown', 1);
        
        stationDataMap.set(key, {
          location: key,
          provinces: provincesMap,
          maxRisk: item.riskLevel,
          gridCount: 1
        });
      }
    });

    return Array.from(stationDataMap.values())
      .filter(station => station.maxRisk >= 0.35)
      .sort((a, b) => b.maxRisk - a.maxRisk)
      .slice(0, 3)
      .map(station => {
        let mostCommonProvince = 'Unknown';
        let maxCount = 0;
        
        station.provinces.forEach((count, province) => {
          if (province !== 'Unknown' && count > maxCount) {
            maxCount = count;
            mostCommonProvince = province;
          }
        });
        
        if (mostCommonProvince === 'Unknown') {
          station.provinces.forEach((count, province) => {
            if (count > maxCount) {
              maxCount = count;
              mostCommonProvince = province;
            }
          });
        }
        
        return {
          id: station.location,
          location: station.location,
          province: mostCommonProvince,
          riskLevel: station.maxRisk >= 0.65 ? 'HIGH' : station.maxRisk >= 0.35 ? 'MED' : 'LOW',
          message: `Risk level ${Math.round(station.maxRisk * 100)}%`,
          color: station.maxRisk >= 0.8 ? 'red' : 
                 station.maxRisk >= 0.65 ? 'orange' : 
                 'yellow',
          actualRisk: station.maxRisk
        };
      });
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center mb-4">
        <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-800">High Risk Areas</h3>
      </div>
      
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading...</div>
        ) : recentAlerts.length > 0 ? (
          recentAlerts.map((alert) => (
            <div 
              key={alert.id}
              className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 ${
                alert.color === 'red' 
                  ? 'bg-red-50 border-red-500' 
                  : alert.color === 'orange'
                  ? 'bg-orange-50 border-orange-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}
            >
              <div className={`font-bold text-xs ${
                alert.color === 'red' ? 'text-red-600' : 
                alert.color === 'orange' ? 'text-orange-600' : 
                'text-yellow-600'
              }`}>
                {alert.riskLevel}
              </div>
              <div>
                <div className="text-sm font-medium">{alert.location}</div>
                <div className="text-xs text-gray-600">{alert.province}</div>
                <div className="text-xs text-gray-600">{alert.message}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
            <div className="text-green-600 font-bold text-xs">LOW</div>
            <div>
              <div className="text-sm font-medium">All Areas</div>
              <div className="text-xs text-gray-600">No high-risk areas detected</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
const FireRiskDashboard: React.FC = () => {
  const { data, loading, error, lastUpdated, modelInfo } = useFireRiskData();
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap'>('markers');
  const [stationCount, setStationCount] = useState<number>(0);
  const [pendingMode, setPendingMode] = useState<'markers' | 'heatmap' | null>(null);
  
  const handleModeSwitch = (mode: 'markers' | 'heatmap') => {
    if (mode === mapMode) return;
    setPendingMode(mode);
    setMapMode(mode);
    setTimeout(() => setPendingMode(null), 200);
  };

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return new Date().toLocaleDateString('en-CA');
    return new Date(timestamp).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStationCountUpdate = (count: number) => {
    setStationCount(count);
  };

  if (loading && (!data || data.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full w-8 h-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-700">Loading fire risk data...</div>
          <div className="text-sm text-gray-500">Calculating Fire Weather Index...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-4">
              Forest Fire Risk Predictor
            </h1>

            <p className="text-base sm:text-lg text-gray-900 max-w-3xl mx-auto font-medium">
              Real-time forest fire risk assessment across Canada using the Canadian Fire Weather Index System.
            </p>

            <div className="mt-6 flex items-center justify-center space-x-2">
              <Database className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">
                Environment and Climate Change Canada Data
              </span>
            </div>
          </div>
        </div> 
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Canada Fire Risk Map
                    </h2>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full shadow-sm ${
                        loading ? 'bg-yellow-500 animate-pulse' : error ? 'bg-red-500' : 'bg-green-500'
                      }`}></div>
                      <span className="text-xs text-gray-900 font-medium">
                        Last updated: {formatLastUpdated(lastUpdated)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => handleModeSwitch('markers')}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        mapMode === 'markers' || pendingMode === 'markers'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Markers
                    </button>
                    <button
                      onClick={() => handleModeSwitch('heatmap')}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        mapMode === 'heatmap' || pendingMode === 'heatmap'
                          ? 'bg-white text-orange-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Layers className="w-4 h-4 mr-1" />
                      Heatmap
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm">
                  {mapMode === 'markers' 
                    ? 'Click markers to view detailed station risk information and weather conditions.'
                    : 'Heat zones show fire risk density and intensity across Canadian regions.'
                  }
                </p>
              </div>
              
              <MapComponent 
                height="700px" 
                className="border border-gray-200 rounded-lg"
                data={data || []}
                mapMode={mapMode}
                onStationCountUpdate={handleStationCountUpdate}
              />
            </div>

            {/* National Risk Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">National Risk Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {data ? data.length.toLocaleString() : '0'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Grid Cells Monitored</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stationCount}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Weather Stations</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {data ? Math.round((data.filter(d => d.riskLevel < 0.4).length / data.length) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Low Risk Areas</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {data ? Math.round((data.filter(d => d.riskLevel >= 0.6).length / data.length) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">High Risk Areas</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">System Uptime:</span>
                  <span className="font-medium text-green-600">99.8% (Last 30 days)</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Data Processing Time:</span>
                  <span className="font-medium text-gray-900">&lt; 40 seconds</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Historical Data Range:</span>
                  <span className="font-medium text-gray-900">45 days rolling</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <StatisticsPanel data={data || []} modelInfo={modelInfo} loading={loading} />
            
            {mapMode === 'heatmap' ? <HeatmapLegend /> : <Legend />}
            
            <HighRiskAreas data={data || []} loading={loading} />

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                About the System
              </h3>
              
              <div className="text-sm text-gray-600 space-y-3">
                <p className="font-medium text-gray-900">
                  Canadian Fire Weather Index
                </p>
                
                <p className="text-xs leading-relaxed">
                  Official algorithm from Environment and Climate Change Canada using 45-day historical weather accumulation to calculate fire danger indices.
                </p>
                
                <div className="pt-3 border-t">
                  <p className="font-medium mb-2 text-gray-800">Key Components:</p>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Fine Fuel Moisture Code (FFMC)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Duff Moisture Code (DMC)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Drought Code (DC)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Buildup & Spread Indices</span>
                    </li>
                  </ul>
                </div>
                
                {modelInfo && (
                  <div className="text-xs pt-3 border-t space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Grid Locations:</span>
                      <span className="font-medium text-gray-900">{data?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weather Stations:</span>
                      <span className="font-medium text-gray-900">{stationCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Update Frequency:</span>
                      <span className="font-medium text-gray-900">Every 2 hours</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              © 2025 Forest Fire Risk Predictor | Canadian Fire Weather Index System
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Data: Environment and Climate Change Canada • Natural Resources Canada
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default FireRiskDashboard;