import postgres from "postgres";

/**
 * Postgres connection. Vercel's Storage integrations (classic Vercel
 * Postgres/Neon, or the newer Prisma Postgres marketplace add-on) don't
 * all inject the same env var name — Prisma Postgres in particular sets
 * `DATABASE_URL` to a `prisma+postgres://` Accelerate URL that a plain
 * postgres.js client can't speak, alongside a real `POSTGRES_URL` that
 * it can. So: prefer `POSTGRES_URL`, and only fall back to `DATABASE_URL`
 * if it's an actual postgres:// URL (skip it otherwise instead of
 * crashing on an unsupported protocol). See .env.local.example for local
 * dev. Server-side only: never import from a client component.
 */
declare global {
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

export class DbConfigError extends Error {}

function resolveConnectionString(): string | undefined {
  const candidates = [
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
  ];
  return candidates.find((url) => url && /^postgres(ql)?:\/\//.test(url));
}

/** Lazily creates (and reuses, across hot-reloads/lambda invocations) the connection. */
export function db() {
  const url = resolveConnectionString();
  if (!url) {
    throw new DbConfigError(
      "No usable Postgres connection string found (checked POSTGRES_URL, POSTGRES_URL_NON_POOLING, DATABASE_URL). Add one to .env.local (see docs/PROJECT_NOTES.md)."
    );
  }
  if (!global.__pgClient) {
    global.__pgClient = postgres(url, { ssl: "require" });
  }
  return global.__pgClient;
}

let schemaReady: Promise<void> | null = null;

/** Idempotent CREATE TABLE IF NOT EXISTS — runs once per server instance. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const sql = db();
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS personas (
          user_id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS call_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS call_sessions_user_id_idx ON call_sessions (user_id)`;
      await sql`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          call_session_id TEXT,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS reports_user_id_idx ON reports (user_id)`;
      await sql`
        CREATE TABLE IF NOT EXISTS word_streak (
          user_id TEXT NOT NULL,
          date TEXT NOT NULL,
          words INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (user_id, date)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS archive_expressions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          report_id TEXT NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS archive_expressions_user_id_idx ON archive_expressions (user_id)`;
      await sql`
        CREATE TABLE IF NOT EXISTS archive_sentences (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          report_id TEXT NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS archive_sentences_user_id_idx ON archive_sentences (user_id)`;
    })();
  }
  return schemaReady;
}
