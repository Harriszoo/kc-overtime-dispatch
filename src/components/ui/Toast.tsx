"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

const STYLES: Record<ToastType, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error:   "border-red-200 bg-red-50 text-red-800",
  info:    "border-blue-200 bg-blue-50 text-blue-800",
};

type Props = {
  message:  string;
  type?:    ToastType;
  duration?: number;
  onDismiss: () => void;
};

export default function Toast({ message, type = "info", duration = 4000, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDismiss(); }, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-md ${STYLES[type]}`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => { setVisible(false); onDismiss(); }}
        className="ml-2 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
