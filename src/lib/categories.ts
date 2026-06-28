import type { Category } from "./types";

/**
 * The canonical category catalog. The AI categorizer maps images onto these.
 * Colors map to Tailwind classes used in markers / badges / chips.
 */
export const CATEGORIES: Category[] = [
  {
    id: "pothole",
    label: "Pothole",
    icon: "🕳️",
    department: "Roads & Infrastructure",
    sla_days: 5,
    color: "amber",
  },
  {
    id: "streetlight",
    label: "Streetlight",
    icon: "💡",
    department: "Electricity",
    sla_days: 3,
    color: "yellow",
  },
  {
    id: "water_leak",
    label: "Water Leak",
    icon: "🚰",
    department: "Water Board",
    sla_days: 2,
    color: "blue",
  },
  {
    id: "garbage",
    label: "Garbage / Waste",
    icon: "🗑️",
    department: "Sanitation",
    sla_days: 2,
    color: "green",
  },
  {
    id: "drainage",
    label: "Drainage / Flooding",
    icon: "🌊",
    department: "Storm Drains",
    sla_days: 4,
    color: "cyan",
  },
  {
    id: "tree",
    label: "Fallen Tree",
    icon: "🌳",
    department: "Parks & Trees",
    sla_days: 3,
    color: "emerald",
  },
  {
    id: "graffiti",
    label: "Graffiti / Vandalism",
    icon: "🎨",
    department: "Municipal Services",
    sla_days: 7,
    color: "fuchsia",
  },
  {
    id: "signage",
    label: "Damaged Signage",
    icon: "🚏",
    department: "Traffic & Signs",
    sla_days: 5,
    color: "orange",
  },
  {
    id: "electric",
    label: "Electrical Hazard",
    icon: "⚡",
    department: "Electricity",
    sla_days: 1,
    color: "red",
  },
  {
    id: "other",
    label: "Other",
    icon: "📍",
    department: "Municipal Services",
    sla_days: 7,
    color: "slate",
  },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export function getCategory(id: string): Category {
  return CATEGORY_MAP[id] ?? CATEGORY_MAP["other"];
}
