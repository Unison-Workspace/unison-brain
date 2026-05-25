import { randomUUID } from "node:crypto";
import type { Command } from "commander";
import { requireClient } from "../client-factory";
import { printJson } from "../output";

export function registerCalendar(program: Command): void {
  const cal = program.command("cal").description("Calendar — events");

  cal
    .command("connection")
    .description("Show the connected calendar account")
    .action(async () => {
      const c = await requireClient();
      printJson(await c.calendar.connection());
    });

  cal
    .command("calendars")
    .description("List calendars")
    .action(async () => {
      const c = await requireClient();
      printJson(await c.calendar.calendars());
    });

  cal
    .command("events")
    .description("List events in a time range")
    .requiredOption("--from <datetime>")
    .requiredOption("--to <datetime>")
    .action(async (o: { from: string; to: string }) => {
      const c = await requireClient();
      printJson(await c.calendar.events({ from: o.from, to: o.to }));
    });

  cal
    .command("event <id>")
    .description("Get an event")
    .action(async (id: string) => {
      const c = await requireClient();
      printJson(await c.calendar.event(id));
    });

  cal
    .command("create-event")
    .description("Create an event")
    .requiredOption("--calendar <id>")
    .requiredOption("--start <datetime>")
    .requiredOption("--end <datetime>")
    .option("--summary <text>")
    .option("--request-id <uuid>", "idempotency key (default: random)")
    .action(
      async (o: {
        calendar: string;
        start: string;
        end: string;
        summary?: string;
        requestId?: string;
      }) => {
        const c = await requireClient();
        printJson(
          await c.calendar.createEvent({
            calendarId: o.calendar,
            startAt: o.start,
            endAt: o.end,
            summary: o.summary,
            requestId: o.requestId ?? randomUUID(),
          }),
        );
      },
    );
}
