import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabaseClient";
import { sendTelegramMessage } from "@/lib/telegram";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Block anyone who does not supply the correct secret key
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Calculate tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // TEST MODE: use today's date to verify with existing data
    // Remove the line below and keep tomorrowStr when done testing
    const targetDate = tomorrowStr;

    // Query promotiondetail rows where startdate = targetDate
    const { data: promotions, error } = await supabase
      .from("promotiondetail")
      .select(
        `
        itemcode,
        itemname,
        startdate,
        enddate,
        price,
        discount,
        servicetype,
        reqid,
        requests (
          requestcode,
          promotionname,
          employees ( fullname ),
          department ( deptname )
        )
      `
      )
      .eq("startdate", targetDate);

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!promotions || promotions.length === 0) {
      return NextResponse.json({
        message: "No promotions starting tomorrow.",
        notified: 0,
      });
    }

    const chatId = process.env.TELEGRAM_CHAT_ID!;

    // Build one combined message for all items
    const itemLines = promotions.map((promo, index) => {
      return [
        `${index + 1}. Combo/Item: <b>(${promo.itemcode ?? "N/A"} - ${promo.itemname}</b>)`,
        `    📅 Start: ${promo.startdate} | End: ${promo.enddate ?? "N/A"}`,
        `    💰 Price: ${promo.price ?? "N/A"}`,
        `_______________________________________`,
      ].join("\n");
    });

    const message = [
      `🔔 <b>Promotions Starting Tomorrow (${targetDate})</b>`,
      `📦 Total items: ${promotions.length}`,
      ``,
      ...itemLines,
    ].join("\n");

    await sendTelegramMessage(chatId, message);

    return NextResponse.json({
      message: `Sent 1 notification for ${promotions.length} item(s).`,
      notified: promotions.length,
    });
  } catch (err) {
    console.error("Notification error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
