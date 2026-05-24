import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

Deno.serve(async (req) => {
  try {
    // Connect to the PostgreSQL instance using the connection string injected by Supabase
    // (SUPABASE_DB_URL has elevated privileges necessary for bypass RLS)
    const databaseUrl = Deno.env.get("SUPABASE_DB_URL")!;
    if (!databaseUrl) {
      throw new Error("Missing SUPABASE_DB_URL environment variable.");
    }
    
    const sql = postgres(databaseUrl);

    // Execute the transaction atomically
    await sql.begin(async (sql) => {
      // Step A: Decrease vitality by 5, constrained between 0 and 100
      await sql`UPDATE thoughts SET vitality = LEAST(100, GREATEST(0, vitality - 5));`;
      
      // Step B: Hard-delete any rows where vitality has hit exactly 0 (or lower)
      await sql`DELETE FROM thoughts WHERE vitality <= 0;`;
    });

    return new Response(
      JSON.stringify({ success: true, message: "Decay processing complete." }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error processing decay:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
