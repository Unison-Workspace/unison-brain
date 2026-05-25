import { qs } from "../http";
import type { JsonRecord, RequestFn } from "./_request";

export interface CalendarEventCreateInput {
  calendarId: string;
  summary?: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  attendees?: { email: string; displayName?: string }[];
  addMeetLink?: boolean;
  recurrencePreset?: "none" | "daily" | "weekly" | "monthly_nth_weekday" | "annually";
  /** Idempotency key (uuid) — required by the API. */
  requestId: string;
  sendUpdates?: "all" | "none";
}

export interface CalendarApi {
  connection(): Promise<JsonRecord>;
  calendars(): Promise<JsonRecord[]>;
  events(opts: { from: string; to: string; calendarIds?: string[] }): Promise<JsonRecord>;
  event(id: string): Promise<JsonRecord>;
  createEvent(input: CalendarEventCreateInput): Promise<JsonRecord>;
}

export function createCalendarApi(req: RequestFn): CalendarApi {
  return {
    connection: () => req("GET", "/calendar/connection"),
    calendars: () =>
      req<{ calendars: JsonRecord[] }>("GET", "/calendar/calendars").then((d) => d.calendars),
    events: (o) =>
      req<{ events: JsonRecord }>(
        "GET",
        `/calendar/events?${qs({ from: o.from, to: o.to, calendarId: o.calendarIds })}`,
      ).then((d) => d.events),
    event: (id) => req("GET", `/calendar/events/${encodeURIComponent(id)}`),
    createEvent: (input) => req("POST", "/calendar/events", input),
  };
}
