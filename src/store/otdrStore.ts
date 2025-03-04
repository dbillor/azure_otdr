import { create } from 'zustand';
import { OTDRTrace, OTDRFilter, OTDREvent, EventType } from '../types/otdr';

// Helper function to generate realistic OTDR trace data
const generateOTDRTrace = (
  id: string, 
  fileName: string, 
  fiberId: string, 
  timestamp: string, 
  length: number = 500, 
  events: OTDREvent[]
): OTDRTrace => {
  // Generate distance array with fine granularity
  const distance = Array.from({ length }, (_, i) => i * 0.05);
  
  // Base attenuation value (dB/km)
  const baseAttenuation = 0.25;
  
  // Generate power values with realistic fiber characteristics
  const power = distance.map((dist, i) => {
    // Base linear attenuation
    let value = -baseAttenuation * dist;
    
    // Add some natural fiber noise
    value -= (Math.random() * 0.03);
    
    // Add Rayleigh backscatter curve (logarithmic decay)
    value -= 2 * Math.log(dist + 1) / Math.log(10);
    
    // Add events impact to the trace
    events.forEach(event => {
      if (dist > event.distance) {
        // Apply loss after the event point
        value -= event.loss * (1 - Math.exp(-(dist - event.distance)));
        
        // Add reflection spike near the event
        if (event.reflection > -50 && Math.abs(dist - event.distance) < 0.1) {
          const reflectionImpact = (0.1 - Math.abs(dist - event.distance)) * 
                               Math.max(0, (event.reflection + 80) / 10);
          value += reflectionImpact;
        }
      }
    });
    
    return value;
  });
  
  return {
    id,
    fileName,
    fiberId,
    timestamp,
    distance,
    power,
    events
  };
};

// Mock data for initial state
const mockTraces: OTDRTrace[] = [
  generateOTDRTrace(
    '1',
    'trace_fiber001_2024-02-15.sor',
    'FIBER001',
    '2024-02-15T10:30:00Z',
    500,
    [
      {
        id: '1-1',
        type: EventType.REFLECTION,
        distance: 2.5,
        loss: 0.3,
        reflection: -35,
        description: 'Connector'
      },
      {
        id: '1-2',
        type: EventType.SPLICE,
        distance: 5.2,
        loss: 0.1,
        reflection: -60,
        description: 'Fusion Splice'
      },
      {
        id: '1-3',
        type: EventType.SPLICE,
        distance: 7.8,
        loss: 0.15,
        reflection: -62,
        description: 'Fusion Splice'
      },
      {
        id: '1-4',
        type: EventType.CONNECTOR,
        distance: 15.3,
        loss: 0.5,
        reflection: -32,
        description: 'Patch Panel'
      },
      {
        id: '1-5',
        type: EventType.BREAK,
        distance: 22.7,
        loss: 45,
        reflection: -14,
        description: 'Fiber Break'
      }
    ]
  ),
  generateOTDRTrace(
    '2',
    'trace_fiber002_2024-03-01.sor',
    'FIBER002',
    '2024-03-01T14:15:00Z',
    500,
    [
      {
        id: '2-1',
        type: EventType.CONNECTOR,
        distance: 1.8,
        loss: 0.5,
        reflection: -30,
        description: 'Entry Connector'
      },
      {
        id: '2-2',
        type: EventType.LOSS,
        distance: 4.5,
        loss: 0.8,
        reflection: -65,
        description: 'Bend or Stress Point'
      },
      {
        id: '2-3',
        type: EventType.SPLICE,
        distance: 8.2,
        loss: 0.12,
        reflection: -58,
        description: 'Fusion Splice'
      },
      {
        id: '2-4',
        type: EventType.LOSS,
        distance: 12.4,
        loss: 0.6,
        reflection: -70,
        description: 'Macrobend'
      }
    ]
  )
];

// Interface for the store state
interface OTDRState {
  traces: OTDRTrace[];
  selectedTrace: OTDRTrace | null;
  comparisonTraces: OTDRTrace[];
  filters: OTDRFilter;
  loading: boolean;
  error: string | null;
  isCompareMode: boolean;

  // Actions
  selectTrace: (traceId: string) => void;
  addComparisonTrace: (traceId: string) => void;
  removeComparisonTrace: (traceId: string) => void;
  toggleCompareMode: () => void;
  clearComparison: () => void;
  uploadTrace: (file: File, apiTrace?: OTDRTrace) => Promise<void>;
  updateFilters: (filters: Partial<OTDRFilter>) => void;
  resetFilters: () => void;
  getFilteredTraces: () => OTDRTrace[];
}

