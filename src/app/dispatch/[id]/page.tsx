import { notFound } from "next/navigation";
import Link from "next/link";
import { getShiftById } from "@/lib/shifts";
import { getCallLog } from "@/lib/calls";
import { getEligibleOfficers } from "@/lib/officers";
import { auth, isSupervisor } from "@/auth";
import CallLogPanel from "@/components/dispatch/CallLogPanel";
import type { ShiftPost, ShiftStatus } from "@/types";

const STATUS_BADGE: Record<ShiftStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  approved:  "bg-green-100  text-green-800",
  active:    "bg-blue-100   text-blue-800",
  completed: "bg-gray-100   text-gray-600",
  cancelled: "bg-red-100    text-red-700",
};

type Props = { params: Promise<{ id: string }> };

export default async function ShiftDetailPage({ params }: Props) {
  const { id }   = await params;
  const session  = await auth();
  const supervisor = isSupervisor(session?.user.rank ?? "");

  const [shift, callLog] = await Promise.all([
    getShiftById(id),
    getCallLog(id),
  ]);

  if (!shift) notFound();

  // Only compute eligible queue for live (non-terminal) shifts
  const isLive = shift.status === "pending" || shift.status === "approved" || shift.status === "active";
  const eligibleQueue = isLive
    ? await getEligibleOfficers(
        shift.post as ShiftPost,
        new Date(shift.shift_start),
        new Date(shift.shift_end)
      ).then((officers) =>
        // Inverse seniority: most-recent seniority_date first (least senior = called first)
        [...officers].sort(
          (a, b) => new Date(b.seniority_date).getTime() - new Date(a.seniority_date).getTime()
        )
      )
    : [];

  const calledIds = new Set(callLog.map((e) => e.officer_id));
  const queue = eligibleQueue.filter((o) => !calledIds.has(o.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dispatch"
            className="text-sm text-kc-blue-600 hover:underline"
          >
            ← Dispatch board
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{shift.post}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(shift.shift_start).toLocaleString("en-US", {
              weekday: "long", month: "short", day: "numeric",
              hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
            })}
            {" — "}
            {new Date(shift.shift_end).toLocaleTimeString("en-US", {
              hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
            })}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE[shift.status as ShiftStatus]}`}>
          {shift.status}
        </span>
      </div>

      {/* Shift details card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Assigned officer</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {shift.last_name}, {shift.first_name}
            </dd>
            <dd className="text-xs text-gray-400">#{shift.badge_number}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Shift type</dt>
            <dd className="mt-1 text-sm text-gray-700">{shift.shift_type.replace(/_/g, " ")}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Calls logged</dt>
            <dd className="mt-1 text-sm text-gray-700">{callLog.length}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Still eligible</dt>
            <dd className="mt-1 text-sm text-gray-700">{queue.length} officer{queue.length !== 1 ? "s" : ""}</dd>
          </div>
        </dl>
      </div>

      {/* Call log + queue */}
      <CallLogPanel
        shiftId={shift.id}
        entries={callLog}
        queue={eligibleQueue}
        supervisor={supervisor}
      />
    </div>
  );
}
