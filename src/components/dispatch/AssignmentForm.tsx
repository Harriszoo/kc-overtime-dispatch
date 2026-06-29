"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Personnel, ShiftPost, FatigueCheckResult } from "@/types";
import { ShiftPostEnum, checkAntiFatigueWindow } from "@/types";
import FatigueAlert from "./FatigueAlert";
import EligibleOfficerList from "./EligibleOfficerList";
import type { ShiftRow as ShiftRowLib } from "@/lib/shifts";

type Props = { officers: Personnel[] };

export default function AssignmentForm({ officers }: Props) {
  const router = useRouter();

  const [post,       setPost]       = useState<ShiftPost | "">("");
  const [officerId,  setOfficerId]  = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd,   setShiftEnd]   = useState("");
  const [notes,      setNotes]      = useState("");

  const [officerShifts,  setOfficerShifts]  = useState<ShiftRowLib[]>([]);
  const [fatigueResult,  setFatigueResult]  = useState<FatigueCheckResult | null>(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [serverError,    setServerError]    = useState<string | null>(null);

  async function handleOfficerSelect(id: string) {
    setOfficerId(id);
    setFatigueResult(null);
    if (!id) return;
    const res = await fetch(`/api/shifts?officerId=${id}`);
    const data: ShiftRowLib[] = await res.json();
    setOfficerShifts(data);
  }

  function runFatigueCheck() {
    if (!officerId || !post || !shiftStart || !shiftEnd) return;
    const result = checkAntiFatigueWindow(officerShifts as Parameters<typeof checkAntiFatigueWindow>[0], {
      officer_id:  officerId,
      post:        post as ShiftPost,
      shift_start: new Date(shiftStart),
      shift_end:   new Date(shiftEnd),
    });
    setFatigueResult(result);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fatigueResult && !fatigueResult.pass) return;

    setSubmitting(true);
    setServerError(null);

    const res = await fetch("/api/shifts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shift: {
          officer_id:  officerId,
          post,
          shift_type:  "overtime",
          shift_start: new Date(shiftStart),
          shift_end:   new Date(shiftEnd),
          notes:       notes || null,
        },
      }),
    });

    if (res.ok) {
      router.push("/dispatch");
      router.refresh();
    } else {
      const data = await res.json();
      setServerError(typeof data.error === "string" ? data.error : "Submission failed.");
    }
    setSubmitting(false);
  }

  const durationHours = shiftStart && shiftEnd
    ? (new Date(shiftEnd).getTime() - new Date(shiftStart).getTime()) / 3_600_000
    : 0;
  const durationError = durationHours <= 0
    ? "Shift end must be after shift start."
    : durationHours > 16
    ? `Shift duration of ${durationHours.toFixed(1)}h exceeds the 16-hour maximum.`
    : null;

  const readyToCheck = !!officerId && !!shiftStart && !!shiftEnd && !durationError;
  const canSubmit    = readyToCheck && (fatigueResult === null || fatigueResult.pass) && !submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Post */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Post</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-kc-blue-500 focus:ring-kc-blue-500"
          value={post}
          onChange={(e) => { setPost(e.target.value as ShiftPost); setFatigueResult(null); }}
          required
        >
          <option value="">Select a post…</option>
          {ShiftPostEnum.options.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Shift Start</label>
          <input
            type="datetime-local"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={shiftStart}
            onChange={(e) => { setShiftStart(e.target.value); setFatigueResult(null); }}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Shift End</label>
          <input
            type="datetime-local"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={shiftEnd}
            onChange={(e) => { setShiftEnd(e.target.value); setFatigueResult(null); }}
            required
          />
        </div>
      </div>

      {/* Inline duration error — shown immediately, before officer selection */}
      {durationError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {durationError}
        </p>
      )}

      {/* Eligible officer list — appears after post + times are valid */}
      {post && shiftStart && shiftEnd && !durationError && (
        <EligibleOfficerList
          post={post as ShiftPost}
          shiftStart={shiftStart}
          shiftEnd={shiftEnd}
          selected={officerId}
          onSelect={handleOfficerSelect}
        />
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Fatigue pre-check */}
      {readyToCheck && (
        <button
          type="button"
          onClick={runFatigueCheck}
          className="text-sm font-medium text-kc-blue-600 hover:underline"
        >
          Check fatigue window
        </button>
      )}

      {fatigueResult && <FatigueAlert result={fatigueResult} />}

      {serverError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-kc-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-kc-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Assign Overtime"}
      </button>
    </form>
  );
}
