import type { FatigueCheckResult } from "@/types";

const VIOLATION_LABELS: Record<string, string> = {
  SHIFT_TOO_LONG:           "Shift Too Long",
  SHIFT_OVERLAP:            "Shift Overlap",
  INSUFFICIENT_REST_BEFORE: "Insufficient Rest (Before)",
  INSUFFICIENT_REST_AFTER:  "Insufficient Rest (After)",
};

export default function FatigueAlert({ result }: { result: FatigueCheckResult }) {
  if (result.pass) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        Anti-fatigue check passed. This assignment is within safe scheduling limits.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-semibold">
        Scheduling Blocked — {VIOLATION_LABELS[result.violationType] ?? result.violationType}
      </p>
      <p className="mt-1">{result.error}</p>
    </div>
  );
}
