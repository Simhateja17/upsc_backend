import { supabaseAdmin } from "../config/supabase";
import { sendEvaluationComplete } from "../services/emailService";

export interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  settings: Record<string, any> | null;
}

export function todayStartIST(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  istNow.setHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffset);
}

export function getNotifPref(user: UserRow, key: string): boolean {
  return user.settings?.notifications?.[key] ?? true;
}

export async function alreadyNotifiedToday(userId: string, type: string): Promise<boolean> {
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

export async function insertNotification(userId: string, title: string, body: string, type: string) {
  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type,
    read: false,
  });
}

/**
 * Fires when a mains answer (daily / mock test / PYQ) finishes AI evaluation.
 * Shared by all three evaluation flows so the notification + email + preference
 * check only lives in one place.
 */
export async function notifyAnswerEvaluated(params: {
  userId: string;
  score: number;
  maxScore: number;
}): Promise<void> {
  const { userId, score, maxScore } = params;
  try {
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("email, first_name, settings")
      .eq("id", userId)
      .single();
    if (!userData) return;

    const user = userData as unknown as UserRow;
    if (!getNotifPref(user, "answer")) return;

    await insertNotification(
      userId,
      `Answer Evaluated — Score: ${score}/${maxScore} ✅`,
      "Your mains answer has been evaluated. View detailed feedback, strengths, and suggestions.",
      "answer_evaluated"
    );

    if (user.email) {
      const firstName = user.first_name || "Aspirant";
      await sendEvaluationComplete(user.email, firstName, score, maxScore);
    }
  } catch (err) {
    // Notification failure is non-critical
  }
}

// Streak milestones worth celebrating. Below 365 these are hand-picked;
// at/after 365 we celebrate every 100th day (400, 500, ...) plus 365 itself.
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 150, 200, 250, 300, 365];

export function streakMilestoneCopy(streak: number): { title: string; body: string } | null {
  const isMilestone = STREAK_MILESTONES.includes(streak) || (streak > 365 && streak % 100 === 0);
  if (!isMilestone) return null;

  const title = `${streak}-day streak! 🔥`;
  let body: string;
  if (streak >= 365) body = "A full year of consistency. You're in rare company — keep going.";
  else if (streak >= 100) body = "You're in the top 1% of aspirants for consistency. Unstoppable.";
  else if (streak >= 30) body = "A full month of daily prep. The habit is locked in.";
  else if (streak >= 14) body = "Two weeks straight — consistency is compounding.";
  else if (streak >= 7) body = "One week strong. Momentum is on your side.";
  else body = "You're building the habit. Keep the chain alive.";
  return { title, body };
}

/**
 * Called when the frontend fetches notifications (i.e. when the user opens the
 * site after logging in). Fires a congratulatory notification ONLY when the
 * user's current streak hits a milestone (3, 7, 14, 30, 50, 100, ... then every
 * 100). Because the streak increments by one per day, each milestone value
 * occurs on exactly one calendar day, so a once-per-day dedup is sufficient.
 * Additive to — and independent of — the evening "streak at risk" cron alert;
 * both share the "streak" preference toggle.
 */
export async function checkAndSendLoginStreakNotification(userId: string): Promise<void> {
  try {
    if (await alreadyNotifiedToday(userId, "streak_milestone")) return;

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, settings")
      .eq("id", userId)
      .single();
    if (!userData) return;
    const user = userData as unknown as UserRow;
    if (!getNotifPref(user, "streak")) return;

    const { data: streakRow } = await supabaseAdmin
      .from("user_streaks")
      .select("current_streak")
      .eq("user_id", userId)
      .single();
    const streak = streakRow?.current_streak ?? 0;

    const copy = streakMilestoneCopy(streak);
    if (!copy) return;

    await insertNotification(userId, copy.title, copy.body, "streak_milestone");
  } catch (err) {
    // Notification failure is non-critical
  }
}
