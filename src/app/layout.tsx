import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "KC DAJD — Overtime Dispatch",
  description: "King County Department of Adult and Juvenile Detention Overtime Scheduling",
};

const NAV = [
  { href: "/",         label: "Dashboard" },
  { href: "/dispatch", label: "Dispatch"  },
  { href: "/schedule", label: "Schedule"  },
  { href: "/roster",   label: "Roster"    },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="bg-kc-blue-900 text-white shadow-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
            <span className="shrink-0 text-base font-semibold tracking-tight">
              KC DAJD · Overtime Dispatch
            </span>
            <div className="flex gap-5">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-kc-blue-100 transition-colors hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
