"use client";

import { useEffect, useState } from "react";
import type { Personnel, ShiftPost } from "@/types";

type Props = {
  post:        ShiftPost;
  shiftStart:  string;
  shiftEnd:    string;
  selected:    string;
  onSelect:    (officerId: string) => void;
};

export default function EligibleOfficerList({
  post, shiftStart, shiftEnd, selected, onSelect,
}: Props) {
  const [officers, setOfficers] = useState<Personnel[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!post || !shiftStart || !shiftEnd) return;
    setLoading(true);
    // Convert datetime-local strings (local time) to UTC ISO before sending —
    // the server must compare against TIMESTAMPTZ columns in the same reference frame.
    const qs = new URLSearchParams({
      post,
      shiftStart: new Date(shiftStart).toISOString(),
      shiftEnd:   new Date(shiftEnd).toISOString(),
    });
    fetch(`/api/officers?${qs}`)
      .then((r) => r.json())
      .then((data: Personnel[]) => setOfficers(data))
      .finally(() => setLoading(false));
  }, [post, shiftStart, shiftEnd]);

  if (loading) {
    return <p className="text-sm text-gray-400">Loading eligible officers…</p>;
  }

  if (!officers.length) {
    return (
      <p className="text-sm text-red-600">
        No eligible officers — all certified staff are either unavailable or within a rest window.
      </p>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Eligible Officer ({officers.length} available, ordered by seniority)
      </label>
      <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white divide-y divide-gray-100">
        {officers.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => onSelect(o.id)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                selected === o.id
                  ? "bg-kc-blue-100 font-semibold text-kc-blue-900"
                  : "hover:bg-gray-50 text-gray-800"
              }`}
            >
              <span className="font-medium">{o.last_name}, {o.first_name}</span>
              <span className="ml-2 text-xs text-gray-400">
                #{o.badge_number} · {o.rank}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
