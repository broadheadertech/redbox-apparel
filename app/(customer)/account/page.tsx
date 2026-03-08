"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Package,
  MapPin,
  Heart,
  User,
  ChevronRight,
  LogOut,
  ShoppingBag,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const profile = useQuery(api.storefront.customers.getMyProfile);
  const ensureProfile = useMutation(api.storefront.customers.ensureCustomerProfile);
  const orders = useQuery(api.storefront.orders.getMyOrders, {});
  const { signOut, user } = useClerk();
  const router = useRouter();

  // Auto-create customer profile on first visit
  useEffect(() => {
    if (profile === null && user) {
      ensureProfile().catch(() => {});
    }
  }, [profile, user, ensureProfile]);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <User className="h-16 w-16 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">Sign in to your account</h1>
        <Link
          href="/sign-in"
          className="mt-2 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const activeOrders = orders?.filter((o) =>
    ["pending", "paid", "processing", "shipped"].includes(o.status)
  ) ?? [];

  const menuItems = [
    {
      href: "/account/orders",
      icon: Package,
      label: "My Orders",
      desc: activeOrders.length > 0
        ? `${activeOrders.length} active order${activeOrders.length !== 1 ? "s" : ""}`
        : "View order history",
    },
    {
      href: "/account/addresses",
      icon: MapPin,
      label: "Addresses",
      desc: "Manage delivery addresses",
    },
    {
      href: "/account/wishlist",
      icon: Heart,
      label: "Wishlist",
      desc: "Your saved items",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <User className="h-7 w-7" />
          )}
        </div>
        <div>
          <h1 className="text-lg font-bold">
            {user.firstName ?? ""} {user.lastName ?? ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </div>

      {/* Active orders summary */}
      {activeOrders.length > 0 && (
        <Link
          href="/account/orders"
          className="mt-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4"
        >
          <ShoppingBag className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {activeOrders.length} active order{activeOrders.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Track your deliveries
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      {/* Menu */}
      <div className="mt-6 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
          >
            <item.icon className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut(() => router.push("/browse"))}
        className="mt-8 flex w-full items-center gap-3 rounded-lg p-3 text-sm text-destructive hover:bg-destructive/5"
      >
        <LogOut className="h-5 w-5" />
        Sign Out
      </button>
    </div>
  );
}
