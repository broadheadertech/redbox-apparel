"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Home, Search, Heart, User, ShoppingBag, X, LayoutList } from "lucide-react";
import { Syne, Space_Mono, DM_Sans } from "next/font/google";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { AnnouncementBar } from "@/components/customer/AnnouncementBar";
import { cn } from "@/lib/utils";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const navItems = [
  { href: "/browse", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: LayoutList },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/account", label: "Account", icon: User },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const cartCount = useQuery(api.storefront.cart.getCartItemCount);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <ErrorBoundary>
      <div
        className={cn(
          "theme-customer min-h-screen flex flex-col bg-background text-foreground font-body",
          syne.variable,
          spaceMono.variable,
          dmSans.variable
        )}
      >
        {/* Announcement Bar */}
        <AnnouncementBar />

        {/* Top header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
            {/* Logo */}
            <Link
              href="/browse"
              className="flex-shrink-0 font-display text-lg font-extrabold uppercase tracking-wider text-foreground"
            >
              <span className="text-primary">RED</span>BOX
            </Link>

            {/* Universal search bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex-1"
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Got You Lookin' Great"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-secondary pl-10 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
              )}
            </form>

            {/* Right icons */}
            <div className="flex flex-shrink-0 items-center gap-1">
              {/* Wishlist */}
              <Link
                href="/account/wishlist"
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
                aria-label="Shopping cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {(cartCount ?? 0) > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Desktop nav links */}
          <div className="hidden lg:block border-t border-border">
            <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 h-10">
              <Link
                href="/browse"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === "/browse" || pathname.startsWith("/browse/")
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                Shop
              </Link>
              <Link
                href="/branches"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname.startsWith("/branches")
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                Stores
              </Link>
            </div>
          </div>
        </header>

        {/* Main content — padded bottom for mobile nav */}
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>

        {/* Bottom navigation — mobile only */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card lg:hidden">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-1 text-xs transition-colors",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label === "Cart" && (cartCount ?? 0) > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </ErrorBoundary>
  );
}
