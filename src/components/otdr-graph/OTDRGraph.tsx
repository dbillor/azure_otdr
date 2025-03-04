import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
  Legend,
  Label
} from 'recharts';
import { OTDRTrace, OTDREvent, EventType } from '../../types/otdr';
import EventMarker from './EventMarker';
import EventTooltip from '../tooltip/EventTooltip';
import useOTDRStore from '../../store/otdrStore';

interface OTDRGraphProps {
  trace: OTDRTrace;
}

// Array of different colors for multiple traces
const TRACE_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#8b5cf6', // purple
  '#db2777', // pink
  '#f59e0b', // amber
  '#0891b2', // cyan
  '#4f46e5', // indigo
  '#78716c', // stone
];

const OTDRGraph: React.FC<OTDRGraphProps> = ({ trace }) => {
  const { isCompareMode, comparisonTraces } = useOTDRStore();
  const [selectedEvent, setSelectedEvent] = useState<OTDREvent | null>(null);
  const [selectedArea, setSelectedArea] = useState<{start: number, end: number} | null>(null);
  
  // Get traces to be displayed
  const displayTraces = useMemo(() => {
    if (isCompareMode && comparisonTraces.length > 0) {
      return comparisonTraces;
    }
    return [trace];
  }, [isCompareMode, comparisonTraces, trace]);
  
  // Combine multiple traces into a single dataset
  const combinedData = useMemo(() => {
    // Find the maximum number of data points among all traces
    const maxLength = Math.max(...displayTraces.map(t => t.distance.length));
    
    // Create array of data points
    const data = new Array(maxLength).fill(0).map((_, index) => {
      const dataPoint: any = { distance: 0 };
      
      displayTraces.forEach((t, traceIndex) => {
        if (index < t.distance.length) {
          // Store the distance value (should be the same for all traces at the same index)
          dataPoint.distance = t.distance[index];
          // Store each trace's power value with the trace ID as the key
          dataPoint[`power_${t.id}`] = t.power[index];
        }
      });
      
      return dataPoint;
    });
    
    return data;
  }, [displayTraces]);
  
  // Helper function to get event color based on type (using more vibrant colors)
  const getEventColor = (type: EventType): string => {
    switch (type) {
      case EventType.REFLECTION:
        return '#3b82f6'; // vibrant blue
      case EventType.LOSS:
        return '#f59e0b'; // vibrant amber
      case EventType.BREAK:
        return '#ef4444'; // vibrant red
      case EventType.SPLICE:
        return '#10b981'; // vibrant emerald
      case EventType.CONNECTOR:
        return '#8b5cf6'; // vibrant purple
      default:
        return '#6b7280'; // vibrant gray
    }
  };
  
  // Click handler for events
  const handleEventClick = (event: OTDREvent) => {
    setSelectedEvent(event === selectedEvent ? null : event);
  };
  
  // Hover handler for events
  const handleEventHover = (event: OTDREvent) => {
    setSelectedEvent(event);
  };
  
  // Leave handler for events
  const handleEventLeave = () => {
    setSelectedEvent(null);
  };
  
  // Reset zoom
  const resetZoom = () => {
    setSelectedArea(null);
  };
  
  // Find the min and max distance across all traces
  const allDistances = displayTraces.flatMap(t => t.distance);
  const maxDistance = Math.max(...allDistances);
  
  // Calculate domain based on selected area or full range
  const xDomain = selectedArea 
    ? [selectedArea.start, selectedArea.end]
    : [0, maxDistance];
    
  // Find min and max power values across all traces with some padding
  const allPowerValues = displayTraces.flatMap(t => t.power);
  const minPower = Math.min(...allPowerValues) - 3;
  const maxPower = Math.max(...allPowerValues) + 3;
  
  // Custom formatter for tooltips when comparing multiple traces
  const customFormatter = (value: number, name: string) => {
    if (name.startsWith('power_')) {
      // Extract the trace ID from the property name
      const traceId = name.replace('power_', '');
      // Find the trace by ID
      const traceInfo = displayTraces.find(t => t.id === traceId);
      
      if (traceInfo) {
        return [`${value.toFixed(2)} dB`, traceInfo.fileName || `Trace ${traceId}`];
      }
    }
    return [`${value.toFixed(2)} dB`, name];
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          {isCompareMode && comparisonTraces.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold">
                Comparing {comparisonTraces.length} OTDR Traces
              </h2>
              <div className="text-sm text-gray-500">
                {displayTraces.map((t, i) => (
                  <div key={t.id} className="flex items-center mt-1">
                    <span 
                      className="inline-block w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: TRACE_COLORS[i % TRACE_COLORS.length] }}
                    />
                    <span>{t.fileName} ({t.fiberId})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{trace.fileName}</h2>
              <div className="text-sm text-gray-500">
                Fiber ID: {trace.fiberId} | Recorded: {new Date(trace.timestamp).toLocaleString()}
              </div>
            </>
          )}
        </div>
        
        {selectedArea && (
          <button
            onClick={resetZoom}
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm hover:bg-blue-200 transition-colors"
          >
            Reset Zoom
          </button>
        )}
      </div>
      
      <div className="flex-1 min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={combinedData}
            margin={{ top: 20, right: 45, left: 35, bottom: 35 }}
          >
            <CartesianGrid 
              strokeDasharray="2 2" 
              opacity={0.5} 
              horizontal={true}
              vertical={true}
            />
            <XAxis 
              dataKey="distance" 
              domain={xDomain}
              type="number"
              tickCount={20}
              allowDecimals={true}
              allowDataOverflow={true}
              padding={{ left: 20, right: 20 }}
              tickMargin={10}
              tick={{ fill: '#666', fontSize: 11 }}
              tickLine={{ stroke: '#999' }}
            >
              <Label 
                value="Distance (km)" 
                position="insideBottom" 
                offset={-5} 
                style={{ textAnchor: 'middle', fontSize: 12, fill: '#666', fontWeight: 500 }}
              />
            </XAxis>
            <YAxis 
              domain={[minPower, maxPower]}
              reversed={true}
              tickCount={10}
              allowDecimals={true}
              allowDataOverflow={true}
              tickMargin={8}
              width={60}
              tick={{ fill: '#666', fontSize: 11 }}
              tickLine={{ stroke: '#999' }}
              tickFormatter={(value) => value.toFixed(1)}
            >
              <Label 
                value="Power (dB)" 
                angle={-90} 
                position="insideLeft" 
                offset={-5} 
                style={{ textAnchor: 'middle', fontSize: 12, fill: '#666', fontWeight: 500 }}
              />
            </YAxis>
            <Tooltip 
              formatter={customFormatter}
              labelFormatter={(value: number) => `Distance: ${value.toFixed(2)} km`}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ddd',
                borderRadius: '5px',
                padding: '8px 12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              wrapperStyle={{ zIndex: 10 }}
              cursor={{ strokeDasharray: '3 3', stroke: '#666' }}
            />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            
            {/* Render lines for each trace */}
            {displayTraces.map((traceItem, index) => (
              <Line 
                key={traceItem.id}
                type="monotone" 
                dataKey={`power_${traceItem.id}`} 
                stroke={TRACE_COLORS[index % TRACE_COLORS.length]} 
                strokeWidth={3}
                dot={false} 
                activeDot={{ r: 8, fill: TRACE_COLORS[index % TRACE_COLORS.length], stroke: '#ffffff', strokeWidth: 2.5 }}
                name={traceItem.fileName || `Trace ${traceItem.id}`}
                isAnimationActive={true}
                animationDuration={750}
                connectNulls={true}
              />
            ))}
            
            {/* Always show events on the plot */}
            <>
              {console.log("Events in trace:", trace.events?.length || 0, trace.events)}
              {/* Render vertical reference lines for events */}
              {trace.events.map(event => (
                <ReferenceLine
                  key={`line-${event.id}`}
                  x={event.distance}
                  stroke={getEventColor(event.type)}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  ifOverflow="extendDomain"
                  label={{ 
                    value: `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} (${event.loss.toFixed(1)}dB)`,
                    position: "top",
                    fill: getEventColor(event.type),
                    fontSize: 11,
                    fontWeight: 600
                  }}
                />
              ))}
              
              {/* Render event markers with labels */}
              {trace.events.map(event => (
                <React.Fragment key={event.id}>
                  {/* Add a larger background dot for better visibility */}
                  <ReferenceDot
                    x={event.distance}
                    y={trace.power[trace.distance.findIndex(d => Math.abs(d - event.distance) < 0.01)] || 0}
                    r={13}
                    fill={getEventColor(event.type)}
                    fillOpacity={0.2}
                    stroke={getEventColor(event.type)}
                    strokeWidth={1}
                    isFront={true}
                  />
                  {/* Main event dot */}
                  <ReferenceDot
                    x={event.distance}
                    y={trace.power[trace.distance.findIndex(d => Math.abs(d - event.distance) < 0.01)] || 0}
                    r={8}
                    fill={getEventColor(event.type)}
                    stroke="white"
                    strokeWidth={3}
                    strokeOpacity={1}
                    onClick={() => handleEventClick(event)}
                    onMouseEnter={() => handleEventHover(event)}
                    onMouseLeave={handleEventLeave}
                    style={{ cursor: 'pointer' }}
                    isFront={true}
                  />
                </React.Fragment>
              ))}
              
              {/* Highlight selected event */}
              {selectedEvent && (
                <>
                  {/* Pulsing animated highlight effect */}
                  <ReferenceLine
                    x={selectedEvent.distance}
                    stroke={getEventColor(selectedEvent.type)}
                    strokeWidth={4}
                    isFront={true}
                    strokeLinecap="round"
                  />
                  {/* Outer highlight ring */}
                  <ReferenceDot
                    x={selectedEvent.distance}
                    y={trace.power[trace.distance.findIndex(d => Math.abs(d - selectedEvent.distance) < 0.01)] || 0}
                    r={25}
                    fill={getEventColor(selectedEvent.type)}
                    fillOpacity={0.2}
                    stroke={getEventColor(selectedEvent.type)}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    isFront={true}
                  />
                  {/* Middle highlight ring */}
                  <ReferenceDot
                    x={selectedEvent.distance}
                    y={trace.power[trace.distance.findIndex(d => Math.abs(d - selectedEvent.distance) < 0.01)] || 0}
                    r={18}
                    fill={getEventColor(selectedEvent.type)}
                    fillOpacity={0.4}
                    stroke={getEventColor(selectedEvent.type)}
                    strokeWidth={2}
                    isFront={true}
                  />
                  {/* Inner highlight dot */}
                  <ReferenceDot
                    x={selectedEvent.distance}
                    y={trace.power[trace.distance.findIndex(d => Math.abs(d - selectedEvent.distance) < 0.01)] || 0}
                    r={12}
                    fill={getEventColor(selectedEvent.type)}
                    fillOpacity={0.8}
                    stroke="white"
                    strokeWidth={3}
                    isFront={true}
                  />
                </>
              )}
            </>
            
            {/* Only show the event details panel when not in compare mode */}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Only show event details panel when not in compare mode */}
      {!isCompareMode && (
        <div className="mt-4 border-t pt-4">
          <h3 className="font-medium mb-2">Events ({trace.events.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trace.events.map(event => (
              <EventMarker 
                key={event.id} 
                event={event} 
                isSelected={selectedEvent?.id === event.id}
                onClick={() => handleEventClick(event)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Event tooltip */}
      {selectedEvent && !isCompareMode && (
        <div 
          style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto'
          }}
        >
          <EventTooltip 
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        </div>
      )}
    </div>
  );
};

export default OTDRGraph;