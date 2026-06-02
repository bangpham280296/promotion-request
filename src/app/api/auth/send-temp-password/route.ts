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
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required." }, { status: 400 });
        }

        // Tìm user trong Supabase Auth theo email
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
            return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
        }

        const user = listData.users.find((u) => u.email === email);
        if (!user) {
            return NextResponse.json({ error: "Email not found." }, { status: 404 });
        }

        // Tạo mật khẩu tạm thời
        const tempPassword = generateTempPassword();

        // Cập nhật password trong Supabase
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: tempPassword }
        );
        if (updateError) {
            return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
        }

        // Gửi email
        await transporter.sendMail({
            from: `"KFC Promotions System" <${process.env.SMTP_FROM}>`,
            to: email,
            subject: "Mật khẩu tạm thời - KFC Promotions System",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="color: #e4002b; margin-bottom: 8px;">KFC Promotions System</h2>
                    <p style="color: #374151;">Xin chào,</p>
                    <p style="color: #374151;">Mật khẩu tạm thời của bạn là:</p>
                    <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; text-align: center; margin: 16px 0;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #111827;">${tempPassword}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Vui lòng đăng nhập và đổi mật khẩu mới ngay sau khi nhận được email này.</p>
                    <p style="color: #6b7280; font-size: 14px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy liên hệ quản trị viên ngay.</p>
                </div>
            `,
        });

        return NextResponse.json({ message: "Temporary password sent successfully." });
    } catch (err) {
        console.error("send-temp-password error:", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
