import { CalendarBoard } from "@/components/calendar-board";
import { PlanActions } from "@/components/plan-actions";
import { EventForm } from "@/components/event-form";
import { EmptyState, ErrorState } from "@/components/ui";
import { localIsoDate, weekContaining, zonedTimestamp } from "@/domain/time";
import { requireUser } from "@/lib/auth";
import { loadPage } from "@/lib/page-data";
import { getProfile, listCalendar } from "@/services/records";

export default async function CalendarPage() {
  const loaded = await loadPage(async () => {
    const user = await requireUser();
    const profile = await getProfile(user.id);
    const today = localIsoDate(new Date(), profile.timezone);
    const week = weekContaining(today);
    const items = await listCalendar(
      user.id,
      new Date(zonedTimestamp(week.start, "00:00", profile.timezone)),
      new Date(zonedTimestamp(week.end, "23:59", profile.timezone)),
    );
    return { week, items, timeZone: profile.timezone };
  });
  if (!loaded.ok) {
    return <ErrorState message={loaded.message} />;
  }
  const { week, items, timeZone } = loaded.data;
  return (
    <div className="grid gap-5">
      <h1 className="serif text-3xl">Kalendarz</h1>
      <PlanActions />
      <EventForm />
      {items.length === 0 ? <EmptyState>Ten tydzień nie ma jeszcze bloków.</EmptyState> : null}
      <CalendarBoard
        weekStart={week.start}
        timeZone={timeZone}
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          itemType: item.itemType,
          startAt: item.startAt.toISOString(),
          endAt: item.endAt.toISOString(),
          isFixed: item.isFixed,
          placementReason: item.placementReason,
          status: item.status,
        }))}
      />
    </div>
  );
}
