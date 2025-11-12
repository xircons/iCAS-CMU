import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Calendar } from "lucide-react";
import { useClub } from "../../contexts/ClubContext";
import { MonthCalendar } from "../MonthCalendar";
import { eventApi, type Event } from "../../features/event/api/eventApi";

export function ClubCalendarView() {
  const { club, clubId } = useClub();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!clubId) return;

      try {
        setIsLoading(true);
        // Get all events for user's clubs, then filter by current club
        const allEvents = await eventApi.getEvents();
        
        // Filter events by club - events created by members of this club
        // Note: The API returns events from all user's clubs, so we need to filter
        // by checking if the event creator is a member of this club
        const clubEvents = allEvents.filter((event) => {
          // For now, we'll show all events since the API doesn't directly filter by club
          // In a real implementation, you'd need to check event.clubId or filter server-side
          return true; // Show all events for now
        });
        
        setEvents(clubEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [clubId]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-xl md:text-2xl">Calendar</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {club?.name} - View club events and meetings
        </p>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Club Events</CardTitle>
          <CardDescription>Upcoming events and meetings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading calendar...</p>
            </div>
          ) : (
            <MonthCalendar 
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              events={events.map(event => ({
                id: event.id,
                date: event.date,
                type: event.type,
                title: event.title,
              }))}
              onMonthChange={setCurrentMonth}
              onDateSelect={setSelectedDate}
            />
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events
                .filter(event => {
                  const eventDate = new Date(event.date);
                  eventDate.setHours(0, 0, 0, 0);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return eventDate >= today;
                })
                .sort((a, b) => {
                  const dateA = new Date(a.date).getTime();
                  const dateB = new Date(b.date).getTime();
                  return dateA - dateB;
                })
                .map((event) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString()} at {event.time}
                        </p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground">• {event.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

