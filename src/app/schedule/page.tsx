import { getShifts } from "@/lib/shifts";
import TimelineView from "@/components/schedule/TimelineView";

export default async function SchedulePage() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const shifts = await getShifts({ after: weekStart, before: weekEnd });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Weekly Schedule</h1>
      <TimelineView shifts={shifts} weekStart={weekStart} />
    </div>
  );
}
