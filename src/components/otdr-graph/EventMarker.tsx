import React from 'react';
import { OTDREvent, EventType } from '../../types/otdr';

interface EventMarkerProps {
  event: OTDREvent;
  isSelected: boolean;
  onClick: () => void;
}

const EventMarker: React.FC<EventMarkerProps> = ({ event, isSelected, onClick }) => {
  // Helper function to get event background color based on type
  const getEventBackground = (type: EventType): string => {
    switch (type) {
      case EventType.REFLECTION:
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case EventType.LOSS:
        return 'bg-amber-100 border-amber-300 text-amber-800';
      case EventType.BREAK:
        return 'bg-red-100 border-red-300 text-red-800';
      case EventType.SPLICE:
        return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case EventType.CONNECTOR:
        return 'bg-purple-100 border-purple-300 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };
  
  // Helper function to get event icon based on type
  const getEventIcon = (type: EventType): React.ReactNode => {
    switch (type) {
      case EventType.REFLECTION:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case EventType.LOSS:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
      case EventType.BREAK:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case EventType.SPLICE:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        );
      case EventType.CONNECTOR:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  return (
    <div
      onClick={onClick}
      className={`p-3 border rounded-md cursor-pointer transition-all ${
        getEventBackground(event.type)
      } ${
        isSelected ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-center space-x-2">
        {getEventIcon(event.type)}
        <span className="font-medium">{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</span>
      </div>
      
      <div className="mt-2 text-sm">
        <div className="flex justify-between">
          <span>Distance:</span>
          <span className="font-medium">{event.distance.toFixed(2)} km</span>
        </div>
        
        <div className="flex justify-between">
          <span>Loss:</span>
          <span className="font-medium">{event.loss.toFixed(2)} dB</span>
        </div>
        
        <div className="flex justify-between">
          <span>Reflection:</span>
          <span className="font-medium">{event.reflection.toFixed(2)} dB</span>
        </div>
      </div>
      
      {event.description && (
        <div className="mt-1 text-xs italic truncate">
          {event.description}
        </div>
      )}
    </div>
  );
};

export default EventMarker;