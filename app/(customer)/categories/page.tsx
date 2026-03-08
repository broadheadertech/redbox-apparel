"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Gender card config ──────────────────────────────────────────────────────
const GENDER_CARDS = [
  {
    key: "womens",
    label: "Women",
    bg: "bg-gradient-to-br from-pink-50 to-pink-100",
    accent: "text-pink-700",
  },
  {
    key: "mens",
    label: "Men",
    bg: "bg-gradient-to-br from-blue-50 to-blue-100",
    accent: "text-blue-700",
  },
  {
    key: "kids",
    label: "Kids",
    bg: "bg-gradient-to-br from-amber-50 to-amber-100",
    accent: "text-amber-700",
  },
] as const;

type GenderKey = (typeof GENDER_CARDS)[number]["key"];

// Display order for tags
const TAG_ORDER = ["Clothing", "Shoes", "Bags", "Accessories", "Underwear"];

function matchesGender(genders: string[], gender: GenderKey): boolean {
  if (genders.includes(gender)) return true;
  if (gender === "kids") {
    // "kids" matches boys, girls, and "kids" (unisex-kids)
    return genders.includes("boys") || genders.includes("girls");
  }
  // For mens/womens: "unisex" (adult) counts towards both
  if (genders.includes("unisex")) return true;
  return false;
}

/** Get gender-filtered style count for a category */
function getGenderCount(
  genderCounts: Record<string, number>,
  gender: GenderKey
): number {
  let total = genderCounts[gender] ?? 0;
  if (gender === "kids") {
    // kids = kids (unisex-kids) + boys + girls — adult "unisex" does NOT count
    total += genderCounts["boys"] ?? 0;
    total += genderCounts["girls"] ?? 0;
  } else {
    // mens/womens also includes adult "unisex" items
    total += genderCounts["unisex"] ?? 0;
  }
  return total;
}

/** Get count for a specific sub-gender (boys or girls), including kids (unisex-kids) */
function getSubGenderCount(
  genderCounts: Record<string, number>,
  subGender: "boys" | "girls"
): number {
  // "kids" gender = unisex for children, counts towards both boys and girls
  return (genderCounts[subGender] ?? 0) + (genderCounts["kids"] ?? 0);
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const data = useQuery(api.storefront.homepage.getHomepageData);
  const [expanded, setExpanded] = useState<GenderKey | null>(null);

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-secondary"
          />
        ))}
      </div>
    );
  }

  const { categories, brands } = data;

  const toggle = (key: GenderKey) =>
    setExpanded((prev) => (prev === key ? null : key));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      {GENDER_CARDS.map((card) => {
        const isOpen = expanded === card.key;

        // Categories that have products in this gender
        const genderCategories = categories.filter((c) =>
          matchesGender(c.genders, card.key)
        );

        // Brands that have products in this gender
        const genderBrands = brands.filter((b) =>
          matchesGender(b.genders, card.key)
        );

        // Group categories by tag
        const tagGroups = new Map<string, typeof genderCategories>();
        const untagged: typeof genderCategories = [];
        for (const cat of genderCategories) {
          if (cat.tag) {
            const group = tagGroups.get(cat.tag) ?? [];
            group.push(cat);
            tagGroups.set(cat.tag, group);
          } else {
            untagged.push(cat);
          }
        }

        // Sort tag groups by predefined order
        const sortedTags = TAG_ORDER.filter((t) => tagGroups.has(t));
        // Any tags not in TAG_ORDER go at the end
        for (const t of tagGroups.keys()) {
          if (!sortedTags.includes(t)) sortedTags.push(t);
        }

        // Pick a brand image for the card background
        const heroImage =
          genderBrands.find((b) => b.imageUrl)?.imageUrl ?? null;

        return (
          <div key={card.key} className="overflow-hidden rounded-2xl border border-border">
            {/* Card header — always visible */}
            <button
              onClick={() => toggle(card.key)}
              className={cn(
                "relative flex w-full items-center justify-between p-5 transition-colors",
                card.bg
              )}
            >
              <div className="flex items-center gap-2">
                <h2 className={cn("font-display text-2xl font-bold", card.accent)}>
                  {card.label}
                </h2>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform",
                    card.accent,
                    isOpen && "rotate-180"
                  )}
                />
              </div>

              {/* Background image on right side */}
              {heroImage && (
                <div className="absolute right-0 top-0 h-full w-1/3 overflow-hidden">
                  <Image
                    src={heroImage}
                    alt={card.label}
                    fill
                    sizes="200px"
                    className="object-cover object-center opacity-60"
                  />
                  <div
                    className={cn(
                      "absolute inset-0",
                      "bg-gradient-to-r from-transparent to-transparent",
                      "[mask-image:linear-gradient(to_right,transparent,black_30%)]"
                    )}
                  />
                </div>
              )}
            </button>

            {/* Expandable subcategories */}
            {isOpen && (
              <div className="divide-y divide-border bg-card">
                {/* Browse All link */}
                <Link
                  href="/browse"
                  className="flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  Browse All {card.label}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>

                {/* Brands link */}
                <Link
                  href={`/brands?gender=${card.key}`}
                  className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Brands
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {genderBrands.length}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>

                {/* Boys / Girls sub-links (only under Kids) */}
                {card.key === "kids" && (() => {
                  const boysCount = genderCategories.reduce(
                    (sum, c) => sum + getSubGenderCount(c.genderCounts, "boys"), 0
                  );
                  const girlsCount = genderCategories.reduce(
                    (sum, c) => sum + getSubGenderCount(c.genderCounts, "girls"), 0
                  );
                  return (
                    <>
                      <Link
                        href="/browse"
                        className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        Boys
                        <div className="flex items-center gap-2">
                          {boysCount > 0 && (
                            <span className="text-xs text-muted-foreground">{boysCount}</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                      <Link
                        href="/browse"
                        className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        Girls
                        <div className="flex items-center gap-2">
                          {girlsCount > 0 && (
                            <span className="text-xs text-muted-foreground">{girlsCount}</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    </>
                  );
                })()}

                {/* Tag-grouped category rows */}
                {sortedTags.map((tag) => {
                  const tagCats = tagGroups.get(tag) ?? [];
                  const tagCount = tagCats.reduce(
                    (sum, c) => sum + getGenderCount(c.genderCounts, card.key),
                    0
                  );
                  return (
                    <div key={tag}>
                      {/* Tag header row — links to tag detail */}
                      <Link
                        href={`/categories/${encodeURIComponent(tag)}?gender=${card.key}`}
                        className="flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                      >
                        {tag}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {tagCount}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    </div>
                  );
                })}

                {/* Untagged categories shown individually */}
                {untagged.map((cat) => {
                  const catCount = getGenderCount(cat.genderCounts, card.key);
                  return (
                    <Link
                      key={cat.name}
                      href="/browse"
                      className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <div className="flex items-center gap-3">
                        {cat.imageUrl && (
                          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-secondary">
                            <Image
                              src={cat.imageUrl}
                              alt={cat.name}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        {cat.name}
                      </div>
                      <div className="flex items-center gap-2">
                        {catCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {catCount}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}

                {genderCategories.length === 0 && (
                  <div className="px-5 py-4 text-sm text-muted-foreground">
                    No categories yet
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
