import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// 1. Global Cache Setup (Safe for Next.js Hot Reloading)
declare global {
    var otpCache: Map<string, { code: string; expires: number }> | undefined;
}

const cache = global.otpCache || new Map<string, { code: string; expires: number }>();
if (process.env.NODE_ENV !== 'production') {
    global.otpCache = cache;
}

const resend = new Resend(process.env.RESEND_API_KEY);

// 2. Professional Email Template Generator
function generateVerificationEmail(otp: string, name?: string) {
    const greeting = name ? `Hi ${name},` : 'Hello,';

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Your OffLynk Verification Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #f3f4f6; text-align: center;">
              <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">OffLynk</h2>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 24px;">
                ${greeting}
              </p>
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 24px;">
                Please use the following verification code to access your account. This code is valid for the next <strong>5 minutes</strong>.
              </p>

              <div style="background-color: #f3f4f6; border-radius: 6px; padding: 24px; text-align: center; margin-bottom: 30px;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4F46E5;">
                  ${otp}
                </span>
              </div>

              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                If you did not request this code, please ignore this email or contact support if you have concerns about your account security.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
                Securely delivered by OffLynk Security
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
                &copy; ${new Date().getFullYear()} OffLynk. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </body>
    </html>
  `;
}

// 3. API Route Handler
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, name } = body;

        // Basic validation
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to memory cache (5 minute expiration)
        cache.set(email, { code: otp, expires: Date.now() + 5 * 60 * 1000 });

        // Send via Resend
        const { error } = await resend.emails.send({
            from: 'OffLynk Security <onboarding@resend.dev>',
            to: email,
            subject: 'Your OffLynk Verification Code',
            html: generateVerificationEmail(otp, name),
        });

        if (error) {
            console.error('Resend Error:', error);
            return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Internal Server Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}