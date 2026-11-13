"use client";

import { useMemo, useState } from "react";
import { clientApi } from "@/lib/client-api";
import { Icon } from "./icon";
import { ErrorState, LoadingState } from "./states";

type AddType = "Sesja" | "Wydarzenie" | "Rutyna";

export function AddModal({
  close,
  onSaved,
  goals,
}: {
  close: () => void;
  onSaved: () => void;
  goals: { id: string; name: string }[];
}) {
  const [type, setType] = useState<AddType>("Wydarzenie");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const date = String(form.get("date") ?? today);
    const time = String(form.get("time") ?? "09:00");
    const duration = Number(form.get("duration") ?? 45);
    const category = String(form.get("category") ?? "learning_work");
    const goalId = String(form.get("goalId") ?? "");
    if (!title) {
      setError("Podaj nazwę.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (type === "Rutyna") {
        await clientApi("/api/routines", {
          method: "POST",
          body: JSON.stringify({
            title,
            durationMinutes: duration,
            windowStart: time,
            windowEnd: addMinutes(time, duration),
            daysOfWeek: [1, 2, 3, 4, 5],
          }),
        });
      } else {
        const startAt = new Date(`${date}T${time}:00`);
        const endAt = new Date(startAt.getTime() + duration * 60_000);
        await clientApi("/api/calendar/items", {
          method: "POST",
          body: JSON.stringify({
            itemType: type === "Sesja" ? "flexible_task" : "one_off_event",
            title,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            isFixed: type === "Wydarzenie",
            description: goalId || category,
          }),
        });
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać do planu.");
    } finally {
      setPending(false);
    }
  }

  if (saved) {
    return (
      <div className="modal-backdrop">
        <div className="success-modal card">
          <span className="success-check">
            <Icon name="check" size={28} />
          </span>
          <h2>Dodano do planu</h2>
          <p>Nowa pozycja pojawiła się w Twoim kalendarzu.</p>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              onSaved();
              close();
            }}
          >
            Gotowe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={close} role="presentation">
      <form className="modal card" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <div>
            <h2>Dodaj do planu</h2>
            <p>Utwórz nową sesję, wydarzenie lub rutynę.</p>
          </div>
          <button className="icon-btn" type="button" onClick={close} aria-label="Zamknij">
            <Icon name="x" />
          </button>
        </div>
        <div className="type-tabs">
          {(["Sesja", "Wydarzenie", "Rutyna"] as const).map((tab) => (
            <button
              className={type === tab ? "active" : ""}
              onClick={() => setType(tab)}
              key={tab}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
        {pending ? <LoadingState label="Zapisywanie…" /> : null}
        <label className="field">
          <span>Nazwa</span>
          <input name="title" autoFocus placeholder="np. Angielski — konwersacje" required />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Data</span>
            <input name="date" type="date" defaultValue={today} required={type !== "Rutyna"} />
          </label>
          <label className="field">
            <span>Godzina</span>
            <input name="time" type="time" defaultValue="09:00" required />
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Czas trwania</span>
            <select name="duration" defaultValue="45">
              <option value="30">30 minut</option>
              <option value="45">45 minut</option>
              <option value="60">1 godzina</option>
              <option value="90">1,5 godziny</option>
            </select>
          </label>
          <label className="field">
            <span>Kategoria</span>
            <select name="category" defaultValue="learning_work">
              <option value="learning_work">Nauka i praca</option>
              <option value="training">Trening</option>
              <option value="leisure">Czas wolny</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Powiązany cel</span>
          <select name="goalId" defaultValue="">
            <option value="">Bez celu</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button className="btn secondary" type="button" onClick={close} disabled={pending}>
            Anuluj
          </button>
          <button className="btn primary" type="submit" disabled={pending}>
            Dodaj do kalendarza
          </button>
        </div>
      </form>
    </div>
  );
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
