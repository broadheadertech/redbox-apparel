import { v, ConvexError } from "convex/values";
import { query, mutation, action, internalMutation } from "../_generated/server";
import { internal as _internal } from "../_generated/api";
import { requireRole } from "../_helpers/permissions";
import { ADMIN_ROLES } from "../_helpers/permissions";
import { createHash, randomBytes } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any;

// ─── helpers ─────────────────────────────────────────────────────────────────

function hashPassword(password: string, salt: string): string {
  return createHash("sha256")
    .update(salt + password)
    .digest("hex");
}

function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

// ─── listByBranch ─────────────────────────────────────────────────────────────

export const listByBranch = query({
  args: {
    branchId: v.id("branches"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);

    const accounts = await ctx.db
      .query("cashierAccounts")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .collect();

    const filtered = args.includeInactive
      ? accounts
      : accounts.filter((a) => a.isActive);

    return filtered
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
      .map((a) => ({
        _id: a._id,
        branchId: a.branchId,
        firstName: a.firstName,
        lastName: a.lastName,
        username: a.username,
        isActive: a.isActive,
        createdAt: a.createdAt,
      }));
  },
});

// ─── createCashierAccount (action — needs Node.js crypto) ─────────────────────

export const createCashierAccount = action({
  args: {
    branchId: v.id("branches"),
    firstName: v.string(),
    lastName: v.string(),
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHORIZED" });

    if (!args.firstName.trim()) throw new ConvexError("First name is required");
    if (!args.lastName.trim()) throw new ConvexError("Last name is required");
    if (!args.username.trim()) throw new ConvexError("Username is required");
    if (args.password.length < 6)
      throw new ConvexError("Password must be at least 6 characters");

    const salt = generateSalt();
    const passwordHash = hashPassword(args.password, salt);

    return await ctx.runMutation(internal.admin.cashierAccounts._insertCashierAccount, {
      branchId: args.branchId,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      username: args.username.trim().toLowerCase(),
      passwordHash,
      passwordSalt: salt,
      clerkSubject: identity.subject,
    });
  },
});

export const _insertCashierAccount = internalMutation({
  args: {
    branchId: v.id("branches"),
    firstName: v.string(),
    lastName: v.string(),
    username: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    clerkSubject: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkSubject))
      .unique();
    if (!user) throw new ConvexError({ code: "UNAUTHORIZED" });
    if (!ADMIN_ROLES.includes(user.role as "admin"))
      throw new ConvexError({ code: "UNAUTHORIZED" });

    // Username must be unique within the branch
    const existing = await ctx.db
      .query("cashierAccounts")
      .withIndex("by_branch_username", (q) =>
        q.eq("branchId", args.branchId).eq("username", args.username)
      )
      .first();
    if (existing) throw new ConvexError("Username already taken at this branch");

    const id = await ctx.db.insert("cashierAccounts", {
      branchId: args.branchId,
      firstName: args.firstName,
      lastName: args.lastName,
      username: args.username,
      passwordHash: args.passwordHash,
      passwordSalt: args.passwordSalt,
      isActive: true,
      createdById: user._id,
      createdAt: Date.now(),
    });

    return { id };
  },
});

// ─── updateCashierAccount ─────────────────────────────────────────────────────

export const updateCashierAccount = mutation({
  args: {
    accountId: v.id("cashierAccounts"),
    firstName: v.string(),
    lastName: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);

    const account = await ctx.db.get(args.accountId);
    if (!account) throw new ConvexError("Account not found");

    const username = args.username.trim().toLowerCase();

    // Check username uniqueness (exclude self)
    if (username !== account.username) {
      const existing = await ctx.db
        .query("cashierAccounts")
        .withIndex("by_branch_username", (q) =>
          q.eq("branchId", account.branchId).eq("username", username)
        )
        .first();
      if (existing) throw new ConvexError("Username already taken at this branch");
    }

    await ctx.db.patch(args.accountId, {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      username,
    });
  },
});

// ─── resetPassword (action — needs Node.js crypto) ───────────────────────────

export const resetPassword = action({
  args: {
    accountId: v.id("cashierAccounts"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHORIZED" });

    if (args.newPassword.length < 6)
      throw new ConvexError("Password must be at least 6 characters");

    const salt = generateSalt();
    const passwordHash = hashPassword(args.newPassword, salt);

    await ctx.runMutation(internal.admin.cashierAccounts._updatePassword, {
      accountId: args.accountId,
      passwordHash,
      passwordSalt: salt,
      clerkSubject: identity.subject,
    });
  },
});

export const _updatePassword = internalMutation({
  args: {
    accountId: v.id("cashierAccounts"),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    clerkSubject: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkSubject))
      .unique();
    if (!user) throw new ConvexError({ code: "UNAUTHORIZED" });
    if (!ADMIN_ROLES.includes(user.role as "admin"))
      throw new ConvexError({ code: "UNAUTHORIZED" });

    const account = await ctx.db.get(args.accountId);
    if (!account) throw new ConvexError("Account not found");

    await ctx.db.patch(args.accountId, {
      passwordHash: args.passwordHash,
      passwordSalt: args.passwordSalt,
    });
  },
});

// ─── deactivate / reactivate ──────────────────────────────────────────────────

export const deactivateCashierAccount = mutation({
  args: { accountId: v.id("cashierAccounts") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new ConvexError("Account not found");
    await ctx.db.patch(args.accountId, { isActive: false });
  },
});

export const reactivateCashierAccount = mutation({
  args: { accountId: v.id("cashierAccounts") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new ConvexError("Account not found");
    await ctx.db.patch(args.accountId, { isActive: true });
  },
});
