import Link from "next/link";
import { getShifts } from "@/lib/shifts";

const POSTS = [
  "Vacation/Sick Leave Relief",
  "Gun Position / Court Detail / Transport",
  "Intake & Releases",
  "Visiting Control",
  "Hospital Watch",
  "Response and Movement Officer",
  "Central Control",
] as const;

export default async function DashboardPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const shifts = await getShifts({ after: todayStart, before: todayEnd });

  const coverageByPost = Object.fromEntries(
    POSTS.map((post) => [post, shifts.filter((s) => s.post === post && s.status !== "cancelled")])
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today's Post Coverage</h1>
        <Link
          href="/dispatch/new"
          className="rounded-md bg-kc-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-kc-blue-700"
        >
          Assign Overtime
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {POSTS.map((post) => {
          const assigned = coverageByPost[post];
          const covered = assigned.length > 0;
          return (
            <div
              key={post}
              className={`rounded-lg border p-4 ${
                covered
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {covered ? "Covered" : "Uncovered"}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">{post}</p>
              {assigned.map((s) => (
                <p key={s.id} className="mt-1 text-xs text-gray-600">
                  {s.last_name}, {s.first_name}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
