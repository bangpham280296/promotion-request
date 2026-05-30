import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// These are automatically available in every Supabase Edge Function
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Set these in Supabase Dashboard → Edge Functions → notify-promotions → Secrets
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate tomorrow's date (UTC+7 Hanoi time)
    const now = new Date();
    const hanoiOffset = 7 * 60; // UTC+7 in minutes
    const hanoiNow = new Date(now.getTime() + hanoiOffset * 60 * 1000);
    const tomorrow = new Date(hanoiNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

    // Query promotiondetail rows where startdate = tomorrow
    const { data: promotions, error } = await supabase
      .from("promotiondetail")
      .select("itemcode, itemname, startdate, enddate, price, discount")
      .eq("startdate", tomorrowStr);

    if (error) {
      console.error("Supabase query error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!promotions || promotions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No promotions starting tomorrow.", notified: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Build one combined Telegram message for all items
    const itemLines = promotions.map((promo, index) => {
      return [
        `${index + 1}. 🍗 <b>${promo.itemname}</b> (${promo.itemcode ?? "N/A"})`,
        `    📅 Start: ${promo.startdate} | End: ${promo.enddate ?? "N/A"}`,
        `    💰 Price: ${promo.price ?? "N/A"} | Discount: ${promo.discount ?? "N/A"}`,
        `_______________________________________`,
      ].join("\n");
    });

    const message = [
      `🔔 <b>Promotions Starting Tomorrow (${tomorrowStr})</b>`,
      `📦 Total items: ${promotions.length}`,
      ``,
      ...itemLines,
    ].join("\n");

    // Send to Telegram
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!telegramRes.ok) {
      const err = await telegramRes.json();
      console.error("Telegram error:", err);
      return new Response(JSON.stringify({ error: "Telegram send failed", detail: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: `Sent 1 notification for ${promotions.length} item(s).`,
        notified: promotions.length,
        date: tomorrowStr,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
