import { query, mutation, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireCustomer(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");

  const customer = await ctx.db
    .query("customers")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!customer) throw new ConvexError("Customer profile not found");
  return customer;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getMyAddresses = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const customer = await ctx.db
      .query("customers")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!customer) return [];

    const addresses = await ctx.db
      .query("customerAddresses")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .collect();

    // Default address first, then by creation date
    return addresses.sort((a: any, b: any) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const addAddress = mutation({
  args: {
    label: v.string(),
    recipientName: v.string(),
    phone: v.string(),
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    province: v.string(),
    postalCode: v.string(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const customer = await requireCustomer(ctx);
    const now = Date.now();

    // If this is default, unset other defaults
    if (args.isDefault) {
      const existing = await ctx.db
        .query("customerAddresses")
        .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
        .collect();
      for (const addr of existing) {
        if (addr.isDefault) {
          await ctx.db.patch(addr._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    // If this is the first address, make it default
    const existingCount = await ctx.db
      .query("customerAddresses")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .collect();
    const makeDefault = args.isDefault || existingCount.length === 0;

    const addressId = await ctx.db.insert("customerAddresses", {
      customerId: customer._id,
      label: args.label,
      recipientName: args.recipientName,
      phone: args.phone,
      addressLine1: args.addressLine1,
      addressLine2: args.addressLine2,
      city: args.city,
      province: args.province,
      postalCode: args.postalCode,
      country: "Philippines",
      isDefault: makeDefault,
      createdAt: now,
      updatedAt: now,
    });

    return addressId;
  },
});

export const updateAddress = mutation({
  args: {
    addressId: v.id("customerAddresses"),
    label: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    phone: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const customer = await requireCustomer(ctx);

    const address = await ctx.db.get(args.addressId);
    if (!address || address.customerId !== customer._id) {
      throw new ConvexError("Address not found");
    }

    const now = Date.now();

    if (args.isDefault) {
      const allAddresses = await ctx.db
        .query("customerAddresses")
        .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
        .collect();
      for (const addr of allAddresses) {
        if (addr.isDefault && addr._id !== args.addressId) {
          await ctx.db.patch(addr._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    const updates: Record<string, any> = { updatedAt: now };
    if (args.label !== undefined) updates.label = args.label;
    if (args.recipientName !== undefined) updates.recipientName = args.recipientName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.addressLine1 !== undefined) updates.addressLine1 = args.addressLine1;
    if (args.addressLine2 !== undefined) updates.addressLine2 = args.addressLine2;
    if (args.city !== undefined) updates.city = args.city;
    if (args.province !== undefined) updates.province = args.province;
    if (args.postalCode !== undefined) updates.postalCode = args.postalCode;
    if (args.isDefault !== undefined) updates.isDefault = args.isDefault;

    await ctx.db.patch(args.addressId, updates);
    return args.addressId;
  },
});

export const deleteAddress = mutation({
  args: { addressId: v.id("customerAddresses") },
  handler: async (ctx, args) => {
    const customer = await requireCustomer(ctx);

    const address = await ctx.db.get(args.addressId);
    if (!address || address.customerId !== customer._id) {
      throw new ConvexError("Address not found");
    }

    await ctx.db.delete(args.addressId);

    // If deleted was default, make the newest one default
    if (address.isDefault) {
      const remaining = await ctx.db
        .query("customerAddresses")
        .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
        .collect();
      if (remaining.length > 0) {
        remaining.sort((a: any, b: any) => b.createdAt - a.createdAt);
        await ctx.db.patch(remaining[0]._id, { isDefault: true, updatedAt: Date.now() });
      }
    }
  },
});
