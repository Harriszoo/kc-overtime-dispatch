import Link from "next/link";
import type { Personnel } from "@/types";
import CertBadge from "./CertBadge";

export default function OfficerCard({ officer }: { officer: Personnel }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">
            {officer.last_name}, {officer.first_name}
          </p>
          <p className="text-xs text-gray-500">
            #{officer.badge_number} · {officer.rank}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            officer.is_active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {officer.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {officer.certifications.map((cert) => (
          <CertBadge key={cert} code={cert} />
        ))}
      </div>

      <Link
        href={`/roster/${officer.id}`}
        className="text-xs font-medium text-kc-blue-600 hover:underline"
      >
        View schedule →
      </Link>
    </div>
  );
}
