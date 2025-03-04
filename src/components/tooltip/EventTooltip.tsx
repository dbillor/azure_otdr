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
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className={`text-lg font-semibold ${getEventColor(event.type)}`}>
            {event.type.charAt(0).toUpperCase() + event.type.slice(1)} Event Details
          </Dialog.Title>
          
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-600">Event ID:</div>
              <div className="font-medium">{event.id}</div>
              
              <div className="text-gray-600">Distance:</div>
              <div className="font-medium">{event.distance.toFixed(2)} km</div>
              
              <div className="text-gray-600">Loss:</div>
              <div className="font-medium">{event.loss.toFixed(2)} dB</div>
              
              <div className="text-gray-600">Reflection:</div>
              <div className="font-medium">{event.reflection.toFixed(2)} dB</div>
              
              <div className="text-gray-600">Description:</div>
              <div className="font-medium">{event.description || 'No description available'}</div>
              
              <div className="text-gray-600">Status:</div>
              <div className={`font-medium ${severity.color}`}>{severity.label}</div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md text-sm mt-3">
              <p>{getEventExplanation(event.type)}</p>
            </div>
            
            {severity.label !== 'Normal' && (
              <div className={`text-sm ${severity.color === 'text-red-600' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'} p-3 rounded-md`}>
                <p className="font-medium">Recommendation:</p>
                <p>
                  {severity.label === 'Critical' 
                    ? 'Immediate investigation required. This event indicates a possible fiber break or critical failure point.'
                    : 'This event exceeds typical thresholds and should be investigated during next maintenance window.'}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EventTooltip;