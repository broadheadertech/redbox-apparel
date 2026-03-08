"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowLeft, Package, ChevronRight } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Payment", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  paid: { label: "Paid", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  returned: { label: "Returned", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
};

const TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const orders = useQuery(api.storefront.orders.getMyOrders, {});

  const filteredOrders = orders?.filter((o) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return ["pending", "paid", "processing", "shipped"].includes(o.status);
    if (activeTab === "delivered") return o.status === "delivered";
    if (activeTab === "cancelled") return ["cancelled", "returned", "refunded"].includes(o.status);
    return true;
  }) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Account
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold uppercase">My Orders</h1>

      {/* Tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {orders === undefined && (
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {/* Empty */}
      {orders !== undefined && filteredOrders.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <Package className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No orders found</p>
          <Link
            href="/browse"
            className="mt-2 text-sm text-primary hover:underline"
          >
            Start shopping
          </Link>
        </div>
      )}

      {/* Order list */}
      {filteredOrders.length > 0 && (
        <div className="mt-6 space-y-3">
          {filteredOrders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-muted" };
            return (
              <Link
                key={order._id}
                href={`/account/orders/${order._id}`}
                className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                {/* Image */}
                <div className="relative h-16 w-13 flex-shrink-0 overflow-hidden rounded bg-muted">
                  {order.firstImageUrl ? (
                    <Image
                      src={order.firstImageUrl}
                      alt=""
                      fill
                      sizes="52px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusInfo.color)}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.itemCount} item{order.itemCount !== 1 ? "s" : ""} &middot;{" "}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p className="font-mono text-sm font-medium text-primary">
                    {formatPrice(order.totalCentavos)}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
