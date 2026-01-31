export const DEFAULT_BRIEF =
  "Premium insulated water bottle designed for active lifestyles. Features double-wall vacuum insulation, leak-proof cap, and ergonomic design.";

export const TONE_OPTIONS = [
  { value: "professional", label: "Professional", description: "Clean, trustworthy" },
  { value: "friendly", label: "Friendly", description: "Approachable, warm" },
  { value: "bold", label: "Bold", description: "Energetic, confident" },
  { value: "premium", label: "Premium", description: "Sophisticated, quality" },
] as const;

export const COLOR_OPTIONS = [
  { value: "#059669", label: "Emerald", bg: "bg-emerald-600" },
  { value: "#0d9488", label: "Teal", bg: "bg-teal-600" },
  { value: "#d97706", label: "Amber", bg: "bg-amber-600" },
  { value: "#e11d48", label: "Rose", bg: "bg-rose-600" },
  { value: "#15803d", label: "Green", bg: "bg-green-700" },
  { value: "#0891b2", label: "Cyan", bg: "bg-cyan-600" },
] as const;

export const PERSONA_CARDS = [
  {
    icon: "🏃",
    title: "Athletes",
    description:
      "Performance-focused messaging, training features, endurance benefits",
  },
  {
    icon: "💼",
    title: "Commuters",
    description:
      "Daily convenience, office-friendly, cup holder compatibility",
  },
  {
    icon: "⛰️",
    title: "Outdoor",
    description:
      "Durability emphasis, insulation stats, adventure-ready features",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Families",
    description:
      "Safety certifications, spill-proof design, kid-friendly options",
  },
] as const;

export const DEFAULT_BRAND_NAME = "HydroFlow";

export const PALETTE_EXTRA = ["#15803d", "#0d9488"] as const;
