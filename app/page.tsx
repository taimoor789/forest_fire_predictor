import Map from './components/Map';
import { FireRiskData } from './types';

//Server Component by default - run on the server, faster, and better for SEO, 'use client' only for interactivity
export default function Home() {
  return (
    //header → main content → footer structure
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
              {/* GREEN DOT - Indicates system is online */}
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
              <span className="text-sm text-gray-600 font-semibold">
                Last updated: {new Date().toLocaleDateString('en-CA')}
              </span>
            </div>
          </div>
        </div> 
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* CSS Grid with responsive columns */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* MAP SECTION  */}
          <div className="lg:col-span-3">
            
            {/* CARD COMPONENT PATTERN */}
            {/* White background + shadow + padding = card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Canada Fire Risk Heatmap
                </h2>
                <p className="text-gray-600 text-sm">
                  Click on any marker to view detailed risk information for that location.
                </p>
              </div>
              
              {/* MAP COMPONENT */}
              <Map 
                height="700px" 
                className="border border-gray-200"
              />
            </div>
          </div>

          {/* SIDEBAR - Information panel */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* STATISTICS CARD */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Current Statistics
              </h3>
              
              {/* STATISTICS GRID  */}
              <div className="space-y-4">
                
                {/* STAT ITEM PATTERN */}
                <div className="border-b pb-2">
                  <div className="text-2xl font-bold text-red-600">12</div>
                  <div className="text-sm text-gray-600">High Risk Areas</div>
                </div>
                
                <div className="border-b pb-2">
                  <div className="text-2xl font-bold text-orange-600">28</div>
                  <div className="text-sm text-gray-600">Medium Risk Areas</div>
                </div>
                
                <div className="border-b pb-2">
                  <div className="text-2xl font-bold text-green-600">45</div>
                  <div className="text-sm text-gray-600">Low Risk Areas</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-blue-600">91.2%</div>
                  <div className="text-sm text-gray-600">Model Accuracy</div>
                </div>
              </div>
            </div>

            {/* RECENT ALERTS CARD */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Recent Alerts
              </h3>
              
              {/* ALERT LIST */}
              <div className="space-y-3">
                
                {/* INDIVIDUAL ALERT ITEMS */}
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded border-l-4 border-red-500">
                  <div className="text-red-600 font-bold text-xs">HIGH</div>
                  <div>
                    <div className="text-sm font-medium">British Columbia</div>
                    <div className="text-xs text-gray-600">Risk increased 15%</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded border-l-4 border-orange-500">
                  <div className="text-orange-600 font-bold text-xs">MED</div>
                  <div>
                    <div className="text-sm font-medium">Northern Alberta</div>
                    <div className="text-xs text-gray-600">Dry conditions detected</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded border-l-4 border-green-500">
                  <div className="text-green-600 font-bold text-xs">LOW</div>
                  <div>
                    <div className="text-sm font-medium">Maritime Provinces</div>
                    <div className="text-xs text-gray-600">Recent rainfall</div>
                  </div>
                </div>
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
                
                {/* FEATURE LIST */}
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Temperature & humidity</li>
                  <li>Wind speed & direction</li>
                  <li>Precipitation levels</li>
                  <li>Vegetation dryness</li>
                  <li>Historical fire data</li>
                </ul>
                
                <p className="text-xs mt-3 pt-3 border-t">
                  Updated daily at 6:00 AM EST using Environment Canada data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* FOOTER */}
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