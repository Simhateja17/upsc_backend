import prisma from "./config/database";
import { defaultEntitlementsForTier } from "./services/entitlements.service";

async function main() {
  console.log("Seeding database...");

  // ==================== Pricing Plans ====================
  const existingPlans = await prisma.pricingPlan.count();
  if (existingPlans === 0) {
    await prisma.pricingPlan.createMany({
      data: [
        {
          name: "Aspire",
          tier: "aspire",
          billingCycle: "monthly",
          price: 199,
          originalPrice: 299,
          duration: "Monthly",
          durationDays: 30,
          features: [
            "5 Mains Answer Evaluations / day",
            "5 Prelims Mock Tests / day",
            "Jeet AI Mentor Mentor - 5 Messages / day",
            "Limited analytics and revision suite",
          ],
          isPopular: false,
          order: 0,
          entitlements: defaultEntitlementsForTier("aspire") as any,
        },
        {
          name: "Aspire",
          tier: "aspire",
          billingCycle: "quarterly",
          price: 479,
          originalPrice: 747,
          duration: "Quarterly",
          durationDays: 90,
          features: ["Everything in Aspire monthly", "Save 20%"],
          isPopular: false,
          order: 1,
          entitlements: defaultEntitlementsForTier("aspire") as any,
        },
        {
          name: "Aspire",
          tier: "aspire",
          billingCycle: "yearly",
          price: 1439,
          originalPrice: 3588,
          duration: "Yearly",
          durationDays: 365,
          features: ["Everything in Aspire monthly", "Save 40%"],
          isPopular: false,
          order: 2,
          entitlements: defaultEntitlementsForTier("aspire") as any,
        },
        {
          name: "Rise",
          tier: "rise",
          billingCycle: "monthly",
          price: 499,
          originalPrice: 699,
          duration: "Monthly",
          durationDays: 30,
          features: [
            "25 Mains Answer Evaluations / day",
            "50 Prelims Mock Tests / day",
            "Jeet AI Mentor Mentor - 100 Messages / day",
            "Full analytics and revision suite",
          ],
          isPopular: true,
          order: 3,
          entitlements: defaultEntitlementsForTier("rise") as any,
        },
        {
          name: "Rise",
          tier: "rise",
          billingCycle: "quarterly",
          price: 1197,
          originalPrice: 1797,
          duration: "Quarterly",
          durationDays: 90,
          features: ["Everything in Rise monthly", "Save 20%"],
          isPopular: true,
          order: 4,
          entitlements: defaultEntitlementsForTier("rise") as any,
        },
        {
          name: "Rise",
          tier: "rise",
          billingCycle: "yearly",
          price: 3599,
          originalPrice: 8388,
          duration: "Yearly",
          durationDays: 365,
          features: ["Everything in Rise monthly", "Save 40%"],
          isPopular: true,
          order: 5,
          entitlements: defaultEntitlementsForTier("rise") as any,
        },
        {
          name: "Ascent",
          tier: "ascent",
          billingCycle: "monthly",
          price: 1999,
          originalPrice: 2499,
          duration: "Monthly",
          durationDays: 30,
          features: [
            "Unlimited Mains Answer Evaluations",
            "Unlimited Prelims Mock Test practice",
            "Jeet AI Mentor - Unlimited messages",
            "Mentor-led growth",
          ],
          isPopular: false,
          order: 6,
          entitlements: defaultEntitlementsForTier("ascent") as any,
        },
        {
          name: "Ascent",
          tier: "ascent",
          billingCycle: "quarterly",
          price: 4799,
          originalPrice: 6747,
          duration: "Quarterly",
          durationDays: 90,
          features: ["Everything in Ascent monthly", "Save 20%"],
          isPopular: false,
          order: 7,
          entitlements: defaultEntitlementsForTier("ascent") as any,
        },
        {
          name: "Ascent",
          tier: "ascent",
          billingCycle: "yearly",
          price: 14399,
          originalPrice: 29988,
          duration: "Yearly",
          durationDays: 365,
          features: ["Everything in Ascent monthly", "Save 40%"],
          isPopular: false,
          order: 8,
          entitlements: defaultEntitlementsForTier("ascent") as any,
        },
      ],
    });
    console.log("Created 9 pricing plans");
  } else {
    console.log(`Pricing plans already seeded (${existingPlans} found)`);
  }

  // ==================== Testimonials ====================
  const existingTestimonials = await prisma.testimonial.count();
  if (existingTestimonials === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          name: "Priya Sharma",
          title: "IAS 2024 - AIR 45",
          content: "The daily MCQ practice and AI-powered answer evaluation transformed my preparation. The structured approach helped me improve my Prelims score from 95 to 132 within 3 months.",
          rating: 5,
          order: 0,
          isActive: true,
        },
        {
          name: "Rahul Verma",
          title: "IPS 2023 - AIR 112",
          content: "The editorial summaries saved me 2 hours daily. The mock tests are incredibly accurate to the actual exam pattern. I cleared both Prelims and Mains on my first attempt.",
          rating: 5,
          order: 1,
          isActive: true,
        },
        {
          name: "Anjali Nair",
          title: "IFS 2024 - AIR 23",
          content: "What sets this platform apart is the mentor guidance. My mentor helped me identify weak areas and craft a targeted strategy. The study planner kept me consistent throughout the year.",
          rating: 5,
          order: 2,
          isActive: true,
        },
        {
          name: "Karan Mehta",
          title: "IRS 2023 - AIR 78",
          content: "The PYQ bank with 20 years of questions is a goldmine. The AI feedback on my answers was more accurate than many coaching institutes. Best investment for UPSC prep.",
          rating: 5,
          order: 3,
          isActive: true,
        },
        {
          name: "Deepika Rao",
          title: "IDAS 2024 - AIR 156",
          content: "As a working professional, the flexibility of this platform was key. I could practice during commute, get AI evaluations overnight, and the daily 30-minute study plan kept me on track.",
          rating: 4,
          order: 4,
          isActive: true,
        },
      ],
    });
    console.log("Created 5 testimonials");
  } else {
    console.log(`Testimonials already seeded (${existingTestimonials} found)`);
  }

  // ==================== Video Subjects ====================
  const existingVideoSubjects = await prisma.videoSubject.count();
  if (existingVideoSubjects === 0) {
    await prisma.videoSubject.createMany({
      data: [
        { name: "Indian Polity & Governance", description: "Constitution, Parliament, Judiciary, Federalism, Local Self-Government", order: 0, videoCount: 0 },
        { name: "Modern History", description: "British Rule, Freedom Struggle, Post-Independence India", order: 1, videoCount: 0 },
        { name: "Indian & World Geography", description: "Physical, Human, Economic Geography, Maps & Atlas", order: 2, videoCount: 0 },
        { name: "Indian Economy", description: "Planning, Budgets, Banking, Trade, Infrastructure, Agriculture", order: 3, videoCount: 0 },
        { name: "Environment & Ecology", description: "Biodiversity, Climate Change, Pollution, Conventions & Acts", order: 4, videoCount: 0 },
        { name: "Science & Technology", description: "Space, Defence, Biotechnology, IT, Current Developments", order: 5, videoCount: 0 },
        { name: "Ethics, Integrity & Aptitude", description: "GS Paper IV — Ethics, Case Studies, Thinkers", order: 6, videoCount: 0 },
        { name: "Current Affairs", description: "Monthly compilations, International Relations, Schemes & Policies", order: 7, videoCount: 0 },
      ],
    });
    console.log("Created 8 video subjects");
  } else {
    console.log(`Video subjects already seeded (${existingVideoSubjects} found)`);
  }

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
