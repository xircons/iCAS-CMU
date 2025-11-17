import React from "react";
import { cn } from "./ui/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface MonthCalendarProps {
  currentMonth: Date;
  selectedDate?: Date;
  events: Array<{
    id: number;
    date: Date;
    type: "practice" | "meeting" | "performance" | "workshop" | "other";
    title: string;
  }>;
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
  className?: string;
}

export function MonthCalendar({
  currentMonth,
  selectedDate,
  events,
  onMonthChange,
  onDateSelect,
  className,
}: MonthCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get first day of month and last day
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  // Get day of week for first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // Generate only current month dates
  const dates: Date[] = [];
  
  // Current month days only
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    dates.push(date);
  }

  // Group events by date - normalize all dates to avoid timezone issues
  const eventsByDate = new Map<string, typeof events>();
  events.forEach((event) => {
    // Handle both Date objects and date strings
    const eventDate = event.date instanceof Date 
      ? new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate())
      : new Date(new Date(event.date).getFullYear(), new Date(event.date).getMonth(), new Date(event.date).getDate());
    
    const key = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
    if (!eventsByDate.has(key)) {
      eventsByDate.set(key, []);
    }
    eventsByDate.get(key)!.push(event);
  });

  // Get events for a specific date - normalize date for comparison
  const getEventsForDate = (date: Date): typeof events => {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const key = `${normalizedDate.getFullYear()}-${normalizedDate.getMonth()}-${normalizedDate.getDate()}`;
    return eventsByDate.get(key) || [];
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    return date.getTime() === today.getTime();
  };

  // Check if date is selected
  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return date.getTime() === selected.getTime();
  };

  // Check if date is past
  const isPast = (date: Date): boolean => {
    return date < today;
  };

  // Get event type color matching the upcoming events section
  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case "practice":
        return "bg-blue-100 text-blue-700 hover:bg-blue-200";
      case "meeting":
        return "bg-purple-100 text-purple-700 hover:bg-purple-200";
      case "performance":
        return "bg-red-100 text-red-700 hover:bg-red-200";
      case "workshop":
        return "bg-green-100 text-green-700 hover:bg-green-200";
      case "other":
        return "bg-gray-100 text-gray-700 hover:bg-gray-200";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };


  return (
    <div className={cn("w-full", className)} style={{ display: 'block' }}>
      {/* Days of Week Header */}
      <div 
        className="grid gap-0.5 sm:gap-1 mb-1 sm:mb-2" 
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
      >
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
          <div
            key={index}
            className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div 
        className="grid gap-0.5 sm:gap-1" 
        style={{ 
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gridAutoRows: '1fr',
          minHeight: 'calc(6 * (80px + 0.5px))', // 6 rows × (cell height + gap) for mobile
        }}
      >
        {/* Empty cells for days before the first day of month */}
        {Array.from({ length: firstDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="min-h-[80px] h-[80px] sm:min-h-[100px] sm:h-[100px] md:min-h-[130px] md:h-[130px]" />
        ))}
        
        {/* Current month dates */}
        {dates.map((date, index) => {
          const dateEvents = getEventsForDate(date);
          const isTodayDate = isToday(date);
          const isSelectedDate = isSelected(date);
          const isPastDate = isPast(date);
          
          // Limit visible events to 3, show "+N more" if more exist
          const visibleEvents = dateEvents.slice(0, 3);
          const remainingCount = dateEvents.length - 3;

          return (
            <div
              key={index}
              onClick={() => onDateSelect(date)}
              className={cn(
                "min-h-[80px] h-[80px] sm:min-h-[100px] sm:h-[100px] md:min-h-[130px] md:h-[130px]",
                "p-0.5 sm:p-1 md:p-1.5 border rounded-md cursor-pointer transition-colors flex flex-col",
                "hover:bg-gray-50 active:bg-gray-100",
                isTodayDate && "border-2",
                isSelectedDate && !isTodayDate && "bg-gray-100",
                isPastDate && "opacity-70"
              )}
              style={isTodayDate ? { 
                backgroundColor: '#9F76B3',
                borderColor: '#9F76B3'
              } : isSelectedDate && !isTodayDate ? {
                backgroundColor: '#e5e7eb',
                borderColor: '#d1d5db'
              } : {}}
            >
              {/* Date Number */}
              <div className={cn(
                "text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 md:mb-1.5 p-0.5 sm:p-1 flex-shrink-0 text-black rounded",
                isTodayDate && "font-bold text-white"
              )}
              style={isTodayDate ? { backgroundColor: '#9F76B3' } : {}}
              >
                {date.getDate()}
              </div>

              {/* Event Indicators */}
              <div className="flex flex-col gap-0 flex-1 overflow-hidden min-h-0">
                {visibleEvents.length > 0 ? (
                  visibleEvents.map((event) => {
                    const eventIsPast = isPastDate;
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "w-full min-h-[14px] sm:min-h-[18px] md:min-h-[20px] rounded px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-0.5 md:py-1 font-normal",
                          "text-[9px] sm:text-[10px] md:text-xs leading-tight sm:leading-snug shadow-sm",
                          "cursor-pointer touch-manipulation",
                          "flex items-center justify-center border",
                          getEventTypeColor(event.type),
                          eventIsPast && "opacity-70"
                        )}
                        title={event.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Select the date when clicking event (same as clicking date grid)
                          onDateSelect(date);
                        }}
                      >
                        <span className="block truncate text-center w-full text-[9px] sm:text-[10px] md:text-xs font-medium">{event.title}</span>
                      </div>
                    );
                  })
                ) : null}
                {remainingCount > 0 && (
                  <div className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground font-medium px-0.5 sm:px-1 mt-0.5 text-center">
                    +{remainingCount}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
