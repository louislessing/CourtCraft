import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const emailBody = `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a3560 0%, #234a85 100%); padding: 32px 36px;">
          <h1 style="color: #C9A84C; font-size: 22px; font-weight: 700; margin: 0 0 4px 0;">
            New Personal Contact Request
          </h1>
          <p style="color: rgba(255,255,255,0.65); font-size: 13px; margin: 0;">
            Someone would like to be contacted personally via CourtCraft Advocate
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 36px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; width: 130px;">
                <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Name</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 15px; color: #1a3560; font-weight: 500;">${name}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Email</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                <a href="mailto:${email}" style="font-size: 15px; color: #C9A84C; font-weight: 500; text-decoration: none;">${email}</a>
              </td>
            </tr>
            ${phone ? `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Phone</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 15px; color: #1a3560; font-weight: 500;">${phone}</span>
              </td>
            </tr>` : ''}
            ${message ? `
            <tr>
              <td style="padding: 10px 0; vertical-align: top;">
                <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Message</span>
              </td>
              <td style="padding: 10px 0;">
                <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
              </td>
            </tr>` : ''}
          </table>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 36px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
            This request was submitted via the CourtCraft Advocate website contact bubble.<br/>
            Please respond to the individual within 24 hours.
          </p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: 'CourtCraft Advocate <noreply@courtcraftadvocate.com>',
      to: ['support@courtcraftadvocate.com'],
      replyTo: email,
      subject: `Personal Contact Request from ${name}`,
      html: emailBody,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact request email error:', error);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
