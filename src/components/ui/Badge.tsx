type Color = "gray" | "green" | "yellow" | "red" | "blue" | "purple";

const COLORS: Record<Color, string> = {
  gray:   "bg-gray-100 text-gray-700",
  green:  "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red:    "bg-red-100 text-red-800",
  blue:   "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
};

type Props = {
  label: string;
  color?: Color;
};

export default function Badge({ label, color = "gray" }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[color]}`}>
      {label}
    </span>
  );
}
