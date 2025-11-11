import api from '../../../config/api';

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
  date: string; // ISO date string (YYYY-MM-DD)
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

export interface EventsResponse {
  success: boolean;
  events: Event[];
}

export interface EventResponse {
  success: boolean;
  event: Event;
}

export interface EventStatsResponse {
  success: boolean;
  stats: EventStats;
}

export const eventApi = {
  /**
   * Get events filtered by user's club memberships
   * @param upcoming - If true, only return future events
   */
  getEvents: async (upcoming?: boolean): Promise<Event[]> => {
    try {
      const params = upcoming ? { upcoming: 'true' } : {};
      const response = await api.get<EventsResponse>('/events', { params });
      
      // Convert date strings to Date objects
      return response.data.events.map(event => ({
        ...event,
        date: new Date(event.date),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      }));
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get event by ID
   */
  getEventById: async (id: number): Promise<Event> => {
    try {
      const response = await api.get<EventResponse>(`/events/${id}`);
      
      // Convert date strings to Date objects
      const event = response.data.event;
      return {
        ...event,
        date: new Date(event.date),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      };
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Create new event (leader/admin only)
   */
  createEvent: async (data: CreateEventRequest): Promise<Event> => {
    try {
      const response = await api.post<EventResponse>('/events', data);
      
      // Convert date strings to Date objects
      const event = response.data.event;
      return {
        ...event,
        date: new Date(event.date),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      };
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Update event (leader/admin or creator)
   */
  updateEvent: async (id: number, data: UpdateEventRequest): Promise<Event> => {
    try {
      const response = await api.put<EventResponse>(`/events/${id}`, data);
      
      // Convert date strings to Date objects
      const event = response.data.event;
      return {
        ...event,
        date: new Date(event.date),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      };
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Delete event (leader/admin or creator)
   */
  deleteEvent: async (id: number): Promise<void> => {
    try {
      await api.delete(`/events/${id}`);
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get event statistics for user's clubs
   */
  getEventStats: async (): Promise<EventStats> => {
    try {
      const response = await api.get<EventStatsResponse>('/events/stats');
      return response.data.stats;
    } catch (error: any) {
      throw error;
    }
  },
};

