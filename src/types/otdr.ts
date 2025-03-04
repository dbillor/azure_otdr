export interface OTDRTrace {
  id: string;
  fileName: string;
  fiberId: string;
  timestamp: string;
  distance: number[];
  power: number[];
  events: OTDREvent[];
}

export interface OTDREvent {
  id: string;
  type: EventType;
  distance: number;
  loss: number;
  reflection: number;
  description: string;
}

export enum EventType {
  REFLECTION = 'reflection',
  LOSS = 'loss',
  BREAK = 'break',
  SPLICE = 'splice',
  CONNECTOR = 'connector',
  OTHER = 'other'
}

export interface OTDRFilter {
  fiberId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}