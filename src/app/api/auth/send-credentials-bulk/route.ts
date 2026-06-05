import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { transporter } from "@/lib/mailer";

function generateTempPassword(): string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const selectedEmails: string[] | undefined = body.emails;

        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (listError) {
            return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
        }

        const usersToSend = listData.users.filter((u) => {
            if (!u.email) return false;
            if (selectedEmails && selectedEmails.length > 0) {
                return selectedEmails.includes(u.email);
            }
            return true;
        });

        const appUrl = "https://request-kfcvn.netlify.app";

        const results: { email: string; success: boolean; error?: string }[] = [];

        for (const user of usersToSend) {
            try {
                const tempPassword = generateTempPassword();

                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    user.id,
                    { password: tempPassword }
                );
                if (updateError) throw new Error("Failed to update password");

                await transporter.sendMail({
                    from: `"KFC Promotions System" <${process.env.SMTP_FROM}>`,
                    to: user.email!,
                    subject: "Thông tin đăng nhập - KFC Promotions System",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <h2 style="color: #e4002b; margin-bottom: 4px;">KFC Promotions System</h2>
                            <p style="color: #6b7280; font-size: 13px; margin-top: 0;">Thông tin đăng nhập của bạn</p>
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
                            <p style="color: #374151;">Xin chào,</p>
                            <p style="color: #374151;">Tài khoản của bạn đã được tạo trên hệ thống KFC Promotions. Dưới đây là thông tin đăng nhập:</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                                <tr>
                                    <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 120px;">Email</td>
                                    <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #111827;">${user.email}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Password</td>
                                    <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #111827; font-size: 18px; font-weight: bold; letter-spacing: 3px;">${tempPassword}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Link website</td>
                                    <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">
                                        <a href="${appUrl}/signin" style="color: #e4002b;">${appUrl}/signin</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #6b7280; font-size: 13px;">Vui lòng đăng nhập và đổi mật khẩu mới ngay sau khi nhận được email này.</p>
                            <p style="color: #6b7280; font-size: 13px;">Nếu bạn có thắc mắc, hãy liên hệ quản trị viên.</p>
                        </div>
                    `,
                });

                results.push({ email: user.email!, success: true });
            } catch (err) {
                results.push({ email: user.email!, success: false, error: (err as Error).message });
            }
        }

        return NextResponse.json({ results });
    } catch (err) {
        console.error("send-credentials-bulk error:", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
