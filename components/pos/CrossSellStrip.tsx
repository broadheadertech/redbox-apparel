"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePOSCart } from "@/components/providers/POSCartProvider";
import { formatCurrency } from "@/lib/formatters";
import { Sparkles, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function CrossSellStrip({ variantIds }: { variantIds: Id<"variants">[] }) {
  const { addItem, updateQuantity, items } = usePOSCart();
  const logAcceptance = useMutation(api.analytics.crossSellAnalytics.logAcceptance);
  const [collapsed, setCollapsed] = useState(false);

  const suggestions = useQuery(
    api.pos.crossSell.getSuggestions,
    variantIds.length > 0 ? { variantIds: variantIds.slice(0, 3), limit: 5 } : "skip"
  );

  // Don't render while loading or when no suggestions
  if (!suggestions || suggestions.length === 0) return null;

  const cartSet = new Set(variantIds.map(String));

  return (
    <div className="mt-3 rounded-lg border bg-muted/30">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Frequently Bought Together
        </div>
        {collapsed
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </button>

      {!collapsed && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-none">
          {suggestions.map((s) => {
            const alreadyInCart = cartSet.has(String(s.variantId));
            const cartItem = items.find((i) => String(i.variantId) === String(s.variantId));

            return (
              <div
                key={String(s.variantId)}
                className={cn(
                  "flex w-32 shrink-0 flex-col rounded-md border bg-background p-2 text-left",
                  alreadyInCart && "opacity-60"
                )}
              >
                <p className="truncate text-xs font-semibold leading-tight">{s.styleName}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {s.size} · {s.color}
                </p>
                <p className="mt-1 text-xs font-bold">{formatCurrency(s.priceCentavos)}</p>
                <p className="text-[10px] text-muted-foreground">Stock: {s.stock}</p>

                <button
                  className={cn(
                    "mt-2 flex w-full items-center justify-center gap-1 rounded py-1 text-[11px] font-medium transition-colors",
                    alreadyInCart
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={() => {
                    if (alreadyInCart && cartItem) {
                      updateQuantity(s.variantId, 1);
                    } else {
                      addItem(s.variantId, s.priceCentavos, s.styleName, s.size, s.color);
                    }
                    // Fire-and-forget — non-blocking analytics
                    logAcceptance({
                      suggestedVariantId: s.variantId,
                      cartVariantIds: variantIds,
                      priceCentavos: s.priceCentavos,
                    }).catch(() => {});
                  }}
                >
                  <Plus className="h-3 w-3" />
                  {alreadyInCart ? `Add (${cartItem?.quantity ?? 0})` : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
