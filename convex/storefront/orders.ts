import { query, mutation, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RBX-${dateStr}-${rand}`;
}

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

export const getMyOrders = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const customer = await ctx.db
      .query("customers")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!customer) return [];

    let orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .collect();

    if (args.status) {
      orders = orders.filter((o) => o.status === args.status);
    }

    // Sort by newest first
    orders.sort((a, b) => b.createdAt - a.createdAt);

    // Enrich with item count and first item image
    const enriched = await Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        let firstImageUrl: string | null = null;
        if (items.length > 0) {
          const variant = await ctx.db.get(items[0].variantId);
          if (variant) {
            const style = await ctx.db.get(variant.styleId);
            if (style) {
              const images = await ctx.db
                .query("productImages")
                .withIndex("by_style", (q) => q.eq("styleId", style._id))
                .collect();
              const primary = images.find((img) => img.isPrimary);
              if (primary) firstImageUrl = await ctx.storage.getUrl(primary.storageId);
            }
          }
        }

        return {
          ...order,
          itemCount: items.reduce((s, i) => s + i.quantity, 0),
          firstImageUrl,
        };
      })
    );

    return enriched;
  },
});

export const getOrderDetail = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const customer = await ctx.db
      .query("customers")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!customer) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.customerId !== customer._id) return null;

    // Get order items with enriched data
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    const items = await Promise.all(
      orderItems.map(async (oi) => {
        const variant = await ctx.db.get(oi.variantId);
        const style = variant ? await ctx.db.get(variant.styleId) : null;

        let imageUrl: string | null = null;
        if (style) {
          const images = await ctx.db
            .query("productImages")
            .withIndex("by_style", (q) => q.eq("styleId", style._id))
            .collect();
          const primary = images.find((img) => img.isPrimary);
          if (primary) imageUrl = await ctx.storage.getUrl(primary.storageId);
        }

        return {
          ...oi,
          styleName: style?.name ?? "Unknown",
          color: variant?.color ?? "",
          size: variant?.size ?? "",
          imageUrl,
        };
      })
    );

    // Get shipment info
    const shipment = await ctx.db
      .query("shipments")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .unique();

    return {
      ...order,
      items,
      shipment,
    };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const createOrder = mutation({
  args: {
    addressId: v.id("customerAddresses"),
    paymentMethod: v.union(
      v.literal("cod"),
      v.literal("gcash"),
      v.literal("maya"),
      v.literal("card"),
      v.literal("bankTransfer")
    ),
    voucherCode: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const customer = await requireCustomer(ctx);

    // Get address
    const address = await ctx.db.get(args.addressId);
    if (!address || address.customerId !== customer._id) {
      throw new ConvexError("Address not found");
    }

    // Get cart
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .unique();
    if (!cart) throw new ConvexError("Cart is empty");

    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();
    if (cartItems.length === 0) throw new ConvexError("Cart is empty");

    // Build order items and calculate totals
    let subtotalCentavos = 0;
    const orderItemsData: Array<{
      variantId: any;
      quantity: number;
      unitPriceCentavos: number;
      lineTotalCentavos: number;
    }> = [];

    for (const ci of cartItems) {
      const variant = await ctx.db.get(ci.variantId);
      if (!variant || !variant.isActive) {
        throw new ConvexError(`Product "${ci.variantId}" is no longer available`);
      }

      const lineTotal = variant.priceCentavos * ci.quantity;
      subtotalCentavos += lineTotal;

      orderItemsData.push({
        variantId: ci.variantId,
        quantity: ci.quantity,
        unitPriceCentavos: variant.priceCentavos,
        lineTotalCentavos: lineTotal,
      });
    }

    // Calculate shipping (free over P999, else P99)
    const shippingFeeCentavos = subtotalCentavos >= 99900 ? 0 : 9900;

    // VAT calculation (already included in price, 12%)
    const vatAmountCentavos = Math.round(subtotalCentavos - subtotalCentavos / 1.12);

    const now = Date.now();
    const totalCentavos = subtotalCentavos + shippingFeeCentavos;

    // Create order
    const orderId = await ctx.db.insert("orders", {
      customerId: customer._id,
      orderNumber: generateOrderNumber(),
      status: args.paymentMethod === "cod" ? "processing" : "pending",
      subtotalCentavos,
      vatAmountCentavos,
      shippingFeeCentavos,
      discountAmountCentavos: 0,
      totalCentavos,
      shippingAddressId: args.addressId,
      shippingAddress: {
        recipientName: address.recipientName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        province: address.province,
        postalCode: address.postalCode,
        country: address.country,
      },
      paymentMethod: args.paymentMethod,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Create order items
    for (const item of orderItemsData) {
      await ctx.db.insert("orderItems", {
        orderId,
        ...item,
      });
    }

    // Clear cart
    for (const ci of cartItems) {
      await ctx.db.delete(ci._id);
    }
    await ctx.db.patch(cart._id, { updatedAt: now });

    const order = await ctx.db.get(orderId);
    return { orderId, orderNumber: order!.orderNumber };
  },
});

export const cancelOrder = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const customer = await requireCustomer(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order || order.customerId !== customer._id) {
      throw new ConvexError("Order not found");
    }

    const cancellableStatuses = ["pending", "paid", "processing"];
    if (!cancellableStatuses.includes(order.status)) {
      throw new ConvexError("Order cannot be cancelled at this stage");
    }

    await ctx.db.patch(args.orderId, {
      status: "cancelled",
      cancelledAt: Date.now(),
      cancelReason: args.reason ?? "Cancelled by customer",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
