import React from "react";
import { Leaf, Gem, PawPrint, HelpCircle } from "lucide-react";
import { Kingdom } from "../../types";

export function normalizeKingdom(kingdom?: string): Kingdom | undefined {
  if (!kingdom) return undefined;
  const k = kingdom.toLowerCase();
  if (k.includes("plant")) return "Plant";
  if (k.includes("mineral")) return "Mineral";
  if (k.includes("animal")) return "Animal";
  return undefined;
}

export interface KingdomMeta {
  kingdom: Kingdom;
  label: string;
  emoji: string;
  badgeClass: string;
  pillClass: string;
  borderClass: string;
  bgLightClass: string;
  textClass: string;
  accentColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function getKingdomMeta(kingdom?: string): KingdomMeta | null {
  const norm = normalizeKingdom(kingdom);
  if (!norm) return null;

  switch (norm) {
    case "Plant":
      return {
        kingdom: "Plant",
        label: "Plant",
        emoji: "🌿",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
        pillClass: "bg-emerald-600 text-white border-emerald-700",
        borderClass: "border-emerald-500",
        bgLightClass: "bg-emerald-50/70",
        textClass: "text-emerald-700",
        accentColor: "#10b981",
        icon: Leaf,
      };
    case "Mineral":
      return {
        kingdom: "Mineral",
        label: "Mineral",
        emoji: "🪨",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
        pillClass: "bg-amber-600 text-white border-amber-700",
        borderClass: "border-amber-500",
        bgLightClass: "bg-amber-50/70",
        textClass: "text-amber-800",
        accentColor: "#d97706",
        icon: Gem,
      };
    case "Animal":
      return {
        kingdom: "Animal",
        label: "Animal",
        emoji: "🐾",
        badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
        pillClass: "bg-rose-600 text-white border-rose-700",
        borderClass: "border-rose-500",
        bgLightClass: "bg-rose-50/70",
        textClass: "text-rose-700",
        accentColor: "#e11d48",
        icon: PawPrint,
      };
  }
}

interface KingdomBadgeProps {
  kingdom?: string;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export default function KingdomBadge({
  kingdom,
  size = "xs",
  showLabel = true,
  className = "",
}: KingdomBadgeProps): JSX.Element | null {
  const meta = getKingdomMeta(kingdom);
  if (!meta) {
    return null;
  }

  const Icon = meta.icon;
  const iconSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
  };

  const textSizes = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1 font-bold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-extrabold uppercase tracking-wide shrink-0 transition ${meta.badgeClass} ${textSizes[size]} ${className}`}
      title={`${meta.label} Kingdom (${meta.emoji})`}
    >
      <Icon className={`${iconSizes[size]} shrink-0`} />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}

export function KingdomIcon({
  kingdom,
  className = "w-4 h-4",
}: {
  kingdom?: string;
  className?: string;
}): JSX.Element {
  const meta = getKingdomMeta(kingdom);
  if (!meta) return <HelpCircle className={`text-slate-400 ${className}`} />;
  const Icon = meta.icon;
  return <Icon className={`${meta.textClass} ${className}`} />;
}
