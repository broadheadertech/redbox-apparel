"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Truck, Clock, CheckCircle2, AlertTriangle, BarChart3,
  ChevronDown, ChevronUp,
} from "lucide-react";

const PERIOD_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
];

export default function DriverAnalyticsPage() {
  const [periodDays, setPeriodDays] = useState("30");
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const data = useQuery(api.logistics.assignments.getDriverAnalytics, {
    periodDays: parseInt(periodDays),
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Driver Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Delivery performance, on-time rates, and driver rankings.
        </p>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Total Deliveries</p>
            <p className="text-2xl font-bold">{data.totalDeliveriesInPeriod}</p>
          </div>
          <div className={cn(
            "rounded-lg border p-3",
            data.overallOnTimeRate >= 90 ? "bg-green-500/10" :
            data.overallOnTimeRate >= 70 ? "bg-amber-500/10" : "bg-red-500/10"
          )}>
            <p className="text-xs text-muted-foreground">On-Time Rate</p>
            <p className={cn(
              "text-2xl font-bold",
              data.overallOnTimeRate >= 90 ? "text-green-600" :
              data.overallOnTimeRate >= 70 ? "text-amber-600" : "text-red-600"
            )}>{data.overallOnTimeRate}%</p>
          </div>
          <div className="rounded-lg border p-3 bg-card">
            <p className="text-xs text-muted-foreground">Active Drivers</p>
            <p className="text-2xl font-bold">{data.rankings.length}</p>
          </div>
          <div className={cn(
            "rounded-lg border p-3",
            data.activeDeliveries.filter((d) => d.isOverdue).length > 0 ? "bg-red-500/10" : "bg-green-500/10"
          )}>
            <p className="text-xs text-muted-foreground">Overdue Now</p>
            <p className="text-2xl font-bold">
              {data.activeDeliveries.filter((d) => d.isOverdue).length}
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Period</Label>
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Deliveries (overdue highlighted) */}
      {data && data.activeDeliveries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Current Deliveries</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.activeDeliveries.map((d) => (
              <div key={d.transferId} className={cn(
                "rounded-lg border p-3",
                d.isOverdue ? "border-red-500/30 bg-red-500/5" : "bg-card"
              )}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{d.driverName}</span>
                  {d.isOverdue ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" /> {d.daysOverdue}d late
                    </Badge>
                  ) : d.driverArrived ? (
                    <Badge className="text-xs bg-green-500">Arrived</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">En route</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">→ {d.toBranchName}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {d.expectedDeliveryDate ? (
                    <span>ETA: {new Date(d.expectedDeliveryDate).toLocaleDateString()}</span>
                  ) : (
                    <span>No ETA</span>
                  )}
                  {d.expectedDeliveryDays && (
                    <span className="ml-1">({d.expectedDeliveryDays}d window)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driver Rankings Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Driver Rankings</h2>
        <div className="rounded-lg border overflow-hidden">
          {data === undefined ? (
            <div className="p-8 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : data.rankings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground">
              <Truck className="h-10 w-10" />
              <p>No driver deliveries in this period.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Deliveries</TableHead>
                  <TableHead className="text-right">On-Time</TableHead>
                  <TableHead className="text-right">Late</TableHead>
                  <TableHead className="text-right">On-Time Rate</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rankings.map((driver, i) => {
                  const isExpanded = expandedDriver === driver.driverId;
                  return (
                    <>
                      <TableRow
                        key={driver.driverId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedDriver(isExpanded ? null : driver.driverId)}
                      >
                        <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{driver.driverName}</TableCell>
                        <TableCell className="text-right tabular-nums">{driver.totalDeliveries}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-600">{driver.onTime}</TableCell>
                        <TableCell className="text-right tabular-nums text-red-600">{driver.late}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={cn(
                            "text-xs tabular-nums",
                            driver.onTimeRate >= 90 ? "text-green-600 border-green-500/30" :
                            driver.onTimeRate >= 70 ? "text-amber-600 border-amber-500/30" :
                            "text-red-600 border-red-500/30"
                          )}>
                            {driver.onTimeRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {driver.avgDeliveryHours}h
                        </TableCell>
                        <TableCell>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${driver.driverId}-detail`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="px-6 py-3">
                              <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                                Recent Deliveries
                              </p>
                              <div className="space-y-1.5">
                                {driver.recentDeliveries.map((del) => (
                                  <div key={del.transferId} className="flex items-center gap-3 text-sm">
                                    {del.isOnTime ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                    )}
                                    <span className="flex-1 truncate">{del.route}</span>
                                    <span className="text-xs tabular-nums text-muted-foreground">
                                      {del.deliveryTimeHours}h
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(del.deliveredAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
