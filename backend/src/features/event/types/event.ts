export type EventType = 'practice' | 'meeting' | 'performance' | 'workshop' | 'other';

export interface Event {
  id: number;
  title: string;
  type: EventType;
  date: Date;
  time: string;
  location: string;
  description: string | null;
  attendees: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventRequest {
  title: string;
  type: EventType;
  date: string; // ISO date string
  time: string; // HH:mm format
  location: string;
  description?: string;
  clubId?: number; // Optional: if not provided, will use user's primary club
}

export interface UpdateEventRequest {
  title?: string;
  type?: EventType;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
}

export interface EventStats {
  eventsThisMonth: number;
  daysUntilNextEvent: number | null;
  averageAttendance: number;
}

