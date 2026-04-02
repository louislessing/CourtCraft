// Deployed: 2026-03-19
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

function buildReminderEmail(
  fullName: string,
  eventTitle: string,
  eventDate: string,
  reminderLabel: string,
  daysUntil: number
) {
  const formattedDate = new Date(eventDate).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 7 ? "#f97316" : "#c9a84c";

  return `
    <div style="${baseStyle}">
      <h1 style="${goldStyle}">⚖️ Court Date Reminder</h1>
      <p style="color: #cccccc; line-height: 1.7;">
        Hi ${fullName}, you have an upcoming court date in <strong style="color: ${urgencyColor};">${reminderLabel}</strong>.
      </p>
      <div style="background: #1a2035; border: 2px solid ${urgencyColor}33; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <p style="color: ${urgencyColor}; margin: 0 0 8px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">📅 Upcoming Date</p>
        <p style="color: #ffffff; font-size: 20px; font-weight: bold; margin: 4px 0;">${eventTitle}</p>
        <p style="color: #c9a84c; font-size: 16px; margin: 8px 0 0;">${formattedDate}</p>
      </div>
      <h2 style="${goldStyle}">Preparation Checklist:</h2>
      <ul style="color: #cccccc; line-height: 2.2;">
        <li>✅ Review your Position Statement</li>
        <li>✅ Organise your evidence bundle</li>
        <li>✅ Confirm your McKenzie Friend attendance</li>
        <li>✅ Review the court's directions and orders</li>
        <li>✅ Prepare your questions and key points for the judge</li>
        <li>✅ Arrange childcare and transport to court</li>
      </ul>
      <a href="https://courtcraft5759.builtwithrocket.new/case-management" style="${btnStyle}">
        View Case Management →
      </a>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        CourtCraft Advocate provides McKenzie Friend lay support services only, not regulated legal advice.
        You are receiving this reminder because you added this court date to your CourtCraft Advocate calendar.
      </p>
    </div>
  `;
}

async function sendReminderEmail(
  to: string,
  fullName: string,
  eventTitle: string,
  eventDate: string,
  reminderLabel: string,
  daysUntil: number
) {
  const subject = `⚖️ Court Date in ${reminderLabel} — ${eventTitle}`;
  const html = buildReminderEmail(fullName, eventTitle, eventDate, reminderLabel, daysUntil);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.message ?? "Email send failed");
  }

  return await response.json();
}

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Calculate target dates
    const in2Weeks = new Date(now);
    in2Weeks.setDate(in2Weeks.getDate() + 14);
    const in2WeeksStr = in2Weeks.toISOString().split("T")[0];

    const in1Week = new Date(now);
    in1Week.setDate(in1Week.getDate() + 7);
    const in1WeekStr = in1Week.toISOString().split("T")[0];

    const in48h = new Date(now);
    in48h.setDate(in48h.getDate() + 2);
    const in48hStr = in48h.toISOString().split("T")[0];

    // Fetch all future court dates with user profile info
    const { data: courtDates, error: fetchError } = await supabase
      .from("court_dates")
      .select(`
        id,
        event_date,
        event_title,
        event_type,
        reminder_2w_sent,
        reminder_1w_sent,
        reminder_48h_sent,
        user_id,
        user_profiles!inner(id, email, full_name)
      `)
      .gte("event_date", today)
      .order("event_date", { ascending: true });

    if (fetchError) throw fetchError;

    const results: { id: string; type: string; status: string; email?: string }[] = [];

    for (const date of courtDates ?? []) {
      const profile = Array.isArray(date.user_profiles)
        ? date.user_profiles[0]
        : date.user_profiles;

      if (!profile?.email) continue;

      const reminders: {
        type: "2_weeks" | "1_week" | "48_hours";
        label: string;
        targetDate: string;
        sentFlag: "reminder_2w_sent" | "reminder_1w_sent" | "reminder_48h_sent";
        daysUntil: number;
      }[] = [
        {
          type: "2_weeks",
          label: "2 weeks",
          targetDate: in2WeeksStr,
          sentFlag: "reminder_2w_sent",
          daysUntil: 14,
        },
        {
          type: "1_week",
          label: "1 week",
          targetDate: in1WeekStr,
          sentFlag: "reminder_1w_sent",
          daysUntil: 7,
        },
        {
          type: "48_hours",
          label: "48 hours",
          targetDate: in48hStr,
          sentFlag: "reminder_48h_sent",
          daysUntil: 2,
        },
      ];

      for (const reminder of reminders) {
        if (date.event_date !== reminder.targetDate) continue;
        if (date[reminder.sentFlag]) continue;

        try {
          // Send Resend email
          await sendReminderEmail(
            profile.email,
            profile.full_name || "there",
            date.event_title,
            date.event_date,
            reminder.label,
            reminder.daysUntil
          );

          // Create in-app notification
          await supabase.from("notifications").insert({
            user_id: date.user_id,
            court_date_id: date.id,
            title: `Court Date in ${reminder.label}`,
            message: `${date.event_title} — ${new Date(date.event_date).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
            reminder_type: reminder.type,
            is_read: false,
          });

          // Mark reminder as sent
          await supabase
            .from("court_dates")
            .update({ [reminder.sentFlag]: true })
            .eq("id", date.id);

          results.push({
            id: date.id,
            type: reminder.type,
            status: "sent",
            email: profile.email,
          });
        } catch (err: any) {
          console.error(`Reminder failed for ${date.id} (${reminder.type}):`, err.message);
          results.push({ id: date.id, type: reminder.type, status: "failed" });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: courtDates?.length ?? 0,
        reminders_sent: results.filter((r) => r.status === "sent").length,
        results,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("court-date-reminders error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Reminder processing failed" }),
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
