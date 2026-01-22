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

  const dangerClasses = [
    { name: 'Extreme', count: stats.extreme, color: '#9C27B0', range: '30+' },
    { name: 'Very High', count: stats.veryHigh, color: '#F44336', range: '18-30' },
    { name: 'High', count: stats.high, color: '#FF9800', range: '8-18' },
    { name: 'Moderate', count: stats.moderate, color: '#FFEB3B', range: '4-8' },
    { name: 'Low', count: stats.low, color: '#8BC34A', range: '2-4' },
    { name: 'Very Low', count: stats.veryLow, color: '#4CAF50', range: '0-2' }
  ];

  return (
    <div className="rounded-lg shadow-lg backdrop-blur-sm p-6 mb-6" style={{ backgroundColor: 'rgba(255, 248, 230, 0.85)', border: '1px solid rgba(218, 165, 32, 0.3)' }}>
      <div className="flex items-center mb-4">
        <TrendingUp className="w-5 h-5 mr-2 text-orange-700" />
        <h3 className="text-lg font-semibold text-amber-900">FWI Distribution</h3>
      </div>
      
      {/* Circular Grid Layout - 2x3 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {dangerClasses.map((danger, index) => (
          <div 
            key={index}
            className="relative rounded-xl shadow-md p-4 text-center transition-all hover:shadow-lg"
            style={{ 
              backgroundColor: `${danger.color}15`,
              border: `2px solid ${danger.color}40`
            }}
          >
            {/* Count Circle */}
            <div 
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-sm"
              style={{ 
                backgroundColor: danger.color,
                color: 'white'
              }}
            >
              <span className="text-xl font-bold">
                {shouldShowSkeleton ? '...' : danger.count}
              </span>
            </div>
            
            {/* Label */}
            <div className="text-sm font-semibold mb-1" style={{ color: danger.color }}>
              {danger.name}
            </div>
            
            {/* FWI Range */}
            <div className="text-xs font-medium" style={{ color: danger.color }}>
              FWI {danger.range}
            </div>
          </div>
        ))}
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