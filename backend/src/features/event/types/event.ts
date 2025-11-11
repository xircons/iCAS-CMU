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
  reminderEnabled: boolean;
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
  reminderEnabled?: boolean;
}

export interface UpdateEventRequest {
  title?: string;
  type?: EventType;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
  reminderEnabled?: boolean;
}

export interface EventStats {
  eventsThisMonth: number;
  daysUntilNextEvent: number | null;
  averageAttendance: number;
}

