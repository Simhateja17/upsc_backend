import { Resend } from "resend";
import config from "../config";

const resend = config.resend.apiKey
  ? new Resend(config.resend.apiKey)
  : null;

const FROM_EMAIL = config.resend.fromEmail;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping email:", options.subject);
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Send failed:", error);
    return false;
  }
}

// ==================== Email Templates ====================

export async function sendWelcomeEmail(
  to: string,
  firstName: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Welcome to Rise with Jeet! 🎯",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Welcome, ${firstName || "Aspirant"}!</h1>
        <p>Your UPSC preparation journey starts now. Here's what you can do:</p>
        <ul>
          <li><strong>Daily MCQ Practice</strong> — 10 new questions every day</li>
          <li><strong>Answer Writing</strong> — AI-evaluated mains practice</li>
          <li><strong>Editorial Analysis</strong> — Daily newspaper analysis</li>
          <li><strong>Mock Tests</strong> — Full-length and subject-wise tests</li>
        </ul>
        <p>Start your preparation today!</p>
        <a href="${config.cors.origin}/dashboard" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
        <p style="color: #666; margin-top: 24px;">— Team Rise with Jeet</p>
      </div>
    `,
  });
}

export async function sendDailyReminder(
  to: string,
  firstName: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Your Daily MCQ is ready! 📝",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Good morning, ${firstName || "Aspirant"}!</h2>
        <p>Today's Daily MCQ challenge is live. Keep your streak going!</p>
        <a href="${config.cors.origin}/dashboard/daily-mcq" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Start Today's MCQ</a>
      </div>
    `,
  });
}

export async function sendStreakAlert(
  to: string,
  firstName: string,
  currentStreak: number
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Don't lose your ${currentStreak}-day streak! 🔥`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hey ${firstName || "Aspirant"}!</h2>
        <p>You're on a <strong>${currentStreak}-day streak</strong>! Don't break it now.</p>
        <p>Complete today's practice to keep the momentum going.</p>
        <a href="${config.cors.origin}/dashboard" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px;">Continue Streak</a>
      </div>
    `,
  });
}

export async function sendEvaluationComplete(
  to: string,
  firstName: string,
  score: number,
  maxScore: number
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Your answer has been evaluated — Score: ${score}/${maxScore} ✅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Evaluation Complete!</h2>
        <p>Hi ${firstName || "Aspirant"}, your mains answer has been evaluated.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="font-size: 32px; font-weight: bold; color: #2563eb; margin: 0;">${score}/${maxScore}</p>
          <p style="color: #666; margin: 4px 0;">Your Score</p>
        </div>
        <p>View detailed feedback including strengths, areas for improvement, and suggestions.</p>
        <a href="${config.cors.origin}/dashboard/daily-answer" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">View Results</a>
      </div>
    `,
  });
}

export async function sendWeeklyProgress(
  to: string,
  firstName: string,
  stats: {
    mcqsCompleted: number;
    answersWritten: number;
    editorialsRead: number;
    mockTests: number;
    streak: number;
  }
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Your Weekly Progress Summary 📊",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Weekly Progress — ${firstName || "Aspirant"}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Daily MCQs Completed</td><td style="text-align: right; font-weight: bold;">${stats.mcqsCompleted}/7</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Answers Written</td><td style="text-align: right; font-weight: bold;">${stats.answersWritten}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Editorials Read</td><td style="text-align: right; font-weight: bold;">${stats.editorialsRead}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Mock Tests</td><td style="text-align: right; font-weight: bold;">${stats.mockTests}</td></tr>
          <tr><td style="padding: 8px;">Current Streak</td><td style="text-align: right; font-weight: bold; color: #dc2626;">${stats.streak} days 🔥</td></tr>
        </table>
        <p style="margin-top: 16px;">Keep pushing! Consistency is key to UPSC success.</p>
        <a href="${config.cors.origin}/dashboard" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
      </div>
    `,
  });
}
