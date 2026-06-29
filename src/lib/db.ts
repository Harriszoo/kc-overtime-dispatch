import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const ssl = process.env.DATABASE_URL?.includes("supabase.co")
  ? { rejectUnauthorized: false }
  : process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false;

const sql = postgres(process.env.DATABASE_URL, {
  ssl,
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export default sql;
