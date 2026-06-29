import { getOfficers } from "@/lib/officers";
import OfficerCard from "@/components/roster/OfficerCard";

export default async function RosterPage() {
  const officers = await getOfficers({ isActive: true });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Officer Roster</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {officers.map((officer) => (
          <OfficerCard key={officer.id} officer={officer} />
        ))}
        {officers.length === 0 && (
          <p className="col-span-full text-sm text-gray-400">No active officers found.</p>
        )}
      </div>
    </div>
  );
}
