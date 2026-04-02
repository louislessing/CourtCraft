// Deployed: 2026-03-20
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { type, to, fullName, currency = "GBP", amount = 35, trialEndDate, nextCourtDate, verificationCode, documentTitle, documentType, totalDocuments, failureReason, caseTitle, caseNumber, generatedAt, sections, invoiceNumber, periodStart, periodEnd, newStatus, cancelAtPeriodEnd } = await req.json();

    let subject = "";
    let html = "";

    const baseStyle = `
      font-family: Georgia, serif;
      background: #0a0f1e;
      color: #ffffff;
      padding: 40px;
      max-width: 600px;
      margin: 0 auto;
    `;

    const goldStyle = "color: #c9a84c; font-weight: bold;";
    const btnStyle = `
      display: inline-block;
      background: linear-gradient(135deg, #c9a84c, #f0d080);
      color: #0a0f1e;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: bold;
      font-family: Georgia, serif;
      margin-top: 20px;
    `;

    // Full currency symbol map
    const currencySymbol = (c: string): string => {
      const map: Record<string, string> = { GBP: '£', USD: '$', CAD: 'C$', AUD: 'A$', NZD: 'NZ$', EUR: '€' };
      return map[c] ?? '£';
    };
    const sym = currencySymbol(currency);
    const siteUrl = "https://courtcraftadvocate.com";

    if (type === "case_insights") {
      const caseTitleSafe = caseTitle || "Your Case";
      const caseNumberSafe = caseNumber ? ` · ${caseNumber}` : "";
      const generatedAtSafe = generatedAt || new Date().toLocaleString('en-GB');
      const sectionColors: Record<string, string> = {
        "Key Case Insights": "#2563eb",
        "Timeline Predictions": "#7c3aed",
        "Next Steps": "#c9a84c",
      };

      const sectionsHtml = Array.isArray(sections)
        ? sections.map((s: { label: string; bullets: string[] }) => {
            const color = sectionColors[s.label] || "#c9a84c";
            const bulletsHtml = Array.isArray(s.bullets) && s.bullets.length > 0
              ? `<ul style="color: #cccccc; line-height: 1.9; padding-left: 20px; margin: 0;">${s.bullets.map((b: string) => `<li style="font-size: 13px;">${b}</li>`).join('')}</ul>`
              : `<p style="color: #888; font-size: 13px; margin: 0;">No data available for this section.</p>`;
            return `
              <div style="background: #1a2035; border: 1px solid ${color}44; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
                <p style="color: ${color}; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">${s.label}</p>
                ${bulletsHtml}
              </div>
            `;
          }).join('')
        : '';

      subject = `AI Case Insights Report — ${caseTitleSafe} | CourtCraft Advocate`;
      html = `
        <div style="${baseStyle}">
          <div style="border-bottom: 1px solid #c9a84c44; padding-bottom: 20px; margin-bottom: 24px;">
            <h1 style="${goldStyle} font-size: 20px; margin: 0 0 6px;">AI Case Insights Report</h1>
            <p style="color: #cccccc; font-size: 13px; margin: 0;">CourtCraft Advocate — Cross-tool AI Analysis</p>
          </div>

          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #888; font-size: 12px; padding: 3px 0;">Case</td>
                <td style="color: #ffffff; font-size: 12px; font-weight: bold; padding: 3px 0;">${caseTitleSafe}${caseNumberSafe}</td>
              </tr>
              <tr>
                <td style="color: #888; font-size: 12px; padding: 3px 0;">Generated</td>
                <td style="color: #ffffff; font-size: 12px; padding: 3px 0;">${generatedAtSafe}</td>
              </tr>
              <tr>
                <td style="color: #888; font-size: 12px; padding: 3px 0; vertical-align: top;">Prepared for</td>
                <td style="color: #cccccc; font-size: 11px; padding: 3px 0;">${fullName}</td>
              </tr>
              <tr>
                <td style="color: #888; font-size: 12px; padding: 3px 0; vertical-align: top;">Data sources</td>
                <td style="color: #cccccc; font-size: 11px; padding: 3px 0;">Cases · Court Dates · Timeline Events · Finance · Child Contacts · Communications · Secure Vault · Documents</td>
              </tr>
            </table>
          </div>

          ${sectionsHtml}

          <a href="${siteUrl}/dashboard#case-insights" style="${btnStyle}">
            View in Dashboard →
          </a>

          <p style="color: #666; font-size: 11px; margin-top: 30px; line-height: 1.6; border-top: 1px solid #1a2035; padding-top: 16px;">
            This AI analysis is based on your live case data at the time of generation. It is not legal advice and should not be relied upon as a substitute for professional legal counsel. CourtCraft Advocate provides McKenzie Friend lay support services only.
          </p>
        </div>
      `;
    } else if (type === "court_report") {
      const caseTitleSafe = caseTitle || "Your Case";
      const caseNumberSafe = caseNumber ? ` · ${caseNumber}` : "";
      const generatedAtSafe = generatedAt || new Date().toLocaleString('en-GB');
      const reportTypeSafe = (body as any).reportType || "Court Report";
      const hearingTypeSafe = (body as any).hearingType || "";
      const reportSections = (body as any).sections || [];

      const sectionColors: Record<string, string> = {};
      const defaultColors = ["#2563eb", "#7c3aed", "#c9a84c", "#059669", "#dc2626", "#0891b2", "#d97706", "#6366f1"];
      reportSections.forEach((s: { label: string; bullets: string[] }, i: number) => {
        sectionColors[s.label] = defaultColors[i % defaultColors.length];
      });

      const sectionsHtml = Array.isArray(reportSections)
        ? reportSections.map((s: { label: string; bullets: string[] }) => {
            const color = sectionColors[s.label] || "#2563eb";
            const bulletsHtml = Array.isArray(s.bullets) && s.bullets.length > 0
              ? `<ul style="color: #cccccc; line-height: 1.9; padding-left: 20px; margin: 0;">${s.bullets.slice(0, 6).map((b: string) => `<li style="font-size: 12px; margin-bottom: 4px;">${b}</li>`).join('')}</ul>`
              : `<p style="color: #888; font-size: 12px; margin: 0;">No data available for this section.</p>`;
            return `
              <div style="background: #1a2035; border: 1px solid ${color}44; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
                <p style="color: ${color}; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px; border-bottom: 1px solid ${color}33; padding-bottom: 8px;">${s.label}</p>
                ${bulletsHtml}
              </div>
            `;
          }).join('')
        : '';

      subject = `Court Report — ${reportTypeSafe} | ${caseTitleSafe} | CourtCraft Advocate`;
      html = `
        <div style="${baseStyle}">
          <div style="border-bottom: 1px solid #2563eb44; padding-bottom: 20px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #1e3a5f, #2563eb); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="color: white; font-size: 18px;">⚖</span>
              </div>
              <div>
                <h1 style="color: #ffffff; font-size: 18px; margin: 0 0 2px; font-weight: bold;">${reportTypeSafe}</h1>
                <p style="color: #7ca3d4; font-size: 12px; margin: 0;">CourtCraft Advocate — Court-Ready Report</p>
              </div>
            </div>
          </div>

          <div style="background: #1a2035; border: 1px solid #2563eb33; border-radius: 12px; padding: 16px; margin: 0 0 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #888; font-size: 11px; padding: 3px 0; width: 110px;">Case</td>
                <td style="color: #ffffff; font-size: 11px; font-weight: bold; padding: 3px 0;">${caseTitleSafe}${caseNumberSafe}</td>
              </tr>
              <tr>
                <td style="color: #888; font-size: 11px; padding: 3px 0;">Hearing Type</td>
                <td style="color: #7ca3d4; font-size: 11px; padding: 3px 0;">${hearingTypeSafe}</td>
              </tr>
              <tr>
                <td style="color: #888; font-size: 11px; padding: 3px 0;">Generated</td>
                <td style="color: #cccccc; font-size: 11px; padding: 3px 0;">${generatedAtSafe}</td>
              </tr>
              <tr>
                <td style="color: #888; font-size: 11px; padding: 3px 0;">Prepared for</td>
                <td style="color: #cccccc; font-size: 11px; padding: 3px 0;">${fullName}</td>
              </tr>
              <tr>
                <td style="color: #888; font-size: 11px; padding: 3px 0; vertical-align: top;">Data sources</td>
                <td style="color: #aaaaaa; font-size: 10px; padding: 3px 0;">Cases · Court Dates · Timeline · Finance · Child Contacts · Communications · Vault · Documents</td>
              </tr>
            </table>
          </div>

          ${sectionsHtml}

          <a href="${siteUrl}/dashboard#court-report" style="${btnStyle}">
            View Full Report in Dashboard →
          </a>

          <p style="color: #666; font-size: 10px; margin-top: 28px; line-height: 1.6; border-top: 1px solid #1a2035; padding-top: 14px;">
            IMPORTANT: This report is AI-generated based on data entered by the user. It is not legal advice and should not be relied upon as a substitute for professional legal counsel. CourtCraft Advocate provides McKenzie Friend lay support services only. Always verify all information before submitting to court. courtcraftadvocate.com
          </p>
        </div>
      `;
    } else if (type === "email_verification") {
      subject = "CourtCraft Advocate — Your Email Verification Code";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Verify Your Email Address</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, thank you for signing up to CourtCraft Advocate.
            Please use the code below to verify your email address.
          </p>
          <div style="background: #1a2035; border: 2px solid #c9a84c; border-radius: 16px; padding: 32px; margin: 24px 0; text-align: center;">
            <p style="color: #cccccc; font-size: 13px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
            <p style="color: #c9a84c; font-size: 42px; font-weight: bold; letter-spacing: 12px; margin: 0; font-family: monospace;">${verificationCode}</p>
            <p style="color: #666; font-size: 12px; margin: 16px 0 0;">This code expires in 15 minutes</p>
          </div>
          <p style="color: #cccccc; line-height: 1.7;">
            Enter this code on the verification screen to complete your account setup.
          </p>
          <p style="color: #cccccc; line-height: 1.7;">
            If you did not create an account with CourtCraft Advocate, please ignore this email.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            CourtCraft Advocate — McKenzie Friend lay support services. Not regulated legal advice.
          </p>
        </div>
      `;
    } else if (type === "welcome") {
      subject = "Welcome to CourtCraft Advocate — Your Legal Journey Starts Now";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Welcome to CourtCraft Advocate, ${fullName}.</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            You've taken the first step toward taking control of your legal journey.
            Your subscription is now active — full access to every tool, no restrictions.
          </p>
          <h2 style="${goldStyle}">What's included:</h2>
          <ul style="color: #cccccc; line-height: 2;">
            <li>🤖 AI Legal Assistant — UK Family Law trained</li>
            <li>📄 Document Builder — 50+ court document templates</li>
            <li>📁 Case Management — Timeline, contacts, finance tracker</li>
            <li>📅 Court Date Calendar — Never miss a deadline</li>
            <li>💬 Live Support Chat — 24/7 assistance</li>
          </ul>
          <p style="color: #cccccc;">
            Your subscription is <span style="${goldStyle}">${sym}${amount}/month</span>. Cancel anytime.
          </p>
          <a href="${siteUrl}/dashboard" style="${btnStyle}">
            Go to Your Dashboard →
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            CourtCraft Advocate provides McKenzie Friend lay support services only, not regulated legal advice.
          </p>
        </div>
      `;
    } else if (type === "payment_confirmation") {
      subject = "Payment Confirmed — CourtCraft Advocate Subscription";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Payment Confirmed</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, your CourtCraft Advocate subscription is now active.
          </p>
          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #c9a84c; margin: 0 0 8px; font-weight: bold;">Subscription Details</p>
            <p style="color: #cccccc; margin: 4px 0;">Plan: Monthly Subscription</p>
            <p style="color: #cccccc; margin: 4px 0;">Amount: ${sym}${amount}/month</p>
            <p style="color: #cccccc; margin: 4px 0;">Status: <span style="color: #4ade80;">Active ✓</span></p>
          </div>
          <a href="${siteUrl}/dashboard" style="${btnStyle}">
            Access Your Dashboard →
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            You can manage your subscription at any time from your dashboard settings.
          </p>
        </div>
      `;
    } else if (type === "invoice_confirmation") {
      subject = "Invoice — CourtCraft Advocate Subscription Renewal";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Subscription Renewed Successfully</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, your CourtCraft Advocate subscription has been renewed and your payment was successful.
          </p>
          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #c9a84c; margin: 0 0 12px; font-weight: bold;">📄 Invoice Details</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #888; font-size: 13px; padding: 5px 0;">Description</td>
                <td style="color: #ffffff; font-size: 13px; padding: 5px 0; text-align: right;">CourtCraft Advocate — Monthly Subscription</td>
              </tr>
              <tr>
                <td style="color: #888; font-size: 13px; padding: 5px 0;">Amount</td>
                <td style="color: #ffffff; font-size: 13px; padding: 5px 0; text-align: right; font-weight: bold;">${sym}${amount}</td>
              </tr>
              ${periodStart ? `<tr>
                <td style="color: #888; font-size: 13px; padding: 5px 0;">Billing Period</td>
                <td style="color: #cccccc; font-size: 13px; padding: 5px 0; text-align: right;">${periodStart}${periodEnd ? ` – ${periodEnd}` : ""}</td>
              </tr>` : ""}
              <tr>
                <td style="color: #888; font-size: 13px; padding: 5px 0;">Status</td>
                <td style="color: #4ade80; font-size: 13px; padding: 5px 0; text-align: right; font-weight: bold;">Paid ✓</td>
              </tr>
            </table>
          </div>
          <p style="color: #cccccc; line-height: 1.7;">
            Your subscription is active and all tools remain fully accessible. Thank you for continuing with CourtCraft Advocate.
          </p>
          <a href="${siteUrl}/dashboard" style="${btnStyle}">
            Go to Dashboard →
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            You can manage your subscription and view billing history from your dashboard settings. CourtCraft Advocate — McKenzie Friend lay support services. Not regulated legal advice.
          </p>
        </div>
      `;
    } else if (type === "subscription_updated") {
      const statusLabel = cancelAtPeriodEnd
        ? "Cancels at Period End"
        : newStatus === "active" ? "Active" : newStatus === "past_due" ? "Past Due" : newStatus === "trialing" ? "Trial" : (newStatus || "Updated");
      const statusColor = cancelAtPeriodEnd ? "#f97316" : newStatus === "active" ? "#4ade80" : newStatus === "past_due" ? "#ef4444" : "#c9a84c";
      subject = `Subscription Updated — CourtCraft Advocate`;
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Your Subscription Has Been Updated</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, your CourtCraft Advocate subscription status has changed.
          </p>
          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #c9a84c; margin: 0 0 12px; font-weight: bold;">Subscription Status</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #888; font-size: 13px; padding: 5px 0;">Plan</td>
                <td style="color: #ffffff; font-size: 13px; padding: 5px 0; text-align: right;">CourtCraft Advocate — Monthly</td>
              </tr>
              <tr>
                <td style="color: #888; font-size: 13px; padding: 5px 0;">New Status</td>
                <td style="color: ${statusColor}; font-size: 13px; padding: 5px 0; text-align: right; font-weight: bold;">${statusLabel}</td>
              </tr>
              ${periodEnd ? `<tr>
                <td style="color: #888; font-size: 13px; padding: 5px 0;">${cancelAtPeriodEnd ? "Access Until" : "Next Renewal"}</td>
                <td style="color: #cccccc; font-size: 13px; padding: 5px 0; text-align: right;">${periodEnd}</td>
              </tr>` : ""}
            </table>
          </div>
          ${cancelAtPeriodEnd ? `
          <div style="background: #2a1a0a; border: 1px solid #f9731633; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="color: #f97316; margin: 0 0 8px; font-weight: bold;">⚠️ Cancellation Scheduled</p>
            <p style="color: #cccccc; margin: 0; font-size: 13px; line-height: 1.7;">Your subscription will remain active until the end of the current billing period. After that, you will lose access to all tools and case data.</p>
          </div>
          <a href="${siteUrl}/subscription" style="${btnStyle}">
            Reactivate Subscription →
          </a>
          ` : `
          <a href="${siteUrl}/dashboard" style="${btnStyle}">
            Go to Dashboard →
          </a>
          `}
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you did not make this change, please contact us immediately. CourtCraft Advocate — McKenzie Friend lay support services. Not regulated legal advice.
          </p>
        </div>
      `;
    } else if (type === "subscription_canceled") {
      subject = "Subscription Cancelled — CourtCraft Advocate";
      html = `
        <div style="${baseStyle}">
          <div style="background: #1a1a2e; border: 1px solid #c9a84c44; border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="color: #c9a84c; font-size: 16px; font-weight: bold; margin: 0;">Subscription Cancelled</p>
            <p style="color: #888; font-size: 12px; margin: 8px 0 0;">Your CourtCraft Advocate subscription has ended</p>
          </div>
          <h1 style="${goldStyle}">We're Sorry to See You Go, ${fullName}</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Your CourtCraft Advocate subscription has been cancelled. Your account data will be retained for 30 days in case you decide to return.
          </p>
          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #c9a84c; margin: 0 0 12px; font-weight: bold;">What Happens Next</p>
            <ul style="color: #cccccc; line-height: 2; margin: 0; padding-left: 20px; font-size: 13px;">
              <li>Your access to all tools has ended</li>
              <li>Your case data is retained for 30 days</li>
              <li>You can resubscribe at any time to regain full access</li>
              <li>Contact us if you need a data export before deletion</li>
            </ul>
          </div>
          <p style="color: #cccccc; line-height: 1.7;">
            If you cancelled by mistake or would like to continue, you can resubscribe at any time.
          </p>
          <a href="${siteUrl}/subscription" style="${btnStyle}">
            Resubscribe →
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Thank you for using CourtCraft Advocate. We hope to support you again in the future. CourtCraft Advocate — McKenzie Friend lay support services. Not regulated legal advice.
          </p>
        </div>
      `;
    } else if (type === "court_reminder") {
      subject = `⚖️ Court Date Reminder — ${nextCourtDate}`;
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Court Date Reminder</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, this is a reminder about your upcoming court date.
          </p>
          <div style="background: #1a2035; border: 1px solid #f97316; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #f97316; margin: 0 0 8px; font-weight: bold;">📅 Upcoming Date</p>
            <p style="color: #ffffff; font-size: 18px; margin: 4px 0;">${nextCourtDate}</p>
          </div>
          <h2 style="${goldStyle}">Preparation Checklist:</h2>
          <ul style="color: #cccccc; line-height: 2;">
            <li>✅ Review your Position Statement</li>
            <li>✅ Organise your evidence bundle</li>
            <li>✅ Confirm your McKenzie Friend attendance</li>
            <li>✅ Review the court's directions</li>
            <li>✅ Prepare your questions for the judge</li>
          </ul>
          <a href="${siteUrl}/document-builder" style="${btnStyle}">
            Prepare Your Documents →
          </a>
        </div>
      `;
    } else if (type === "trial_ending") {
      subject = "Your CourtCraft Advocate Trial Ends Soon — Continue Your Journey";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Your Subscription Ends on ${trialEndDate}</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, your subscription period is coming to an end.
            Don't lose access to your case files, documents, and AI assistant.
          </p>
          <p style="color: #cccccc;">
            Continue for just <span style="${goldStyle}">${sym}${amount}/month</span> — cancel anytime.
          </p>
          <a href="${siteUrl}/sign-up-login" style="${btnStyle}">
            Activate Subscription →
          </a>
        </div>
      `;
    } else if (type === "trial_countdown_3day") {
      subject = "⏳ 3 Days Left on Your CourtCraft Advocate Trial";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">⏳ 3 Days Remaining on Your Subscription</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, your subscription ends on <strong style="color: #ffffff;">${trialEndDate}</strong>.
            You have just 3 days left to secure full access to all your tools.
          </p>
          <div style="background: #1a2035; border: 1px solid #c9a84c55; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #c9a84c; margin: 0 0 12px; font-weight: bold;">What you'll lose access to:</p>
            <ul style="color: #cccccc; line-height: 2; margin: 0; padding-left: 20px;">
              <li>🤖 AI Legal Assistant — UK Family Law trained</li>
              <li>📄 Document Builder — 50+ court document templates</li>
              <li>📁 Case Management — Timeline, contacts, finance tracker</li>
              <li>📅 Court Date Calendar — Never miss a deadline</li>
            </ul>
          </div>
          <p style="color: #cccccc;">
            Continue for just <span style="${goldStyle}">${sym}${amount}/month</span> — cancel anytime.
          </p>
          <a href="${siteUrl}/subscription" style="${btnStyle}">
            Upgrade Now — Keep Full Access →
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            CourtCraft Advocate — McKenzie Friend lay support services. Not regulated legal advice.
          </p>
        </div>
      `;
    } else if (type === "trial_countdown_1day") {
      subject = "🚨 Final 24 Hours — Your CourtCraft Advocate Subscription Expires Tomorrow";
      html = `
        <div style="${baseStyle}">
          <div style="background: #2a1515; border: 2px solid #ef4444; border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="color: #ef4444; font-size: 18px; font-weight: bold; margin: 0;">🚨 FINAL 24 HOURS</p>
            <p style="color: #cccccc; font-size: 13px; margin: 8px 0 0;">Your subscription expires on ${trialEndDate}</p>
          </div>
          <h1 style="${goldStyle}">Don't Lose Your Case Files, ${fullName}</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Your subscription expires tomorrow. After that, you'll lose access to your AI assistant, documents, and case management tools.
          </p>
          <p style="color: #cccccc;">
            Secure your subscription now for just <span style="${goldStyle}">${sym}${amount}/month</span>. Cancel anytime — no long-term commitment.
          </p>
          <a href="${siteUrl}/subscription" style="${btnStyle}">
            Activate Subscription Now →
          </a>
          <p style="color: #888; font-size: 13px; margin-top: 20px; line-height: 1.6;">
            Already subscribed? You can safely ignore this email. Your account is protected.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            CourtCraft Advocate — McKenzie Friend lay support services. Not regulated legal advice.
          </p>
        </div>
      `;
    } else if (type === "document_milestone") {
      const docTitleSafe = documentTitle || "your document";
      const docTypeSafe = documentType || "Court Document";
      const totalSafe = totalDocuments || 1;
      subject = `📄 Document Complete — ${docTitleSafe} | CourtCraft Advocate`;
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Document Generated Successfully</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, your court document has been completed and saved to your account.
          </p>
          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #c9a84c; margin: 0 0 12px; font-weight: bold;">📄 Document Details</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;"><strong style="color: #ffffff;">Title:</strong> ${docTitleSafe}</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;"><strong style="color: #ffffff;">Type:</strong> ${docTypeSafe}</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;"><strong style="color: #ffffff;">Status:</strong> <span style="color: #4ade80;">Complete ✓</span></p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;"><strong style="color: #ffffff;">Total Documents Saved:</strong> ${totalSafe}</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;"><strong style="color: #ffffff;">Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <p style="color: #cccccc; line-height: 1.7;">
            Your document is securely stored in your CourtCraft Advocate account. You can access, edit, or download it at any time from your Document Builder.
          </p>
          <a href="${siteUrl}/document-builder" style="${btnStyle}">
            View Your Documents →
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            CourtCraft Advocate — McKenzie Friend lay support services. Not regulated legal advice.
          </p>
        </div>
      `;
    } else if (type === "gdpr_consent_update") {
      subject = "CourtCraft Advocate — Your Consent Preferences Have Been Updated";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Consent Preferences Updated</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, your data consent preferences have been successfully updated on CourtCraft Advocate.
          </p>
          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #c9a84c; margin: 0 0 8px; font-weight: bold;">What This Means</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;">Your updated preferences are now active and will be applied to all future data processing activities.</p>
          </div>
          <p style="color: #cccccc; line-height: 1.7;">
            You can update your consent preferences at any time from the GDPR Compliance Centre in your dashboard.
          </p>
          <a href="${siteUrl}/dashboard" style="${btnStyle}">
            View GDPR Settings →
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This email was sent because you updated your consent preferences. If you did not make this change, please contact us immediately.
          </p>
        </div>
      `;
    } else if (type === "gdpr_data_access") {
      subject = "CourtCraft Advocate — Your Personal Data Export Is Ready";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Your Data Export Is Ready</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, your personal data export has been generated and downloaded as requested under your Right to Data Portability (Article 20, UK GDPR).
          </p>
          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #c9a84c; margin: 0 0 8px; font-weight: bold;">Export Details</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;">Format: JSON (machine-readable)</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;">Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;">Includes: Profile, cases, documents, chat history, finance records</p>
          </div>
          <p style="color: #cccccc; line-height: 1.7;">
            If you did not request this export, please contact our Data Protection team immediately.
          </p>
          <a href="${siteUrl}/dashboard" style="${btnStyle}">
            Go to Dashboard →
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            CourtCraft Advocate — Data Protection Officer contact: privacy@courtcraftadvocate.com
          </p>
        </div>
      `;
    } else if (type === "gdpr_erasure_request") {
      subject = "CourtCraft Advocate — Account Deletion Request Received";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Account Deletion Request Received</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, we have received your request to delete your CourtCraft Advocate account and all associated personal data under your Right to Erasure (Article 17, UK GDPR).
          </p>
          <div style="background: #2a1515; border: 1px solid #ef444433; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #ef4444; margin: 0 0 8px; font-weight: bold;">⚠️ Important Information</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;">Your request has been logged and will be processed within <strong style="color: #ffffff;">30 days</strong> as required by UK GDPR.</p>
            <p style="color: #cccccc; margin: 8px 0 4px; font-size: 14px;">The following will be permanently deleted:</p>
            <ul style="color: #cccccc; font-size: 13px; line-height: 1.8; padding-left: 20px;">
              <li>Your account and profile information</li>
              <li>All case files, documents, and timeline events</li>
              <li>Finance records and communication logs</li>
              <li>AI chat history and uploaded files</li>
            </ul>
          </div>
          <p style="color: #cccccc; line-height: 1.7;">
            If you change your mind, please contact us before the deletion is processed. Once completed, this action cannot be reversed.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Data Protection Officer: privacy@courtcraftadvocate.com | Reference: GDPR-ERASURE-${Date.now()}
          </p>
        </div>
      `;
    } else if (type === "gdpr_rectification") {
      subject = "CourtCraft Advocate — Your Personal Details Have Been Updated";
      html = `
        <div style="${baseStyle}">
          <h1 style="${goldStyle}">Personal Details Updated</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Hi ${fullName}, your personal details have been successfully updated on CourtCraft Advocate under your Right to Rectification (Article 16, UK GDPR).
          </p>
          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #c9a84c; margin: 0 0 8px; font-weight: bold;">Changes Applied</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;">Your profile information has been updated as requested.</p>
            <p style="color: #cccccc; margin: 4px 0; font-size: 14px;">Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <p style="color: #cccccc; line-height: 1.7;">
            If you did not make these changes, please contact us immediately.
          </p>
          <a href="${siteUrl}/dashboard" style="${btnStyle}">
            View Your Profile →
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            CourtCraft Advocate — Data Protection Officer contact: privacy@courtcraftadvocate.com
          </p>
        </div>
      `;
    } else if (type === "payment_failed") {
      subject = "⚠️ Payment Declined — Action Required | CourtCraft Advocate";
      html = `
        <div style="${baseStyle}">
          <div style="background: #2a1515; border: 2px solid #ef4444; border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="color: #ef4444; font-size: 18px; font-weight: bold; margin: 0;">⚠️ Payment Declined</p>
            <p style="color: #cccccc; font-size: 13px; margin: 8px 0 0;">Your CourtCraft Advocate subscription payment could not be processed</p>
          </div>
          <h1 style="${goldStyle}">We Couldn't Process Your Payment, ${fullName}</h1>
          <p style="color: #cccccc; line-height: 1.7;">
            Unfortunately, your recent payment attempt was unsuccessful. To avoid losing access to your case files, documents, and AI assistant, please update your payment details as soon as possible.
          </p>
          ${failureReason ? `
          <div style="background: #1a2035; border: 1px solid #ef444433; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="color: #ef4444; margin: 0 0 6px; font-weight: bold; font-size: 13px;">Reason</p>
            <p style="color: #cccccc; margin: 0; font-size: 14px;">${failureReason}</p>
          </div>
          ` : ""}
          <h2 style="${goldStyle}">What You Can Do</h2>
          <div style="background: #1a2035; border: 1px solid #c9a84c33; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #cccccc; margin: 0 0 12px; font-size: 14px; line-height: 1.8;">
              <strong style="color: #ffffff;">1. Update your payment method</strong> — Add a new card or update your billing details to retry the payment immediately.
            </p>
            <p style="color: #cccccc; margin: 0 0 12px; font-size: 14px; line-height: 1.8;">
              <strong style="color: #ffffff;">2. Pause your subscription</strong> — If you need more time, you can pause your subscription to prevent further failed attempts while you sort out your payment.
            </p>
            <p style="color: #cccccc; margin: 0; font-size: 14px; line-height: 1.8;">
              <strong style="color: #ffffff;">3. Contact support</strong> — Our team is available 24/7 to help you resolve any billing issues.
            </p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${siteUrl}/subscription" style="${btnStyle}; margin-right: 12px;">
              Update Payment →
            </a>
            <a href="${siteUrl}/settings" style="display: inline-block; background: transparent; color: #c9a84c; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-family: Georgia, serif; margin-top: 20px; border: 1px solid #c9a84c;">
              Manage Subscription
            </a>
          </div>
          <p style="color: #888; font-size: 13px; margin-top: 20px; line-height: 1.6;">
            Stripe will automatically retry your payment. If the issue persists, please update your payment method to keep your account active.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            CourtCraft Advocate — McKenzie Friend lay support services. Not regulated legal advice.
          </p>
        </div>
      `;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CourtCraft Advocate <noreply@courtcraftadvocate.com>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Email send failed");
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Email failed" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
