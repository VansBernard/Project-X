export function prismaDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return databaseUrl;
  }

  try {
    const url = new URL(databaseUrl);
    const hostname = url.hostname.toLowerCase();
    const usesSupabase = hostname.includes("supabase") || hostname.includes("pooler.supabase.com");
    const usesSupabasePooler = url.port === "6543";

    if (usesSupabase) {
      // Use TLS for Supabase connections and preserve the configured endpoint.
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
