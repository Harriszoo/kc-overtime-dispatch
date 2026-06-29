import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="bg-kc-blue-900 text-white shadow-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
            <span className="shrink-0 text-base font-semibold tracking-tight">
              KC DAJD · Overtime Dispatch
            </span>

            {session && (
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
            )}

            {session && (
              <div className="ml-auto flex items-center gap-4">
                <span className="text-sm text-kc-blue-200">
                  {session.user.name}
                  <span className="ml-1.5 text-xs text-kc-blue-400">
                    {session.user.rank}
                  </span>
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="rounded border border-kc-blue-600 px-3 py-1 text-xs font-medium text-kc-blue-200 hover:border-kc-blue-400 hover:text-white"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </nav>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
