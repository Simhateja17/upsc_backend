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

export async function sendPhoneOtpEmail(to: string, phone: string, otp: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Verify your phone number — RiseWithJeet",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; text-align: center; padding: 40px 24px;">
        <h2 style="color: #1a365d; margin-bottom: 8px;">Verify your phone number</h2>
        <p style="color: #667085; font-size: 14px; margin-bottom: 24px;">
          Use the code below to verify your new phone number<br/><strong>+91 ${phone}</strong> on RiseWithJeet.
        </p>
        <div style="background: #FFF8ED; border: 2px solid #F5A623; border-radius: 12px; padding: 20px; display: inline-block; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a365d;">${otp}</span>
        </div>
        <p style="color: #9CA3AF; font-size: 12px;">This code expires in 5 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
}

export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Your RiseWithJeet Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; text-align: center; padding: 40px 24px;">
        <h2 style="color: #1a365d; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #667085; font-size: 14px; margin-bottom: 24px;">
          Use the code below to verify your email address on RiseWithJeet.
        </p>
        <div style="background: #FFF8ED; border: 2px solid #F5A623; border-radius: 12px; padding: 20px; display: inline-block; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a365d;">${otp}</span>
        </div>
        <p style="color: #9CA3AF; font-size: 12px;">This code expires in 5 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
}

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
        <a href="${config.cors.origins[0]}/dashboard" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
        <p style="color: #666; margin-top: 24px;">— Team Rise with Jeet</p>
      </div>
    `,
  });
}

export async function sendMorningDigest(
  to: string,
  firstName: string,
  editorials: { title: string; source: string }[]
): Promise<boolean> {
  const editorialList = editorials
    .map(
      (e) =>
        `<li style="padding: 4px 0;">${e.title} <span style="color: #94A3B8;">(${e.source})</span></li>`
    )
    .join("");

  return sendEmail({
    to,
    subject: "Today's Current Affairs Digest 📰",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Good morning, ${firstName || "Aspirant"}!</h2>
        <p>Here is your complete current affairs edition from yesterday:</p>
        <ul style="padding-left: 20px; margin: 16px 0;">
          ${editorialList || "<li>No editorials were available for yesterday.</li>"}
        </ul>
        <a href="${config.cors.origins[0]}/dashboard/daily-editorial" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Read Editorials</a>
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
        <a href="${config.cors.origins[0]}/dashboard/daily-mcq" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Start Today's MCQ</a>
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
        <a href="${config.cors.origins[0]}/dashboard" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px;">Continue Streak</a>
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
        <a href="${config.cors.origins[0]}/dashboard/daily-answer" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">View Results</a>
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
        <a href="${config.cors.origins[0]}/dashboard" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
      </div>
    `,
  });
}

export async function sendBookingConfirmation(
  to: string,
  name: string,
  phone?: string,
  message?: string
): Promise<boolean> {
  const firstName = name.split(" ")[0];
  return sendEmail({
    to,
    subject: "Your Discovery Call is Booked! 📞",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Discovery Call Booked, ${firstName}!</h2>
        <p>Thank you for booking your free 20-minute discovery call with Jeet Sir.</p>
        <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-weight: bold;">What happens next:</p>
          <ul style="margin: 8px 0 0 20px;">
            <li>We'll review your preparation stage and goals</li>
            <li>Jeet Sir will prepare a rough strategy outline for you</li>
            <li>You'll receive a confirmation email with call details within 24 hours</li>
          </ul>
        </div>
        ${phone ? `<p><strong>Your phone:</strong> ${phone}</p>` : ""}
        ${message ? `<p><strong>Your message:</strong> ${message}</p>` : ""}
        <p style="color: #666; margin-top: 24px;">No hard sell, no commitment — just an honest conversation about your UPSC journey.</p>
        <p style="color: #666;">— Team Rise with Jeet</p>
      </div>
    `,
  });
}

export async function sendFeedbackNotification(
  to: string,
  feedback: {
    rating: number;
    category: string;
    workingWell: string;
    couldBeBetter: string;
    userEmail?: string;
  }
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `New Feedback Received — ${feedback.category} (${feedback.rating}/5)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">New User Feedback</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Rating</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${feedback.rating}/5 ${"⭐".repeat(feedback.rating)}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Category</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${feedback.category}</td></tr>
          ${feedback.userEmail ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">User Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${feedback.userEmail}</td></tr>` : ""}
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; vertical-align: top;">What's Working</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${feedback.workingWell}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; vertical-align: top;">Could Be Better</td><td style="padding: 8px;">${feedback.couldBeBetter}</td></tr>
        </table>
        <p style="color: #666; margin-top: 24px;">— Rise with Jeet Feedback System</p>
      </div>
    `,
  });
}

export async function sendContactNotification(
  to: string,
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
  }
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `New Contact Message: ${contact.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${contact.firstName} ${contact.lastName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${contact.email}">${contact.email}</a></td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subject</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${contact.subject}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; vertical-align: top;">Message</td><td style="padding: 8px;">${contact.message.replace(/\n/g, "<br>")}</td></tr>
        </table>
        <p style="color: #666; margin-top: 24px;">— Rise with Jeet Contact System</p>
      </div>
    `,
  });
}
