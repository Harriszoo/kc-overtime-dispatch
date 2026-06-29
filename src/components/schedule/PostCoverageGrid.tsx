"use client";

import type { ShiftRow } from "@/lib/shifts";

// 24-hour coverage grid: rows = posts, columns = hours
// Each cell is colored by fill status (covered / partial / uncovered).

const POSTS = [
  "Vacation/Sick Leave Relief",
  "Gun Position / Court Detail / Transport",
  "Intake & Releases",
  "Visiting Control",
  "Hospital Watch",
  "Response and Movement Officer",
  "Central Control",
] as const;

type Props = {
  shifts: ShiftRow[];
  date:   Date;
};

export default function PostCoverageGrid({ shifts, date }: Props) {
  const hours = Array.from({ length: 24 }, (_, h) => h);

  function isCovered(post: string, hour: number): boolean {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return shifts.some(
      (s) =>
        s.post === post &&
        s.status !== "cancelled" &&
        new Date(s.shift_start) < slotEnd &&
        new Date(s.shift_end) > slotStart
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-48 border border-gray-200 bg-gray-50 px-2 py-1 text-left text-gray-500">
              Post
            </th>
            {hours.map((h) => (
              <th
                key={h}
                className="border border-gray-200 bg-gray-50 px-1 py-1 text-center text-gray-400"
              >
                {String(h).padStart(2, "0")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {POSTS.map((post) => (
            <tr key={post} className="even:bg-gray-50">
              <td className="border border-gray-200 px-2 py-1.5 font-medium text-gray-700">
                {post}
              </td>
              {hours.map((h) => {
                const covered = isCovered(post, h);
                return (
                  <td
                    key={h}
                    title={`${post} — ${String(h).padStart(2, "0")}:00`}
                    className={`border border-gray-200 ${
                      covered ? "bg-green-200" : "bg-red-100"
                    }`}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-200" /> Covered
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-100" /> Uncovered
        </span>
      </div>
    </div>
  );
}
