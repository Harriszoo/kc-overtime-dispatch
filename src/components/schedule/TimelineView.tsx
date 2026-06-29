"use client";

import type { ShiftRow } from "@/lib/shifts";

const POSTS = [
  "Vacation/Sick Leave Relief",
  "Gun Position / Court Detail / Transport",
  "Intake & Releases",
  "Visiting Control",
  "Hospital Watch",
  "Response and Movement Officer",
  "Central Control",
] as const;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  shifts:    ShiftRow[];
  weekStart: Date;
};

export default function TimelineView({ shifts, weekStart }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-48 border border-gray-200 bg-gray-50 px-3 py-2 text-left text-gray-500">
              Post
            </th>
            {days.map((d, i) => (
              <th
                key={i}
                className="border border-gray-200 bg-gray-50 px-3 py-2 text-center text-gray-500"
              >
                {DAY_LABELS[d.getDay()]} {d.getMonth() + 1}/{d.getDate()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {POSTS.map((post) => (
            <tr key={post} className="even:bg-gray-50">
              <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700">
                {post}
              </td>
              {days.map((day, i) => {
                const dayShifts = shifts.filter((s) => {
                  const start = new Date(s.shift_start);
                  return (
                    s.post === post &&
                    s.status !== "cancelled" &&
                    start.toDateString() === day.toDateString()
                  );
                });
                return (
                  <td key={i} className="border border-gray-200 px-2 py-1 align-top">
                    {dayShifts.map((s) => (
                      <div
                        key={s.id}
                        className="mb-1 rounded bg-kc-blue-100 px-1.5 py-0.5 text-kc-blue-900"
                      >
                        {s.last_name}
                        <span className="ml-1 text-kc-blue-500">
                          {new Date(s.shift_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          –
                          {new Date(s.shift_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
