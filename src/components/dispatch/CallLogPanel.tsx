"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CallEntry } from "@/lib/calls";
import type { Personnel } from "@/types";

const RESPONSE_BADGE: Record<string, string> = {
  accepted:  "bg-green-100 text-green-800",
  declined:  "bg-red-100   text-red-700",
  no_answer: "bg-gray-100  text-gray-600",
};

const RESPONSE_LABEL: Record<string, string> = {
  accepted:  "Accepted",
  declined:  "Declined",
  no_answer: "No answer",
};

type Props = {
  shiftId:    string;
  entries:    CallEntry[];
  queue:      Personnel[];   // eligible officers not yet in log, inverse seniority order
  supervisor: boolean;
};

export default function CallLogPanel({ shiftId, entries, queue, supervisor }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [notes, setNotes]              = useState("");
  const [error, setError]              = useState<string | null>(null);

  async function recordOffer(officerId: string) {
    setError(null);
    const res = await fetch(`/api/shifts/${shiftId}/calls`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ officerId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to log call.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function recordResponse(entryId: string, response: string) {
    setError(null);
    const res = await fetch(`/api/calls/${entryId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ response, notes: notes || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to record response.");
      return;
    }
    setRespondingId(null);
    setNotes("");
    startTransition(() => router.refresh());
  }

  const calledIds = new Set(entries.map((e) => e.officer_id));

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ── Already-called entries ─────────────────────────────────── */}
      {entries.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Call log
          </h3>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["#", "Officer", "Seniority", "Called at", "Response", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-400">
                      {e.call_order}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {e.last_name}, {e.first_name}
                      </p>
                      <p className="text-xs text-gray-400">#{e.badge_number} · {e.rank}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(e.seniority_date).getFullYear()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(e.called_at).toLocaleTimeString("en-US", {
                        hour: "numeric", minute: "2-digit", hour12: true,
                      })}
                      <span className="ml-1 text-xs text-gray-400">by {e.called_by}</span>
                    </td>
                    <td className="px-4 py-3">
                      {e.response ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESPONSE_BADGE[e.response]}`}>
                          {RESPONSE_LABEL[e.response]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Awaiting response</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {supervisor && !e.response && (
                        respondingId === e.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              value={notes}
                              onChange={(ev) => setNotes(ev.target.value)}
                              className="w-40 rounded border border-gray-300 px-2 py-1 text-xs"
                            />
                            <button
                              onClick={() => recordResponse(e.id, "accepted")}
                              disabled={isPending}
                              className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Accepted
                            </button>
                            <button
                              onClick={() => recordResponse(e.id, "declined")}
                              disabled={isPending}
                              className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              Declined
                            </button>
                            <button
                              onClick={() => recordResponse(e.id, "no_answer")}
                              disabled={isPending}
                              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                              No answer
                            </button>
                            <button
                              onClick={() => { setRespondingId(null); setNotes(""); }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRespondingId(e.id)}
                            className="text-xs font-medium text-kc-blue-600 hover:underline"
                          >
                            Record response
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Queue: eligible officers not yet called ────────────────── */}
      {supervisor && queue.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Call queue — inverse seniority order
          </h3>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Officer", "Rank", "Seniority", "Badge", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queue.filter((o) => !calledIds.has(o.id)).map((o, i) => (
                  <tr key={o.id} className={i === 0 ? "bg-kc-blue-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {o.last_name}, {o.first_name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{o.rank}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(o.seniority_date).toLocaleDateString("en-US", {
                        year: "numeric", month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">#{o.badge_number}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => recordOffer(o.id)}
                        disabled={isPending}
                        className={`rounded px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                          i === 0
                            ? "bg-kc-blue-600 text-white hover:bg-kc-blue-700"
                            : "border border-kc-blue-300 text-kc-blue-600 hover:bg-kc-blue-50"
                        }`}
                      >
                        Record offer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length === 0 && (
            <p className="mt-2 text-xs text-gray-400">
              First officer (highlighted) is least senior — required by union call order.
            </p>
          )}
        </div>
      )}

      {supervisor && queue.filter((o) => !calledIds.has(o.id)).length === 0 && (
        <p className="text-sm text-gray-500">
          All eligible officers have been contacted for this shift.
        </p>
      )}
    </div>
  );
}
