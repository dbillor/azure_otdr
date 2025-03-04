import React from 'react';
import { OTDRTrace } from '../../types/otdr';
import useOTDRStore from '../../store/otdrStore';

interface TraceListProps {
  traces: OTDRTrace[];
}

const TraceList: React.FC<TraceListProps> = ({ traces }) => {
  const { 
    selectedTrace, 
    selectTrace, 
    isCompareMode, 
    comparisonTraces, 
    addComparisonTrace,
    removeComparisonTrace
  } = useOTDRStore();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTraceClick = (trace: OTDRTrace) => {
    if (isCompareMode) {
      const isAlreadyInComparison = comparisonTraces.some(t => t.id === trace.id);
      if (isAlreadyInComparison) {
        removeComparisonTrace(trace.id);
      } else {
        addComparisonTrace(trace.id);
      }
    } else {
      selectTrace(trace.id);
    }
  };

  const isInComparison = (traceId: string) => {
    return comparisonTraces.some(t => t.id === traceId);
  };

  return (
    <div className="divide-y">
      {traces.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No traces found with the current filters.
        </div>
      ) : (
        traces.map(trace => {
          const isSelected = selectedTrace?.id === trace.id;
          const isComparing = isInComparison(trace.id);
          
          return (
            <div
              key={trace.id}
              className={`p-3 hover:bg-gray-100 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              } ${isComparing ? 'bg-indigo-50' : ''}`}
              onClick={() => handleTraceClick(trace)}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-blue-700 truncate max-w-[180px]">
                  {trace.fileName}
                </div>
                <div className="flex space-x-2">
                  {isCompareMode && (
                    <div className={`w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center ${
                      isComparing ? 'bg-indigo-500' : 'bg-white'
                    }`}>
                      {isComparing && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {trace.events.length} events
                  </div>
                </div>
              </div>
              
              <div className="mt-1 text-xs text-gray-500">
                Fiber ID: {trace.fiberId}
              </div>
              
              <div className="mt-1 text-xs text-gray-500">
                {formatDate(trace.timestamp)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TraceList;