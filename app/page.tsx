"use client";

import Map from './components/Map';
import { useFireRiskData } from './lib/api';
import { useMemo } from 'react';
import { FireRiskData } from './types';

export default function Home() {
  const {data, loading, error, lastUpdated, modelInfo} = useFireRiskData();

   //Calculate statistics from the actual data
   const statistics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        totalLocations: 0
      };
    }

    const stats = data.reduce((acc, location) => {
      if (location.riskLevel >= 0.6) {
        acc.highRiskCount++;
      } else if (location.riskLevel >= 0.3) {
        acc.mediumRiskCount++;
      } else {
        acc.lowRiskCount++;
      }
      return acc;
    }, {
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0
    });

    return {
      ...stats,
      totalLocations: data.length
    };
   }, [data]);

    //Calculate recent alerts from data
    const recentAlerts = useMemo(() => {
      if (!data || data.length === 0) return [];

      return data
      .filter(location => location.riskLevel >= 0.4) //Only show medium+ risk
      .sort((a,b) => b.riskLevel - a.riskLevel) //Sort by risk level descending
      .slice(0, 3) //Take top 3
      .map(location => ({
        id: location.id,
        location: location.location,
        province: location.province,
        riskLevel: location.riskLevel >= 0.6 ? 'HIGH' : 'MED',
        message: location.riskLevel >= 0.6 ? `Risk level ${Math.round(location.riskLevel * 100)}%`
          : location.humidity && location.humidity < 40 
            ? 'Dry conditions detected'
            : `Risk increased to ${Math.round(location.riskLevel * 100)}%`,
        color: location.riskLevel >= 0.6 ? 'red' : 'orange'
      }));
    }, [data]);

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

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-red-50 to-orange-50 shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-red-600 via-orange-600 to-red-800 bg-clip-text text-transparent">
                Forest Fire Risk Predictor
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg lg:text-xl text-gray-700 max-w-4xl mx-auto font-medium leading-relaxed">
              Real-time forest fire risk assessment across Canada using machine learning 
              and weather data analysis.
            </p>

            <div className="mt-8 flex items-center justify-center space-x-2">
              {/* Status indicator */}
              <div className={`w-3 h-3 rounded-full animate-pulse shadow-lg ${
                loading ? 'bg-yellow-500' : error ? 'bg-red-500' : 'bg-green-500'
              }`}></div>
              <span className="text-sm text-gray-600 font-semibold">
                Last updated: {formatLastUpdated(lastUpdated)}
              </span>
            </div>
          </div>
        </div> 
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* MAP SECTION */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Canada Fire Risk Heatmap
                </h2>
                <p className="text-gray-600 text-sm">
                  Click on any marker to view detailed risk information for that location.
                  {loading && <span className="text-blue-600 ml-2">Loading predictions...</span>}
                  {error && <span className="text-red-600 ml-2">Using fallback data</span>}
                </p>
              </div>
              
              <Map 
                height="700px" 
                className="border border-gray-200"
                data={data}
              />
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* STATISTICS CARD */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Current Statistics
              </h3>
              
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <div className="text-2xl font-bold text-red-600">
                    {loading ? '...' : statistics.highRiskCount}
                  </div>
                  <div className="text-sm text-gray-600">High Risk Areas</div>
                </div>
                
                <div className="border-b pb-2">
                  <div className="text-2xl font-bold text-orange-600">
                    {loading ? '...' : statistics.mediumRiskCount}
                  </div>
                  <div className="text-sm text-gray-600">Medium Risk Areas</div>
                </div>
                
                <div className="border-b pb-2">
                  <div className="text-2xl font-bold text-green-600">
                    {loading ? '...' : statistics.lowRiskCount}
                  </div>
                  <div className="text-sm text-gray-600">Low Risk Areas</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {loading ? '...' : modelInfo ? `${(modelInfo.accuracy * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Model Accuracy</div>
                </div>

                {modelInfo && (
                  <div className="pt-2">
                    <div className="text-lg font-bold text-purple-600">
                      {modelInfo.roc_auc.toFixed(3)}
                    </div>
                    <div className="text-sm text-gray-600">ROC-AUC Score</div>
                  </div>
                )}
              </div>
            </div>

            {/* RECENT ALERTS CARD */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                High Risk Areas
              </h3>
              
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center text-gray-500 py-4">Loading...</div>
                ) : recentAlerts.length > 0 ? (
                  recentAlerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={`flex items-start space-x-3 p-3 rounded border-l-4 ${
                        alert.color === 'red' 
                          ? 'bg-red-50 border-red-500' 
                          : 'bg-orange-50 border-orange-500'
                      }`}
                    >
                      <div className={`font-bold text-xs ${
                        alert.color === 'red' ? 'text-red-600' : 'text-orange-600'
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
                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded border-l-4 border-green-500">
                    <div className="text-green-600 font-bold text-xs">LOW</div>
                    <div>
                      <div className="text-sm font-medium">All Areas</div>
                      <div className="text-xs text-gray-600">No high-risk areas detected</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MODEL INFO CARD */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                About the Model
              </h3>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  This machine learning model analyzes multiple factors:
                </p>
                
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Temperature & humidity</li>
                  <li>Wind speed & direction</li>
                  <li>Precipitation levels</li>
                  <li>Vegetation dryness</li>
                  <li>Historical fire data</li>
                </ul>
                
                {modelInfo && (
                  <div className="text-xs mt-3 pt-3 border-t">
                    <p><strong>Model Version:</strong> {modelInfo.version}</p>
                    <p><strong>Locations Monitored:</strong> {statistics.totalLocations}</p>
                  </div>
                )}
                
                <p className="text-xs mt-3 pt-3 border-t">
                  Updated Daily using Environment Canada data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              © 2025 Forest Fire Risk Predictor | Powered by Machine Learning
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Data sources: Environment and Climate Change Canada, Natural Resources Canada
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}