// Create the store
const useOTDRStore = create<OTDRState>((set, get) => ({
  traces: mockTraces,
  selectedTrace: mockTraces.length > 0 ? mockTraces[0] : null,
  comparisonTraces: [],
  filters: {
    fiberId: '',
    startDate: '',
    endDate: '',
    search: ''
  },
  loading: false,
  error: null,
  isCompareMode: false,

  // Action to select a trace by ID
  selectTrace: (traceId: string) => {
    const trace = get().traces.find(t => t.id === traceId) || null;
    set({ selectedTrace: trace });
  },
  
  // Action to add a trace to comparison set
  addComparisonTrace: (traceId: string) => {
    const { comparisonTraces, traces } = get();
    const trace = traces.find(t => t.id === traceId);
    
    if (trace && !comparisonTraces.some(t => t.id === traceId)) {
      set({ 
        comparisonTraces: [...comparisonTraces, trace],
        isCompareMode: true 
      });
    }
  },
  
  // Action to remove a trace from comparison
  removeComparisonTrace: (traceId: string) => {
    const { comparisonTraces } = get();
    const updatedTraces = comparisonTraces.filter(t => t.id !== traceId);
    
    set({ 
      comparisonTraces: updatedTraces,
      isCompareMode: updatedTraces.length > 0
    });
  },
  
  // Toggle compare mode
  toggleCompareMode: () => {
    set(state => ({ isCompareMode: !state.isCompareMode }));
  },
  
  // Clear all comparison traces
  clearComparison: () => {
    set({ 
      comparisonTraces: [],
      isCompareMode: false
    });
  },

  // Action to upload a new trace using the Python parser
  uploadTrace: async (file: File, apiTrace?: OTDRTrace) => {
    set({ loading: true, error: null });
    
    try {
      // If we have an API trace, use it directly
      if (apiTrace) {
        // Add the API trace to the store
        set(state => ({ 
          traces: [...state.traces, apiTrace],
          selectedTrace: apiTrace,
          loading: false 
        }));
        return;
      }
      
      // Otherwise, create mock data locally
      const now = new Date();
      const timestamp = now.toISOString();
      const fiberId = file.name.split('_')[0] || `FIBER${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // Mock some events based on file size
      const fiberLength = file.size / 1000; // Using file size as a proxy for fiber length
      const events: OTDREvent[] = [];
      
      // Add starter events
      events.push({
        id: `${Date.now()}-0`,
        type: EventType.CONNECTOR,
        distance: 0.2,
        loss: 0.5,
        reflection: -38,
        description: 'Entry Connector'
      });
      
      // Simulate back reflections and fiber issues
      const mockFiberIssues = [
        { distance: fiberLength * 0.2, type: EventType.SPLICE },
        { distance: fiberLength * 0.4, type: EventType.LOSS },
        { distance: fiberLength * 0.7, type: EventType.CONNECTOR },
        { distance: fiberLength * 0.9, type: EventType.BREAK },
      ];
      
      mockFiberIssues.forEach((issue, i) => {
        const eventId = `${Date.now()}-${i + 1}`;
        
        switch (issue.type) {
          case EventType.SPLICE:
            events.push({
              id: eventId,
              type: EventType.SPLICE,
              distance: issue.distance,
              loss: 0.1,
              reflection: -60,
              description: 'Fusion Splice'
            });
            break;
          case EventType.LOSS:
            events.push({
              id: eventId,
              type: EventType.LOSS,
              distance: issue.distance,
              loss: 0.6,
              reflection: -68,
              description: 'Macrobend'
            });
            break;
          case EventType.CONNECTOR:
            events.push({
              id: eventId,
              type: EventType.CONNECTOR,
              distance: issue.distance,
              loss: 0.4,
              reflection: -35,
              description: 'Patch Panel Connection'
            });
            break;
          case EventType.BREAK:
            events.push({
              id: eventId,
              type: EventType.BREAK,
              distance: issue.distance,
              loss: 40,
              reflection: -15,
              description: 'Fiber Break'
            });
            break;
        }
      });
      
      // Create data points that show a realistic OTDR trace
      const numPoints = 500;
      const distance = Array.from({ length: numPoints }, (_, i) => (i * fiberLength / numPoints));
      
      // Generate power values
      const power = distance.map(dist => {
        // Base linear attenuation
        let value = -0.25 * dist;
        
        // Add some natural fiber noise
        value -= (Math.random() * 0.05);
        
        // Add Rayleigh backscatter curve
        value -= 2 * Math.log(dist + 1) / Math.log(10);
        
        // Add events impact to the trace
        events.forEach(event => {
          if (dist > event.distance) {
            // Apply loss after the event point
            value -= event.loss * (1 - Math.exp(-(dist - event.distance) * 5));
            
            // Add reflection spike near the event
            if (event.reflection > -50 && Math.abs(dist - event.distance) < 0.1) {
              const reflectionImpact = (0.1 - Math.abs(dist - event.distance)) * 
                               Math.max(0, (event.reflection + 80) / 10);
              value += reflectionImpact;
            }
          }
        });
        
        return value;
      });
      
      // Create the trace object
      const newTrace: OTDRTrace = {
        id: `${Date.now()}`,
        fileName: file.name,
        fiberId,
        timestamp,
        distance,
        power,
        events
      };
      
      // Add the new trace to the store
      set(state => ({ 
        traces: [...state.traces, newTrace],
        selectedTrace: newTrace,
        loading: false 
      }));
    } catch (err) {
      set({ 
        loading: false, 
        error: err instanceof Error ? err.message : 'Failed to upload trace' 
      });
    }
  },

  // Action to update filters
  updateFilters: (filters: Partial<OTDRFilter>) => {
    set(state => ({ 
      filters: { ...state.filters, ...filters } 
    }));
  },

  // Action to reset filters to default values
  resetFilters: () => {
    set({ 
      filters: {
        fiberId: '',
        startDate: '',
        endDate: '',
        search: ''
      } 
    });
  },

  // Getter to retrieve filtered traces
  getFilteredTraces: () => {
    const { traces, filters } = get();
    
    return traces.filter(trace => {
      // Apply fiberId filter if specified
      if (filters.fiberId && !trace.fiberId.includes(filters.fiberId)) {
        return false;
      }
      
      // Apply date range filters if specified
      if (filters.startDate && new Date(trace.timestamp) < new Date(filters.startDate)) {
        return false;
      }
      
      if (filters.endDate && new Date(trace.timestamp) > new Date(filters.endDate)) {
        return false;
      }
      
      // Apply search filter across fileName and fiberId
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          trace.fileName.toLowerCase().includes(searchLower) ||
          trace.fiberId.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }
}));

export default useOTDRStore;