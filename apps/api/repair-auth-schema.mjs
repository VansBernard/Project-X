import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env" });

const { Client } = pg;
const connectionUrl = new URL(process.env.DATABASE_URL);
// `pg` lets sslmode in the URL override the explicit SSL options below.
connectionUrl.searchParams.delete("sslmode");
connectionUrl.searchParams.delete("sslaccept");
const client = new Client({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false }
});

const statements = [
  `DO $$ BEGIN
     CREATE TYPE auth_token_type AS ENUM ('email_verification', 'password_reset');
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,
  `CREATE TABLE IF NOT EXISTS public.sessions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
     user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
     refresh_token_hash text NOT NULL,
     ip_address inet,
     user_agent text,
     expires_at timestamptz NOT NULL,
     revoked_at timestamptz,
     replaced_by_session_id uuid,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     deleted_at timestamptz
   )`,
  `CREATE TABLE IF NOT EXISTS public.auth_tokens (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE RESTRICT,
     user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
     type auth_token_type NOT NULL,
     token_hash text NOT NULL,
     expires_at timestamptz NOT NULL,
     used_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     deleted_at timestamptz
   )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS sessions_refresh_token_hash_key ON public.sessions(refresh_token_hash)",
  "CREATE INDEX IF NOT EXISTS sessions_dealer_id_user_id_idx ON public.sessions(dealer_id, user_id)",
  "CREATE INDEX IF NOT EXISTS sessions_dealer_id_expires_at_idx ON public.sessions(dealer_id, expires_at)",
  "CREATE INDEX IF NOT EXISTS sessions_dealer_id_revoked_at_idx ON public.sessions(dealer_id, revoked_at)",
  "CREATE INDEX IF NOT EXISTS sessions_dealer_id_deleted_at_idx ON public.sessions(dealer_id, deleted_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_token_hash_key ON public.auth_tokens(token_hash)",
  "CREATE INDEX IF NOT EXISTS auth_tokens_dealer_id_user_id_type_idx ON public.auth_tokens(dealer_id, user_id, type)",
  "CREATE INDEX IF NOT EXISTS auth_tokens_dealer_id_expires_at_idx ON public.auth_tokens(dealer_id, expires_at)",
  "CREATE INDEX IF NOT EXISTS auth_tokens_dealer_id_used_at_idx ON public.auth_tokens(dealer_id, used_at)",
  "CREATE INDEX IF NOT EXISTS auth_tokens_dealer_id_deleted_at_idx ON public.auth_tokens(dealer_id, deleted_at)"
];

try {
  await client.connect();
  for (const statement of statements) {
    await client.query(statement);
  }
  console.log("Authentication schema is ready.");
} finally {
  await client.end();
}
