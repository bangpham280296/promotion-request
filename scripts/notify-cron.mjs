/**
 * Run this script daily with a system cron job or Task Scheduler.
 * Example cron (Linux/Mac): 0 8 * * * node /path/to/scripts/notify-cron.mjs
 * Example (Windows Task Scheduler): run "node scripts/notify-cron.mjs" daily at 08:00
 *
 * Requires: NEXT_PUBLIC_APP_URL and CRON_SECRET in your environment
 *   or edit the constants below directly.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "your_random_secret_here";

async function run() {
  console.log(`[${new Date().toISOString()}] Running promotion notification check...`);

  const res = await fetch(`${APP_URL}/api/notify-promotions`, {
    headers: {
      Authorization: `Bearer ${CRON_SECRET}`,
    },
  });

  const data = await res.json();
  console.log("Response:", data);
}

run().catch((err) => {
  console.error("Cron script failed:", err);
  process.exit(1);
});
