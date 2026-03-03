import { v, ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { withBranchScope } from "../_helpers/withBranchScope";
import { POS_ROLES } from "../_helpers/permissions";
// ─── getActivePromotions ────────────────────────────────────────────────────
// Returns promotions currently active for the cashier's branch.

export const getActivePromotions = query({
  args: {},
  handler: async (ctx) => {
    const scope = await withBranchScope(ctx);
    if (!(POS_ROLES as readonly string[]).includes(scope.user.role)) {
      throw new ConvexError({ code: "UNAUTHORIZED" });
    }

    const branchId = scope.branchId;
    if (!branchId) return [];

    const now = Date.now();

    const allActive = await ctx.db
      .query("promotions")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Filter: within date range AND applicable to this branch
    const applicable = allActive.filter((promo) => {
      if (now < promo.startDate || now > promo.endDate) return false;
      if (promo.branchIds.length > 0 && !promo.branchIds.includes(branchId)) return false;
      return true;
    });

    // Sort by priority (highest first)
    applicable.sort((a, b) => b.priority - a.priority);

    return applicable.map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      promoType: p.promoType,
      percentageValue: p.percentageValue,
      maxDiscountCentavos: p.maxDiscountCentavos,
      fixedAmountCentavos: p.fixedAmountCentavos,
      buyQuantity: p.buyQuantity,
      getQuantity: p.getQuantity,
      minSpendCentavos: p.minSpendCentavos,
      tieredDiscountCentavos: p.tieredDiscountCentavos,
      brandIds: p.brandIds.map(String),
      categoryIds: p.categoryIds.map(String),
      variantIds: p.variantIds.map(String),
      priority: p.priority,
    }));
  },
});

// ─── getVariantHierarchy ────────────────────────────────────────────────────
// Returns brandId + categoryId for each variant in the cart.
// Used by client for promo eligibility preview.

export const getVariantHierarchy = query({
  args: {
    variantIds: v.array(v.id("variants")),
  },
  handler: async (ctx, args) => {
    const scope = await withBranchScope(ctx);
    if (!(POS_ROLES as readonly string[]).includes(scope.user.role)) {
      throw new ConvexError({ code: "UNAUTHORIZED" });
    }

    const result: Record<string, { brandId: string; categoryId: string }> = {};

    // Cache to avoid repeated lookups
    const categoryBrandCache = new Map<string, string>();

    for (const variantId of args.variantIds) {
      const variant = await ctx.db.get(variantId);
      if (!variant) continue;

      const style = await ctx.db.get(variant.styleId);
      if (!style) continue;

      const categoryId = String(style.categoryId);
      let brandId = categoryBrandCache.get(categoryId);

      if (!brandId) {
        const category = await ctx.db.get(style.categoryId);
        if (category) {
          brandId = String(category.brandId);
          categoryBrandCache.set(categoryId, brandId);
        }
      }

      result[String(variantId)] = {
        brandId: brandId ?? "",
        categoryId,
      };
    }

    return result;
  },
});
