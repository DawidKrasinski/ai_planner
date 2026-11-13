import type { IconName } from "./icon";

export type NavId = "dashboard" | "calendar" | "goals" | "stats" | "settings";

export const NAV: { id: NavId; href: string; label: string; mobileLabel: string; icon: IconName }[] = [
  { id: "dashboard", href: "/dashboard", label: "Pulpit", mobileLabel: "Pulpit", icon: "home" },
  { id: "calendar", href: "/calendar", label: "Kalendarz", mobileLabel: "Kalendarz", icon: "calendar" },
  { id: "goals", href: "/goals", label: "Cele", mobileLabel: "Cele", icon: "target" },
  {
    id: "stats",
    href: "/statistics",
    label: "Dyscyplina i statystyki",
    mobileLabel: "Statystyki",
    icon: "chart",
  },
  { id: "settings", href: "/settings", label: "Ustawienia", mobileLabel: "Więcej", icon: "settings" },
];

export function navIdFromPath(pathname: string): NavId {
  if (pathname.startsWith("/calendar")) {
    return "calendar";
  }
  if (pathname.startsWith("/goals")) {
    return "goals";
  }
  if (pathname.startsWith("/statistics")) {
    return "stats";
  }
  if (pathname.startsWith("/settings") || pathname.startsWith("/history")) {
    return "settings";
  }
  return "dashboard";
}

export function assistantScreenFromPath(pathname: string): "dashboard" | "calendar" | "goals" | "statistics" | "settings" | "history" {
  if (pathname.startsWith("/calendar")) {
    return "calendar";
  }
  if (pathname.startsWith("/goals")) {
    return "goals";
  }
  if (pathname.startsWith("/statistics")) {
    return "statistics";
  }
  if (pathname.startsWith("/history")) {
    return "history";
  }
  if (pathname.startsWith("/settings")) {
    return "settings";
  }
  return "dashboard";
}
