import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";

// Extend the built-in session types with rank
declare module "next-auth" {
  interface Session {
    user: { rank: string; personnelId: string } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email    = credentials?.email    as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const rows = await sql<{ id: string; first_name: string; last_name: string; rank: string; email: string; password_hash: string }[]>`
          SELECT id, first_name, last_name, rank, email, password_hash
          FROM   personnel
          WHERE  email     = ${email}
            AND  is_active = true
          LIMIT  1
        `;
        const person = rows[0];
        if (!person?.password_hash) return null;

        const ok = await bcrypt.compare(password, person.password_hash);
        if (!ok) return null;

        return {
          id:          person.id,
          name:        `${person.first_name} ${person.last_name}`,
          email:       person.email,
          rank:        person.rank,
          personnelId: person.id,
        };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.rank        = (user as { rank: string }).rank;
        token.personnelId = (user as { personnelId: string }).personnelId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.rank        = token.rank as string;
        session.user.personnelId = token.personnelId as string;
      }
      return session;
    },
  },

  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});

// Ranks authorized to approve/cancel shifts
const SUPERVISOR_RANKS = new Set([
  "Corrections Captain",
  "Corrections Lieutenant",
  "Corrections Sergeant",
]);

export function isSupervisor(rank: string) {
  return SUPERVISOR_RANKS.has(rank);
}
