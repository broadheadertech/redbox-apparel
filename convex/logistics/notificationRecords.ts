import { v } from "convex/values";
import { internalQuery, internalMutation, mutation, query } from "../_generated/server";
import { requireAuth } from "../_helpers/permissions";

// ─── _getTransferContext ───────────────────────────────────────────────────────

export const _getTransferContext = internalQuery({
  args: { transferId: v.id("transfers") },
  handler: async (ctx, args) => {
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) return null;
    const from = await ctx.db.get(transfer.fromBranchId);
    const to   = await ctx.db.get(transfer.toBranchId);
    return {
      fromBranchId:   transfer.fromBranchId,
      toBranchId:     transfer.toBranchId,
      fromBranchName: from?.name ?? "Warehouse",
      toBranchName:   to?.name  ?? "Branch",
      requestedById:  transfer.requestedById,
      driverId:       transfer.driverId ?? null,
    };
  },
});

// ─── _resolveRecipients ────────────────────────────────────────────────────────
// Returns { id, email } for each user who should receive the notification.

export const _resolveRecipients = internalQuery({
  args: {
    type: v.string(),
    requestedById: v.id("users"),
    driverId: v.union(v.id("users"), v.null()),
    fromBranchId: v.id("branches"),
    toBranchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    type UserRole = "admin" | "manager" | "cashier" | "warehouseStaff" | "hqStaff" | "viewer" | "driver" | "supplier";
    async function byRole(...roles: UserRole[]) {
      const all = await Promise.all(
        roles.map((role) =>
          ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", role))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect()
        )
      );
      return all.flat();
    }

    async function byBranch(branchId: typeof args.fromBranchId) {
      return ctx.db
        .query("users")
        .withIndex("by_branch", (q) => q.eq("branchId", branchId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    }

    type User = { _id: typeof args.requestedById; email: string; role: string };
    let users: User[] = [];

    switch (args.type) {
      case "transfer_requested": {
        users = await byRole("warehouseStaff", "hqStaff", "admin");
        break;
      }
      case "transfer_approved": {
        const u = await ctx.db.get(args.requestedById);
        if (u) users = [u];
        break;
      }
      case "transfer_rejected":
      case "transfer_cancelled": {
        const u = await ctx.db.get(args.requestedById);
        if (u) users = [u];
        break;
      }
      case "transfer_packed": {
        users = await byRole("admin", "hqStaff");
        if (args.driverId) {
          const driver = await ctx.db.get(args.driverId);
          if (driver) users = [...users, driver];
        }
        break;
      }
      case "driver_assigned": {
        const destUsers = await byBranch(args.toBranchId);
        const managers  = destUsers.filter((u) => ["manager", "admin", "viewer"].includes(u.role));
        if (args.driverId) {
          const driver = await ctx.db.get(args.driverId);
          users = driver ? [driver, ...managers] : managers;
        } else {
          users = managers;
        }
        break;
      }
      case "driver_in_transit": {
        const destUsers = await byBranch(args.toBranchId);
        users = destUsers.filter((u) => ["manager", "admin", "viewer"].includes(u.role));
        break;
      }
      case "driver_arrived": {
        const destUsers = await byBranch(args.toBranchId);
        users = destUsers.filter((u) => ["manager", "admin", "viewer"].includes(u.role));
        break;
      }
      case "driver_delivered": {
        const destUsers = await byBranch(args.toBranchId);
        const branchMgrs = destUsers.filter((u) => ["manager", "admin", "viewer"].includes(u.role));
        const warehouse  = await byRole("warehouseStaff", "hqStaff");
        users = [...branchMgrs, ...warehouse];
        break;
      }
      case "transfer_confirmed": {
        users = await byRole("warehouseStaff", "hqStaff", "admin");
        break;
      }
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    return users
      .filter((u) => {
        if (seen.has(u._id as string)) return false;
        seen.add(u._id as string);
        return true;
      })
      .map((u) => ({ id: u._id, email: u.email }));
  },
});

// ─── _bulkInsert ──────────────────────────────────────────────────────────────

export const _bulkInsert = internalMutation({
  args: {
    notifications: v.array(
      v.object({
        userId: v.id("users"),
        type: v.union(
          v.literal("transfer_requested"),
          v.literal("transfer_approved"),
          v.literal("transfer_rejected"),
          v.literal("transfer_packed"),
          v.literal("driver_assigned"),
          v.literal("driver_in_transit"),
          v.literal("driver_arrived"),
          v.literal("driver_delivered"),
          v.literal("transfer_confirmed"),
          v.literal("transfer_cancelled")
        ),
        title: v.string(),
        body: v.string(),
        transferId: v.optional(v.id("transfers")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const n of args.notifications) {
      await ctx.db.insert("staffNotifications", { ...n, isRead: false, createdAt: now });
    }
  },
});

// ─── getMyStaffNotifications ──────────────────────────────────────────────────

export const getMyStaffNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return ctx.db
      .query("staffNotifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(30);
  },
});

// ─── markAllRead ──────────────────────────────────────────────────────────────

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const unread = await ctx.db
      .query("staffNotifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
  },
});

// ─── markRead ─────────────────────────────────────────────────────────────────

export const markRead = mutation({
  args: { id: v.id("staffNotifications") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.patch(args.id, { isRead: true });
  },
});
