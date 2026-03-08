"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowLeft } from "lucide-react";

type GenderKey = "mens" | "womens" | "kids";

const GENDER_LABELS: Record<GenderKey, string> = {
  womens: "Women\u2019s",
  mens: "Men\u2019s",
  kids: "Kids\u2019",
};

function matchesGender(genders: string[], gender: GenderKey): boolean {
  if (genders.includes(gender)) return true;
  if (gender === "kids") {
    return genders.includes("boys") || genders.includes("girls");
  }
  if (genders.includes("unisex")) return true;
  return false;
}

export default function BrandsPage() {
  const searchParams = useSearchParams();
  const gender = (searchParams.get("gender") as GenderKey) ?? "womens";
  const data = useQuery(api.storefront.homepage.getHomepageData);

  const label = GENDER_LABELS[gender] ?? "All";

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-6 w-6 animate-pulse rounded bg-secondary" />
          <div className="h-6 w-48 animate-pulse rounded bg-secondary" />
        </div>
        {/* Hero skeleton */}
        <div className="space-y-4 mb-6">
          <div className="h-48 animate-pulse rounded-xl bg-secondary" />
          <div className="h-48 animate-pulse rounded-xl bg-secondary" />
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const filteredBrands = data.brands.filter((b) =>
    matchesGender(b.genders, gender)
  );

  // First 2 brands → large hero cards, rest → 2-col grid
  const heroBrands = filteredBrands.slice(0, 2);
  const gridBrands = filteredBrands.slice(2);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/categories"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary"
          aria-label="Back to categories"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-lg font-bold">
          {label} Brands App
        </h1>
      </div>

      {filteredBrands.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No brands found for {label.toLowerCase()}.
        </p>
      )}

      {/* Hero brand cards (first 2) */}
      <div className="space-y-4 mb-4">
        {heroBrands.map((brand) => (
          <Link
            key={brand._id}
            href={`/browse/${brand._id}`}
            className="relative block h-48 w-full overflow-hidden rounded-xl bg-secondary sm:h-56"
          >
            {(brand.bannerUrl || brand.imageUrl) && (
              <Image
                src={brand.bannerUrl ?? brand.imageUrl!}
                alt={brand.name}
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="font-display text-2xl font-bold uppercase tracking-tight text-white drop-shadow-lg">
                {brand.name}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Discover More Brands button */}
      {gridBrands.length > 0 && (
        <>
          <div className="mb-4">
            <div className="flex w-full items-center justify-center rounded-none bg-black px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white">
              Discover More Brands &gt;
            </div>
          </div>

          {/* 2-column grid */}
          <div className="grid grid-cols-2 gap-3">
            {gridBrands.map((brand) => (
              <Link
                key={brand._id}
                href={`/browse/${brand._id}`}
                className="group relative block overflow-hidden rounded-xl bg-secondary"
              >
                <div className="relative aspect-[4/3] w-full">
                  {(brand.bannerUrl || brand.imageUrl) ? (
                    <Image
                      src={brand.bannerUrl ?? brand.imageUrl!}
                      alt={brand.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 320px"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <span className="text-2xl font-bold text-muted-foreground/40">
                        {brand.name[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-muted/80 px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    {brand.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
