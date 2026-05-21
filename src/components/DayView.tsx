import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  Trash2,
  Pencil,
  Plus,
  Search,
  QrCode,
  Video,
} from "lucide-react";
import { Calendar } from "./ui/calendar";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  getDiceBearAvatar,
} from "./ui/avatar";
import { cn } from "./ui/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type DayEventType =
  | "practice"
  | "meeting"
  | "performance"
  | "workshop"
  | "other";

export type AttendeeLike =
  | number
  | { id: number | string; name: string; avatarUrl?: string }[];

export interface DayEvent {
  id: number | string;
  title: string;
  type: DayEventType;
  date: Date;
  /** 24h start, e.g. "09:30" */
  startTime: string;
  /** 24h end, e.g. "11:00" */
  endTime: string;
  location: string;
  description?: string;
  attendees?: AttendeeLike;
  /** Optional minute-offset reminder, default 10 */
  reminderMinutes?: number;
  primaryActionLabel?: string;
}

interface DayViewProps {
  events: DayEvent[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onPrimaryAction?: (event: DayEvent) => void;
  onAddEvent?: () => void;
  onEditEvent?: (event: DayEvent) => void;
  onDeleteEvent?: (event: DayEvent) => void;
  onDuplicateEvent?: (event: DayEvent) => void;
  /** Switch back to monthly view; used by the in-card view selector */
  onSwitchToMonth?: () => void;
  /** When true, the outer page padding is skipped so DayView can sit inside
   *  an already-padded layout. */
  embedded?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const START_HOUR = 8; // 8 AM
const END_HOUR = 19; // 7 PM (inclusive label)
const HOUR_HEIGHT = 72; // px per hour row — generous whitespace
const HOURS: number[] = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i,
);

/** Soft pastel palette. Each tone keeps a thin matching border + sharp text. */
const EVENT_STYLE: Record<
  DayEventType,
  { bg: string; border: string; text: string; subText: string }
> = {
  practice: {
    bg: "bg-blue-50",
    border: "border-blue-200/70",
    text: "text-blue-900",
    subText: "text-blue-700/80",
  },
  meeting: {
    bg: "bg-purple-50",
    border: "border-purple-200/70",
    text: "text-purple-900",
    subText: "text-purple-700/80",
  },
  performance: {
    bg: "bg-red-50",
    border: "border-red-200/70",
    text: "text-red-900",
    subText: "text-red-700/80",
  },
  workshop: {
    bg: "bg-green-50",
    border: "border-green-200/70",
    text: "text-green-900",
    subText: "text-green-700/80",
  },
  // Neutral / default — like "Friday standup" in the reference
  other: {
    bg: "bg-muted/60",
    border: "border-transparent",
    text: "text-foreground",
    subText: "text-muted-foreground",
  },
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function toFractionalHour(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function formatClock(hours: number, minutes: number) {
  const period = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return formatClock(h || 0, m || 0);
}

function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function attendeeCount(a?: AttendeeLike): number {
  if (!a) return 0;
  return Array.isArray(a) ? a.length : a;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function DayView({
  events,
  selectedDate: controlledDate,
  onDateChange,
  onPrimaryAction,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onSwitchToMonth,
  embedded = false,
}: DayViewProps) {
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const selectedDate = controlledDate ?? internalDate;

  const setDate = (d: Date) => {
    setInternalDate(d);
    onDateChange?.(d);
  };

  /* ---------------- Events scoped to the selected day ------------------- */
  const dayEvents = useMemo(
    () => events.filter((e) => isSameDay(e.date, selectedDate)),
    [events, selectedDate],
  );

  /* ---------------- Dates with events (for mini-calendar dots) ----------- */
  const datesWithEvents = useMemo(
    () =>
      events.map(
        (e) => new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate()),
      ),
    [events],
  );

  /* ---------------- Currently-focused event for the detail card --------- */
  const [focusedEventId, setFocusedEventId] = useState<
    DayEvent["id"] | null
  >(null);

  const focusedEvent =
    dayEvents.find((e) => e.id === focusedEventId) ?? dayEvents[0] ?? null;

  /* ---------------- Day navigation -------------------------------------- */
  const shiftDay = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    setDate(next);
  };

  /* ---------------- Current time tracker for the "now" indicator -------- */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const showNowLine = isSameDay(now, selectedDate);
  const nowFractional = now.getHours() + now.getMinutes() / 60;
  const nowOffset = (nowFractional - START_HOUR) * HOUR_HEIGHT;
  const nowVisible =
    showNowLine && nowOffset >= 0 && nowOffset <= HOURS.length * HOUR_HEIGHT;

  /* ---------------- View-mode dropdown ---------------------------------- */
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  /* ---------------------------------------------------------------------- */
  return (
    <div className={cn(embedded ? "" : "p-4 md:p-8")}>
      <Card className="overflow-hidden p-0 gap-0 rounded-[var(--radius)] border-border">
        {/* ─────────────── CARD HEADER ─────────────── */}
        <header className="flex items-center justify-between gap-4 flex-wrap p-4 sm:p-5 border-b border-border">
          {/* Left: date chip + title */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* JAN / 10 chip */}
            <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card px-3 py-1.5 min-w-[52px] shrink-0">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
                {selectedDate
                  .toLocaleDateString(undefined, { month: "short" })
                  .toUpperCase()}
              </span>
              <span className="text-lg font-bold text-foreground leading-tight">
                {selectedDate.getDate()}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                {selectedDate.toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: "long",
                })}
              </p>
            </div>
          </div>

          {/* Right: nav + view selector + add event */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="hidden sm:inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-muted/60 transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Prev / Today / Next nav group */}
            <div className="inline-flex items-stretch rounded-md border border-border overflow-hidden bg-card">
              <button
                type="button"
                className="flex items-center justify-center w-9 h-9 hover:bg-muted/60 transition-colors text-foreground"
                onClick={() => shiftDay(-1)}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="w-px bg-border" />
              <button
                type="button"
                className="px-4 h-9 text-sm text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => setDate(new Date())}
              >
                Today
              </button>
              <div className="w-px bg-border" />
              <button
                type="button"
                className="flex items-center justify-center w-9 h-9 hover:bg-muted/60 transition-colors text-foreground"
                onClick={() => shiftDay(1)}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* View selector */}
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-sm text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => setViewMenuOpen((v) => !v)}
              >
                Day view
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                    viewMenuOpen && "rotate-180",
                  )}
                />
              </button>
              {viewMenuOpen && (
                <>
                  {/* Click-away overlay */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setViewMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 z-20 rounded-md border border-border bg-popover shadow-md overflow-hidden">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/60"
                      disabled
                    >
                      Day view
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      onClick={() => {
                        setViewMenuOpen(false);
                        onSwitchToMonth?.();
                      }}
                    >
                      Month view
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Black "Add event" button — matches theme's --secondary (#171619) */}
            <Button
              onClick={onAddEvent}
              className="h-9 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-3"
            >
              <Plus className="h-4 w-4" />
              Add event
            </Button>
          </div>
        </header>

        {/* ─────────────── BODY: timeline + sidebar ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
          {/* ────── Left: custom daily timeline ────── */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[60px_1fr] min-w-[480px]">
              {/* Hour labels column */}
              <div aria-hidden>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="flex items-start justify-end pr-3 pt-1 text-xs text-muted-foreground"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    {formatHourLabel(h)}
                  </div>
                ))}
              </div>

              {/* Timeline grid */}
              <div
                className="relative border-l border-border"
                style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
              >
                {/* Hour dividers */}
                {HOURS.map((_, i) => (
                  <div
                    key={`hr-${i}`}
                    className="absolute left-0 right-0 border-b border-border/60"
                    style={{ top: `${i * HOUR_HEIGHT}px`, height: 0 }}
                  />
                ))}

                {/* Empty state */}
                {dayEvents.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-sm text-muted-foreground">
                      No events scheduled
                    </p>
                  </div>
                )}

                {/* Event blocks */}
                {dayEvents.map((event) => {
                  const start = toFractionalHour(event.startTime);
                  const end = toFractionalHour(event.endTime);
                  const top =
                    (Math.max(start, START_HOUR) - START_HOUR) * HOUR_HEIGHT;
                  const height =
                    (Math.min(end, END_HOUR + 1) -
                      Math.max(start, START_HOUR)) *
                    HOUR_HEIGHT;
                  if (height <= 0) return null;

                  const style = EVENT_STYLE[event.type];
                  const isFocused = focusedEvent?.id === event.id;
                  const isCompact = height < 44;

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setFocusedEventId(event.id)}
                      className={cn(
                        "absolute left-3 right-3 rounded-md border text-left transition-all cursor-pointer",
                        "px-3 py-2",
                        style.bg,
                        style.border,
                        style.text,
                        "hover:shadow-sm",
                        isFocused &&
                          "ring-2 ring-foreground/15 ring-offset-1 ring-offset-background shadow-sm",
                      )}
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(height - 4, 22)}px`,
                      }}
                    >
                      <p className="text-sm font-medium truncate leading-tight">
                        {event.title}
                      </p>
                      {!isCompact && (
                        <p
                          className={cn(
                            "text-xs mt-0.5 truncate",
                            style.subText,
                          )}
                        >
                          {formatTime(event.startTime)}
                        </p>
                      )}
                    </button>
                  );
                })}

                {/* Current time indicator */}
                {nowVisible && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: `${nowOffset}px` }}
                  >
                    {/* time label sitting in the hour gutter */}
                    <span
                      className="absolute -translate-y-1/2 -left-[60px] w-[56px] pr-2 text-right text-[11px] font-medium text-foreground bg-background"
                      style={{ top: 0 }}
                    >
                      {formatClock(now.getHours(), now.getMinutes())}
                    </span>
                    {/* dot + dashed line */}
                    <span className="absolute -translate-y-1/2 -left-1 h-2 w-2 rounded-full bg-foreground" />
                    <div className="border-t border-dashed border-foreground/40" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ────── Right: sidebar (mini-cal + event detail) ────── */}
          <aside className="border-t lg:border-t-0 lg:border-l border-border flex flex-col">
            {/* Mini calendar */}
            <div className="p-3 sm:p-4 border-b border-border">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setDate(d)}
                weekStartsOn={1}
                showOutsideDays
                modifiers={{ hasEvent: datesWithEvents }}
                modifiersClassNames={{
                  hasEvent:
                    "relative after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-foreground",
                }}
                className="p-0"
                classNames={{
                  months: "flex flex-col",
                  month: "flex flex-col gap-2",
                  caption:
                    "flex justify-between pt-1 pb-2 relative items-center w-full px-1",
                  caption_label:
                    "text-sm font-semibold text-foreground absolute left-1/2 -translate-x-1/2",
                  nav: "flex items-center justify-between w-full",
                  nav_button:
                    "size-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors",
                  nav_button_previous: "",
                  nav_button_next: "",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell:
                    "text-muted-foreground rounded-md flex-1 font-normal text-[0.7rem] uppercase tracking-wide pb-1",
                  row: "flex w-full mt-0.5",
                  cell: "relative p-0 text-center text-sm flex-1 focus-within:relative focus-within:z-20",
                  day: "mx-auto size-9 p-0 font-normal text-foreground rounded-full hover:bg-muted/60 aria-selected:opacity-100 relative inline-flex items-center justify-center",
                  day_selected:
                    "ring-1 ring-border bg-card text-foreground hover:bg-muted/60",
                  day_today:
                    "bg-foreground text-background font-semibold hover:bg-foreground hover:text-background",
                  day_outside: "text-muted-foreground/40",
                  day_disabled: "text-muted-foreground opacity-40",
                  day_hidden: "invisible",
                }}
              />
            </div>

            {/* Event detail */}
            <div className="p-4 sm:p-5 flex-1 space-y-4">
              {focusedEvent ? (
                <>
                  {/* Title + action icons */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-foreground leading-tight break-words flex-1 min-w-0">
                      {focusedEvent.title}
                    </h3>
                    <div className="flex items-center gap-0.5 text-muted-foreground shrink-0">
                      <button
                        type="button"
                        className="p-1.5 hover:bg-muted/60 hover:text-foreground rounded-md transition-colors"
                        aria-label="Duplicate"
                        onClick={() => onDuplicateEvent?.(focusedEvent)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 hover:bg-muted/60 hover:text-foreground rounded-md transition-colors"
                        aria-label="Delete"
                        onClick={() => onDeleteEvent?.(focusedEvent)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 hover:bg-muted/60 hover:text-foreground rounded-md transition-colors"
                        aria-label="Edit"
                        onClick={() => onEditEvent?.(focusedEvent)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Meta rows — date, time, reminder */}
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2.5 text-foreground">
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {focusedEvent.date.toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5 text-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {formatTimeRange(
                          focusedEvent.startTime,
                          focusedEvent.endTime,
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5 text-foreground">
                      <Bell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{focusedEvent.reminderMinutes ?? 10} min before</span>
                    </li>
                  </ul>

                  {/* Attendees */}
                  {attendeeCount(focusedEvent.attendees) > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {Array.isArray(focusedEvent.attendees) ? (
                          <div className="flex items-center -space-x-2">
                            {focusedEvent.attendees
                              .slice(0, 5)
                              .map((attendee) => (
                                <Avatar
                                  key={attendee.id}
                                  className="size-7 ring-2 ring-card"
                                >
                                  <AvatarImage
                                    src={
                                      attendee.avatarUrl ??
                                      getDiceBearAvatar(attendee.name)
                                    }
                                    alt={attendee.name}
                                  />
                                  <AvatarFallback className="text-[10px]">
                                    {attendee.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                          </div>
                        ) : (
                          <div className="flex items-center -space-x-2">
                            {Array.from({
                              length: Math.min(
                                attendeeCount(focusedEvent.attendees),
                                5,
                              ),
                            }).map((_, i) => (
                              <Avatar
                                key={i}
                                className="size-7 ring-2 ring-card"
                              >
                                <AvatarImage
                                  src={getDiceBearAvatar(
                                    `${focusedEvent.id}-${i}`,
                                  )}
                                  alt=""
                                />
                                <AvatarFallback className="text-[10px]">
                                  ··
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        )}
                        <span className="text-xs font-medium text-muted-foreground tracking-wide">
                          OR
                        </span>
                        <button
                          type="button"
                          className="size-7 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                          aria-label="Add attendee"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {attendeeCount(focusedEvent.attendees)} guests
                        </span>
                        <span className="mx-1.5 text-border">|</span>
                        <span>
                          {attendeeCount(focusedEvent.attendees)} yes
                        </span>
                        <span className="mx-1.5 text-border">|</span>
                        <span>0 awaiting</span>
                      </p>
                    </div>
                  )}

                  {/* About this event */}
                  {focusedEvent.description && (
                    <div className="space-y-1 pt-2 border-t border-border">
                      <p className="text-sm font-semibold text-foreground">
                        About this event
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {focusedEvent.description}
                      </p>
                    </div>
                  )}

                  {/* Primary action */}
                  {onPrimaryAction && (
                    <Button
                      className="w-full mt-1"
                      onClick={() => onPrimaryAction(focusedEvent)}
                    >
                      {focusedEvent.type === "meeting" ? (
                        <>
                          <Video className="h-4 w-4" />
                          {focusedEvent.primaryActionLabel ?? "Join Meeting"}
                        </>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4" />
                          {focusedEvent.primaryActionLabel ??
                            "Check-in Members"}
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Select an event on the timeline to see its details.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </Card>
    </div>
  );
}

export default DayView;
