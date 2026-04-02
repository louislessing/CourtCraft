import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-session-courtcraft-2024';
const resend = new Resend(process.env.RESEND_API_KEY);

function isAdminAuthenticated(request: NextRequest): boolean {
  const cookie = request.cookies.get('admin_authenticated')?.value;
  return cookie === 'true';
}

export interface AlertPayload {
  serviceName: string;
  degradationType: 'down' | 'degraded';
  incidentId: string;
  latencyMs?: number;
  error?: string;
  checkedAt: string;
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: AlertPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { serviceName, degradationType, incidentId, latencyMs, error, checkedAt } = payload;

  const statusColor = degradationType === 'down' ? '#ef4444' : '#f59e0b';
  const statusLabel = degradationType === 'down' ? '🔴 SERVICE DOWN' : '🟡 SERVICE DEGRADED';
  const serviceDisplayName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0f1e; color: #ffffff; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #0d1526; border: 1px solid #1e2d4a; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: ${statusColor}15; border-bottom: 1px solid ${statusColor}30; padding: 24px 32px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: ${statusColor};"></div>
              <span style="color: ${statusColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">${statusLabel}</span>
            </div>
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 12px 0 0 0;">
              ${serviceDisplayName} Health Alert
            </h1>
          </div>
          <!-- Body -->
          <div style="padding: 32px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a; color: #6b7fa3; font-size: 13px; width: 40%;">Service</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a; color: #ffffff; font-size: 13px; font-weight: 600;">${serviceDisplayName}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a; color: #6b7fa3; font-size: 13px;">Degradation Type</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a;">
                  <span style="background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}30; border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase;">${degradationType}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a; color: #6b7fa3; font-size: 13px;">Incident ID</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a; color: #c9a84c; font-size: 13px; font-family: monospace;">${incidentId}</td>
              </tr>
              ${latencyMs !== undefined ? `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a; color: #6b7fa3; font-size: 13px;">Latency</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a; color: #ffffff; font-size: 13px;">${latencyMs}ms</td>
              </tr>` : ''}
              ${error ? `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a; color: #6b7fa3; font-size: 13px;">Error</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #1e2d4a; color: #ef4444; font-size: 12px; font-family: monospace;">${error}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 12px 0; color: #6b7fa3; font-size: 13px;">Detected At</td>
                <td style="padding: 12px 0; color: #ffffff; font-size: 13px;">${new Date(checkedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })} GMT</td>
              </tr>
            </table>

            <div style="margin-top: 28px; background: #0a0f1e; border: 1px solid #1e2d4a; border-radius: 10px; padding: 16px 20px;">
              <p style="color: #6b7fa3; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.1em;">Action Required</p>
              <p style="color: #ffffff; font-size: 14px; margin: 0;">
                Please investigate the ${serviceDisplayName} service immediately. 
                Log into the <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/dashboard" style="color: #c9a84c; text-decoration: none;">Admin Dashboard</a> 
                to view real-time service health status.
              </p>
            </div>
          </div>
          <!-- Footer -->
          <div style="padding: 20px 32px; border-top: 1px solid #1e2d4a; background: #0a0f1e;">
            <p style="color: #3d4f6b; font-size: 11px; margin: 0; text-align: center;">
              CourtCraft Advocate — Automated Health Alert System · Incident ${incidentId}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error: resendError } = await resend.emails.send({
      from: 'CourtCraft Alerts <alerts@courtcraftadvocate.com>',
      to: ['admin@courtcraftadvocate.com'],
      subject: `[${degradationType.toUpperCase()}] ${serviceDisplayName} Health Alert — Incident ${incidentId}`,
      html: htmlBody,
    });

    if (resendError) {
      console.error('Resend error:', resendError);
      return NextResponse.json({ error: resendError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: data?.id, incidentId });
  } catch (err: any) {
    console.error('Failed to send health alert:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
