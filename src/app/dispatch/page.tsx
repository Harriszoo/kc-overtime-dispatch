import Link from "next/link";
import { getShifts } from "@/lib/shifts";
import ShiftActions from "@/components/dispatch/ShiftActions";
import type { ShiftStatus } from "@/types";

const STATUS_BADGE: Record<ShiftStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  approved:  "bg-green-100  text-green-800",
  active:    "bg-blue-100   text-blue-800",
  completed: "bg-gray-100   text-gray-600",
  cancelled: "bg-red-100    text-red-700",
};

function formatShiftTime(val: Date | string) {
  return new Date(val).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
    hour12: true, timeZoneName: "short",
  });
}

export default async function DispatchPage() {
  const all = await getShifts();
  const shifts = all.filter((s) => s.status !== "cancelled");

  const pending  = shifts.filter((s) => s.status === "pending").length;
  const approved = shifts.filter((s) => s.status === "approved").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overtime Dispatch Board</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pending} pending · {approved} approved
          </p>
        </div>
        <Link
          href="/dispatch/new"
          className="rounded-md bg-kc-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-kc-blue-700"
        >
          New Assignment
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Post", "Officer", "Shift Start", "Shift End", "Type", "Status", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shifts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  No active shifts.
                </td>
              </tr>
            ) : (
              shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{shift.post}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {shift.last_name}, {shift.first_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatShiftTime(shift.shift_start)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatShiftTime(shift.shift_end)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{shift.shift_type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[shift.status as ShiftStatus]}`}
                    >
                      {shift.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ShiftActions shiftId={shift.id} status={shift.status as ShiftStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
