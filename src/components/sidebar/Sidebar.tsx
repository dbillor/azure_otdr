import React, { useState } from 'react';
import useOTDRStore from '../../store/otdrStore';
import FileUploader from '../file-management/FileUploader';
import TraceList from './TraceList';
import { OTDRFilter } from '../../types/otdr';

const Sidebar: React.FC = () => {
  const { 
    filters, 
    updateFilters, 
    resetFilters,
    getFilteredTraces,
    traces,
    isCompareMode,
    toggleCompareMode,
    clearComparison,
    comparisonTraces
  } = useOTDRStore();
  
  const [expanded, setExpanded] = useState(true);
  const toggleSidebar = () => setExpanded(!expanded);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateFilters({ [name]: value } as Partial<OTDRFilter>);
  };
  
  const handleReset = () => {
    resetFilters();
  };
  
  const filteredTraces = getFilteredTraces();
  
  // Get unique fiber IDs for the dropdown
  const fiberIds = Array.from(new Set(traces.map(trace => trace.fiberId)));
  
  return (
    <aside 
      className={`bg-white shadow-md transition-all duration-300 ${
        expanded ? 'w-80' : 'w-16'
      } flex flex-col`}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className={`font-semibold ${expanded ? 'block' : 'hidden'}`}>
          OTDR Files
        </h2>
        <button 
          onClick={toggleSidebar}
          className="p-1 hover:bg-gray-200 rounded-md"
        >
          {expanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
      
      {expanded && (
        <>
          <div className="p-4 border-b">
            <FileUploader />
          </div>
          
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Filter Traces</h3>
              <div className="flex space-x-2">
                <button
                  onClick={toggleCompareMode}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    isCompareMode 
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={isCompareMode ? 'Exit Compare Mode' : 'Enter Compare Mode'}
                >
                  {isCompareMode ? 'Exit Compare' : 'Compare'}
                </button>
                
                {isCompareMode && comparisonTraces.length > 0 && (
                  <button
                    onClick={clearComparison}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    title="Clear selected traces"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            {isCompareMode && (
              <div className="mb-3 p-2 bg-indigo-50 text-indigo-700 text-xs rounded-md">
                <p>Compare Mode: Select multiple traces to view them together.</p>
                <p className="mt-1 font-medium">
                  {comparisonTraces.length} trace{comparisonTraces.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Fiber ID</label>
                <select
                  name="fiberId"
                  value={filters.fiberId}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="">All Fibers</option>
                  {fiberIds.map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Search</label>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search files..."
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>
              
              <button
                onClick={handleReset}
                className="w-full p-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
              >
                Reset Filters
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <TraceList traces={filteredTraces} />
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;