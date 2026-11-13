"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Button, ErrorState, Field, fieldClass } from "@/components/ui";

export type CalendarEntry = {
  id: string;
  title: string;
  itemType: string;
  startAt: string;
  endAt: string;
  isFixed: boolean;
  placementReason: string;
  status: string;
};

export function CalendarBoard({
  items,
  weekStart,
  timeZone,
}: {
  items: CalendarEntry[];
  weekStart: string;
  timeZone: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [preference, setPreference] = useState<"once" | "recurring">("once");
  const days = useMemo(() => groupByDay(items, timeZone), [items, timeZone]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const response = await fetch(`/api/calendar/items/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        startAt: new Date(String(form.get("start"))).toISOString(),
        endAt: new Date(String(form.get("end"))).toISOString(),
        preference,
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Nie udało się przesunąć bloku.");
      return;
    }
    setSelected(null);
    router.refresh();
  }

  function onDragEnd(item: CalendarEntry, event: React.DragEvent<HTMLButtonElement>) {
    const offset = Math.round(event.nativeEvent.offsetY / 16) * 15;
    const start = new Date(item.startAt);
    const end = new Date(item.endAt);
    const duration = end.getTime() - start.getTime();
    start.setMinutes(start.getMinutes() + offset);
    end.setTime(start.getTime() + duration);
    void fetch(`/api/calendar/items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startAt: start.toISOString(), endAt: end.toISOString(), preference: "once" }),
    }).then(() => router.refresh());
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">Tydzień od {weekStart}. Na telefonie użyj przycisku Edytuj. Przeciąganie jest dodatkową ścieżką.</p>
      {error ? <ErrorState message={error} /> : null}
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => (
          <section key={day.date} className="rounded-2xl bg-card p-2">
            <h2 className="px-1 text-sm font-semibold">{day.date.slice(5)}</h2>
            <div className="mt-2 grid gap-2">
              {day.items.length === 0 ? <p className="px-1 text-xs text-muted">Pusto</p> : day.items.map((item) => (
                <button
                  key={item.id}
                  draggable
                  onDragEnd={(event) => onDragEnd(item, event)}
                  onClick={() => setSelected(item)}
                  className="rounded-xl border border-line px-2 py-2 text-left text-sm"
                  type="button"
                >
                  <span className="block font-medium">{item.title}</span>
                  <span className="text-xs text-muted">{label(item.itemType)} · {item.isFixed ? "stałe" : "ruchome"}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {selected ? (
        <form className="grid gap-3 rounded-2xl border border-line bg-card p-4" onSubmit={save}>
          <h2 className="font-semibold">{selected.title}</h2>
          <p className="text-sm text-muted">{selected.placementReason || "Brak uzasadnienia."}</p>
          <Field label="Początek">
            <input className={fieldClass} name="start" type="datetime-local" defaultValue={toLocal(selected.startAt, timeZone)} required />
          </Field>
          <Field label="Koniec">
            <input className={fieldClass} name="end" type="datetime-local" defaultValue={toLocal(selected.endAt, timeZone)} required />
          </Field>
          <fieldset className="text-sm">
            <legend>Czy to zmiana na stałe?</legend>
            <label className="mr-4"><input type="radio" name="pref" checked={preference === "once"} onChange={() => setPreference("once")} /> Jednorazowo</label>
            <label><input type="radio" name="pref" checked={preference === "recurring"} onChange={() => setPreference("recurring")} /> Preferencja</label>
          </fieldset>
          <Button type="submit" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz przesunięcie"}</Button>
        </form>
      ) : null}
    </div>
  );
}

function groupByDay(items: CalendarEntry[], timeZone: string) {
  const map = new Map<string, CalendarEntry[]>();
  for (const item of items) {
    const date = formatInTimeZone(item.startAt, timeZone, "yyyy-MM-dd");
    const list = map.get(date) ?? [];
    list.push(item);
    map.set(date, list);
  }
  return [...map.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, dayItems]) => ({ date, items: dayItems }));
}

function label(type: string) {
  const names: Record<string, string> = {
    goal_session: "Sesja celu",
    fixed_commitment: "Zobowiązanie",
    one_off_event: "Zdarzenie",
    routine_occurrence: "Rutyna",
    flexible_task: "Zadanie",
    meal: "Posiłek",
    break: "Przerwa",
    travel: "Dojazd",
    preparation: "Przygotowanie",
  };
  return names[type] ?? type;
}

function toLocal(iso: string, timeZone: string) {
  return formatInTimeZone(iso, timeZone, "yyyy-MM-dd'T'HH:mm");
}
