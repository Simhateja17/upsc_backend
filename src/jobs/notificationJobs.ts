import { supabaseAdmin } from "../config/supabase";
import {
  sendDailyReminder,
  sendStreakAlert,
  sendMorningDigest,
  sendWeeklyProgress,
} from "../services/emailService";

function todayStartIST(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  istNow.setHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffset);
}

interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  settings: Record<string, any> | null;
}

function getNotifPref(user: UserRow, key: string): boolean {
  return user.settings?.notifications?.[key] ?? true;
}

async function alreadyNotifiedToday(userId: string, type: string): Promise<boolean> {
  const todayStart = todayStartIST();
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", todayStart.toISOString())
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function insertNotification(userId: string, title: string, body: string, type: string) {
  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type,
    read: false,
  });
}

// ==================== Daily MCQ Reminder (8:00 AM IST) ====================

export async function sendDailyMcqReminders(): Promise<void> {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, settings");
  if (!users?.length) return;

  const todayStart = todayStartIST();
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);

  const { data: todayAttempts } = await supabaseAdmin
    .from("mcq_attempts")
    .select("user_id")
    .gte("created_at", todayStart.toISOString())
    .lt("created_at", tomorrowStart.toISOString());

  const attemptedUserIds = new Set((todayAttempts || []).map((a) => a.user_id));

  let sent = 0;
  for (const user of users as UserRow[]) {
    if (!getNotifPref(user, "mcq")) continue;
    if (attemptedUserIds.has(user.id)) continue;
    if (await alreadyNotifiedToday(user.id, "mcq_reminder")) continue;

    const firstName = user.first_name || "Aspirant";

    await insertNotification(
      user.id,
      "Daily MCQ Challenge is Live! 📝",
      "Today's 10-question MCQ set is ready. Keep your streak going!",
      "mcq_reminder"
    );

    if (user.email) {
      try {
        await sendDailyReminder(user.email, firstName);
      } catch (err) {
        console.warn(`[MCQReminder] Email failed for ${user.id}:`, err);
      }
    }
    sent++;
  }

  console.log(`[MCQReminder] Sent ${sent} reminders.`);
}

// ==================== Streak Alert (7:00 PM IST) ====================

export async function sendStreakAlerts(): Promise<void> {
  const todayStart = todayStartIST();

  const { data: streaks } = await supabaseAdmin
    .from("user_streaks")
    .select("user_id, current_streak, last_active_date")
    .gt("current_streak", 0);
  if (!streaks?.length) return;

  const atRiskUserIds: { userId: string; streak: number }[] = [];
  for (const s of streaks) {
    if (!s.last_active_date) continue;
    const lastActive = new Date(s.last_active_date);
    if (lastActive < todayStart) {
      atRiskUserIds.push({ userId: s.user_id, streak: s.current_streak });
    }
  }
  if (!atRiskUserIds.length) return;

  const userIds = atRiskUserIds.map((u) => u.userId);
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, settings")
    .in("id", userIds);
  if (!users?.length) return;

  const userMap = new Map((users as UserRow[]).map((u) => [u.id, u]));

  let sent = 0;
  for (const { userId, streak } of atRiskUserIds) {
    const user = userMap.get(userId);
    if (!user || !getNotifPref(user, "streak")) continue;
    if (await alreadyNotifiedToday(userId, "streak_alert")) continue;

    const firstName = user.first_name || "Aspirant";

    await insertNotification(
      userId,
      `Your ${streak}-day streak is at risk! 🔥`,
      "Complete today's practice before midnight to keep your streak alive.",
      "streak_alert"
    );

    if (user.email) {
      try {
        await sendStreakAlert(user.email, firstName, streak);
      } catch (err) {
        console.warn(`[StreakAlert] Email failed for ${userId}:`, err);
      }
    }
    sent++;
  }

  console.log(`[StreakAlert] Sent ${sent} alerts.`);
}

// ==================== Morning Digest (7:30 AM IST) ====================

export async function sendMorningDigestNotifications(): Promise<void> {
  const todayStart = todayStartIST();
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);

  const { data: editorials } = await supabaseAdmin
    .from("editorials")
    .select("title, source")
    .gte("published_at", todayStart.toISOString())
    .lt("published_at", tomorrowStart.toISOString())
    .order("published_at", { ascending: false })
    .limit(10);

  const editorialList = (editorials || []) as { title: string; source: string }[];

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, settings");
  if (!users?.length) return;

  let sent = 0;
  for (const user of users as UserRow[]) {
    if (!getNotifPref(user, "digest")) continue;
    if (await alreadyNotifiedToday(user.id, "digest")) continue;

    const firstName = user.first_name || "Aspirant";
    const count = editorialList.length;

    await insertNotification(
      user.id,
      "Today's Current Affairs Digest 📰",
      count > 0
        ? `${count} editorial${count > 1 ? "s" : ""} ready for your current affairs prep today.`
        : "Check back soon — today's editorials are being prepared.",
      "digest"
    );

    if (user.email && count > 0) {
      try {
        await sendMorningDigest(user.email, firstName, editorialList);
      } catch (err) {
        console.warn(`[MorningDigest] Email failed for ${user.id}:`, err);
      }
    }
    sent++;
  }

  console.log(`[MorningDigest] Sent ${sent} digest notifications.`);
}

// ==================== Weekly Progress (Sunday 9:00 AM IST) ====================

export async function sendWeeklyProgressEmails(): Promise<void> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekAgoStr = weekAgo.toISOString();

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, settings");
  if (!users?.length) return;

  let sent = 0;
  for (const user of users as UserRow[]) {
    if (!getNotifPref(user, "promo")) continue;

    const [mcqRes, mainsRes, editorialRes, mockRes, streakRes] = await Promise.all([
      supabaseAdmin
        .from("mcq_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", weekAgoStr),
      supabaseAdmin
        .from("mains_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", weekAgoStr),
      supabaseAdmin
        .from("editorial_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", true)
        .gte("created_at", weekAgoStr),
      supabaseAdmin
        .from("mock_test_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", weekAgoStr),
      supabaseAdmin
        .from("user_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .single(),
    ]);

    const stats = {
      mcqsCompleted: mcqRes.count ?? 0,
      answersWritten: mainsRes.count ?? 0,
      editorialsRead: editorialRes.count ?? 0,
      mockTests: mockRes.count ?? 0,
      streak: streakRes.data?.current_streak ?? 0,
    };

    const hasActivity = stats.mcqsCompleted + stats.answersWritten + stats.editorialsRead + stats.mockTests > 0;
    if (!hasActivity) continue;

    const firstName = user.first_name || "Aspirant";

    await insertNotification(
      user.id,
      "Your Weekly Progress Summary 📊",
      `This week: ${stats.mcqsCompleted} MCQs, ${stats.answersWritten} answers, ${stats.editorialsRead} editorials read. Current streak: ${stats.streak} days.`,
      "weekly_progress"
    );

    if (user.email) {
      try {
        await sendWeeklyProgress(user.email, firstName, stats);
      } catch (err) {
        console.warn(`[WeeklyProgress] Email failed for ${user.id}:`, err);
      }
    }
    sent++;
  }

  console.log(`[WeeklyProgress] Sent ${sent} weekly summaries.`);
}
