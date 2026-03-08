"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowLeft, Search } from "lucide-react";

type GenderKey = "mens" | "womens" | "kids";

function matchesGender(genders: string[], gender: GenderKey): boolean {
  if (genders.includes(gender)) return true;
  if (gender === "kids") {
    return genders.includes("boys") || genders.includes("girls");
  }
  if (genders.includes("unisex")) return true;
  return false;
}

export default function TagCategoriesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tag = decodeURIComponent(params.tag as string);
  const gender = (searchParams.get("gender") as GenderKey) ?? "womens";

  const data = useQuery(api.storefront.homepage.getHomepageData);

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-6 w-6 animate-pulse rounded bg-secondary" />
          <div className="h-6 w-32 animate-pulse rounded bg-secondary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const { categories } = data;

  // Filter: matching tag + matching gender
  const filtered = categories.filter(
    (c) => c.tag === tag && matchesGender(c.genders, gender)
  );

  // Sort alphabetically, but put a "View All" card first
  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

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
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{tag}</span>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No categories found.
        </p>
      )}

      {/* 2-column grid of category cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* View All card */}
        {sorted.length > 0 && (
          <Link
            href={`/categories/${encodeURIComponent(tag)}/products?gender=${gender}`}
            className="flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"
          >
            {sorted[0]?.imageUrl && (
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                <Image
                  src={sorted[0].imageUrl}
                  alt="View All"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            )}
            {!sorted[0]?.imageUrl && (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                <span className="text-lg font-bold text-muted-foreground/40">All</span>
              </div>
            )}
            <span className="text-sm font-medium text-foreground">View All</span>
          </Link>
        )}

        {/* Individual category cards */}
        {sorted.map((cat) => (
          <Link
            key={cat.name}
            href={`/categories/${encodeURIComponent(tag)}/products?gender=${gender}&category=${encodeURIComponent(cat.name)}`}
            className="flex items-center gap-3 rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"
          >
            {cat.imageUrl ? (
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                <span className="text-lg font-bold text-muted-foreground/40">
                  {cat.name[0]}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-foreground">{cat.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
