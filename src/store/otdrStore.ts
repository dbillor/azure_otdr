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
  uploadTrace: (file: File) => Promise<void>;
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

  // Action to upload a new trace (mock implementation)
  uploadTrace: async (file: File) => {
    set({ loading: true, error: null });
    
    try {
      // In a real implementation, this would send the file to a backend API
      // and parse the response. For now, we'll create a mock trace with some delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate random timestamp within the last 30 days
      const now = new Date();
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const randomHours = Math.floor(Math.random() * 24);
      const randomMinutes = Math.floor(Math.random() * 60);
      const timestamp = new Date(now.getTime() - 
        (randomDaysAgo * 24 * 60 * 60 * 1000) - 
        (randomHours * 60 * 60 * 1000) - 
        (randomMinutes * 60 * 1000)
      ).toISOString();
      
      // Generate random fiber ID
      const fiberId = `FIBER${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // Generate random events based on the fiber length
      const fiberLength = 10 + Math.random() * 20; // 10-30km range
      const numEvents = 2 + Math.floor(Math.random() * 4); // 2-5 events
      
      const events: OTDREvent[] = [];
      
      // Add an entry connector event
      events.push({
        id: `${Date.now()}-0`,
        type: EventType.CONNECTOR,
        distance: 0.2 + Math.random() * 0.3, // 0.2-0.5km
        loss: 0.3 + Math.random() * 0.4,     // 0.3-0.7dB loss
        reflection: -40 + Math.random() * 10, // -40 to -30dB reflection
        description: 'Entry Connector'
      });
      
      // Add middle events
      for (let i = 1; i < numEvents; i++) {
        const eventDistance = (i * fiberLength / numEvents) + (Math.random() * 1.5 - 0.75);
        
        // Randomly select event type
        const eventTypes = [EventType.SPLICE, EventType.LOSS, EventType.CONNECTOR, EventType.REFLECTION];
        const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        // Create event with properties based on type
        let event: OTDREvent;
        
        switch (randomType) {
          case EventType.SPLICE:
            event = {
              id: `${Date.now()}-${i}`,
              type: EventType.SPLICE,
              distance: eventDistance,
              loss: 0.05 + Math.random() * 0.2, // 0.05-0.25dB loss
              reflection: -65 + Math.random() * 10, // -65 to -55dB reflection
              description: 'Fusion Splice'
            };
            break;
          case EventType.CONNECTOR:
            event = {
              id: `${Date.now()}-${i}`,
              type: EventType.CONNECTOR,
              distance: eventDistance,
              loss: 0.3 + Math.random() * 0.5, // 0.3-0.8dB loss
              reflection: -40 + Math.random() * 15, // -40 to -25dB reflection
              description: 'Patch Panel Connection'
            };
            break;
          case EventType.LOSS:
            event = {
              id: `${Date.now()}-${i}`,
              type: EventType.LOSS,
              distance: eventDistance,
              loss: 0.4 + Math.random() * 0.6, // 0.4-1.0dB loss
              reflection: -70 + Math.random() * 10, // -70 to -60dB reflection
              description: Math.random() > 0.5 ? 'Macrobend' : 'Stress Point'
            };
            break;
          default:
            event = {
              id: `${Date.now()}-${i}`,
              type: EventType.REFLECTION,
              distance: eventDistance,
              loss: 0.2 + Math.random() * 0.4, // 0.2-0.6dB loss
              reflection: -45 + Math.random() * 15, // -45 to -30dB reflection
              description: 'Reflective Event'
            };
        }
        
        events.push(event);
      }
      
      // Add a terminal event (end of fiber or break)
      const isBreak = Math.random() > 0.7; // 30% chance of a break
      
      if (isBreak) {
        events.push({
          id: `${Date.now()}-${numEvents}`,
          type: EventType.BREAK,
          distance: fiberLength - 1 - Math.random() * 2, // Just before end
          loss: 35 + Math.random() * 20, // 35-55dB loss (high)
          reflection: -25 + Math.random() * 15, // -25 to -10dB reflection (high)
          description: 'Fiber Break'
        });
      } else {
        events.push({
          id: `${Date.now()}-${numEvents}`,
          type: EventType.REFLECTION,
          distance: fiberLength,
          loss: 20 + Math.random() * 10, // 20-30dB loss
          reflection: -30 + Math.random() * 10, // -30 to -20dB reflection
          description: 'End of Fiber'
        });
      }
      
      // Create the new trace using our generator function
      const newTrace = generateOTDRTrace(
        `${Date.now()}`,
        file.name,
        fiberId,
        timestamp,
        500, // Use higher data point resolution
        events
      );
      
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