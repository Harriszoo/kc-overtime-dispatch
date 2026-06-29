"use client";

import { useEffect, useRef } from "react";

type Props = {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, title, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    open ? el.showModal() : el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-xl backdrop:bg-gray-900/40"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}
