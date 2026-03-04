import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * One-time backfill: creates inventoryBatches records for existing inventory
 * that predates the batch tracking system. Uses inventory._creationTime as
 * the receivedAt date.
 *
 * Run from Convex dashboard → Functions → migrations/backfillBatches:run
 */

export const _backfillChunk = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allInventory = await ctx.db.query("inventory").collect();
    const withStock = allInventory.filter((inv) => inv.quantity > 0);

    let created = 0;
    let skipped = 0;

    for (const inv of withStock) {
      // Check if batches already exist for this branch+variant
      const existingBatch = await ctx.db
        .query("inventoryBatches")
        .withIndex("by_branch_variant", (q) =>
          q.eq("branchId", inv.branchId).eq("variantId", inv.variantId)
        )
        .first();

      if (existingBatch) {
        skipped++;
        continue;
      }

      // Get cost price from variant (fallback to 0)
      const variant = await ctx.db.get(inv.variantId);
      const costPrice = variant?.costPriceCentavos ?? 0;

      await ctx.db.insert("inventoryBatches", {
        branchId: inv.branchId,
        variantId: inv.variantId,
        quantity: inv.quantity,
        costPriceCentavos: costPrice,
        receivedAt: inv._creationTime,
        source: "legacy",
        notes: "Backfilled from existing inventory",
        createdAt: Date.now(),
      });

      created++;
    }

    return { created, skipped, total: withStock.length };
  },
});

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<{ created: number; skipped: number; total: number }> => {
    const result = await ctx.runMutation(
      internal.migrations.backfillBatches._backfillChunk
    );
    console.log(
      `Backfill complete: ${result.created} batches created, ${result.skipped} skipped (already had batches), ${result.total} inventory records with stock`
    );
    return result;
  },
});
