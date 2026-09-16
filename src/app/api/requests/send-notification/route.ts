import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { transporter } from "@/lib/mailer";

function formatVNDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

function formatVNDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

function buildEmailHtml({
  requestcode,
  promotionname,
  requesterName,
  deptName,
  startDate,
  endDate,
  createDate,
}: {
  requestcode: string;
  promotionname: string;
  requesterName: string;
  deptName: string;
  startDate: string;
  endDate: string;
  createDate: string;
}) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông Báo Tạo Promotion Request Mới</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#2c3e50;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f6f8;padding:30px 10px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);border:1px solid #eaeaea;">
          
          <!-- KFC Brand Header -->
          <tr>
            <td style="background-color:#e4002b;padding:24px 32px;text-align:center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="display:inline-block;background-color:#ffffff;color:#e4002b;font-weight:900;font-size:22px;letter-spacing:1.5px;padding:4px 14px;border-radius:4px;">KFC</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:10px;">
                    <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                      Hệ Thống KFC Promotions
                    </h1>
                    <p style="margin:4px 0 0 0;color:#ffccd3;font-size:13px;font-weight:400;">
                      Thông Báo Tạo Yêu Cầu Khuyến Mãi Mới
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#4a5568;">
                Xin chào,
              </p>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#4a5568;">
                Hệ thống vừa ghi nhận một Promotion Request mới được tạo thành công với thông tin chi tiết như sau:
              </p>

              <!-- Request Code Highlight Box -->
              <div style="background-color:#fff5f6;border-left:4px solid #e4002b;padding:14px 18px;border-radius:4px;margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#e4002b;letter-spacing:0.5px;">Mã Request</div>
                <div style="font-size:18px;font-weight:700;color:#202124;margin-top:2px;">${requestcode}</div>
              </div>

              <!-- Information Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:24px;">
                <tr style="border-bottom:1px solid #edf2f7;">
                  <td width="38%" style="padding:10px 0;font-size:13px;font-weight:600;color:#718096;">Tên chương trình KM:</td>
                  <td width="62%" style="padding:10px 0;font-size:14px;font-weight:600;color:#1a202c;">${promotionname}</td>
                </tr>
                <tr style="border-bottom:1px solid #edf2f7;">
                  <td style="padding:10px 0;font-size:13px;font-weight:600;color:#718096;">Người tạo Request:</td>
                  <td style="padding:10px 0;font-size:13px;color:#2d3748;">${requesterName}</td>
                </tr>
                <tr style="border-bottom:1px solid #edf2f7;">
                  <td style="padding:10px 0;font-size:13px;font-weight:600;color:#718096;">Phòng ban:</td>
                  <td style="padding:10px 0;font-size:13px;color:#2d3748;">${deptName}</td>
                </tr>
                <tr style="border-bottom:1px solid #edf2f7;">
                  <td style="padding:10px 0;font-size:13px;font-weight:600;color:#718096;">Thời gian áp dụng:</td>
                  <td style="padding:10px 0;font-size:13px;color:#2d3748;">
                    Từ <strong>${startDate}</strong> đến <strong>${endDate}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:13px;font-weight:600;color:#718096;">Thời gian gửi (GMT+7):</td>
                  <td style="padding:10px 0;font-size:13px;color:#2d3748;">${createDate}</td>
                </tr>
              </table>

              <p style="margin:20px 0 0 0;font-size:13px;line-height:1.6;color:#718096;">
                Vui lòng theo dõi và tiến hành các bước phê duyệt / thiết lập tiếp theo theo quy trình.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;border-top:1px solid #e9ecef;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a0aec0;line-height:1.5;">
                Đây là email tự động từ <strong>KFC Promotions System</strong>.<br>
                Vui lòng không phản hồi (reply) trực tiếp vào email này.
              </p>
              <p style="margin:8px 0 0 0;font-size:11px;color:#cbd5e0;">
                &copy; KFC Vietnam. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const reqid = body?.reqid;

    if (!reqid) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin reqid" },
        { status: 400 }
      );
    }

    // 1. Query request data joining employees & department
    const { data: reqData, error: reqErr } = await supabaseAdmin
      .from("requests")
      .select(`
        reqid, requestcode, promotionname, startdate, enddate, createdate,
        employees:employees!request_requester_fkey(fullname),
        department:department(deptname)
      `)
      .eq("reqid", reqid)
      .single();

    if (reqErr || !reqData) {
      console.error("[send-notification] Request not found:", reqErr);
      return NextResponse.json(
        { success: false, error: `Không tìm thấy thông tin request: ${reqErr?.message || "Not found"}` },
        { status: 404 }
      );
    }

    // 2. Query active notification recipients
    const { data: recipients, error: recErr } = await supabaseAdmin
      .from("notification_recipients")
      .select("email, recipient_type")
      .eq("is_active", true);

    if (recErr) {
      console.warn("[send-notification] Cannot fetch recipients table:", recErr.message);
    }

    // 3. Separate TO and CC
    const activeList = recipients || [];
    let toEmails = activeList
      .filter((r) => r.recipient_type === "TO" && r.email)
      .map((r) => r.email.trim());

    const ccEmails = activeList
      .filter((r) => r.recipient_type === "CC" && r.email)
      .map((r) => r.email.trim());

    // Chỉ gửi khi có người nhận trong danh sách cấu hình. Tuyệt đối không tự gửi lại cho chính mình (SMTP_FROM).
    if (toEmails.length === 0 && ccEmails.length === 0) {
      console.log(
        `[send-notification] Không có người nhận nào trong danh sách notification_recipients. Bỏ qua việc gửi email cho request ${reqData.requestcode}.`
      );
      return NextResponse.json({
        success: true,
        message: "No recipients configured. Email notification skipped.",
        skipped: true,
      });
    }

    // Nếu không có email TO nhưng có email CC, chuyển CC sang TO để gửi hợp lệ
    if (toEmails.length === 0 && ccEmails.length > 0) {
      toEmails = [...ccEmails];
      ccEmails.length = 0;
    }

    // 4. Email Subject
    const subject = `[${reqData.requestcode}] - ${reqData.promotionname}`;

    // 5. Build HTML content
    const requesterName =
      (reqData.employees as any)?.fullname || "Không xác định";
    const deptName =
      (reqData.department as any)?.deptname || "Không xác định";
    const startDate = reqData.startdate ? formatVNDate(reqData.startdate) : "-";
    const endDate = reqData.enddate ? formatVNDate(reqData.enddate) : "-";
    const createDate = formatVNDateTime(reqData.createdate);

    const htmlContent = buildEmailHtml({
      requestcode: reqData.requestcode,
      promotionname: reqData.promotionname,
      requesterName,
      deptName,
      startDate,
      endDate,
      createDate,
    });

    // 6. Send Mail
    await transporter.sendMail({
      from: `"KFC Promotions System" <${process.env.SMTP_FROM || "bangpt@kfcvietnam.com.vn"}>`,
      to: toEmails,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      subject,
      html: htmlContent,
    });

    console.log(
      `[send-notification] Email sent for request ${reqData.requestcode} to TO: [${toEmails.join(
        ", "
      )}] CC: [${ccEmails.join(", ")}]`
    );

    return NextResponse.json({
      success: true,
      message: "Email notification sent successfully",
    });
  } catch (error: any) {
    console.error("[send-notification] Error sending email:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gửi email thất bại",
      },
      { status: 500 }
    );
  }
}
