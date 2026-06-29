import { getOfficers } from "@/lib/officers";
import AssignmentForm from "@/components/dispatch/AssignmentForm";

export default async function NewDispatchPage() {
  // Pass active officers to the form; eligibility filtering happens
  // client-side via /api/officers?post=&shiftStart=&shiftEnd=
  const officers = await getOfficers({ isActive: true });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">New Overtime Assignment</h1>
      <p className="mb-6 text-sm text-gray-500">
        Only officers with required certifications and a clear 8-hour rest window will appear.
      </p>
      <AssignmentForm officers={officers} />
    </div>
  );
}
