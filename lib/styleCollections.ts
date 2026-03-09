export const STYLE_COLLECTIONS = [
  {
    slug: "street-style",
    name: "Street Style",
    description: "Urban fits for the bold and fearless",
    tags: ["streetwear", "urban", "casual"],
    gradient: "from-red-600/80 via-red-900/60 to-black/80",
  },
  {
    slug: "office-ready",
    name: "Office Ready",
    description: "Polished looks for the modern professional",
    tags: ["formal", "business", "polo"],
    gradient: "from-slate-700/80 via-slate-900/60 to-black/80",
  },
  {
    slug: "weekend-vibes",
    name: "Weekend Vibes",
    description: "Relaxed styles for your off-duty days",
    tags: ["casual", "comfort", "relaxed"],
    gradient: "from-amber-600/80 via-orange-900/60 to-black/80",
  },
  {
    slug: "athletic",
    name: "Athletic",
    description: "Performance-ready gear for every workout",
    tags: ["sport", "gym", "active"],
    gradient: "from-emerald-600/80 via-emerald-900/60 to-black/80",
  },
  {
    slug: "date-night",
    name: "Date Night",
    description: "Premium pieces that make an impression",
    tags: ["premium", "dressy"],
    gradient: "from-purple-600/80 via-purple-900/60 to-black/80",
  },
] as const;

export type StyleCollection = (typeof STYLE_COLLECTIONS)[number];
