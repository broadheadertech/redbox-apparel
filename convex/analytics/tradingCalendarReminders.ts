// convex/analytics/tradingCalendarReminders.ts
// Helpers (internalQuery / internalMutation) for trading calendar reminder emails.
// No "use node" — runs in Convex V8 runtime.

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../_generated/server";

// ─── Dedup helpers ────────────────────────────────────────────────────────────

export const _checkReminderSent = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const existing = await ctx.db
      .query("tradingReminders")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return existing !== null;
  },
});

export const _markReminderSent = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await ctx.db.insert("tradingReminders", { key, sentAt: Date.now() });
  },
});

// ─── Data helpers ─────────────────────────────────────────────────────────────

export const _getCustomEventsForDate = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return ctx.db
      .query("tradingEvents")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
  },
});

export const _getStaffEmailRecipients = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter(
        (u) =>
          u.isActive &&
          ["admin", "manager", "hqStaff"].includes(u.role) &&
          u.email
      )
      .map((u) => ({ name: u.name, email: u.email }));
  },
});
