import { query, mutation, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthenticatedCustomer(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");

  const clerkId = identity.subject;
  const existing = await ctx.db
    .query("customers")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();

  return { identity, clerkId, customer: existing };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const customer = await ctx.db
      .query("customers")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return customer;
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const ensureCustomerProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const clerkId = identity.subject;
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) return existing._id;

    const now = Date.now();
    const customerId = await ctx.db.insert("customers", {
      clerkId,
      email: identity.email ?? "",
      firstName: (identity.givenName as string) ?? "",
      lastName: (identity.familyName as string) ?? "",
      phone: (identity.phoneNumber as string) ?? undefined,
      avatarUrl: (identity.pictureUrl as string) ?? undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return customerId;
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    dateOfBirth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { customer } = await getAuthenticatedCustomer(ctx);
    if (!customer) throw new ConvexError("Customer profile not found");

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;

    await ctx.db.patch(customer._id, updates);
    return customer._id;
  },
});
