"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Package, PackageCheck, Truck, ClipboardCheck,
  AlertTriangle, CheckCircle2, Clock, ArrowRight,
  BarChart3, QrCode, Box,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WarehouseDashboardPage() {
  const approved = useQuery(api.transfers.fulfillment.listApprovedTransfers);
  const packed = useQuery(api.transfers.fulfillment.listPackedTransfers);
  const inTransit = useQuery(api.transfers.fulfillment.listInTransitTransfers);
  const driverAnalytics = useQuery(api.logistics.assignments.getDriverAnalytics, { periodDays: 30 });

  const isLoading = approved === undefined || packed === undefined || inTransit === undefined;

  const overdueCount = driverAnalytics?.activeDeliveries.filter((d) => d.isOverdue).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Warehouse Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Logistics pipeline, deliveries, and warehouse operations
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* ─── Pipeline Cards ─────────────────────────────────────────────── */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Transfer Pipeline</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/warehouse/packing">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <ClipboardCheck className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">{approved.length}</div>
                    <p className="text-xs text-muted-foreground">Awaiting packing</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/warehouse/logistics">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-500/30 bg-blue-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Packed</CardTitle>
                    <PackageCheck className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{packed.length}</div>
                    <p className="text-xs text-muted-foreground">Ready for dispatch</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/warehouse/logistics">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-500/30 bg-purple-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                    <Truck className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">{inTransit.length}</div>
                    <p className="text-xs text-muted-foreground">Being delivered</p>
                  </CardContent>
                </Card>
              </Link>

              <Card className={cn(
                "border-green-500/30 bg-green-500/5",
                overdueCount > 0 && "border-red-500/30 bg-red-500/5"
              )}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {overdueCount > 0 ? "Overdue" : "On Track"}
                  </CardTitle>
                  {overdueCount > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-3xl font-bold",
                    overdueCount > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {overdueCount > 0 ? overdueCount : "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {overdueCount > 0 ? "Deliveries past ETA" : "All deliveries on schedule"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ─── Overdue Alerts ─────────────────────────────────────────────── */}
          {driverAnalytics && driverAnalytics.activeDeliveries.filter((d) => d.isOverdue).length > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-700">Overdue Deliveries</h3>
              </div>
              <div className="space-y-2">
                {driverAnalytics.activeDeliveries
                  .filter((d) => d.isOverdue)
                  .map((d) => (
                    <div key={d.transferId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-red-500" />
                        <span className="font-medium">{d.driverName}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{d.toBranchName}</span>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {d.daysOverdue}d overdue
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ─── Active Deliveries ─────────────────────────────────────────── */}
          {driverAnalytics && driverAnalytics.activeDeliveries.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Active Deliveries</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {driverAnalytics.activeDeliveries.map((d) => (
                  <div key={d.transferId} className={cn(
                    "rounded-lg border p-3",
                    d.isOverdue ? "border-red-500/30" : "border-border"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{d.driverName}</span>
                      {d.driverArrived ? (
                        <Badge className="text-xs bg-green-500">Arrived</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Truck className="h-3 w-3 mr-1" /> En route
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <ArrowRight className="inline h-3 w-3" /> {d.toBranchName}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {d.expectedDeliveryDate ? (
                        <span>
                          ETA: {new Date(d.expectedDeliveryDate).toLocaleDateString()}
                          {d.isOverdue && <span className="text-red-500 ml-1">({d.daysOverdue}d late)</span>}
                        </span>
                      ) : (
                        <span>No ETA set</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Driver Performance (30d) ──────────────────────────────────── */}
          {driverAnalytics && driverAnalytics.rankings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Driver Performance (30d)</h2>
                <Link href="/warehouse/driver-analytics" className="text-xs text-primary hover:underline">
                  View full analytics →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {driverAnalytics.rankings.slice(0, 6).map((driver, i) => (
                  <div key={driver.driverId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                        <span className="font-medium text-sm">{driver.driverName}</span>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        driver.onTimeRate >= 90 ? "text-green-600 border-green-500/30" :
                        driver.onTimeRate >= 70 ? "text-amber-600 border-amber-500/30" :
                        "text-red-600 border-red-500/30"
                      )}>
                        {driver.onTimeRate}% on-time
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{driver.totalDeliveries} deliveries</span>
                      <span>Avg: {driver.avgDeliveryHours}h</span>
                      {driver.late > 0 && <span className="text-red-500">{driver.late} late</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Quick Actions ──────────────────────────────────────────────── */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link
                href="/warehouse/transfer-requests"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Transfer Requests</p>
                  <p className="text-xs text-muted-foreground">Approve or reject</p>
                </div>
              </Link>

              <Link
                href="/warehouse/packing"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <Box className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Box Packing</p>
                  <p className="text-xs text-muted-foreground">Scan items into boxes</p>
                </div>
              </Link>

              <Link
                href="/warehouse/receiving"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Receive Shipments</p>
                  <p className="text-xs text-muted-foreground">Incoming stock</p>
                </div>
              </Link>

              <Link
                href="/warehouse/logistics"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <Truck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Logistics</p>
                  <p className="text-xs text-muted-foreground">Assign drivers & track</p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
