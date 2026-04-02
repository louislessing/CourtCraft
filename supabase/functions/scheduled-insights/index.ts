// Deployed: 2026-03-20
// Scheduled edge function: generates AI case insights and emails them to users
// Can be triggered by Supabase cron (pg_cron) or called manually
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    // Allow manual trigger for a specific user (from dashboard)
    let targetUserId: string | null = null;
    let manualEmail: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetUserId = body.user_id || null;
        manualEmail = body.email || null;
      } catch {
        // no body
      }
    }

    // Fetch due schedules
    let query = supabase
      .from("insight_schedules")
      .select("*")
      .eq("is_active", true);

    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    } else {
      // Only fetch schedules that are due
      query = query.lte("next_run_at", now.toISOString());
    }

    const { data: schedules, error: schedErr } = await query;
    if (schedErr) throw schedErr;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    const errors: string[] = [];

    for (const schedule of schedules) {
      try {
        await processSchedule(supabase, schedule, manualEmail, now);
        processed++;
      } catch (err: any) {
        errors.push(`User ${schedule.user_id}: ${err.message}`);
        console.error(`Failed for user ${schedule.user_id}:`, err);
      }
    }

    return new Response(JSON.stringify({ processed, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("scheduled-insights error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processSchedule(
  supabase: any,
  schedule: any,
  overrideEmail: string | null,
  now: Date
) {
  const userId = schedule.user_id;

  // Fetch user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const fullName = profile?.full_name || profile?.email || "User";
  const deliveryEmail = overrideEmail || schedule.delivery_email;

  // Fetch active case
  const { data: activeCase } = await supabase
    .from("cases")
    .select("id, title, case_number, case_type, court_name, applicant_name, respondent_name, status, notes")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const caseId = activeCase?.id || null;

  // Fetch all tool data in parallel
  const [
    casesResult,
    timelineResult,
    financeResult,
    courtDatesResult,
    childContactsResult,
    communicationsResult,
    vaultFilesResult,
    documentsResult,
  ] = await Promise.all([
    supabase.from("cases").select("id, title, case_number, case_type, court_name, applicant_name, respondent_name, status, notes").eq("user_id", userId).limit(10),
    caseId ? supabase.from("timeline_events").select("id, event_date, event_title, event_type, description, has_evidence").eq("case_id", caseId).order("event_date", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    caseId ? supabase.from("finance_entries").select("id, entry_date, description, amount, entry_type, category").eq("case_id", caseId).order("entry_date", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    caseId ? supabase.from("court_dates").select("id, event_date, event_title, event_type, is_urgent, notes").eq("case_id", caseId).order("event_date", { ascending: true }).limit(10) : Promise.resolve({ data: [] }),
    supabase.from("child_contacts").select("id, child_name, contact_date, contact_type, status, notes, location").eq("user_id", userId).order("contact_date", { ascending: false }).limit(15),
    caseId ? supabase.from("communications").select("id, comm_date, comm_type, subject, summary, direction").eq("case_id", caseId).order("comm_date", { ascending: false }).limit(15) : Promise.resolve({ data: [] }),
    supabase.from("file_uploads").select("id, file_name, context, created_at").eq("user_id", userId).like("context", "dashboard-secure%").order("created_at", { ascending: false }).limit(20),
    supabase.from("file_uploads").select("id, file_name, context, created_at").eq("user_id", userId).like("context", "document-builder%").order("created_at", { ascending: false }).limit(20),
  ]);

  const ctx = {
    cases: casesResult.data || [],
    timelineEvents: timelineResult.data || [],
    financeEntries: financeResult.data || [],
    courtDates: courtDatesResult.data || [],
    childContacts: childContactsResult.data || [],
    communications: communicationsResult.data || [],
    vaultFiles: vaultFilesResult.data || [],
    documents: (documentsResult.data || []).map((f: any) => ({ id: f.id, title: f.file_name, document_type: f.context, created_at: f.created_at })),
  };

  // Build insights prompt
  const insightsPrompt = buildInsightsPrompt(ctx);

  // Call Anthropic
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1200,
      messages: [{ role: "user", content: insightsPrompt }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    throw new Error(`Anthropic API error: ${errText}`);
  }

  const anthropicData = await anthropicRes.json();
  const insightsText: string = anthropicData.content?.[0]?.text || "";

  if (!insightsText) throw new Error("Empty insights response from AI");

  // Parse sections
  const sections = parseInsightsSections(insightsText);

  const generatedAt = now.toLocaleString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const frequencyLabel = schedule.frequency === "weekly" ? "Weekly" : "Monthly";

  // Send email via Resend
  const emailHtml = buildScheduledInsightsEmail({
    fullName,
    caseTitle: activeCase?.title || "Your Case",
    caseNumber: activeCase?.case_number || "",
    generatedAt,
    sections,
    frequency: frequencyLabel,
  });

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CourtCraft Advocate <noreply@courtcraftadvocate.com>",
      to: [deliveryEmail],
      subject: `${frequencyLabel} AI Case Insights — ${activeCase?.title || "Your Case"} | CourtCraft Advocate`,
      html: emailHtml,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    throw new Error(`Resend error: ${errText}`);
  }

  // Update schedule: set last_sent_at and compute next_run_at
  const nextRunAt = computeNextRun(schedule, now);
  await supabase
    .from("insight_schedules")
    .update({ last_sent_at: now.toISOString(), next_run_at: nextRunAt.toISOString() })
    .eq("id", schedule.id);
}

function computeNextRun(schedule: any, from: Date): Date {
  const next = new Date(from);
  if (schedule.frequency === "weekly") {
    // Next occurrence of day_of_week
    const targetDay = schedule.day_of_week ?? 1;
    const currentDay = next.getUTCDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7; // same day → next week
    next.setUTCDate(next.getUTCDate() + daysUntil);
  } else {
    // Monthly: next occurrence of day_of_month
    const targetDay = schedule.day_of_month ?? 1;
    next.setUTCMonth(next.getUTCMonth() + 1);
    next.setUTCDate(Math.min(targetDay, 28));
  }
  next.setUTCHours(schedule.hour_utc ?? 8, 0, 0, 0);
  return next;
}

function buildInsightsPrompt(ctx: any): string {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const lines: string[] = [];
  lines.push(`Today is ${todayStr}. You are an expert UK family law AI assistant.`);
  lines.push("Analyse the following live case data and produce a structured report with THREE sections:");
  lines.push("");
  lines.push("**1. KEY CASE INSIGHTS** — 2-3 bullet points identifying the most important patterns, risks, or strengths across all the data.");
  lines.push("");
  lines.push("**2. TIMELINE PREDICTIONS** — 2-3 bullet points predicting likely upcoming milestones or risks based on the data.");
  lines.push("");
  lines.push("**3. NEXT STEPS** — 3-4 specific, actionable recommendations the user should take right now to strengthen their case.");
  lines.push("");
  lines.push("Be concise, specific, and reference actual dates/amounts/names from the data. Use plain English. Do not add disclaimers or preamble — go straight to the three sections.");
  lines.push("");
  lines.push("--- LIVE CASE DATA ---");

  if (ctx.cases.length > 0) {
    lines.push("\nCASES:");
    ctx.cases.forEach((c: any) => {
      lines.push(`- [${c.status?.toUpperCase() || "UNKNOWN"}] "${c.title}"${c.case_type ? ` (${c.case_type})` : ""}${c.court_name ? ` at ${c.court_name}` : ""}${c.case_number ? ` ref ${c.case_number}` : ""}`);
      if (c.notes) lines.push(`  Notes: ${c.notes.slice(0, 200)}`);
    });
  } else {
    lines.push("\nCASES: None recorded yet.");
  }

  if (ctx.courtDates.length > 0) {
    lines.push("\nCOURT DATES:");
    ctx.courtDates.forEach((d: any) => {
      const dateStr = new Date(d.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      let daysUntil = Math.ceil((new Date(d.event_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`- ${dateStr} (${daysUntil > 0 ? `in ${daysUntil} days` : "past"}): "${d.event_title}"${d.is_urgent ? " ⚠️ URGENT" : ""}`);
    });
  } else {
    lines.push("\nCOURT DATES: None recorded.");
  }

  if (ctx.timelineEvents.length > 0) {
    const withEvidence = ctx.timelineEvents.filter((e: any) => e.has_evidence).length;
    lines.push(`\nTIMELINE: ${ctx.timelineEvents.length} events (${withEvidence} with evidence, ${ctx.timelineEvents.length - withEvidence} without)`);
    ctx.timelineEvents.slice(0, 8).forEach((e: any) => {
      const dateStr = new Date(e.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      lines.push(`- ${dateStr}: "${e.event_title}"${e.has_evidence ? " ✓ evidence" : " ✗ no evidence"}`);
    });
  } else {
    lines.push("\nTIMELINE: No events recorded.");
  }

  if (ctx.financeEntries.length > 0) {
    const income = ctx.financeEntries.filter((f: any) => f.entry_type === "income").reduce((s: number, f: any) => s + (f.amount || 0), 0);
    const expenses = ctx.financeEntries.filter((f: any) => f.entry_type === "expense").reduce((s: number, f: any) => s + (f.amount || 0), 0);
    lines.push(`\nFINANCE: Income £${income.toFixed(2)}, Expenses £${expenses.toFixed(2)}, Net £${(income - expenses).toFixed(2)}`);
  } else {
    lines.push("\nFINANCE: No entries recorded.");
  }

  if (ctx.childContacts.length > 0) {
    const upcoming = ctx.childContacts.filter((c: any) => c.status === "scheduled" && new Date(c.contact_date) >= today).length;
    const missed = ctx.childContacts.filter((c: any) => c.status === "missed").length;
    lines.push(`\nCHILD CONTACTS: ${upcoming} upcoming, ${missed} missed`);
  } else {
    lines.push("\nCHILD CONTACTS: None recorded.");
  }

  lines.push(`\nCOMMUNICATIONS: ${ctx.communications.length} logged`);
  lines.push(`SECURE VAULT: ${ctx.vaultFiles.length} file(s) stored`);
  lines.push(`DOCUMENTS BUILT: ${ctx.documents.length} document(s)`);
  lines.push("\n--- END CASE DATA ---");
  return lines.join("\n");
}

function parseInsightsSections(text: string): Array<{ label: string; bullets: string[] }> {
  const sectionDefs = [
    { key: "KEY CASE INSIGHTS", label: "Key Case Insights" },
    { key: "TIMELINE PREDICTIONS", label: "Timeline Predictions" },
    { key: "NEXT STEPS", label: "Next Steps" },
  ];
  return sectionDefs.map(({ key, label }) => {
    const regex = new RegExp(`\\*\\*[0-9]+\\.\\s*${key}\\*\\*([\\s\\S]*?)(?=\\*\\*[0-9]+\\.|$)`, "i");
    const match = text.match(regex);
    const rawContent = match ? match[1].trim() : "";
    const bullets = rawContent
      .split("\n")
      .map((line: string) => line.replace(/^[-*•]\s*/, "").replace(/^\*\*(.*?)\*\*/, "$1").trim())
      .filter((line: string) => line.length > 0 && !line.startsWith("**"));
    return { label, bullets: bullets.length > 0 ? bullets : [rawContent || "No data available."] };
  });
}

function buildScheduledInsightsEmail(opts: {
  fullName: string;
  caseTitle: string;
  caseNumber: string;
  generatedAt: string;
  sections: Array<{ label: string; bullets: string[] }>;
  frequency: string;
}): string {
  const { fullName, caseTitle, caseNumber, generatedAt, sections, frequency } = opts;
  const siteUrl = "https://courtcraftadvocate.com";
  const sectionColors: Record<string, string> = {
    "Key Case Insights": "#2563eb",
    "Timeline Predictions": "#7c3aed",
    "Next Steps": "#c9a84c",
  };

  const sectionsHtml = sections.map((s) => {
    const color = sectionColors[s.label] || "#c9a84c";
    const bulletsHtml = s.bullets.length > 0
      ? `<ul style="color:#cccccc;line-height:1.9;padding-left:20px;margin:0;">${s.bullets.map((b) => `<li style="font-size:13px;">${b}</li>`).join("")}</ul>`
      : `<p style="color:#888;font-size:13px;margin:0;">No data available for this section.</p>`;
    return `<div style="background:#1a2035;border:1px solid ${color}44;border-radius:12px;padding:18px;margin-bottom:16px;">
      <p style="color:${color};font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">${s.label}</p>
      ${bulletsHtml}
    </div>`;
  }).join("");

  return `
    <div style="font-family:Georgia,serif;background:#0a0f1e;color:#ffffff;padding:40px;max-width:600px;margin:0 auto;">
      <div style="border-bottom:1px solid #c9a84c44;padding-bottom:20px;margin-bottom:24px;">
        <h1 style="color:#c9a84c;font-weight:bold;font-size:20px;margin:0 0 6px;">Your ${frequency} AI Case Insights</h1>
        <p style="color:#cccccc;font-size:13px;margin:0;">CourtCraft Advocate — Automated Cross-tool AI Analysis</p>
      </div>

      <p style="color:#cccccc;font-size:13px;line-height:1.7;">Hi ${fullName}, here is your ${frequency.toLowerCase()} automated case analysis generated from your live dashboard data.</p>

      <div style="background:#1a2035;border:1px solid #c9a84c33;border-radius:12px;padding:16px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#888;font-size:12px;padding:3px 0;">Case</td>
            <td style="color:#ffffff;font-size:12px;font-weight:bold;padding:3px 0;">${caseTitle}${caseNumber ? ` · ${caseNumber}` : ""}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding:3px 0;">Generated</td>
            <td style="color:#ffffff;font-size:12px;padding:3px 0;">${generatedAt}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding:3px 0;">Prepared for</td>
            <td style="color:#cccccc;font-size:11px;padding:3px 0;">${fullName}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding:3px 0;vertical-align:top;">Data sources</td>
            <td style="color:#cccccc;font-size:11px;padding:3px 0;">Cases · Court Dates · Timeline Events · Finance · Child Contacts · Communications · Secure Vault · Documents</td>
          </tr>
        </table>
      </div>

      ${sectionsHtml}

      <a href="${siteUrl}/dashboard#case-insights" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#f0d080);color:#0a0f1e;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-family:Georgia,serif;margin-top:20px;">
        View Full Dashboard →
      </a>

      <p style="color:#666;font-size:11px;margin-top:30px;line-height:1.6;border-top:1px solid #1a2035;padding-top:16px;">
        This is an automated ${frequency.toLowerCase()} report. You can change your schedule or unsubscribe at any time from your dashboard settings.<br/><br/>
        This AI analysis is based on your live case data at the time of generation. It is not legal advice and should not be relied upon as a substitute for professional legal counsel. CourtCraft Advocate provides McKenzie Friend lay support services only.
      </p>
    </div>
  `;
}
