/**
 * Seeds a single large test mindmap (Indian Constitution - Complete Overview)
 * with 10 branches and 4-5 levels of depth to test the new React Flow renderer.
 *
 * Run with: npx tsx prisma/seed-test-mindmap.ts
 */

import "dotenv/config";
import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEST_MINDMAP = {
  subjectSlug: "indian-polity",
  subjectName: "Indian Polity",
  subjectIcon: "🏛️",
  title: "Indian Constitution — Complete Overview",
  slug: "indian-constitution-complete",
  branches: [],
  nodes: {
    root: {
      label: "Indian Constitution",
      children: [
        {
          label: "Preamble",
          children: [
            {
              label: "Key Words",
              children: [
                { label: "Sovereign" },
                { label: "Socialist (42nd Amendment)" },
                { label: "Secular (42nd Amendment)" },
                { label: "Democratic" },
                { label: "Republic" },
              ],
            },
            {
              label: "Objectives",
              children: [
                { label: "Justice — Social, Economic, Political" },
                { label: "Liberty — Thought, Expression, Belief" },
                { label: "Equality — Status & Opportunity" },
                { label: "Fraternity — Dignity & Unity" },
              ],
            },
            {
              label: "Landmark Cases",
              children: [
                { label: "Berubari Union (1960) — Not part of Constitution" },
                { label: "Kesavananda Bharati (1973) — Part of Constitution" },
                { label: "LIC of India (1995) — Preamble is key to interpretation" },
              ],
            },
          ],
        },
        {
          label: "Fundamental Rights",
          children: [
            {
              label: "Right to Equality (Art. 14–18)",
              children: [
                { label: "Art. 14 — Equality before law" },
                { label: "Art. 15 — No discrimination" },
                { label: "Art. 16 — Equal opportunity in public employment" },
                { label: "Art. 17 — Abolition of untouchability" },
                { label: "Art. 18 — Abolition of titles" },
              ],
            },
            {
              label: "Right to Freedom (Art. 19–22)",
              children: [
                {
                  label: "Art. 19 — Six Freedoms",
                  children: [
                    { label: "Speech & Expression" },
                    { label: "Assemble peacefully" },
                    { label: "Form associations" },
                    { label: "Move freely" },
                    { label: "Reside & settle" },
                    { label: "Practice any profession" },
                  ],
                },
                { label: "Art. 20 — Protection against conviction" },
                { label: "Art. 21 — Right to Life & Personal Liberty" },
                { label: "Art. 21A — Right to Education (86th Amendment)" },
                { label: "Art. 22 — Protection against arrest & detention" },
              ],
            },
            {
              label: "Right against Exploitation (Art. 23–24)",
              children: [
                { label: "Art. 23 — Prohibition of trafficking & forced labour" },
                { label: "Art. 24 — No child labour below 14 years" },
              ],
            },
            {
              label: "Right to Religion (Art. 25–28)",
              children: [
                { label: "Art. 25 — Freedom of conscience & religion" },
                { label: "Art. 26 — Manage religious affairs" },
                { label: "Art. 27 — No tax for religious promotion" },
                { label: "Art. 28 — No religious instruction in state-funded institutions" },
              ],
            },
            {
              label: "Cultural & Educational Rights (Art. 29–30)",
              children: [
                { label: "Art. 29 — Protection of minorities' interests" },
                { label: "Art. 30 — Right to establish educational institutions" },
              ],
            },
            {
              label: "Right to Constitutional Remedies (Art. 32)",
              children: [
                { label: "Habeas Corpus — Produce the body" },
                { label: "Mandamus — Command to perform duty" },
                { label: "Prohibition — Stop lower court" },
                { label: "Certiorari — Transfer case to higher court" },
                { label: "Quo Warranto — By what authority?" },
              ],
            },
          ],
        },
        {
          label: "Directive Principles (DPSP)",
          children: [
            {
              label: "Socialistic Principles",
              children: [
                { label: "Art. 38 — Social order for welfare" },
                { label: "Art. 39 — Equal pay for equal work" },
                { label: "Art. 39A — Free legal aid" },
                { label: "Art. 41 — Right to work & education" },
                { label: "Art. 43 — Living wage for workers" },
              ],
            },
            {
              label: "Gandhian Principles",
              children: [
                { label: "Art. 40 — Organize village panchayats" },
                { label: "Art. 43 — Cottage industries" },
                { label: "Art. 46 — Promote SC/ST interests" },
                { label: "Art. 47 — Prohibition of intoxicating drinks" },
                { label: "Art. 48 — Prohibit cow slaughter" },
              ],
            },
            {
              label: "Liberal-Intellectual Principles",
              children: [
                { label: "Art. 44 — Uniform Civil Code" },
                { label: "Art. 45 — Early childhood care (amended)" },
                { label: "Art. 48A — Protect environment & forests" },
                { label: "Art. 49 — Protect monuments" },
                { label: "Art. 50 — Separate judiciary from executive" },
                { label: "Art. 51 — Promote international peace" },
              ],
            },
          ],
        },
        {
          label: "Fundamental Duties (Art. 51A)",
          children: [
            { label: "Abide by the Constitution" },
            { label: "Cherish ideals of freedom struggle" },
            { label: "Uphold sovereignty & integrity" },
            { label: "Defend the country" },
            { label: "Promote harmony" },
            { label: "Preserve composite culture" },
            { label: "Protect natural environment" },
            { label: "Develop scientific temper" },
            { label: "Safeguard public property" },
            { label: "Strive for excellence" },
            { label: "Provide education to children (86th Amd)" },
          ],
        },
        {
          label: "Union Executive",
          children: [
            {
              label: "President",
              children: [
                { label: "Election — Electoral College (Art. 54)" },
                { label: "Qualifications (Art. 58)" },
                { label: "Term — 5 years, re-election allowed" },
                {
                  label: "Powers",
                  children: [
                    { label: "Executive — Art. 53" },
                    { label: "Legislative — Summon, prorogue, dissolve" },
                    { label: "Judicial — Pardon power (Art. 72)" },
                    { label: "Emergency — Art. 352, 356, 360" },
                    { label: "Ordinance — Art. 123" },
                  ],
                },
                { label: "Impeachment — Art. 61" },
              ],
            },
            {
              label: "Prime Minister & Council of Ministers",
              children: [
                { label: "Appointment — Art. 75(1)" },
                { label: "Collective responsibility — Art. 75(3)" },
                { label: "Cabinet, Ministers of State, Deputy Ministers" },
                { label: "Kitchen Cabinet — Informal advisory group" },
              ],
            },
            {
              label: "Vice President",
              children: [
                { label: "Election — Both Houses of Parliament" },
                { label: "Ex-officio Chairman of Rajya Sabha" },
                { label: "Acts as President when vacancy arises" },
              ],
            },
          ],
        },
        {
          label: "Parliament",
          children: [
            {
              label: "Lok Sabha",
              children: [
                { label: "Max 552 members (530+20+2 nominated)" },
                { label: "Term — 5 years (extendable during Emergency)" },
                { label: "Speaker & Deputy Speaker" },
                { label: "Money Bills — Exclusive jurisdiction" },
                { label: "No-confidence motion" },
              ],
            },
            {
              label: "Rajya Sabha",
              children: [
                { label: "Max 250 members (238 elected + 12 nominated)" },
                { label: "Permanent body — 1/3 retire every 2 years" },
                { label: "Chairman (VP) & Deputy Chairman" },
                {
                  label: "Special Powers",
                  children: [
                    { label: "Art. 249 — Legislate on State List" },
                    { label: "Art. 312 — Create All India Services" },
                  ],
                },
              ],
            },
            {
              label: "Legislative Process",
              children: [
                { label: "Ordinary Bill — Both Houses" },
                { label: "Money Bill — Art. 110 (Lok Sabha only)" },
                { label: "Financial Bill — Type I & II" },
                { label: "Constitution Amendment Bill — Art. 368" },
              ],
            },
            {
              label: "Joint Session (Art. 108)",
              children: [
                { label: "Called by President" },
                { label: "Presided by Lok Sabha Speaker" },
                { label: "Used only 3 times in history" },
              ],
            },
          ],
        },
        {
          label: "Judiciary",
          children: [
            {
              label: "Supreme Court",
              children: [
                { label: "CJI + 33 judges (current strength: 34)" },
                { label: "Original Jurisdiction — Art. 131" },
                { label: "Appellate Jurisdiction — Art. 132-136" },
                { label: "Advisory Jurisdiction — Art. 143" },
                { label: "Writ Jurisdiction — Art. 32" },
                {
                  label: "Judicial Review",
                  children: [
                    { label: "Power to declare laws unconstitutional" },
                    { label: "Basic Structure Doctrine (Kesavananda, 1973)" },
                    { label: "Judicial Activism & PIL" },
                  ],
                },
              ],
            },
            {
              label: "High Courts",
              children: [
                { label: "25 High Courts across India" },
                { label: "Writ Jurisdiction — Art. 226 (wider than SC)" },
                { label: "Supervisory over subordinate courts" },
                { label: "Appointment — President on CJI consultation" },
              ],
            },
            {
              label: "Subordinate Courts",
              children: [
                { label: "District Courts — Civil & Criminal" },
                { label: "Lok Adalats — Alternative Dispute Resolution" },
                { label: "Tribunals — Art. 323A & 323B" },
              ],
            },
          ],
        },
        {
          label: "Emergency Provisions",
          children: [
            {
              label: "National Emergency (Art. 352)",
              children: [
                { label: "Grounds — War, external aggression, armed rebellion" },
                { label: "44th Amendment — 'Internal disturbance' replaced" },
                { label: "Declared 3 times: 1962, 1971, 1975" },
                { label: "Effect — FRs suspended except Art. 20 & 21" },
                { label: "Parliamentary approval needed within 1 month" },
              ],
            },
            {
              label: "President's Rule (Art. 356)",
              children: [
                { label: "Failure of constitutional machinery in state" },
                { label: "Governor's report (or without)" },
                { label: "Max duration — 3 years (6 months renewable)" },
                { label: "S.R. Bommai case (1994) — Judicial review upheld" },
              ],
            },
            {
              label: "Financial Emergency (Art. 360)",
              children: [
                { label: "Never declared in India" },
                { label: "President can reduce salaries" },
                { label: "Money bills reserved for President's consideration" },
              ],
            },
          ],
        },
        {
          label: "Amendments & Schedules",
          children: [
            {
              label: "Key Amendments",
              children: [
                { label: "1st (1951) — Saved land reform laws" },
                { label: "42nd (1976) — 'Mini Constitution'" },
                { label: "44th (1978) — Reversed 42nd Amendment" },
                { label: "73rd (1992) — Panchayati Raj" },
                { label: "74th (1992) — Municipalities" },
                { label: "86th (2002) — Right to Education" },
                { label: "101st (2016) — GST" },
                { label: "103rd (2019) — 10% EWS Reservation" },
              ],
            },
            {
              label: "12 Schedules",
              children: [
                { label: "1st — States & Union Territories" },
                { label: "2nd — Salaries of officials" },
                { label: "3rd — Oaths & Affirmations" },
                { label: "7th — Union, State, Concurrent Lists" },
                { label: "8th — 22 Official Languages" },
                { label: "9th — Validated laws (immune from Art. 13)" },
                { label: "10th — Anti-Defection Law" },
                { label: "11th — Panchayat powers (29 subjects)" },
                { label: "12th — Municipality powers (18 subjects)" },
              ],
            },
          ],
        },
        {
          label: "Federal Structure",
          children: [
            {
              label: "Centre-State Relations",
              children: [
                { label: "Legislative — Art. 245-255" },
                { label: "Administrative — Art. 256-263" },
                { label: "Financial — Art. 268-293" },
                {
                  label: "Commissions",
                  children: [
                    { label: "Sarkaria Commission (1983)" },
                    { label: "Punchhi Commission (2007)" },
                    { label: "Finance Commission — Art. 280" },
                  ],
                },
              ],
            },
            {
              label: "Inter-State Relations",
              children: [
                { label: "Inter-State Council — Art. 263" },
                { label: "Inter-State Water Disputes — Art. 262" },
                { label: "Zonal Councils — States Reorganisation Act" },
                { label: "Full faith & credit — Art. 261" },
              ],
            },
            {
              label: "Special Provisions",
              children: [
                { label: "Art. 370 — J&K (abrogated 2019)" },
                { label: "Art. 371 — Special states (NE, Goa, etc.)" },
                { label: "5th Schedule — Scheduled Areas" },
                { label: "6th Schedule — Tribal Areas (NE)" },
              ],
            },
          ],
        },
      ],
    },
  },
  quizData: [
    { question: "When was the Indian Constitution adopted?", options: ["26 Jan 1950", "26 Nov 1949", "15 Aug 1947", "26 Jan 1949"], correctAnswer: "26 Nov 1949" },
    { question: "How many Fundamental Duties are there?", options: ["10", "11", "12", "9"], correctAnswer: "11" },
    { question: "Which amendment added 'Socialist' to the Preamble?", options: ["42nd", "44th", "1st", "86th"], correctAnswer: "42nd" },
    { question: "Art. 32 is related to?", options: ["Right to Equality", "Constitutional Remedies", "Right to Freedom", "Right to Religion"], correctAnswer: "Constitutional Remedies" },
    { question: "How many schedules are in the Constitution?", options: ["10", "11", "12", "8"], correctAnswer: "12" },
  ],
};

