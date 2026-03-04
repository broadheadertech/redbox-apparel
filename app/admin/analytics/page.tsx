"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCentavos(centavos: number): string {
  return `₱${(centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function TrendArrow({
  current,
  previous,
  higherIsBetter = true,
}: {
  current: number;
  previous: number;
  higherIsBetter?: boolean;
}) {
  if (previous === 0 || current === previous) return null;
  const isUp = current > previous;
  const isGood = higherIsBetter ? isUp : !isUp;
  return (
    <span className={isGood ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
      {isUp ? " ↑" : " ↓"}
    </span>
  );
}

function MetricCard({
  title,
  value,
  trendCurrent,
  trendPrevious,
  higherIsBetter,
}: {
  title: string;
  value: string;
  trendCurrent?: number;
  trendPrevious?: number;
  higherIsBetter?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-bold">{value}</p>
        {trendCurrent !== undefined && trendPrevious !== undefined && (
          <TrendArrow
            current={trendCurrent}
            previous={trendPrevious}
            higherIsBetter={higherIsBetter}
          />
        )}
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[confidence] ?? colors.low}`}
    >
      {confidence.toUpperCase()}
    </span>
  );
}

// ─── Payment method colors ────────────────────────────────────────────────────

const PAYMENT_COLORS: Record<string, string> = {
  cash: "hsl(var(--primary))",
  gcash: "#3b82f6",
  maya: "#10b981",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
};

// ─── Date Preset helpers ──────────────────────────────────────────────────────

type DatePreset = "today" | "weekly" | "monthly" | "yearly";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function getPresetMs(preset: DatePreset): { startMs: number; endMs: number; label: string } {
  const PHT = 8 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const nowPht = nowMs + PHT;
  const todayMidnightPht = nowPht - (nowPht % (24 * 60 * 60 * 1000));
  const todayStartMs = todayMidnightPht - PHT;

  if (preset === "today") {
    return { startMs: todayStartMs, endMs: nowMs, label: "Today" };
  }
  if (preset === "weekly") {
    const dayOfWeek = new Date(nowPht).getUTCDay();
    const daysSinceMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return { startMs: todayStartMs - daysSinceMon * 24 * 60 * 60 * 1000, endMs: nowMs, label: "This Week" };
  }
  if (preset === "monthly") {
    const d = new Date(nowPht);
    const monthStartPht = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    return { startMs: monthStartPht - PHT, endMs: nowMs, label: "This Month" };
  }
  // yearly
  const d = new Date(nowPht);
  const yearStartPht = Date.UTC(d.getUTCFullYear(), 0, 1);
  return { startMs: yearStartPht - PHT, endMs: nowMs, label: "This Year" };
}

// ─── Tab Types ────────────────────────────────────────────────────────────────

type AnalyticsTab = "descriptive" | "diagnostic" | "predictive" | "prescriptive";

