"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ShiftStatus } from "@/types";

type Props = {
  shiftId: string;
  status: ShiftStatus;
};

export default function ShiftActions({ shiftId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setError(null);
    const res = await fetch(`/api/shifts/${shiftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Approval failed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function cancel() {
    if (!window.confirm("Cancel this shift assignment?")) return;
    setError(null);
    const res = await fetch(`/api/shifts/${shiftId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Cancel failed.");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (status === "completed" || status === "cancelled") return null;

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {status === "pending" && (
        <button
          onClick={approve}
          disabled={isPending}
          className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
      )}
      <button
        onClick={cancel}
        disabled={isPending}
        className="rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
