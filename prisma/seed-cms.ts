import prisma from "../src/config/database";

interface SectionSeed {
  key: string;
  type: string;
  content: string;
  order: number;
}

interface PageSeed {
  slug: string;
  title: string;
  description?: string;
  sections: SectionSeed[];
}

const pages: PageSeed[] = [
  {
    slug: "home",
    title: "Home Page",
    description: "Landing page content",
    sections: [
      { key: "hero_badge", type: "text", content: "🏆 India's #1 AI-Powered UPSC Platform", order: 0 },
      { key: "hero_title", type: "text", content: "Everything you need to crack UPSC, <span class=\"text-[#FFD170]\">Simplified</span>", order: 1 },
      { key: "hero_subtitle", type: "text", content: "Trusted by 50,000+ aspirants preparing with AI-powered learning, daily MCQs practice, instant mains answer evaluation, expert mentorship, and smart revision tools.", order: 2 },
      { key: "hero_cta_primary", type: "text", content: "Start Your Free Trial", order: 3 },
      { key: "hero_cta_secondary", type: "text", content: "Watch Platform Demo", order: 4 },
      { key: "features_title", type: "text", content: "Your Complete UPSC Preparation Ecosystem", order: 5 },
      {
        key: "features", type: "json", order: 6,
        content: JSON.stringify([
          { title: "AI Powered Learning", description: "Get instant feedback on answers, personalized study recommendations, and intelligent doubt solving.", icon: "/icon-ai-learning.png", useImage: true },
          { title: "Live Community", description: "Connect with toppers, join study groups, and participate in discussions with 50,000+ aspirants.", icon: "community", useImage: false },
          { title: "Learn Anywhere", description: "Access platform on mobile, tablet, and desktop with seamless sync across devices.", icon: "/icon-video.png", useImage: true },
          { title: "Personalized Schedule", description: "AI-generated study plan that adapts to your progress and learning pace.", icon: "/icon-schedule.png", useImage: true },
          { title: "Smart Analytics", description: "Track progress, identify weak areas, and get predictive analysis of your UPSC readiness.", icon: "analytics", useImage: false },
          { title: "Interactive Video Lessons", description: "Learn from India's best UPSC educators with interactive quizzes and notes.", icon: "/icon-mobile.png", useImage: true },
        ]),
      },
      { key: "jeetai_title", type: "text", content: "Experience Jeet AI in Action", order: 7 },
      {
        key: "jeetai_features", type: "json", order: 8,
        content: JSON.stringify([
          { title: "Mains Evaluator", description: "Evaluate Mains answers within minutes" },
          { title: "UPSC GPT", description: "" },
          { title: "Test generators", description: "" },
          { title: "Current Affairs", description: "" },
        ]),
      },
      { key: "dashboard_preview_title", type: "text", content: "Personalized Dashboard Preview", order: 9 },
      { key: "mentorship_title", type: "text", content: "Personalized Mentorship", order: 10 },
      { key: "mentorship_subtitle", type: "text", content: "Guidance from experienced mentors who understand the UPSC journey", order: 11 },
      { key: "mentorship_quote", type: "text", content: "The difference between aspirants and officers is often not knowledge but strategy. We help you build the right strategy, maintain consistency, and overcome plateaus.", order: 12 },
      { key: "mentorship_author", type: "text", content: "Jeet Sharma", order: 13 },
      {
        key: "mentorship_features", type: "json", order: 14,
        content: JSON.stringify([
          { title: "Weekly One-on-One Sessions", description: "Personalized feedback and strategy adjustments" },
          { title: "Progress Analytics Dashboard", description: "Visualize your preparation with detailed insights" },
          { title: "Dynamic Study Plan Adjustments", description: "Your plan evolves based on performance and goals" },
        ]),
      },
      { key: "study_planner_title", type: "text", content: "Your Smart Study Planner", order: 15 },
      {
        key: "study_planner_features", type: "json", order: 16,
        content: JSON.stringify([
          "Personalized study schedules based on your goals and timeline",
          "Integrated with all 10 modules for seamless planning",
          "Track progress and adaptive daily adjustments",
          "Balance between reading, practice, and revision",
        ]),
      },
      { key: "live_study_room_title", type: "text", content: "Live Study Room", order: 17 },
      { key: "live_study_room_subtitle", type: "text", content: "Study With 10,000+ UPSC Aspirants", order: 18 },
      {
        key: "live_study_room_features", type: "json", order: 19,
        content: JSON.stringify([
          { emoji: "⏱️", title: "Pomodoro Timer", desc: "Stay focused with proven time management" },
          { emoji: "🏆", title: "Leaderboards", desc: "Track rankings & compete healthily" },
          { emoji: "📋", title: "Task Cards", desc: "Share goals & stay accountable" },
          { emoji: "🔍", title: "Peer Review", desc: "Get feedback from fellow aspirants" },
        ]),
      },
      { key: "download_app_title", type: "text", content: "Download the App", order: 20 },
      { key: "faq_title", type: "text", content: "Frequently Asked Questions", order: 21 },
      {
        key: "faq_items", type: "json", order: 22,
        content: JSON.stringify([
          { question: "The expense windows adapted sir. Wrong widen drawn.", answer: "Offending belonging promotion provision an be oh consulted ourselves it. Blessing welcomed ladyship she met humoured sir breeding her." },
          { question: "Six curiosity day assurance bed necessary?", answer: "Extensive discourse real as an particular principles as. Blessing welcomed ladyship she met humoured sir breeding her." },
          { question: "Produce say the ten moments parties?", answer: "Extensive discourse real as an particular principles as. Blessing welcomed ladyship she met humoured sir breeding her." },
          { question: "Simple innate summer fat appear basket his desire joy?", answer: "Extensive discourse real as an particular principles as. Blessing welcomed ladyship she met humoured sir breeding her." },
          { question: "Outward clothes promise at gravity do excited?", answer: "Extensive discourse real as an particular principles as. Blessing welcomed ladyship she met humoured sir breeding her." },
        ]),
      },
      { key: "footer_contact_title", type: "text", content: "Still have some doubt?", order: 23 },
      { key: "footer_contact_subtitle", type: "text", content: "Let's solve it together. Get personal guidance from our mentors and experts.", order: 24 },
      {
        key: "footer_links", type: "json", order: 25,
        content: JSON.stringify({
          company: ["About Us", "How to work?", "Populer Course", "Service"],
          courses: ["Categories", "Ofline Course", "Vidio Course"],
          support: ["FAQ", "Help Center", "Career", "Privacy"],
        }),
      },
      {
        key: "footer_contact_info", type: "json", order: 26,
        content: JSON.stringify({
          phone: "+0913-705-3875",
          email: "ElizabethJ@jourrapide.com",
          address: "4808 Skinner Hollow Road\nDays Creek, OR 97429",
          telegram: "https://t.me/risewithjeet",
        }),
      },
    ],
  },
  {
    slug: "login",
    title: "Login Page",
    description: "Authentication page content",
    sections: [
      { key: "login_title", type: "text", content: "Welcome Back", order: 0 },
      { key: "signup_title", type: "text", content: "Create Account", order: 1 },
      {
        key: "feature_cards", type: "json", order: 2,
        content: JSON.stringify([
          { title: "AI-Powered Learning", description: "Get instant feedback and personalized study plans" },
          { title: "Daily Practice", description: "MCQs, answer writing, and editorial analysis" },
          { title: "Expert Mentorship", description: "Guidance from experienced UPSC mentors" },
        ]),
      },
    ],
  },
  {
    slug: "dashboard",
    title: "Dashboard",
    description: "Main dashboard page",
    sections: [
      { key: "greeting_suffix", type: "text", content: "Ready to continue your preparation?", order: 0 },
      {
        key: "daily_trio_labels", type: "json", order: 1,
        content: JSON.stringify({ mcq: "Daily MCQ Challenge", answer: "Daily Answer Writing", editorial: "Daily Editorial" }),
      },
    ],
  },
  { slug: "dashboard/daily-mcq", title: "Daily MCQ", sections: [{ key: "page_title", type: "text", content: "Daily MCQ Challenge", order: 0 }, { key: "instructions", type: "text", content: "Answer all questions within the time limit. Each correct answer earns marks.", order: 1 }] },
  { slug: "dashboard/daily-answer", title: "Daily Answer Writing", sections: [{ key: "page_title", type: "text", content: "Daily Answer Writing", order: 0 }, { key: "instructions", type: "text", content: "Write your answer within the word limit. Your response will be evaluated by AI.", order: 1 }] },
  { slug: "dashboard/daily-editorial", title: "Daily Editorial", sections: [{ key: "page_title", type: "text", content: "Daily Editorial", order: 0 }] },
  { slug: "dashboard/mock-tests", title: "Mock Tests", sections: [{ key: "page_title", type: "text", content: "Mock Tests", order: 0 }] },
  { slug: "dashboard/library", title: "Library", sections: [{ key: "page_title", type: "text", content: "Study Library", order: 0 }] },
  { slug: "dashboard/video-lectures", title: "Video Lectures", sections: [{ key: "page_title", type: "text", content: "Video Lectures", order: 0 }] },
  { slug: "dashboard/flashcards", title: "Flashcards", sections: [{ key: "page_title", type: "text", content: "Flashcards", order: 0 }] },
  { slug: "dashboard/jeet-gpt", title: "Jeet GPT", sections: [{ key: "page_title", type: "text", content: "Jeet GPT", order: 0 }] },
  { slug: "dashboard/study-planner", title: "Study Planner", sections: [{ key: "page_title", type: "text", content: "Study Planner", order: 0 }] },
  { slug: "dashboard/pyq", title: "PYQ Question Bank", sections: [{ key: "page_title", type: "text", content: "Previous Year Questions", order: 0 }] },
  { slug: "dashboard/spaced-repetition", title: "Spaced Repetition", sections: [{ key: "page_title", type: "text", content: "Spaced Repetition", order: 0 }] },
  { slug: "dashboard/performance", title: "Performance", sections: [{ key: "page_title", type: "text", content: "Performance Analytics", order: 0 }] },
];

async function seedCms() {
  console.log("Seeding CMS pages...");

  for (const page of pages) {
    const created = await prisma.page.upsert({
      where: { slug: page.slug },
      update: { title: page.title, description: page.description },
      create: {
        slug: page.slug,
        title: page.title,
        description: page.description,
      },
    });

    for (const section of page.sections) {
      await prisma.pageSection.upsert({
        where: { pageId_key: { pageId: created.id, key: section.key } },
        update: { content: section.content, type: section.type, order: section.order },
        create: {
          pageId: created.id,
          key: section.key,
          type: section.type,
          content: section.content,
          order: section.order,
        },
      });
    }

    console.log(`  ✓ ${page.title} (${page.sections.length} sections)`);
  }

  console.log(`\nSeeded ${pages.length} pages successfully!`);
}

seedCms()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
