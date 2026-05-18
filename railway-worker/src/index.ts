import { createClient } from "@supabase/supabase-js";
import { processJob } from "./worker";

// ── KONFIGURACJA ─────────────────────────────────────────────
const POLL_INTERVAL_MS = 20_000; // co 20 sekund

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ── GŁÓWNA PĘTLA ─────────────────────────────────────────────
async function poll() {
  try {
    // Pobierz jeden pending job i od razu oznacz jako processing
    // (atomowa operacja — zapobiega podwójnemu przetwarzaniu)
    const { data, error } = await supabase.rpc("claim_next_job");

    if (error) {
      console.error("[poll] RPC error:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log("[poll] Brak oczekujących jobów");
      return;
    }

    const job = data[0];
    console.log(`[worker] Startuję job ${job.id} dla ${job.email}`);

    try {
      await processJob(supabase, job);
      await supabase
        .from("jobs")
        .update({ status: "done" })
        .eq("id", job.id);
      console.log(`[worker] ✓ Job ${job.id} ukończony`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[worker] ✗ Job ${job.id} błąd:`, msg);
      await supabase
        .from("jobs")
        .update({ status: "failed", error: msg })
        .eq("id", job.id);
    }
  } catch (err) {
    console.error("[poll] Nieoczekiwany błąd:", err);
  }
}

async function main() {
  console.log("🚀 MOODLY Worker uruchomiony");
  console.log(`📡 Polling co ${POLL_INTERVAL_MS / 1000}s`);

  // Uruchom od razu, potem co POLL_INTERVAL_MS
  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
