import React from 'react';
import { OTDREvent, EventType } from '../../types/otdr';
import { Dialog } from '@headlessui/react';

interface EventTooltipProps {
  event: OTDREvent;
  onClose: () => void;
}

const EventTooltip: React.FC<EventTooltipProps> = ({ event, onClose }) => {
  // Helper function to get event color based on type
  const getEventColor = (type: EventType): string => {
    switch (type) {
      case EventType.REFLECTION:
        return 'text-blue-600';
      case EventType.LOSS:
        return 'text-amber-600';
      case EventType.BREAK:
        return 'text-red-600';
      case EventType.SPLICE:
        return 'text-emerald-600';
      case EventType.CONNECTOR:
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };
  
  // Helper function to get explanation based on event type
  const getEventExplanation = (type: EventType): string => {
    switch (type) {
      case EventType.REFLECTION:
        return 'Reflection events occur when light is reflected back to the OTDR, often at connectors, mechanical splices, or breaks. Higher reflection values indicate potential issues.';
      case EventType.LOSS:
        return 'Loss events represent a drop in power without significant reflection, commonly occurring at bends, splices, or macro-bends in the fiber.';
      case EventType.BREAK:
        return 'Break events indicate a complete or near-complete break in the fiber, resulting in very high loss and potentially high reflection.';
      case EventType.SPLICE:
        return 'Splice events typically show a small loss with minimal reflection, representing fusion splices along the fiber route.';
      case EventType.CONNECTOR:
        return 'Connector events show both loss and reflection, representing mechanical connections between fiber sections.';
      default:
        return 'This is an event detected along the fiber route.';
    }
  };
  
  // Helper function to get severity level
  const getSeverityLevel = (event: OTDREvent): { label: string; color: string } => {
    if (event.type === EventType.BREAK) {
      return { label: 'Critical', color: 'text-red-600' };
    }
    
    if (event.type === EventType.REFLECTION && event.reflection > -25) {
      return { label: 'Warning', color: 'text-amber-600' };
    }
    
    if (event.type === EventType.LOSS && event.loss > 0.5) {
      return { label: 'Warning', color: 'text-amber-600' };
    }
    
    if (event.type === EventType.SPLICE && event.loss > 0.3) {
      return { label: 'Warning', color: 'text-amber-600' };
    }
    
    return { label: 'Normal', color: 'text-green-600' };
  };
  
  const severity = getSeverityLevel(event);
  
  return (
    <div className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80">
      <div className={`text-lg font-semibold ${getEventColor(event.type)}`}>
        {event.type.charAt(0).toUpperCase() + event.type.slice(1)} Event
      </div>
      
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-600">Distance:</div>
          <div className="font-medium">{event.distance.toFixed(2)} km</div>
          
          <div className="text-gray-600">Loss:</div>
          <div className="font-medium text-amber-600 font-bold">{event.loss.toFixed(2)} dB</div>
          
          <div className="text-gray-600">Reflection:</div>
          <div className="font-medium">{event.reflection.toFixed(2)} dB</div>
          
          <div className="text-gray-600">Status:</div>
          <div className={`font-medium ${severity.color}`}>{severity.label}</div>
        </div>
        
        {event.description && (
          <div className="text-xs mt-1 italic">
            {event.description}
          </div>
        )}
        
        {severity.label !== 'Normal' && (
          <div className={`text-xs ${severity.color === 'text-red-600' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'} p-2 rounded-md mt-1`}>
            <p className="font-medium">Recommendation:</p>
            <p>
              {severity.label === 'Critical' 
                ? 'Immediate investigation required.'
                : 'Investigate during next maintenance.'}
            </p>
          </div>
        )}
      </div>
      
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
      >
        ×
      </button>
    </div>
  );
};

export default EventTooltip;