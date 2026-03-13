"use node";
// convex/analytics/tradingCalendarReminderJob.ts
// Daily cron action: sends email reminders for upcoming trading calendar events.
// Fires at 8 AM PHT (00:00 UTC). Checks windows: 7 days, 3 days, 1 day ahead.
// Each window sends at most one email per day (deduped by key in tradingReminders table).

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Resend } from "resend";

// ─── Static PH Events (mirrored from tradingCalendar.ts) ─────────────────────

type StaticEvent = {
  month: number; // 1-12 fixed; 0 = recurring every month
  day: number;
  name: string;
  category: "Holiday" | "Season" | "Event" | "Sale Event" | "Payday";
  demandImpact: "low" | "medium" | "high" | "very_high";
};

const PH_EVENTS: StaticEvent[] = [
  { month: 1,  day: 1,  name: "New Year's Day",                    category: "Holiday",    demandImpact: "high" },
  { month: 2,  day: 14, name: "Valentine's Day",                    category: "Event",      demandImpact: "high" },
  { month: 3,  day: 1,  name: "Graduation Season",                  category: "Season",     demandImpact: "very_high" },
  { month: 4,  day: 9,  name: "Araw ng Kagitingan",                 category: "Holiday",    demandImpact: "low" },
  { month: 5,  day: 1,  name: "Labor Day",                          category: "Holiday",    demandImpact: "medium" },
  { month: 6,  day: 1,  name: "Back to School",                     category: "Season",     demandImpact: "very_high" },
  { month: 6,  day: 12, name: "Independence Day",                   category: "Holiday",    demandImpact: "medium" },
  { month: 8,  day: 21, name: "Ninoy Aquino Day",                   category: "Holiday",    demandImpact: "low" },
  { month: 8,  day: 26, name: "National Heroes Day",                category: "Holiday",    demandImpact: "low" },
  { month: 9,  day: 1,  name: "BER Months Start",                   category: "Season",     demandImpact: "high" },
  { month: 10, day: 31, name: "Halloween / Undas",                  category: "Holiday",    demandImpact: "medium" },
  { month: 11, day: 1,  name: "All Saints' Day",                    category: "Holiday",    demandImpact: "low" },
  { month: 11, day: 11, name: "11.11 Sale",                         category: "Sale Event", demandImpact: "very_high" },
  { month: 11, day: 30, name: "Bonifacio Day",                      category: "Holiday",    demandImpact: "low" },
  { month: 12, day: 8,  name: "Feast of Immaculate Conception",     category: "Holiday",    demandImpact: "low" },
  { month: 12, day: 12, name: "12.12 Sale",                         category: "Sale Event", demandImpact: "very_high" },
  { month: 12, day: 24, name: "Christmas Eve",                      category: "Holiday",    demandImpact: "high" },
  { month: 12, day: 25, name: "Christmas Day",                      category: "Holiday",    demandImpact: "very_high" },
  { month: 12, day: 30, name: "Rizal Day",                          category: "Holiday",    demandImpact: "low" },
  { month: 12, day: 31, name: "New Year's Eve",                     category: "Holiday",    demandImpact: "high" },
  { month: 0,  day: 15, name: "Mid-Month Payday",                   category: "Payday",     demandImpact: "high" },
  { month: 0,  day: 30, name: "End-Month Payday",                   category: "Payday",     demandImpact: "high" },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

const PHT = 8 * 60 * 60 * 1000;

function toYYYYMMDD(year: number, month: number, day: number): string {
  return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

function addDays(yyyymmdd: string, n: number): string {
  const y = parseInt(yyyymmdd.slice(0, 4));
  const m = parseInt(yyyymmdd.slice(4, 6)) - 1;
  const d = parseInt(yyyymmdd.slice(6, 8));
  const dt = new Date(Date.UTC(y, m, d + n));
  return toYYYYMMDD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function todayPHT(): string {
  const dt = new Date(Date.now() + PHT);
  return toYYYYMMDD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function formatReadableDate(yyyymmdd: string): string {
  const y = parseInt(yyyymmdd.slice(0, 4));
  const m = parseInt(yyyymmdd.slice(4, 6)) - 1;
  const d = parseInt(yyyymmdd.slice(6, 8));
  return new Date(Date.UTC(y, m, d)).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStaticEventsForDate(yyyymmdd: string): StaticEvent[] {
  const month = parseInt(yyyymmdd.slice(4, 6));
  const day   = parseInt(yyyymmdd.slice(6, 8));
  return PH_EVENTS.filter(
    (ev) => (ev.month === month || ev.month === 0) && ev.day === day
  );
}

// ─── Planning tips ────────────────────────────────────────────────────────────

type AnyEvent = {
  name: string;
  category: string;
  demandImpact: string;
};

function getPlanningTips(events: AnyEvent[]): string[] {
  const tips: string[] = [];
  for (const ev of events) {
    switch (ev.demandImpact) {
      case "very_high":
        tips.push(`Maximize stock levels for <strong>${ev.name}</strong>. Coordinate with warehouse for emergency restocking.`);
        break;
      case "high":
        tips.push(`Review fast-moving inventory ahead of <strong>${ev.name}</strong>. Expect elevated foot traffic.`);
        break;
      case "medium":
        tips.push(`Monitor stock on popular items for <strong>${ev.name}</strong>.`);
        break;
      default:
        // low impact — no tip
        break;
    }
    switch (ev.category) {
      case "Season":
        tips.push(`Seasonal push: ensure full-size-run availability for in-season collections.`);
        break;
      case "Sale Event":
        tips.push(`Flash sale day: prepare promotional signage, briefing for cashiers, and promos in system.`);
        break;
      case "Payday":
        tips.push(`Payday traffic: highlight premium & new-arrival items. Staff POS with extra cashiers if possible.`);
        break;
    }
  }
  // Deduplicate identical tips
  return [...new Set(tips)];
}

// ─── Email builder ────────────────────────────────────────────────────────────

const IMPACT_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  very_high: { bg: "#fee2e2", text: "#991b1b", label: "Very High Demand" },
  high:      { bg: "#fef3c7", text: "#92400e", label: "High Demand" },
  medium:    { bg: "#dbeafe", text: "#1e40af", label: "Medium Demand" },
  low:       { bg: "#f3f4f6", text: "#6b7280", label: "Low Demand" },
};

function buildEmailHtml(
  window: number,
  dateStr: string,
  staticEvents: StaticEvent[],
  customEvents: { name: string; type: string; notes?: string }[]
): string {
  const readableDate = formatReadableDate(dateStr);
  const windowLabel = window === 1 ? "Tomorrow" : `${window} Days Away`;

  const allEventsHtml = [
    ...staticEvents.map((ev) => {
      const badge = IMPACT_BADGE[ev.demandImpact] ?? IMPACT_BADGE.low;
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span style="font-size:14px;font-weight:600;color:#111827;">${ev.name}</span>
              <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:${badge.bg};color:${badge.text};">${badge.label}</span>
              <span style="font-size:12px;color:#6b7280;">${ev.category}</span>
            </div>
          </td>
        </tr>`;
    }),
    ...customEvents.map((ev) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <div>
              <span style="font-size:14px;font-weight:600;color:#111827;">${ev.name}</span>
              <span style="margin-left:8px;font-size:12px;color:#6b7280;text-transform:capitalize;">${ev.type}</span>
              ${ev.notes ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${ev.notes}</p>` : ""}
            </div>
          </td>
        </tr>`),
  ].join("");

  const tips = getPlanningTips([
    ...staticEvents.map((e) => ({ name: e.name, category: e.category, demandImpact: e.demandImpact })),
    ...customEvents.map((e) => ({ name: e.name, category: e.type, demandImpact: "medium" })),
  ]);

  const tipsHtml = tips.length > 0
    ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#166534;">Planning Recommendations</p>
        <ul style="margin:0;padding-left:18px;">
          ${tips.map((t) => `<li style="font-size:13px;color:#15803d;margin-bottom:6px;">${t}</li>`).join("")}
        </ul>
      </div>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#fff;">
      <!-- Header -->
      <div style="background:#dc2626;padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#fca5a5;letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">Trading Calendar Reminder</p>
        <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700;">${windowLabel}: ${readableDate}</h1>
      </div>

      <!-- Body -->
      <div style="padding:24px;">
        <p style="margin:0 0 16px;font-size:14px;color:#374151;">
          The following events are scheduled <strong>${window === 1 ? "tomorrow" : `in ${window} days`}</strong>.
          Plan your staffing, promotions, and stock levels accordingly.
        </p>

        <!-- Events table -->
        <table style="width:100%;border-collapse:collapse;">
          ${allEventsHtml}
        </table>

        ${tipsHtml}
      </div>

      <!-- Footer -->
      <div style="padding:12px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">
          Redbox Apparel &middot; Automated trading calendar reminder &middot; Sent to admin, manager &amp; HQ staff
        </p>
      </div>
    </div>`;
}

// ─── Main action ──────────────────────────────────────────────────────────────

export const sendTradingReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[tradingReminders] RESEND_API_KEY not set — skipping");
      return;
    }

    const resend = new Resend(apiKey);
    const from   = process.env.RESEND_FROM_EMAIL ?? "RedBox <onboarding@resend.dev>";
    const today  = todayPHT();

    const recipients = await ctx.runQuery(
      internal.analytics.tradingCalendarReminders._getStaffEmailRecipients,
      {}
    );

    if (recipients.length === 0) {
      console.warn("[tradingReminders] No staff email recipients found");
      return;
    }

    const emails = recipients.map((r) => r.email).filter(Boolean) as string[];

    for (const window of [7, 3, 1] as const) {
      try {
        const targetDate = addDays(today, window);
        const dedupKey   = `${targetDate}_${window}d`;

        // Skip if already sent today
        const alreadySent = await ctx.runQuery(
          internal.analytics.tradingCalendarReminders._checkReminderSent,
          { key: dedupKey }
        );
        if (alreadySent) continue;

        const staticEvents  = getStaticEventsForDate(targetDate);
        const customEvents  = await ctx.runQuery(
          internal.analytics.tradingCalendarReminders._getCustomEventsForDate,
          { date: targetDate }
        );

        // Only send if there are actual events
        if (staticEvents.length === 0 && customEvents.length === 0) continue;

        const html = buildEmailHtml(
          window,
          targetDate,
          staticEvents,
          customEvents.map((e) => ({ name: e.name, type: e.type, notes: e.notes }))
        );

        const readableDate = formatReadableDate(targetDate);
        const windowLabel  = window === 1 ? "Tomorrow" : `In ${window} Days`;
        const subject      = `[RedBox] ${windowLabel}: ${staticEvents[0]?.name ?? customEvents[0]?.name ?? "Upcoming Event"} & more — ${readableDate}`;

        await resend.emails.send({ from, to: emails, subject, html });

        await ctx.runMutation(
          internal.analytics.tradingCalendarReminders._markReminderSent,
          { key: dedupKey }
        );

        console.log(`[tradingReminders] Sent ${window}-day reminder for ${targetDate} to ${emails.length} recipients`);
      } catch (err) {
        console.error(`[tradingReminders] Failed for window ${window}:`, err);
        // Continue to next window — one failure shouldn't block others
      }
    }
  },
});
