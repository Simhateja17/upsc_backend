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

/**
 * Called when the frontend fetches notifications (i.e. when the user opens the
 * site after logging in). Creates a once-per-day congratulatory streak
 * notification using the user's real current streak. Additive to — and
 * independent of — the evening "streak at risk" cron alert.
 */
export async function checkAndSendLoginStreakNotification(userId: string): Promise<void> {
  try {
    if (await alreadyNotifiedToday(userId, "streak_daily")) return;

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
    if (streak <= 0) return;

    await insertNotification(
      userId,
      `${streak}-day streak! 🔥`,
      "Keep up the momentum — you're on a roll.",
      "streak_daily"
    );
  } catch (err) {
    // Notification failure is non-critical
  }
}
