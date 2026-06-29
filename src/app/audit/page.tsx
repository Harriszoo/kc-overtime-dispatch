import Link from "next/link";
import { getAuditLog } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit";

const ACTION_META: Record<AuditAction, { label: string; badge: string }> = {
  "shift.created":       { label: "Created",        badge: "bg-blue-100   text-blue-800"   },
  "shift.approved":      { label: "Approved",        badge: "bg-green-100  text-green-800"  },
  "shift.cancelled":     { label: "Cancelled",       badge: "bg-red-100    text-red-700"    },
  "shift.status_changed":{ label: "Status changed",  badge: "bg-gray-100   text-gray-600"   },
  "call.offered":        { label: "Offer logged",    badge: "bg-amber-100  text-amber-800"  },
  "call.accepted":       { label: "Accepted",        badge: "bg-green-100  text-green-800"  },
  "call.declined":       { label: "Declined",        badge: "bg-red-100    text-red-700"    },
  "call.no_answer":      { label: "No answer",       badge: "bg-gray-100   text-gray-600"   },
};

function summary(action: AuditAction, payload: Record<string, unknown>): string {
  const post    = (payload.post    as string | undefined) ?? "";
  const officer = (payload.officer as string | undefined) ?? "";
  const order   = payload.call_order as number | undefined;
  const status  = payload.new_status as string | undefined;

  switch (action) {
    case "shift.created":
      return `${post} — assigned to ${officer}`;
    case "shift.approved":
      return `${post} for ${officer}`;
    case "shift.cancelled":
      return `${post} for ${officer}`;
    case "shift.status_changed":
      return `${post} → ${status}`;
    case "call.offered":
      return `Offer #${order} — ${officer} for ${post}`;
    case "call.accepted":
      return `${officer} accepted — ${post}`;
    case "call.declined":
      return `${officer} declined — ${post}`;
    case "call.no_answer":
      return `No answer from ${officer} — ${post}`;
  }
}

export default async function AuditPage() {
  const entries = await getAuditLog(200);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Last {entries.length} actions · reverse chronological
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No audit entries yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {["When", "Actor", "Action", "Details", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => {
                const meta     = ACTION_META[e.action] ?? { label: e.action, badge: "bg-gray-100 text-gray-600" };
                const shiftId  = e.payload.shift_id as string | undefined;
                const formattedTime = new Date(e.created_at).toLocaleString("en-US", {
                  month: "short", day: "numeric",
                  hour: "numeric", minute: "2-digit",
                  hour12: true,
                });

                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formattedTime}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{e.actor_name}</p>
                      {e.actor_email && (
                        <p className="text-xs text-gray-400">{e.actor_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {summary(e.action, e.payload)}
                      {typeof e.payload.notes === "string" && (
                        <span className="ml-2 text-xs text-gray-400 italic">
                          &ldquo;{e.payload.notes}&rdquo;
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {shiftId && (
                        <Link
                          href={`/dispatch/${shiftId}`}
                          className="text-xs text-kc-blue-600 hover:underline"
                        >
                          View shift
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
