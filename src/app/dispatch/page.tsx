import Link from "next/link";
import { getShifts } from "@/lib/shifts";

export default async function DispatchPage() {
  const shifts = await getShifts({ status: "pending" });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overtime Dispatch Board</h1>
          <p className="mt-1 text-sm text-gray-500">
            {shifts.length} pending assignment{shifts.length !== 1 ? "s" : ""}
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
                  No pending shifts.
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
                    {new Date(shift.shift_start).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(shift.shift_end).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{shift.shift_type}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      {shift.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <Link
                      href={`/roster/${shift.officer_id}`}
                      className="text-kc-blue-600 hover:underline"
                    >
                      View officer
                    </Link>
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
