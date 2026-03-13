import { v, ConvexError } from "convex/values";
import { action, internalQuery, query } from "../_generated/server";
import { internal as _internal } from "../_generated/api";
import { withBranchScope } from "../_helpers/withBranchScope";
import { POS_ROLES } from "../_helpers/permissions";
import { createHash } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any;

function hashPassword(password: string, salt: string): string {
  return createHash("sha256")
    .update(salt + password)
    .digest("hex");
}

// ─── _getCashierByUsername (internal) ────────────────────────────────────────
// Used by verifyCashierLogin action to look up the stored hash+salt.

export const _getCashierByUsername = internalQuery({
  args: {
    branchId: v.id("branches"),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cashierAccounts")
      .withIndex("by_branch_username", (q) =>
        q.eq("branchId", args.branchId).eq("username", args.username.toLowerCase())
      )
      .first();
  },
});

// ─── verifyCashierLogin ───────────────────────────────────────────────────────
// Called from the POS ShiftGate login step.
// Returns account info on success, throws on failure.

export const verifyCashierLogin = action({
  args: {
    branchId: v.id("branches"),
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.runQuery(
      internal.cashier.auth._getCashierByUsername,
      { branchId: args.branchId, username: args.username }
    );

    if (!account) {
      throw new ConvexError("Invalid username or password");
    }
    if (!account.isActive) {
      throw new ConvexError("This cashier account has been deactivated");
    }

    const hash = hashPassword(args.password, account.passwordSalt);
    if (hash !== account.passwordHash) {
      throw new ConvexError("Invalid username or password");
    }

    return {
      cashierAccountId: account._id,
      firstName: account.firstName,
      lastName: account.lastName,
      username: account.username,
    };
  },
});

// ─── getPrevShiftHandover ─────────────────────────────────────────────────────
// Returns the most-recently closed shift for this branch so the new cashier
// can count the handover cash before opening their shift.

export const getPrevShiftHandover = query({
  args: {},
  handler: async (ctx) => {
    const scope = await withBranchScope(ctx);
    if (!(POS_ROLES as readonly string[]).includes(scope.user.role)) {
      throw new ConvexError({ code: "UNAUTHORIZED" });
    }

    const branchId = scope.branchId;
    if (!branchId) return null;

    // Most recently closed shift for this branch
    const lastShift = await ctx.db
      .query("cashierShifts")
      .withIndex("by_branch_opened", (q) => q.eq("branchId", branchId))
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "closed"))
      .first();

    if (!lastShift) return null;

    // Resolve cashier name
    let cashierName = "Unknown";
    if (lastShift.cashierAccountId) {
      const account = await ctx.db.get(lastShift.cashierAccountId);
      if (account) cashierName = `${account.firstName} ${account.lastName}`;
    } else {
      const user = await ctx.db.get(lastShift.cashierId);
      if (user) cashierName = user.name ?? "Unknown";
    }

    return {
      shiftId: lastShift._id,
      cashierName,
      openedAt: lastShift.openedAt,
      closedAt: lastShift.closedAt,
      closeType: lastShift.closeType,
      changeFundCentavos: lastShift.changeFundCentavos ?? 0,
      cashFundCentavos: lastShift.cashFundCentavos,
      cashInRegisterCentavos: lastShift.closedCashBalanceCentavos ?? 0,
    };
  },
});
