export function prismaDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return databaseUrl;
  }

  try {
    const url = new URL(databaseUrl);
    const hostname = url.hostname.toLowerCase();
    const usesSupabase = hostname.includes("supabase") || hostname.includes("pooler.supabase.com");
    const usesSupabasePooler = hostname.includes("pooler.supabase.com") || url.port === "6543";

    if (usesSupabase) {
      if (usesSupabasePooler && (url.port === "" || url.port === "5432")) {
        url.port = "6543";
      }

      // Use sslmode=require for Supabase connections; the Supabase pooler expects TLS.
      url.searchParams.set("sslmode", "require");

      if (usesSupabasePooler && !url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}
