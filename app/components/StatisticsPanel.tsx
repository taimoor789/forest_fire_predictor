import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { FireRiskData } from '../types';

interface StatisticsPanelProps {
  data: FireRiskData[];
  modelInfo: any;
  shouldShowSkeleton: boolean;
  userLocation: { lat: number; lon: number; city?: string } | null;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ 
  data, 
  modelInfo, 
  shouldShowSkeleton, 
  userLocation 
}) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { extreme: 0, veryHigh: 0, high: 0, moderate: 0, low: 0, veryLow: 0 };
    }
    
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
        {/* Extreme */}
        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200 shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{shouldShowSkeleton ? '...' : stats.extreme}</div>
          <div className="text-sm text-purple-800">Extreme</div>
          <div className="text-xs text-purple-600 mt-1">FWI 30+</div>
        </div>
        
        {/* Very High */}
        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200 shadow-sm">
          <div className="text-2xl font-bold text-red-600">{shouldShowSkeleton ? '...' : stats.veryHigh}</div>
          <div className="text-sm text-red-800">Very High</div>
          <div className="text-xs text-red-600 mt-1">FWI 18-30</div>
        </div>
        
        {/* High */}
        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{shouldShowSkeleton ? '...' : stats.high}</div>
          <div className="text-sm text-orange-800">High</div>
          <div className="text-xs text-orange-600 mt-1">FWI 8-18</div>
        </div>
        
        {/* Moderate */}
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm">
          <div className="text-2xl font-bold text-yellow-700">{shouldShowSkeleton ? '...' : stats.moderate}</div>
          <div className="text-sm text-yellow-800">Moderate</div>
          <div className="text-xs text-yellow-700 mt-1">FWI 4-8</div>
        </div>
        
        {/* Low */}
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{shouldShowSkeleton ? '...' : stats.low}</div>
          <div className="text-sm text-green-800">Low</div>
          <div className="text-xs text-green-600 mt-1">FWI 2-4</div>
        </div>
        
        {/* Very Low */}
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{shouldShowSkeleton ? '...' : stats.veryLow}</div>
          <div className="text-sm text-green-800">Very Low</div>
          <div className="text-xs text-green-600 mt-1">FWI 0-2</div>
        </div>
      </div>

      {/* Summary Info */}
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

export default StatisticsPanel;