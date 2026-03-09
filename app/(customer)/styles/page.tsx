"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { STYLE_COLLECTIONS } from "@/lib/styleCollections";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StylesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/browse"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          aria-label="Back to browse"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            Shop by Style
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse by occasion and lifestyle
          </p>
        </div>
      </div>

      {/* Collection Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STYLE_COLLECTIONS.map((collection) => (
          <Link
            key={collection.slug}
            href={`/styles/${collection.slug}`}
            className="group relative flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-xl border border-border bg-secondary transition-all hover:border-primary/50 hover:shadow-[0_0_30px_rgba(232,25,44,0.15)]"
          >
            {/* Gradient overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${collection.gradient} transition-opacity group-hover:opacity-90`}
            />

            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, white 20px, white 21px)`,
            }} />

            {/* Content */}
            <div className="relative z-10 p-5">
              <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-white sm:text-2xl">
                {collection.name}
              </h2>
              <p className="mt-1 text-sm text-white/70">
                {collection.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {collection.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
