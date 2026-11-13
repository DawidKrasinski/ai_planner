"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AssistantPanel } from "@/components/assistant-panel";

const links = [
  ["dashboard", "/dashboard"],
  ["calendar", "/calendar"],
  ["goals", "/goals"],
  ["statistics", "/statistics"],
  ["settings", "/settings"],
  ["history", "/history"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const screen = links.find(([, href]) => pathname.startsWith(href))?.[0] ?? "dashboard";
  return (
    <div className="min-h-full md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-line bg-card md:flex md:flex-col md:gap-2 md:p-4">
        <p className="serif px-2 pb-4 text-xl">Menedżer</p>
        {links.map(([key, href]) => (
          <Link key={key} href={href} className={`rounded-xl px-3 py-2 text-sm ${pathname.startsWith(href) ? "bg-accent-soft text-accent" : "text-ink"}`}>
            {t(key)}
          </Link>
        ))}
      </aside>
      <div className="pb-24 md:pb-6">
        <header className="flex items-center justify-between px-4 py-4">
          <p className="serif text-lg md:hidden">Menedżer</p>
          <button className="min-h-11 rounded-full border border-line bg-card px-4 text-sm" type="button" onClick={() => setOpen(true)}>
            {t("assistant")}
          </button>
        </header>
        <main className="px-4">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-line bg-card md:hidden">
        {links.slice(0, 5).map(([key, href]) => (
          <Link key={key} href={href} className="flex min-h-14 items-center justify-center px-1 text-center text-xs">
            {t(key)}
          </Link>
        ))}
      </nav>
      {open ? <AssistantPanel screen={screen} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
