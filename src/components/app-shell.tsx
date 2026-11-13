"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AssistantPanel } from "@/components/meridian/assistant-panel";
import { AddModal } from "@/components/meridian/add-modal";
import { Icon } from "@/components/meridian/icon";
import { NAV, assistantScreenFromPath, navIdFromPath } from "@/components/meridian/nav";
import { ShellProvider } from "@/components/meridian/shell-context";

export function AppShell({
  children,
  profileName = "Profil",
  goals = [],
}: {
  children: React.ReactNode;
  profileName?: string;
  goals?: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const page = navIdFromPath(pathname);
  const [assistant, setAssistant] = useState(false);
  const [modal, setModal] = useState(false);

  const initials = useMemo(() => {
    const parts = profileName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "P";
    }
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [profileName]);

  const openAI = useCallback(() => setAssistant(true), []);
  const openAdd = useCallback(() => setModal(true), []);

  const shellValue = useMemo(
    () => ({ openAI, openAdd, profileName, profileInitials: initials }),
    [openAI, openAdd, profileName, initials],
  );

  return (
    <ShellProvider value={shellValue}>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <Icon name="sparkles" size={17} />
            </div>
            <span>Meridian</span>
            <button className="icon-btn collapse" type="button" aria-label="Zwiń">
              <Icon name="chevronLeft" size={16} />
            </button>
          </div>
          <nav className="side-nav" aria-label="Główna nawigacja">
            <span className="nav-label">Przestrzeń</span>
            {NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`nav-item ${page === item.id ? "active" : ""}`}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button className="ai-side" type="button" onClick={openAI}>
              <span className="ai-orb">
                <Icon name="sparkles" size={16} />
              </span>
              <span>
                <strong>Asystent AI</strong>
                <small>Zapytaj o swój plan</small>
              </span>
              <Icon name="chevronRight" size={16} />
            </button>
            <div className="profile">
              <div className="avatar">{initials}</div>
              <span>
                <strong>{profileName}</strong>
                <small>Plan osobisty</small>
              </span>
              <Link className="icon-btn" href="/settings" aria-label="Ustawienia profilu">
                <Icon name="more" />
              </Link>
            </div>
          </div>
        </aside>

        <header className="mobile-header">
          <div className="brand-mark">
            <Icon name="sparkles" size={16} />
          </div>
          <strong>{NAV.find((item) => item.id === page)?.label}</strong>
          <button className="icon-btn" type="button" onClick={openAI} aria-label="Asystent AI">
            <Icon name="sparkles" />
          </button>
        </header>

        <main>{children}</main>

        <nav className="bottom-nav" aria-label="Nawigacja mobilna">
          {NAV.map((item) => (
            <Link key={item.id} href={item.href} className={page === item.id ? "active" : ""}>
              <Icon name={item.icon} />
              <span>{item.mobileLabel}</span>
            </Link>
          ))}
        </nav>

        {assistant ? (
          <AssistantPanel
            screen={assistantScreenFromPath(pathname)}
            onClose={() => setAssistant(false)}
          />
        ) : null}
        {modal ? (
          <AddModal
            goals={goals}
            close={() => setModal(false)}
            onSaved={() => {
              setModal(false);
              router.refresh();
            }}
          />
        ) : null}
      </div>
    </ShellProvider>
  );
}
