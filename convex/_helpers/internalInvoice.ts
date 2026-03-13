import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

/**
 * Get Philippine date for invoice number generation.
 * Same timezone pattern as POS receipt numbering.
 */
function getPhilippineDate(): { datePart: string; startOfDayMs: number } {
  const nowMs = Date.now();
  const phtDate = new Date(nowMs + PHT_OFFSET_MS);
  const year = phtDate.getUTCFullYear();
  const month = String(phtDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(phtDate.getUTCDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;
  const startOfDayUTC =
    Date.UTC(year, phtDate.getUTCMonth(), phtDate.getUTCDate()) - PHT_OFFSET_MS;
  return { datePart, startOfDayMs: startOfDayUTC };
}

/**
 * Generate an internal invoice (packing slip / transfer receipt) for a delivered transfer.
 *
 * Called from confirmTransferDelivery, driverConfirmDelivery, and confirmBoxReceipt.
 * NO prices — this is purely a stock transfer receipt listing items (and boxes if applicable).
 * Idempotent: skips if an invoice already exists for this transfer.
 */
export async function generateInternalInvoice(
  ctx: MutationCtx,
  args: {
    transferId: Id<"transfers">;
    fromBranchId: Id<"branches">;
    toBranchId: Id<"branches">;
    userId: Id<"users">;
  }
): Promise<Id<"internalInvoices"> | null> {
  // Idempotency check
  const existing = await ctx.db
    .query("internalInvoices")
    .withIndex("by_transfer", (q) => q.eq("transferId", args.transferId))
    .first();
  if (existing) return existing._id;

  // Fetch transfer items (receivedQuantity should already be set by caller)
  const transferItems = await ctx.db
    .query("transferItems")
    .withIndex("by_transfer", (q) => q.eq("transferId", args.transferId))
    .collect();

  const lineItems: {
    variantId: Id<"variants">;
    quantity: number;
  }[] = [];

  for (const item of transferItems) {
    const qty = item.receivedQuantity ?? item.packedQuantity ?? 0;
    if (qty <= 0) continue;

    lineItems.push({
      variantId: item.variantId,
      quantity: qty,
    });
  }

  // Skip if nothing was received
  if (lineItems.length === 0) return null;

  // Generate invoice number: INV-YYYYMMDD-XXXX
  const { datePart, startOfDayMs } = getPhilippineDate();
  const todayInvoices = await ctx.db
    .query("internalInvoices")
    .withIndex("by_createdAt", (q) => q.gte("createdAt", startOfDayMs))
    .collect();
  const seq = (todayInvoices.length + 1).toString().padStart(4, "0");
  const invoiceNumber = `INV-${datePart}-${seq}`;

  // Insert invoice header — no pricing, just transfer receipt
  const invoiceId = await ctx.db.insert("internalInvoices", {
    transferId: args.transferId,
    fromBranchId: args.fromBranchId,
    toBranchId: args.toBranchId,
    invoiceNumber,
    subtotalCentavos: 0,
    vatAmountCentavos: 0,
    totalCentavos: 0,
    status: "generated" as const,
    generatedById: args.userId,
    createdAt: Date.now(),
  });

  // Insert line items — no pricing
  for (const line of lineItems) {
    await ctx.db.insert("internalInvoiceItems", {
      invoiceId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitCostCentavos: 0,
      lineTotalCentavos: 0,
    });
  }

  return invoiceId;
}
