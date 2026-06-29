import { notFound } from "next/navigation";
import { getOfficerById } from "@/lib/officers";
import { getShiftsByOfficer } from "@/lib/shifts";
import CertBadge from "@/components/roster/CertBadge";

export default async function OfficerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [officer, shifts] = await Promise.all([
    getOfficerById(id),
    getShiftsByOfficer(id),
  ]);

  if (!officer) notFound();

  const activeShifts = shifts.filter((s) => s.status !== "cancelled");

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {officer.last_name}, {officer.first_name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Badge #{officer.badge_number} · {officer.rank} · Employee #{officer.employee_id}
        </p>
        <p className="mt-0.5 text-sm text-gray-400">
          Seniority date: {new Date(officer.seniority_date).toLocaleDateString()}
        </p>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Certifications
      </h2>
      <div className="mb-6 flex flex-wrap gap-2">
        {officer.certifications.length > 0
          ? officer.certifications.map((cert) => <CertBadge key={cert} code={cert} />)
          : <span className="text-sm text-gray-400">None on record.</span>
        }
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Shift History ({activeShifts.length})
      </h2>
      <div className="space-y-2">
        {activeShifts.map((shift) => (
          <div
            key={shift.id}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3 text-sm"
          >
            <span className="font-medium text-gray-900">{shift.post}</span>
            <span className="text-gray-500">
              {new Date(shift.shift_start).toLocaleString()} –{" "}
              {new Date(shift.shift_end).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">{shift.status}</span>
          </div>
        ))}
        {activeShifts.length === 0 && (
          <p className="text-sm text-gray-400">No shifts recorded.</p>
        )}
      </div>
    </div>
  );
}
