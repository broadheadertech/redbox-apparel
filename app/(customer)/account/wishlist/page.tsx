"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Heart, ShoppingBag, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

export default function WishlistPage() {
  const wishlist = useQuery(api.storefront.wishlist.getMyWishlist);
  const removeItem = useMutation(api.storefront.wishlist.removeFromWishlist);
  const addToCart = useMutation(api.storefront.cart.addToCart);

  if (wishlist === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold uppercase">Wishlist</h1>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-2">
              <div className="aspect-[3/4] animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Account
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold uppercase">
        Wishlist ({wishlist.length})
      </h1>

      {wishlist.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <Heart className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Your wishlist is empty</p>
          <Link
            href="/browse"
            className="mt-2 text-sm text-primary hover:underline"
          >
            Browse products
          </Link>
        </div>
      )}

      {wishlist.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {wishlist.map((item) => (
            <div
              key={item._id}
              className="group overflow-hidden rounded-lg border border-border bg-card"
            >
              <Link
                href={`/browse/style/${item.styleId}`}
                className="relative block aspect-[3/4] w-full bg-secondary"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.styleName}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : item.brandLogoUrl ? (
                  <Image
                    src={item.brandLogoUrl}
                    alt={item.brandName}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-contain p-6"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Heart className="h-8 w-8" />
                  </div>
                )}
                {item.totalStock === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="rounded bg-white px-3 py-1 text-xs font-bold text-black">
                      OUT OF STOCK
                    </span>
                  </div>
                )}
              </Link>

              <div className="p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {item.brandName}
                </p>
                <Link
                  href={`/browse/style/${item.styleId}`}
                  className="text-sm font-medium leading-tight line-clamp-2 hover:text-primary"
                >
                  {item.styleName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {item.color} / {item.size}
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-primary">
                  {formatPrice(item.priceCentavos)}
                </p>

                <div className="mt-2 flex gap-2">
                  {item.totalStock > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          await addToCart({ variantId: item.variantId });
                          toast.success("Added to bag!");
                        } catch {
                          toast.error("Failed to add to bag");
                        }
                      }}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      Add to Bag
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        await removeItem({ wishlistItemId: item._id });
                        toast.success("Removed from wishlist");
                      } catch {
                        toast.error("Failed to remove");
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