const ANALYTICS_TABS: { value: AnalyticsTab; label: string; description: string }[] = [
  { value: "descriptive", label: "Descriptive", description: "What happened" },
  { value: "diagnostic", label: "Diagnostic", description: "Why it happened" },
  { value: "predictive", label: "Predictive", description: "What will happen" },
  { value: "prescriptive", label: "Prescriptive", description: "Key insights" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function HQAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("descriptive");
  const [datePreset, setDatePreset] = useState<DatePreset>("weekly");

  const { startMs, endMs, label: periodLabel } = useMemo(() => getPresetMs(datePreset), [datePreset]);

  // Descriptive
  const salesSummary = useQuery(
    api.dashboards.hqDdpAnalytics.getHQSalesSummary,
    activeTab === "descriptive" ? { startMs, endMs } : "skip"
  );
  const topProducts = useQuery(
    api.dashboards.hqDdpAnalytics.getHQTopSellingProducts,
    activeTab === "descriptive" ? { startMs, endMs } : "skip"
  );
  const inventoryHealth = useQuery(
    api.dashboards.hqAnalytics.getHQInventoryHealth,
    activeTab === "descriptive" ? {} : "skip"
  );
  const paymentBreakdown = useQuery(
    api.dashboards.hqDdpAnalytics.getHQPaymentMethodBreakdown,
    activeTab === "descriptive" ? { startMs, endMs } : "skip"
  );

  // Diagnostic
  const velocity = useQuery(
    api.dashboards.hqDdpAnalytics.getHQProductVelocity,
    activeTab === "diagnostic" ? { startMs, endMs } : "skip"
  );
  const demandGap = useQuery(
    api.dashboards.hqDdpAnalytics.getHQDemandGapAnalysis,
    activeTab === "diagnostic" ? { startMs, endMs } : "skip"
  );
  const transferEff = useQuery(
    api.dashboards.hqDdpAnalytics.getHQTransferEfficiency,
    activeTab === "diagnostic" ? {} : "skip"
  );

  // Predictive
  const restockSuggestions = useQuery(
    api.dashboards.hqDdpAnalytics.getHQRestockSuggestions,
    activeTab === "predictive" ? {} : "skip"
  );
  const projectedRevenue = useQuery(
    api.dashboards.hqDdpAnalytics.getHQProjectedRevenue,
    activeTab === "predictive" ? {} : "skip"
  );
  const demandForecast = useQuery(
    api.dashboards.hqDdpAnalytics.getHQDemandForecast,
    activeTab === "predictive" ? { startMs, endMs } : "skip"
  );

  // Prescriptive
  const insightsSnapshot = useQuery(
    api.dashboards.hqDdpAnalytics.getInsightsSnapshot,
    activeTab === "prescriptive" ? { startMs, endMs } : "skip"
  );
  const [insightsText, setInsightsText] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generateInsights = useCallback(async () => {
    if (!insightsSnapshot) return;
    setInsightsText("");
    setInsightsError(null);
    setInsightsLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/analytics/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(insightsSnapshot),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setInsightsText(accumulated);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setInsightsError(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setInsightsLoading(false);
    }
  }, [insightsSnapshot]);

  const todayLabel = new Date().toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Whole-business DDP analytics across all branches &middot; {todayLabel}
          </p>
        </div>

        {/* Date preset pills */}
        <div className="flex gap-1.5 flex-wrap">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDatePreset(p.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                datePreset === p.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* DDP Tabs */}
      <div className="flex gap-2">
        {ANALYTICS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors",
              activeTab === tab.value
                ? "border-primary bg-primary/5"
                : "border-muted bg-background hover:bg-muted/50"
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold",
                activeTab === tab.value ? "text-primary" : "text-foreground"
              )}
            >
              {tab.label}
            </span>
            <span className="text-xs text-muted-foreground">{tab.description}</span>
          </button>
        ))}
      </div>

      {/* ═══ DESCRIPTIVE TAB ══════════════════════════════════════════════ */}
      {activeTab === "descriptive" && (
        <div className="space-y-6">
          {/* Sales Summary */}
          {salesSummary === undefined ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : !salesSummary ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title={`Total Revenue (${periodLabel})`}
                value={formatCentavos(salesSummary.thisWeek.revenueCentavos)}
                trendCurrent={salesSummary.thisWeek.revenueCentavos}
                trendPrevious={salesSummary.lastWeek.revenueCentavos}
                higherIsBetter
              />
              <MetricCard
                title={`Transactions (${periodLabel})`}
                value={String(salesSummary.thisWeek.transactionCount)}
                trendCurrent={salesSummary.thisWeek.transactionCount}
                trendPrevious={salesSummary.lastWeek.transactionCount}
                higherIsBetter
              />
              <MetricCard
                title={`Items Sold (${periodLabel})`}
                value={String(salesSummary.thisWeek.itemsSold)}
                trendCurrent={salesSummary.thisWeek.itemsSold}
                trendPrevious={salesSummary.lastWeek.itemsSold}
                higherIsBetter
              />
              <MetricCard
                title="Avg Transaction"
                value={formatCentavos(salesSummary.thisWeek.avgTxnValueCentavos)}
                trendCurrent={salesSummary.thisWeek.avgTxnValueCentavos}
                trendPrevious={salesSummary.lastWeek.avgTxnValueCentavos}
                higherIsBetter
              />
            </div>
          )}

          {/* Top Selling Products + Inventory Health side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Products */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Top Selling Products ({periodLabel})</h3>
              {topProducts === undefined ? (
                <Skeleton className="h-48" />
              ) : !topProducts || topProducts.length === 0 ? (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  No sales data for this period
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p, i) => (
                        <tr key={p.variantId} className="border-b last:border-0">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium">{p.styleName}</p>
                            <p className="text-muted-foreground">{p.size} / {p.color}</p>
                          </td>
                          <td className="px-3 py-2 text-right">{p.totalQuantity}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCentavos(p.totalRevenueCentavos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Inventory Health + Payment Methods */}
            <div className="space-y-6">
              {/* Inventory Health */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Inventory Health (All Branches)</h3>
                {inventoryHealth === undefined ? (
                  <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : !inventoryHealth ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-xl font-bold">{inventoryHealth.totals.totalSkus}</p>
                      <p className="text-xs text-muted-foreground">Total SKUs</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-xl font-bold text-green-600">{inventoryHealth.totals.healthy}</p>
                      <p className="text-xs text-muted-foreground">Healthy</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-xl font-bold text-amber-600">{inventoryHealth.totals.lowStock}</p>
                      <p className="text-xs text-muted-foreground">Low Stock</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-xl font-bold text-red-600">{inventoryHealth.totals.outOfStock}</p>
                      <p className="text-xs text-muted-foreground">Out of Stock</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Payment Methods ({periodLabel})</h3>
                {paymentBreakdown === undefined ? (
                  <Skeleton className="h-32" />
                ) : !paymentBreakdown ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  <div className="rounded-lg border bg-card p-4">
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart
                        data={paymentBreakdown.map((p) => ({
                          name: PAYMENT_LABELS[p.method] ?? p.method,
                          revenue: p.revenueCentavos,
                          percentage: p.percentage,
                          method: p.method,
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 4, left: 50, bottom: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
                        <Tooltip
                          formatter={(value: number | undefined) => [
                            value !== undefined ? formatCentavos(value) : "—",
                            "Revenue",
                          ]}
                        />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                          {paymentBreakdown.map((p) => (
                            <Cell
                              key={p.method}
                              fill={PAYMENT_COLORS[p.method] ?? "hsl(var(--muted))"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 justify-center">
                      {paymentBreakdown.map((p) => (
                        <span key={p.method} className="text-xs text-muted-foreground">
                          {PAYMENT_LABELS[p.method] ?? p.method}: {p.percentage}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DIAGNOSTIC TAB ═══════════════════════════════════════════════ */}
      {activeTab === "diagnostic" && (
        <div className="space-y-6">
          {/* Fast & Slow Movers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fast Movers */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-green-700">Fast Movers (All Branches)</h3>
              {velocity === undefined ? (
                <Skeleton className="h-40" />
              ) : !velocity || velocity.fastMovers.length === 0 ? (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  No sales data
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Avg/Day</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {velocity.fastMovers.map((item) => (
                        <tr key={item.variantId} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.styleName}</p>
                            <p className="text-muted-foreground">{item.size} / {item.color}</p>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-green-600">{item.avgDaily}</td>
                          <td className="px-3 py-2 text-right">{item.currentStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Slow Movers */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-700">Slow Movers (All Branches)</h3>
              {velocity === undefined ? (
                <Skeleton className="h-40" />
              ) : !velocity || velocity.slowMovers.length === 0 ? (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  No slow-moving items detected
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Avg/Day</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {velocity.slowMovers.map((item) => (
                        <tr key={item.variantId} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.styleName}</p>
                            <p className="text-muted-foreground">{item.size} / {item.color}</p>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-amber-600">{item.avgDaily}</td>
                          <td className="px-3 py-2 text-right">{item.currentStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Demand Gap + Transfer Efficiency */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Demand Gap */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Demand Gap (All Branches)</h3>
              <p className="text-xs text-muted-foreground">Items customers ask for vs total stock across all branches</p>
              {demandGap === undefined ? (
                <Skeleton className="h-40" />
              ) : !demandGap || demandGap.length === 0 ? (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  No demand gaps detected for this period
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Brand / Design</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Requests</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">In Stock?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demandGap.map((item, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.brand}</p>
                            {item.design && (
                              <p className="text-muted-foreground">
                                {item.design} {item.size && `(${item.size})`}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{item.requestCount}</td>
                          <td className="px-3 py-2 text-center">
                            {item.inStock ? (
                              <span className="text-green-600 font-medium">{item.currentQuantity} units</span>
                            ) : (
                              <span className="text-red-600 font-medium">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Transfer Efficiency */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Transfer Efficiency</h3>
              <p className="text-xs text-muted-foreground">All transfer fulfillment metrics (last 30 days)</p>
              {transferEff === undefined ? (
                <Skeleton className="h-32" />
              ) : !transferEff ? (
                <p className="text-sm text-muted-foreground">No data.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-card p-4 text-center">
                    <p className="text-2xl font-bold">
                      {transferEff.avgFulfillmentHours > 0
                        ? `${transferEff.avgFulfillmentHours}h`
                        : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Fulfillment</p>
                  </div>
                  <div className="rounded-lg border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{transferEff.completedCount}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="rounded-lg border bg-card p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{transferEff.pendingCount}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PREDICTIVE TAB ═══════════════════════════════════════════════ */}
      {activeTab === "predictive" && (
        <div className="space-y-6">
          {/* Revenue Projection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Revenue Projection (All Retail Branches)</h3>
            {projectedRevenue === undefined ? (
              <Skeleton className="h-20" />
            ) : !projectedRevenue ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <div className="rounded-lg border bg-card p-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">This Week So Far ({projectedRevenue.daysElapsed}d)</p>
                    <p className="text-lg font-bold">{formatCentavos(projectedRevenue.currentWeekRevenueCentavos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Average</p>
                    <p className="text-lg font-bold">{formatCentavos(projectedRevenue.dailyAverageCentavos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Projected Week Total</p>
                    <p className="text-lg font-bold text-primary">{formatCentavos(projectedRevenue.projectedWeekTotalCentavos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Week Actual</p>
                    <p className="text-lg font-bold">{formatCentavos(projectedRevenue.lastWeekTotalCentavos)}</p>
                    {projectedRevenue.projectedWeekTotalCentavos > 0 && projectedRevenue.lastWeekTotalCentavos > 0 && (
                      <TrendArrow
                        current={projectedRevenue.projectedWeekTotalCentavos}
                        previous={projectedRevenue.lastWeekTotalCentavos}
                        higherIsBetter
                      />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Across {projectedRevenue.branchCount} retail branches
                </p>
              </div>
            )}
          </div>

          {/* Restock Suggestions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Restock Suggestions (All Branches)</h3>
            {restockSuggestions === undefined ? (
              <Skeleton className="h-48" />
            ) : !restockSuggestions || restockSuggestions.length === 0 ? (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                No active restock suggestions
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Branch</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Stock</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Velocity</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Days Left</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Suggest</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restockSuggestions.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <p className="font-medium">{s.styleName}</p>
                            <p className="text-muted-foreground">{s.sku} &middot; {s.size} / {s.color}</p>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{s.branchName}</td>
                          <td className="px-3 py-2 text-right">
                            {s.currentStock}
                            {s.incomingStock > 0 && (
                              <span className="text-muted-foreground"> (+{s.incomingStock})</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{s.avgDailyVelocity}/day</td>
                          <td className="px-3 py-2 text-right">
                            <span className={s.daysUntilStockout <= 2 ? "text-red-600 font-medium" : s.daysUntilStockout <= 5 ? "text-amber-600 font-medium" : ""}>
                              {s.daysUntilStockout}d
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{s.suggestedQuantity}</td>
                          <td className="px-3 py-2 text-center">
                            <ConfidenceBadge confidence={s.confidence} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Demand Forecast */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Demand Forecast (All Branches)</h3>
            <p className="text-xs text-muted-foreground">Trending items from customer demand logs across all branches</p>
            {demandForecast === undefined ? (
              <Skeleton className="h-40" />
            ) : !demandForecast || demandForecast.length === 0 ? (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                No demand signals for this period
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Brand / Design</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Requests</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Trending</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">In Stock?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandForecast.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.brand}</p>
                          {item.design && <p className="text-muted-foreground">{item.design}</p>}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{item.requestCount}</td>
                        <td className="px-3 py-2 text-center">
                          {item.isTrending ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              TRENDING
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.inStock ? (
                            <span className="text-green-600 font-medium">Yes</span>
                          ) : (
                            <span className="text-red-600 font-medium">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ PRESCRIPTIVE TAB ═════════════════════════════════════════════ */}
      {activeTab === "prescriptive" && (
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">AI-Generated Insights</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Powered by Google Gemini &middot; Based on your {periodLabel.toLowerCase()} analytics data
                  {insightsSnapshot ? ` across ${insightsSnapshot.sales.branchCount} retail branches` : ""}
                </p>
              </div>
              {insightsText && !insightsLoading && (
                <button
                  onClick={generateInsights}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Regenerate
                </button>
              )}
            </div>

            {/* Not yet generated */}
            {!insightsText && !insightsLoading && !insightsError && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                {insightsSnapshot === undefined ? (
                  <Skeleton className="h-10 w-48" />
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      AI will analyze your sales, inventory, demand, and operational data to surface
                      notable patterns and anomalies.
                    </p>
                    <button
                      onClick={generateInsights}
                      disabled={!insightsSnapshot}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      Generate Insights
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Observations only — not financial or business advice
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Loading */}
            {insightsLoading && !insightsText && (
              <div className="flex items-center gap-2 py-8 justify-center">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-sm text-muted-foreground ml-2">Analyzing data...</span>
              </div>
            )}

            {/* Error */}
            {insightsError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 space-y-2">
                <p className="text-sm text-red-800">{insightsError}</p>
                <button
                  onClick={generateInsights}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Streamed insights */}
            {insightsText && (
              <div className="prose prose-sm max-w-none">
                {insightsText.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={i} className="h-2" />;

                  // Bold headers like **Revenue**
                  if (/^\*\*(.+)\*\*$/.test(trimmed)) {
                    const header = trimmed.replace(/\*\*/g, "");
                    return (
                      <h4 key={i} className="text-sm font-semibold mt-4 mb-1 text-foreground">
                        {header}
                      </h4>
                    );
                  }

                  // Bullet points
                  if (/^[-•*]\s/.test(trimmed)) {
                    const text = trimmed.replace(/^[-•*]\s+/, "");
                    return (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground py-0.5">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span dangerouslySetInnerHTML={{
                          __html: text
                            .replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>")
                            .replace(/`(.+?)`/g, "<code class='text-xs bg-muted px-1 py-0.5 rounded'>$1</code>"),
                        }} />
                      </div>
                    );
                  }

                  // Regular text
                  return (
                    <p key={i} className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{
                      __html: trimmed
                        .replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>")
                        .replace(/`(.+?)`/g, "<code class='text-xs bg-muted px-1 py-0.5 rounded'>$1</code>"),
                    }} />
                  );
                })}
                {insightsLoading && (
                  <span className="inline-block h-4 w-1 bg-primary animate-pulse ml-0.5" />
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            These are AI-generated observations based on your analytics data.
            They are not financial or business advice.
          </p>
        </div>
      )}
    </div>
  );
}
