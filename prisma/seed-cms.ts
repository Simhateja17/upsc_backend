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
  {
    slug: "dashboard/daily-mcq",
    title: "Daily MCQ",
    description: "Daily MCQ challenge page content",
    sections: [
      { key: "page_title", type: "text", content: "Daily MCQ Challenge", order: 0 },
      { key: "subtitle", type: "text", content: "Sharpen your knowledge with focused practice questions", order: 1 },
      { key: "button_start", type: "text", content: "Start Now", order: 2 },
      { key: "button_results", type: "text", content: "View Results", order: 3 },
      { key: "skip_text", type: "text", content: "Skip intro (auto-start in 5s)", order: 4 },
      { key: "empty_title", type: "text", content: "No MCQ Challenge Today", order: 5 },
      { key: "empty_subtitle", type: "text", content: "Check back later for today's challenge.", order: 6 },
      { key: "stat_labels", type: "json", content: JSON.stringify({ questions: "Questions", minutes: "Minutes", marks: "Marks" }), order: 7 },
    ],
  },
  {
    slug: "dashboard/daily-answer",
    title: "Daily Answer Writing",
    description: "Daily mains answer writing page content",
    sections: [
      { key: "page_title", type: "text", content: "Daily Mains Challenge", order: 0 },
      { key: "subtitle", type: "text", content: "Sharpen your answer writing skills with today's carefully crafted question.", order: 1 },
      { key: "subtitle_line2", type: "text", content: "Develop structure, clarity, and depth in your answers.", order: 2 },
      { key: "button_start", type: "text", content: "Start Now", order: 3 },
      { key: "tag_title", type: "text", content: "UPSC Mains Challenge", order: 4 },
      { key: "main_heading", type: "text", content: "Daily Answer Writing with Instant Evaluation", order: 5 },
      { key: "description", type: "text", content: "Practice one UPSC-level question every day. Get structured feedback, personalized insights, model answers, and actionable improvement points to steadily boost your mains scores.", order: 6 },
      { key: "meta_time", type: "text", content: "Time: 15 minutes", order: 7 },
      { key: "meta_word_limit", type: "text", content: "Word limit: 250-300 words", order: 8 },
      { key: "button_begin", type: "text", content: "Begin Challenge", order: 9 },
      { key: "social_proof", type: "text", content: "101+ Students already attempted", order: 10 },
      { key: "upload_title", type: "text", content: "Drop your answer script here", order: 11 },
      { key: "upload_description", type: "text", content: "Upload handwritten answers for AI evaluation", order: 12 },
      { key: "upload_formats", type: "json", content: JSON.stringify(["JPG", "PNG", "PDF", "DOCX"]), order: 13 },
      { key: "upload_max_size", type: "text", content: "Max 10MB", order: 14 },
      { key: "submit_button", type: "text", content: "Submit Answer for Evaluation", order: 15 },
      { key: "feedback_time", type: "text", content: "Get detailed feedback in 60 seconds", order: 16 },
      { key: "empty_title", type: "text", content: "No Mains Challenge Today", order: 17 },
      { key: "empty_subtitle", type: "text", content: "Check back later for today's challenge.", order: 18 },
    ],
  },
  {
    slug: "dashboard/daily-editorial",
    title: "Daily Editorial",
    description: "Daily editorial analysis page",
    sections: [
      { key: "page_title", type: "text", content: "Daily Editorial", order: 0 },
    ],
  },
  {
    slug: "dashboard/mock-tests",
    title: "Mock Tests",
    description: "Mock test builder page content",
    sections: [
      { key: "page_title", type: "text", content: "Mock Tests", order: 0 },
      { key: "hero_badge", type: "text", content: "India's #1 UPSC Mock Test Platform", order: 1 },
      { key: "hero_title", type: "text", content: "Build Your Perfect Mock Test", order: 2 },
      { key: "hero_subtitle_1", type: "text", content: "Adaptive questions · Real exam environment · Detailed analytics.", order: 3 },
      { key: "hero_subtitle_2", type: "text", content: "Everything free. Add as much as you want.", order: 4 },
      { key: "hero_stats", type: "json", content: JSON.stringify([
        { value: "4800+", label: "Questions" },
        { value: "2.1L+", label: "Tests Taken" },
        { value: "94K+", label: "Community" },
        { value: "∞", label: "Always Growing" },
      ]), order: 5 },
      { key: "step_labels", type: "json", content: JSON.stringify(["EXAM MODE", "PAPER TYPE", "TOPIC / SUBJECT", "DIFFICULTY LEVEL", "QUESTION COUNT"]), order: 6 },
      { key: "button_generate", type: "text", content: "Generate My Test →", order: 7 },
      { key: "prelims_papers", type: "json", content: JSON.stringify([
        { label: "GS Paper I", description: "General Studies — History, Geography, Polity, Economy, Science" },
        { label: "CSAT", description: "Aptitude · Comprehension · Logical Reasoning" },
      ]), order: 8 },
      { key: "difficulties", type: "json", content: JSON.stringify(["Easy", "Medium", "Hard"]), order: 9 },
    ],
  },
  {
    slug: "dashboard/library",
    title: "Library",
    description: "Study library page content",
    sections: [
      { key: "page_title", type: "text", content: "Study Library", order: 0 },
      { key: "hero_badge", type: "text", content: "India's Most Comprehensive UPSC Platform", order: 1 },
      { key: "hero_title", type: "text", content: "Your Complete Library for UPSC Preparation", order: 2 },
      { key: "hero_subtitle_1", type: "text", content: "Video lectures, assignment & PYQ collections — everything's free. And we mean it.", order: 3 },
      { key: "hero_subtitle_2", type: "text", content: "Best of teachers on YouTube, beautifully organised and free", order: 4 },
      { key: "browse_heading", type: "text", content: "BROWSE BY SUBJECT", order: 5 },
      { key: "browse_subtitle", type: "text", content: "Pick Your Subject, Start Learning.", order: 6 },
      { key: "tabs", type: "json", content: JSON.stringify(["Notes", "Roadmaps", "PYQ Notes"]), order: 7 },
      { key: "features", type: "json", content: JSON.stringify([
        { title: "UPSC-First Approach", description: "Every line written from the examiner's lens. No fluff — only what earns marks in Prelims and Mains." },
        { title: "Updated Every Week", description: "Budget, new schemes, policy shifts — our notes are refreshed weekly so your study material stays current." },
      ]), order: 8 },
    ],
  },
  {
    slug: "dashboard/video-lectures",
    title: "Video Lectures",
    description: "Video lectures page content",
    sections: [
      { key: "page_title", type: "text", content: "Video Lectures", order: 0 },
      { key: "hero_badge", type: "text", content: "India's Most Comprehensive UPSC Platform", order: 1 },
      { key: "hero_title", type: "text", content: "Your Complete Library for UPSC Preparation", order: 2 },
      { key: "hero_subtitle_1", type: "text", content: "Video lectures, assignment & PYQ collections — everything's free. And we mean it.", order: 3 },
      { key: "hero_subtitle_2", type: "text", content: "Best of teachers on YouTube, beautifully organised and free", order: 4 },
      { key: "hero_stats", type: "json", content: JSON.stringify([
        { number: "500", suffix: "+", label: "Video Lectures" },
        { number: "12", label: "Subjects Covered" },
        { number: "375", suffix: "+", label: "Hours of Content" },
      ]), order: 5 },
      { key: "browse_heading", type: "text", content: "BROWSE BY SUBJECT", order: 6 },
      { key: "browse_subtitle", type: "text", content: "Pick Your Subject, Start Learning.", order: 7 },
    ],
  },
  {
    slug: "dashboard/flashcards",
    title: "Flashcards",
    description: "Flashcards page content",
    sections: [
      { key: "page_title", type: "text", content: "Flashcards", order: 0 },
    ],
  },
  {
    slug: "dashboard/jeet-gpt",
    title: "Jeet GPT",
    description: "Jeet AI chat page content",
    sections: [
      { key: "page_title", type: "text", content: "Jeet AI", order: 0 },
      { key: "sidebar_app_name", type: "text", content: "Rise with Jeet IAS", order: 1 },
      { key: "sidebar_tagline", type: "text", content: "India's Premier UPSC Platform", order: 2 },
      { key: "header_title", type: "text", content: "Jeet AI", order: 3 },
      { key: "header_subtitle", type: "text", content: "Your UPSC Mentor", order: 4 },
      { key: "header_description", type: "text", content: "Ask anything about UPSC preparation", order: 5 },
      { key: "welcome_greeting", type: "text", content: "Hi {firstName}, I'm Jeet AI.", order: 6 },
      { key: "welcome_description", type: "text", content: "I'm Jeet AI, your intelligent UPSC preparation partner — from ancient history to current affairs, revision strategy, or just thinking through a topic together.", order: 7 },
      { key: "welcome_prompt", type: "text", content: "How can I help you today in your preparation?", order: 8 },
      { key: "suggestion_cards", type: "json", content: JSON.stringify([
        { title: "Explain a UPSC topic", subtitle: "Deep explanation with dimensions, UPSC angle & related questions", prompt: "Explain a UPSC topic in depth with all dimensions that an examiner would reward." },
        { title: "Ethics case study I should know", subtitle: "Real-world ethics + how to frame and structure your answer", prompt: "Give me an important ethics case study for UPSC with stakeholder analysis and answer structure." },
        { title: "Build my study plan", subtitle: "Personalized schedule based on your exam date and syllabus gaps", prompt: "Help me build a personalized UPSC study plan based on my preparation level." },
        { title: "Study strategy & planner", subtitle: "Personalized roadmap, daily schedules + all-topic prioritization", prompt: "Give me a study strategy and daily schedule for UPSC preparation with topic prioritization." },
      ]), order: 9 },
      { key: "input_placeholder", type: "text", content: "Ask me anything about your preparation...", order: 10 },
      { key: "input_placeholder_chat", type: "text", content: "Ask Jeet AI anything about UPSC...", order: 11 },
      { key: "disclaimer", type: "text", content: "Jeet AI can make mistakes. Verify important facts from NCERT & official sources.", order: 12 },
    ],
  },
  {
    slug: "dashboard/study-planner",
    title: "Study Planner",
    description: "Study planner page content",
    sections: [
      { key: "page_title", type: "text", content: "Study Planner", order: 0 },
      { key: "streak_title", type: "text", content: "Study Streak", order: 1 },
      { key: "quick_add_title", type: "text", content: "Quick Add to Plan", order: 2 },
      { key: "quick_add_subjects", type: "json", content: JSON.stringify(["Polity", "History", "Science & Technology", "Economics", "Geography", "Revision", "Environment", "Ethics", "Mock Test", "Answer Writing", "GS1", "GS2", "GS3", "GS4"]), order: 3 },
      { key: "study_types", type: "json", content: JSON.stringify(["Video Lectures", "Reading", "Practice", "Revision", "Test", "Note Making", "Answer Writing", "Other"]), order: 4 },
      { key: "time_distribution_title", type: "text", content: "Time Distribution", order: 5 },
      { key: "empty_message", type: "text", content: "No tasks scheduled for today.", order: 6 },
    ],
  },
  {
    slug: "dashboard/pyq",
    title: "PYQ Question Bank",
    description: "Previous year questions page content",
    sections: [
      { key: "page_title", type: "text", content: "Previous Year Questions", order: 0 },
      { key: "ai_eval_steps", type: "json", content: JSON.stringify([
        "Reading your handwritten answers",
        "Identifying key points & arguments",
        "Comparing with model answers",
        "Preparing detailed markup & feedback",
        "Generating Jeet Sir's analysis",
      ]), order: 1 },
    ],
  },
  {
    slug: "dashboard/spaced-repetition",
    title: "Spaced Repetition",
    description: "Spaced repetition page content",
    sections: [
      { key: "page_title", type: "text", content: "Spaced Repetition", order: 0 },
    ],
  },
  {
    slug: "dashboard/performance",
    title: "Performance",
    description: "Performance analytics page content",
    sections: [
      { key: "page_title", type: "text", content: "Performance Analytics", order: 0 },
      { key: "banner_tag", type: "text", content: "Analytics · Performance Dashboard", order: 1 },
      { key: "banner_heading", type: "text", content: "{name}'s Progress.", order: 2 },
      { key: "banner_description", type: "text", content: "Your complete UPSC preparation analytics — streaks, subject mastery, weak areas, spaced repetition & smart notes.", order: 3 },
      { key: "countdown_template", type: "text", content: "{days} days to UPSC Prelims 2026 - Keep going, you're on track!", order: 4 },
      { key: "metric_labels", type: "json", content: JSON.stringify([
        { key: "streak", label: "DAY STREAK", icon: "fire" },
        { key: "questions", label: "QS ATTEMPTED", icon: "pen" },
        { key: "accuracy", label: "AVG ACCURACY", icon: "target" },
        { key: "study_time", label: "STUDY TIME", icon: "clock" },
        { key: "mock_tests", label: "MOCK TESTS", icon: "paper" },
        { key: "badges", label: "BADGES EARNED", icon: "medal" },
      ]), order: 5 },
      { key: "study_time_title", type: "text", content: "Study Time — This Week", order: 6 },
      { key: "strong_areas_title", type: "text", content: "Strong Areas", order: 7 },
      { key: "weak_areas_title", type: "text", content: "Weak Areas", order: 8 },
      { key: "streak_calendar_title", type: "text", content: "Study Streak", order: 9 },
      { key: "daily_trio_title", type: "text", content: "Daily Trio — This Week", order: 10 },
      { key: "daily_trio_items", type: "json", content: JSON.stringify([
        { title: "Daily MCQ Challenge", subtitle: "Polity, Economy, Geography", icon: "book" },
        { title: "Daily Mains Challenge", subtitle: "Answer Writing, AI Evaluated", icon: "pen" },
        { title: "Daily News Analysis", subtitle: "The Hindu, Indian Express", icon: "news" },
      ]), order: 11 },
      { key: "badges_title", type: "text", content: "Achievement Badges", order: 12 },
      { key: "leaderboard_title", type: "text", content: "Weekly Leaderboard", order: 13 },
    ],
  },
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
