"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import {
  CAL_PX_PER_HOUR,
  categoryColor,
  formatMinutes,
  formatTimeRange,
  layoutCalendarBlock,
  timeLabels,
} from "@/lib/calendar-layout";
import { addIsoDays, weekContaining } from "@/domain/time";
import { Icon } from "./icon";
import { useShell } from "./shell-context";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { TopActions } from "./top-actions";

export type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  itemType: string;
  category: string | null;
  goalName: string | null;
  sessionId: string | null;
  plannedMinutes: number;
  isFixed: boolean;
  why: string | null;
};

export type CalendarViewData = {
  timezone: string;
  weekStart: string;
  today: string;
  events: CalendarEvent[];
  unscheduled: { id: string; title: string; meta: string; color: string }[];
  notice: string | null;
  dayStartHour: number;
  dayEndHour: number;
  categoryBudgets: { training: number; learning_work: number; leisure: number };
};

const dayNames = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

export function CalendarView({
  state,
}: {
  state:
    | { status: "loading" }
    | { status: "error"; message: string; onRetry?: () => void }
    | { status: "success"; data: CalendarViewData };
}) {
  const { openAI, openAdd } = useShell();
  const router = useRouter();
  const [view, setView] = useState<"Dzień" | "Tydzień">("Tydzień");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState(0);

  const data = state.status === "success" ? state.data : null;
  const week = data ? weekContaining(data.weekStart) : null;
  const labels = data ? timeLabels(data.dayStartHour, data.dayEndHour) : [];
  const boardHeight = data
    ? Math.max(435, (data.dayEndHour - data.dayStartHour) * CAL_PX_PER_HOUR + 40)
    : 435;

  const laidOut = useMemo(() => {
    if (!data || !week) {
      return [];
    }
    return data.events.map((event) => {
      const startAt = new Date(event.startAt);
      const endAt = new Date(event.endAt);
      const dayIndex = Math.max(
        0,
        Math.min(6, Math.round((startAt.getTime() - new Date(`${week.start}T00:00:00`).getTime()) / 86_400_000)),
      );
      const layout = layoutCalendarBlock({
        startAt,
        endAt,
        dayStartHour: data.dayStartHour,
      });
      return { event, dayIndex, ...layout };
    });
  }, [data, week]);

  const visible = useMemo(() => {
    if (view === "Tydzień") {
      return laidOut;
    }
    return laidOut.filter((item) => item.dayIndex === focusDay);
  }, [laidOut, view, focusDay]);

  if (state.status === "loading") {
    return (
      <div className="page calendar-page">
        <LoadingState label="Wczytywanie kalendarza…" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="page calendar-page">
        <ErrorState message={state.message} onRetry={state.onRetry} />
      </div>
    );
  }
  if (!data || !week) {
    return null;
  }

  const weekLabel = `${week.start} – ${week.end}`;
  const todayIndex = Math.max(
    0,
    Math.min(6, Math.round((new Date(`${data.today}T12:00:00`).getTime() - new Date(`${week.start}T12:00:00`).getTime()) / 86_400_000)),
  );

  async function replan() {
    setPending(true);
    setError(null);
    try {
      await clientApi("/api/calendar/replan", { method: "POST", body: JSON.stringify({}) });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przeliczyć tygodnia.");
    } finally {
      setPending(false);
    }
  }

  async function completeSelected() {
    if (!selected?.sessionId) {
      setError("Ta pozycja nie ma sesji do ukończenia. Użyj edycji statusu zdarzenia.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await clientApi(`/api/sessions/${selected.sessionId}/complete`, {
        method: "POST",
        body: JSON.stringify({
          actualMinutes: selected.plannedMinutes,
          efficiencyRating: 7,
          completionStatus: "completed",
        }),
      });
      setSelected(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się ukończyć sesji.");
    } finally {
      setPending(false);
    }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const startLocal = String(form.get("start"));
    const endLocal = String(form.get("end"));
    setPending(true);
    setError(null);
    try {
      await clientApi(`/api/calendar/items/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          startAt: new Date(startLocal).toISOString(),
          endAt: new Date(endLocal).toISOString(),
          preference: "once",
        }),
      });
      setEditOpen(false);
      setSelected(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać zmian.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page calendar-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">TWÓJ CZAS</p>
          <h1>Kalendarz</h1>
        </div>
        <TopActions onAdd={openAdd} openAI={openAI} />
      </div>

      {data.notice ? (
        <div className="change-notice">
          <span className="ai-orb">
            <Icon name="sparkles" size={16} />
          </span>
          <div>
            <strong>Aktualizacja planu</strong>
            <small>{data.notice}</small>
          </div>
          <button className="btn ghost" type="button" onClick={openAI}>
            Zobacz z AI
          </button>
          <button className="btn ghost" type="button" disabled={pending} onClick={() => void replan()}>
            <Icon name="undo" size={15} /> Przelicz
          </button>
        </div>
      ) : null}

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {pending ? <LoadingState label="Aktualizacja kalendarza…" /> : null}

      <div className="calendar-toolbar">
        <div className="date-nav">
          <h2>{weekLabel}</h2>
          <button className="btn secondary" type="button" onClick={() => setFocusDay(todayIndex)}>
            Dzisiaj
          </button>
          <button className="btn ghost" type="button" disabled={pending} onClick={() => void replan()}>
            Przelicz tydzień
          </button>
        </div>
        <div className="segmented">
          <button className={view === "Dzień" ? "active" : ""} type="button" onClick={() => setView("Dzień")}>
            Dzień
          </button>
          <button className={view === "Tydzień" ? "active" : ""} type="button" onClick={() => setView("Tydzień")}>
            Tydzień
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        <aside className="task-panel card">
          <div className="section-head">
            <div>
              <h3>Do zaplanowania</h3>
              <p>
                {data.unscheduled.length} pozycji ·{" "}
                {formatMinutes(data.unscheduled.reduce((sum, item) => sum + (Number(item.meta.match(/\d+/)?.[0] ?? 0) || 0), 0))}
              </p>
            </div>
          </div>
          {data.unscheduled.length === 0 ? (
            <EmptyState>Brak niezaplanowanych zadań.</EmptyState>
          ) : (
            data.unscheduled.map((task) => (
              <button className="unscheduled" key={task.id} type="button" onClick={openAdd}>
                <i className={task.color} />
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.meta}</small>
                </div>
                <span className="drag">⠿</span>
              </button>
            ))
          )}
          <h4 className="panel-label">KATEGORIE</h4>
          <label className="check-row">
            <input type="checkbox" defaultChecked readOnly />
            <span className="dot blue" />
            Trening <small>{formatMinutes(data.categoryBudgets.training)}</small>
          </label>
          <label className="check-row">
            <input type="checkbox" defaultChecked readOnly />
            <span className="dot violet" />
            Nauka i praca <small>{formatMinutes(data.categoryBudgets.learning_work)}</small>
          </label>
          <label className="check-row">
            <input type="checkbox" defaultChecked readOnly />
            <span className="dot green" />
            Czas wolny <small>{formatMinutes(data.categoryBudgets.leisure)}</small>
          </label>
        </aside>

        <section className="calendar-board card">
          <div className="mobile-day-strip">
            {dayNames.map((name, index) => (
              <button
                key={name}
                type="button"
                className={focusDay === index || (view === "Tydzień" && index === todayIndex) ? "active" : ""}
                onClick={() => {
                  setFocusDay(index);
                  setView("Dzień");
                }}
              >
                {name} {addIsoDays(week.start, index).slice(8)}
              </button>
            ))}
          </div>
          <div className="cal-head">
            <span />
            {dayNames.map((name, index) => (
              <div className={index === todayIndex ? "today" : ""} key={name}>
                <small>{name}</small>
                <strong>{addIsoDays(week.start, index).slice(8)}</strong>
              </div>
            ))}
          </div>
          <div className="cal-body" style={{ height: boardHeight }}>
            <div className="time-labels">
              {labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div
              className="day-grid"
              style={{
                background: `repeating-linear-gradient(to bottom, transparent 0, transparent ${CAL_PX_PER_HOUR - 1}px, #eeeef0 ${CAL_PX_PER_HOUR}px)`,
              }}
            >
              {Array.from({ length: view === "Tydzień" ? 7 : 1 }).map((_, index) => (
                <div
                  className={`day-col ${(view === "Tydzień" ? index : focusDay) === todayIndex ? "today" : ""}`}
                  key={index}
                  style={view === "Dzień" ? { left: 0, width: "100%" } : undefined}
                />
              ))}
              {data.events.length === 0 ? (
                <div style={{ position: "absolute", inset: 16 }}>
                  <EmptyState>Ten tydzień nie ma jeszcze bloków.</EmptyState>
                </div>
              ) : null}
              {visible.map(({ event, dayIndex, top, height }) => {
                const color = categoryColor(event.category, event.itemType);
                const left =
                  view === "Dzień"
                    ? "4px"
                    : `calc(${dayIndex} * 14.2857% + 4px)`;
                const width = view === "Dzień" ? "calc(100% - 8px)" : "calc(14.2857% - 8px)";
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelected(event)}
                    className={`cal-event ${color}`}
                    style={{ left, top, height, width }}
                  >
                    <strong>{event.title}</strong>
                    <small>{formatTimeRange(new Date(event.startAt), new Date(event.endAt))}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {selected ? (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <span className={`goal-icon ${categoryColor(selected.category, selected.itemType)}`}>
                <Icon name="calendar" />
              </span>
              <button className="icon-btn" type="button" onClick={() => setSelected(null)}>
                <Icon name="x" />
              </button>
            </div>
            <span className="badge active-badge">{selected.status.toUpperCase()}</span>
            <h2>{selected.title}</h2>
            <p className="subtitle">
              {formatTimeRange(new Date(selected.startAt), new Date(selected.endAt))}
            </p>
            <div className="detail-list">
              <div>
                <span>Powiązany cel</span>
                <strong>{selected.goalName ?? "—"}</strong>
              </div>
              <div>
                <span>Planowany czas</span>
                <strong>{formatMinutes(selected.plannedMinutes)}</strong>
              </div>
              <div>
                <span>Typ</span>
                <strong>{selected.itemType}</strong>
              </div>
              <div>
                <span>Dlaczego tu</span>
                <strong>{selected.why ?? (selected.isFixed ? "Stałe zobowiązanie" : "Plan tygodnia")}</strong>
              </div>
            </div>
            {editOpen ? (
              <form className="detail-list" onSubmit={saveEdit}>
                <label className="field">
                  <span>Początek</span>
                  <input
                    name="start"
                    type="datetime-local"
                    defaultValue={toLocalInput(selected.startAt)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Koniec</span>
                  <input
                    name="end"
                    type="datetime-local"
                    defaultValue={toLocalInput(selected.endAt)}
                    required
                  />
                </label>
                <p className="subtitle">Przesunięcie jest jednorazowe (nie zmienia preferencji rutyny).</p>
                <button className="btn primary full" type="submit" disabled={pending}>
                  Zapisz zmiany
                </button>
              </form>
            ) : (
              <>
                <button className="btn primary full" type="button" disabled={pending} onClick={() => void completeSelected()}>
                  <Icon name="check" /> Oznacz jako ukończone
                </button>
                <button className="btn secondary full" type="button" onClick={() => setEditOpen(true)}>
                  <Icon name="edit" /> Edytuj
                </button>
              </>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
