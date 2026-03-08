import { v, ConvexError } from "convex/values";
import { query, mutation } from "../_generated/server";
import { requireRole, HQ_ROLES } from "../_helpers/permissions";
import { _logAuditEntry } from "../_helpers/auditLog";

const PLACEMENT_VALUES = ["hero", "category", "flash_sale", "promo"] as const;

// ─── Queries ────────────────────────────────────────────────────────────────

export const listBanners = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, HQ_ROLES);
    const banners = await ctx.db.query("banners").collect();

    const enriched = await Promise.all(
      banners.map(async (b) => ({
        ...b,
        imageUrl: await ctx.storage.getUrl(b.imageStorageId),
      }))
    );

    return enriched.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Public query — used by storefront homepage
export const listActiveBannersByPlacement = query({
  args: {
    placement: v.union(
      v.literal("hero"),
      v.literal("category"),
      v.literal("flash_sale"),
      v.literal("promo")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const banners = await ctx.db
      .query("banners")
      .withIndex("by_active_placement", (q) =>
        q.eq("isActive", true).eq("placement", args.placement)
      )
      .collect();

    const valid = banners.filter(
      (b) =>
        (!b.startDate || b.startDate <= now) &&
        (!b.endDate || b.endDate >= now)
    );

    const enriched = await Promise.all(
      valid.map(async (b) => ({
        _id: b._id,
        title: b.title,
        subtitle: b.subtitle,
        imageUrl: await ctx.storage.getUrl(b.imageStorageId),
        linkUrl: b.linkUrl,
        sortOrder: b.sortOrder,
      }))
    );

    return enriched.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const createBanner = mutation({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    imageStorageId: v.id("_storage"),
    linkUrl: v.optional(v.string()),
    placement: v.union(
      v.literal("hero"),
      v.literal("category"),
      v.literal("flash_sale"),
      v.literal("promo")
    ),
    sortOrder: v.number(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, HQ_ROLES);

    const bannerId = await ctx.db.insert("banners", {
      title: args.title,
      subtitle: args.subtitle,
      imageStorageId: args.imageStorageId,
      linkUrl: args.linkUrl,
      placement: args.placement,
      sortOrder: args.sortOrder,
      isActive: true,
      startDate: args.startDate,
      endDate: args.endDate,
      createdAt: Date.now(),
    });

    await _logAuditEntry(ctx, {
      action: "banner.create",
      userId: user._id,
      entityType: "banners",
      entityId: bannerId,
      after: { title: args.title, placement: args.placement },
    });

    return bannerId;
  },
});

export const updateBanner = mutation({
  args: {
    bannerId: v.id("banners"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    placement: v.optional(
      v.union(
        v.literal("hero"),
        v.literal("category"),
        v.literal("flash_sale"),
        v.literal("promo")
      )
    ),
    sortOrder: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, HQ_ROLES);

    const existing = await ctx.db.get(args.bannerId);
    if (!existing) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Banner not found" });
    }

    const { bannerId, ...updates } = args;
    const patch: Record<string, unknown> = {};
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== (existing as Record<string, unknown>)[key]) {
        before[key] = (existing as Record<string, unknown>)[key];
        after[key] = value;
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length === 0) return;

    await ctx.db.patch(bannerId, patch);

    await _logAuditEntry(ctx, {
      action: "banner.update",
      userId: user._id,
      entityType: "banners",
      entityId: bannerId,
      before,
      after,
    });
  },
});

export const replaceBannerImage = mutation({
  args: {
    bannerId: v.id("banners"),
    newStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, HQ_ROLES);

    const banner = await ctx.db.get(args.bannerId);
    if (!banner) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Banner not found" });
    }

    // Delete old image
    await ctx.storage.delete(banner.imageStorageId);

    await ctx.db.patch(args.bannerId, {
      imageStorageId: args.newStorageId,
    });

    await _logAuditEntry(ctx, {
      action: "banner.replaceImage",
      userId: user._id,
      entityType: "banners",
      entityId: args.bannerId,
    });
  },
});

export const toggleBannerStatus = mutation({
  args: {
    bannerId: v.id("banners"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, HQ_ROLES);

    const banner = await ctx.db.get(args.bannerId);
    if (!banner) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Banner not found" });
    }

    await ctx.db.patch(args.bannerId, { isActive: args.isActive });

    await _logAuditEntry(ctx, {
      action: args.isActive ? "banner.activate" : "banner.deactivate",
      userId: user._id,
      entityType: "banners",
      entityId: args.bannerId,
      before: { isActive: banner.isActive },
      after: { isActive: args.isActive },
    });
  },
});

export const deleteBanner = mutation({
  args: { bannerId: v.id("banners") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, HQ_ROLES);

    const banner = await ctx.db.get(args.bannerId);
    if (!banner) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Banner not found" });
    }

    // Delete image from storage
    await ctx.storage.delete(banner.imageStorageId);

    await ctx.db.delete(args.bannerId);

    await _logAuditEntry(ctx, {
      action: "banner.delete",
      userId: user._id,
      entityType: "banners",
      entityId: args.bannerId,
      before: { title: banner.title, placement: banner.placement },
    });
  },
});