async function main() {
  // Ensure subject exists
  const subject = await prisma.mindmapSubject.upsert({
    where: { slug: TEST_MINDMAP.subjectSlug },
    update: {},
    create: {
      name: TEST_MINDMAP.subjectName,
      slug: TEST_MINDMAP.subjectSlug,
      icon: TEST_MINDMAP.subjectIcon,
    },
  });

  // Delete if already exists
  await prisma.mindmap.deleteMany({
    where: { subjectId: subject.id, slug: TEST_MINDMAP.slug },
  });

  // Create the mindmap
  const map = await prisma.mindmap.create({
    data: {
      subjectId: subject.id,
      title: TEST_MINDMAP.title,
      slug: TEST_MINDMAP.slug,
      branches: TEST_MINDMAP.branches as any,
      nodes: TEST_MINDMAP.nodes as any,
      quizData: TEST_MINDMAP.quizData as any,
    },
  });

  // Count nodes
  function countNodes(node: any): number {
    let c = 1;
    if (node.children) for (const ch of node.children) c += countNodes(ch);
    return c;
  }

  const total = countNodes(TEST_MINDMAP.nodes.root);
  console.log(`Created: "${map.title}"`);
  console.log(`  ID: ${map.id}`);
  console.log(`  Branches: 10`);
  console.log(`  Total nodes: ${total}`);
  console.log(`  Max depth: 5 levels`);
  console.log(`\nView at: /dashboard/mindmap/indian-polity/${TEST_MINDMAP.slug}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
