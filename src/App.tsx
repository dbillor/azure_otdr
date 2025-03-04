import React from 'react';
import './App.css';
import MainLayout from './components/layout/MainLayout';
import OTDRGraph from './components/otdr-graph/OTDRGraph';
import useOTDRStore from './store/otdrStore';

function App() {
  const { selectedTrace, isCompareMode, comparisonTraces } = useOTDRStore();

  // Determine which trace to show based on the mode
  const traceToDisplay = isCompareMode && comparisonTraces.length > 0
    ? comparisonTraces[0]  // In compare mode, we'll use the first trace as a base
    : selectedTrace;

  return (
    <MainLayout>
      <div className="h-full">
        {(isCompareMode && comparisonTraces.length > 0) || selectedTrace ? (
          <OTDRGraph trace={traceToDisplay!} />
        ) : (
          <div className="flex items-center justify-center h-full bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              {isCompareMode ? (
                <>
                  <svg className="w-16 h-16 mx-auto text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <h2 className="mt-4 text-xl font-semibold text-gray-700">Compare Mode Active</h2>
                  <p className="mt-2 text-gray-500">
                    Select traces from the sidebar to compare them together.
                  </p>
                </>
              ) : (
                <>
                  <svg className="w-16 h-16 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                  <h2 className="mt-4 text-xl font-semibold text-gray-700">No OTDR Trace Selected</h2>
                  <p className="mt-2 text-gray-500">
                    Select a trace from the sidebar or upload a new OTDR file to view its details.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default App;
