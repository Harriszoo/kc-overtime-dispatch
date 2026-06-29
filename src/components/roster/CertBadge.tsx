const CERT_LABELS: Record<string, string> = {
  FIREARMS_CERT:        "Firearms",
  CENTRAL_CONTROL_CERT: "Central Control",
  MEDICAL_WATCH_CERT:   "Medical Watch",
  INTAKE_CERT:          "Intake",
  TRANSPORT_CERT:       "Transport",
  COURT_DETAIL_CERT:    "Court Detail",
};

const CERT_COLORS: Record<string, string> = {
  FIREARMS_CERT:        "bg-red-100 text-red-800",
  CENTRAL_CONTROL_CERT: "bg-purple-100 text-purple-800",
  MEDICAL_WATCH_CERT:   "bg-blue-100 text-blue-800",
  INTAKE_CERT:          "bg-yellow-100 text-yellow-800",
  TRANSPORT_CERT:       "bg-orange-100 text-orange-800",
  COURT_DETAIL_CERT:    "bg-green-100 text-green-800",
};

export default function CertBadge({ code }: { code: string }) {
  const label  = CERT_LABELS[code]  ?? code;
  const colors = CERT_COLORS[code]  ?? "bg-gray-100 text-gray-700";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}
