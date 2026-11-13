"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SettingsInput } from "@/domain/schemas";
import { clientApi } from "@/lib/client-api";
import { Icon, type IconName } from "./icon";
import { useShell } from "./shell-context";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { TopActions } from "./top-actions";

export type MemoryEntry = {
  id: string;
  type: string;
  text: string;
  source: string;
  confirmed: boolean;
};

export type SettingsViewData = {
  settings: SettingsInput;
  profile: { displayName: string; timezone: string; locale: string };
  memory: MemoryEntry[];
  googleConfigured: boolean;
  googleStatus: "idle" | "connected" | "error";
  aiProviderLabel: string;
};

const sections: [string, IconName][] = [
  ["Ogólne", "sliders"],
  ["Planowanie", "clock"],
  ["Budżety kategorii", "chart"],
  ["Priorytety P1–P6", "target"],
  ["Asystent AI", "sparkles"],
  ["Integracje", "link"],
  ["Historia", "undo"],
  ["Prywatność i dane", "shield"],
];

export function SettingsView({
  state,
}: {
  state:
    | { status: "loading" }
    | { status: "error"; message: string; onRetry?: () => void }
    | { status: "success"; data: SettingsViewData };
}) {
  const { openAI, openAdd } = useShell();
  const router = useRouter();
  const [section, setSection] = useState("Ogólne");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (state.status === "loading") {
    return (
      <div className="page">
        <LoadingState label="Wczytywanie ustawień…" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="page">
        <ErrorState message={state.message} onRetry={state.onRetry} />
      </div>
    );
  }

  const { data } = state;
  const settings = data.settings;

  async function saveSettings(next: SettingsInput) {
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await clientApi("/api/settings", { method: "PUT", body: JSON.stringify(next) });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać ustawień.");
    } finally {
      setPending(false);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await clientApi("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: form.get("displayName"),
          timezone: form.get("timezone"),
        }),
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać profilu.");
    } finally {
      setPending(false);
    }
  }

  async function connectGoogle() {
    setPending(true);
    setError(null);
    try {
      const result = await clientApi<{ url?: string }>("/api/integrations/google/connect", {
        method: "POST",
      });
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError("Integracja Google nie zwróciła adresu autoryzacji.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : data.googleConfigured
            ? "Nie udało się rozpocząć połączenia."
            : "Integracja Google nie jest skonfigurowana.",
      );
    } finally {
      setPending(false);
    }
  }

  async function updateMemory(id: string, content: string) {
    setPending(true);
    setError(null);
    try {
      await clientApi(`/api/ai/memory/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ content, isUserConfirmed: true }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaktualizować pamięci.");
    } finally {
      setPending(false);
    }
  }

  async function deleteMemory(id: string) {
    setPending(true);
    setError(null);
    try {
      await clientApi(`/api/ai/memory/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć wpisu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">PREFERENCJE</p>
          <h1>Ustawienia</h1>
          <p className="subtitle">Dostosuj Meridian do swojego rytmu dnia.</p>
        </div>
        <TopActions onAdd={openAdd} openAI={openAI} />
      </div>

      {data.googleStatus === "connected" ? (
        <p className="meridian-state empty">Google Calendar został połączony.</p>
      ) : null}
      {data.googleStatus === "error" ? (
        <ErrorState message="Połączenie z Google nie powiodło się. Kalendarz wewnętrzny pozostał bez zmian." />
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {pending ? <LoadingState label="Zapisywanie…" /> : null}
      {saved ? <p className="meridian-state empty">Zapisano.</p> : null}

      <div className="settings-layout">
        <aside className="settings-nav">
          {sections.map(([name, icon]) => (
            <button
              key={name}
              type="button"
              onClick={() => setSection(name)}
              className={section === name ? "active" : ""}
            >
              <Icon name={icon} />
              {name}
              <Icon name="chevronRight" size={15} />
            </button>
          ))}
        </aside>
        <section className="settings-content card">
          <div className="settings-head">
            <h2>{section}</h2>
            <p>Skonfiguruj ustawienia dla sekcji „{section}”.</p>
          </div>

          {section === "Ogólne" ? (
            <form onSubmit={saveProfile}>
              <SettingRow icon="globe" title="Język aplikacji" desc="Język interfejsu">
                <select name="locale" defaultValue={data.profile.locale}>
                  <option value="pl">Polski</option>
                  <option value="en">English</option>
                </select>
              </SettingRow>
              <SettingRow icon="clock" title="Strefa czasowa" desc="Używana w planowaniu">
                <input name="timezone" defaultValue={data.profile.timezone} />
              </SettingRow>
              <SettingRow icon="user" title="Nazwa wyświetlana" desc="Profil osobisty">
                <input name="displayName" defaultValue={data.profile.displayName} required />
              </SettingRow>
              <button className="btn primary" type="submit" disabled={pending}>
                Zapisz profil
              </button>
            </form>
          ) : null}

          {section === "Planowanie" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void saveSettings({
                  ...settings,
                  wakeTime: String(form.get("wake")),
                  sleepTime: String(form.get("sleep")),
                  transitionMinutes: Number(form.get("transition")),
                  breakAfterMinutes: Number(form.get("breakAfter")),
                  breakMinutes: Number(form.get("breakMinutes")),
                  minUsefulSessionMinutes: Number(form.get("minSession")),
                  sleepBorrowMaxMinutes: Number(form.get("sleepBorrow")),
                  capPlanCompletion: form.get("cap") === "on",
                });
              }}
            >
              <SettingRow icon="sun" title="Pobudka" desc="Początek dnia">
                <input name="wake" type="time" defaultValue={settings.wakeTime} required />
              </SettingRow>
              <SettingRow icon="moon" as="clock" title="Sen" desc="Koniec dnia">
                <input name="sleep" type="time" defaultValue={settings.sleepTime} required />
              </SettingRow>
              <SettingRow icon="clock" title="Przejście (min)" desc="Bufor między blokami">
                <input name="transition" type="number" defaultValue={settings.transitionMinutes} />
              </SettingRow>
              <SettingRow icon="clock" title="Przerwa po (min)" desc="Po ilu minutach pracy">
                <input name="breakAfter" type="number" defaultValue={settings.breakAfterMinutes} />
              </SettingRow>
              <SettingRow icon="clock" title="Długość przerwy" desc="Minuty">
                <input name="breakMinutes" type="number" defaultValue={settings.breakMinutes} />
              </SettingRow>
              <SettingRow icon="clock" title="Min. sesja" desc="Najkrótsza użyteczna sesja">
                <input name="minSession" type="number" defaultValue={settings.minUsefulSessionMinutes} />
              </SettingRow>
              <SettingRow icon="shield" title="Pożyczka ze snu" desc="Maks. minuty (P6)">
                <input name="sleepBorrow" type="number" defaultValue={settings.sleepBorrowMaxMinutes} />
              </SettingRow>
              <label className="check-row">
                <input name="cap" type="checkbox" defaultChecked={settings.capPlanCompletion} />
                Ogranicz wyświetlane wykonanie planu do 100%
              </label>
              <button className="btn primary" type="submit" disabled={pending}>
                Zapisz planowanie
              </button>
            </form>
          ) : null}

          {section === "Budżety kategorii" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void saveSettings({
                  ...settings,
                  categoryBudgets: {
                    training: Number(form.get("training")),
                    learning_work: Number(form.get("learning")),
                    leisure: Number(form.get("leisure")),
                  },
                });
              }}
            >
              <SettingRow icon="chart" title="Trening" desc="Minuty tygodniowo">
                <input name="training" type="number" defaultValue={settings.categoryBudgets.training} />
              </SettingRow>
              <SettingRow icon="chart" title="Nauka / praca" desc="Minuty tygodniowo">
                <input name="learning" type="number" defaultValue={settings.categoryBudgets.learning_work} />
              </SettingRow>
              <SettingRow icon="chart" title="Czas wolny" desc="Minuty tygodniowo">
                <input name="leisure" type="number" defaultValue={settings.categoryBudgets.leisure} />
              </SettingRow>
              <button className="btn primary" type="submit" disabled={pending}>
                Zapisz budżety
              </button>
            </form>
          ) : null}

          {section === "Priorytety P1–P6" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const caps = { ...settings.priorityBorrowCaps };
                for (const key of ["1", "2", "3", "4", "5", "6"] as const) {
                  const raw = String(form.get(`p${key}`) ?? "");
                  caps[key] = raw === "" ? null : Number(raw);
                }
                void saveSettings({ ...settings, priorityBorrowCaps: caps });
              }}
            >
              {(["1", "2", "3", "4", "5", "6"] as const).map((key) => (
                <SettingRow
                  key={key}
                  icon="target"
                  title={`P${key} limit pożyczki`}
                  desc="Puste = bez limitu liczbowego w UI"
                >
                  <input
                    name={`p${key}`}
                    type="number"
                    defaultValue={settings.priorityBorrowCaps[key] ?? ""}
                  />
                </SettingRow>
              ))}
              <button className="btn primary" type="submit" disabled={pending}>
                Zapisz limity
              </button>
            </form>
          ) : null}

          {section === "Asystent AI" ? (
            <>
              <div className="provider-card">
                <span className="ai-orb">
                  <Icon name="sparkles" />
                </span>
                <div>
                  <strong>{data.aiProviderLabel}</strong>
                  <small>Provider jest konfigurowany po stronie serwera (zmienne środowiskowe).</small>
                </div>
              </div>
              <div className="settings-subhead">
                <h3>Pamięć asystenta</h3>
                <p>Edytuj lub usuń wpisy. Potwierdzenie użytkownika jest wymagane przy edycji.</p>
              </div>
              {data.memory.length === 0 ? (
                <EmptyState>Brak wpisów w pamięci AI.</EmptyState>
              ) : (
                data.memory.map((entry) => (
                  <div className="setting-row" key={entry.id}>
                    <div>
                      <strong>{entry.type}</strong>
                      <small>
                        {entry.text} · {entry.source}
                        {entry.confirmed ? " · potwierdzone" : ""}
                      </small>
                    </div>
                    <div className="setting-control" style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn secondary"
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const next = window.prompt("Nowa treść pamięci", entry.text);
                          if (next) {
                            void updateMemory(entry.id, next);
                          }
                        }}
                      >
                        Edytuj
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={pending}
                        onClick={() => void deleteMemory(entry.id)}
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : null}

          {section === "Integracje" ? (
            <>
              <SettingRow
                icon="link"
                title="Google Calendar"
                desc="Opcjonalne. Import tworzy stałe zobowiązania."
              >
                <button className="btn secondary" type="button" disabled={pending} onClick={() => void connectGoogle()}>
                  Połącz
                </button>
              </SettingRow>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={settings.googleExportEnabled}
                  onChange={(event) =>
                    void saveSettings({ ...settings, googleExportEnabled: event.target.checked })
                  }
                />
                Pozwól eksportować sesje celów
              </label>
              <div className="modal-actions">
                <button
                  className="btn secondary"
                  type="button"
                  disabled={pending}
                  onClick={() => void clientApi("/api/integrations/google/sync", { method: "POST" }).then(() => router.refresh()).catch((err: unknown) => setError(err instanceof Error ? err.message : "Sync nieudany"))}
                >
                  Synchronizuj
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  disabled={pending}
                  onClick={() => void clientApi("/api/integrations/google/disconnect", { method: "POST" }).then(() => router.refresh()).catch((err: unknown) => setError(err instanceof Error ? err.message : "Rozłączenie nieudane"))}
                >
                  Rozłącz
                </button>
              </div>
            </>
          ) : null}

          {section === "Historia" ? (
            <div className="empty-settings">
              <span className="goal-icon violet">
                <Icon name="undo" />
              </span>
              <h3>Historia zmian</h3>
              <p>Wersje planu i dziennik zmian. Przywrócenie tworzy nową wersję.</p>
              <Link className="btn primary" href="/history">
                Otwórz historię
              </Link>
            </div>
          ) : null}

          {section === "Prywatność i dane" ? (
            <>
              <SettingRow
                icon="shield"
                title="Eksport danych"
                desc="JSON bez tokenów integracji"
              >
                <a className="btn secondary" href="/api/account">
                  Pobierz eksport
                </a>
              </SettingRow>
              <SettingRow
                icon="shield"
                title="Usuń profil"
                desc="Trwałe usunięcie danych aplikacji"
              >
                <button
                  className="btn ghost"
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm("Na pewno usunąć wszystkie dane profilu?")) {
                      return;
                    }
                    void clientApi("/api/account", { method: "DELETE" })
                      .then(() => router.refresh())
                      .catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : "Usunięcie nieudane"),
                      );
                  }}
                >
                  Usuń
                </button>
              </SettingRow>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  as,
  title,
  desc,
  children,
}: {
  icon: IconName | "moon";
  as?: IconName;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  const resolved = (as ?? (icon === "moon" ? "clock" : icon)) as IconName;
  return (
    <div className="setting-row">
      <span className="setting-icon">
        <Icon name={resolved} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{desc}</small>
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}
