import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!;
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SYLLABUS_DATA = {
  prelims: [
    {
      name: "History & Culture",
      short: "History",
      icon: "🏛",
      color: "#e07b39",
      bg: "rgba(224,123,57,.11)",
      topics: [
        { name: "Ancient India", subs: ["Prehistoric India & Sources","Indus Valley Civilisation","Vedic Age & Literature","Mahajanapadas & Magadha","Mauryan Empire & Ashoka","Post-Mauryan Kingdoms","Gupta Empire — Golden Age","Sangam Age & South India"] },
        { name: "Medieval India", subs: ["Rajput Period & Culture","Delhi Sultanate","Vijayanagara Empire","Mughal Empire","Bhakti Movement","Sufi Movement","Maratha Empire","Deccan Sultanates"] },
        { name: "Modern India", subs: ["British Expansion Policy","Economic Impact of British Rule","Revolt of 1857","Early Nationalist Phase","Swadeshi Movement","Non-Cooperation Movement","Civil Disobedience Movement","Quit India Movement & INA","Independence & Partition"] },
        { name: "Art & Architecture", subs: ["Rock-Cut Caves — Ajanta, Ellora","Stupa Architecture","Temple Styles — Nagara, Dravida","Mughal Architecture","Indo-Islamic Architecture","Sculpture Schools"] },
        { name: "Performing Arts & Crafts", subs: ["Classical Dances","Hindustani Classical Music","Carnatic Classical Music","Folk Music & Theatre","Puppetry Traditions","Miniature Paintings","Folk Art — Warli, Madhubani","UNESCO Intangible Heritage"] },
      ],
    },
    {
      name: "Geography",
      short: "Geog.",
      icon: "🌍",
      color: "#2e7dd4",
      bg: "rgba(46,125,212,.10)",
      topics: [
        { name: "Geomorphology", subs: ["Earth's Interior & Layers","Plate Tectonics","Volcanoes — Types & Distribution","Earthquakes — Seismic Waves","Tsunamis & Warning Systems","Weathering & Mass Wasting","Fluvial Landforms","Coastal Landforms","Glacial Landforms","Karst Topography"] },
        { name: "Climatology", subs: ["Atmosphere Layers","Insolation & Heat Budget","Pressure Belts & Winds","Indian Monsoon Mechanism","Cyclones — Tropical vs Extra-tropical","Humidity & Precipitation","Koppen Classification"] },
        { name: "Oceanography", subs: ["Ocean Floor Relief","Ocean Currents","Tides — Types","Ocean Salinity","El Niño & La Niña ENSO","Marine Resources"] },
        { name: "Indian Physical Geography", subs: ["Formation of Himalayas","Divisions of Himalayas","Northern Plains","Peninsular Plateau","Coastal Plains","Eastern & Western Ghats","Islands","Himalayan Rivers","Peninsular Rivers"] },
        { name: "Indian Human Geography", subs: ["Population Distribution","Urbanisation Trends","Cropping Patterns","Types of Indian Soils","Natural Vegetation","Mineral Resources","Energy Resources"] },
      ],
    },
    {
      name: "Indian Polity",
      short: "Polity",
      icon: "⚖️",
      color: "#7c3aed",
      bg: "rgba(124,58,237,.09)",
      topics: [
        { name: "Constitutional Framework", subs: ["Historical Background","Making of Constitution","Salient Features","Preamble — Significance","Union & Territories","Citizenship"] },
        { name: "Fundamental Rights", subs: ["Right to Equality Art 14-18","Right to Freedom Art 19-22","Right against Exploitation","Freedom of Religion","Cultural & Educational Rights","Right to Constitutional Remedies","Writs — Types & Scope"] },
        { name: "DPSP & Duties", subs: ["Directive Principles — Socialistic","Directive Principles — Gandhian","Directive Principles — Liberal","Fundamental Duties Art 51A","FR vs DPSP Conflicts"] },
        { name: "Parliament", subs: ["Lok Sabha — Composition","Rajya Sabha — Special Powers","Parliamentary Sessions","Legislative Procedure","Parliamentary Committees","Anti-Defection Law"] },
        { name: "Judiciary", subs: ["Supreme Court — Composition","Jurisdictions & Writs","High Courts Powers","Judicial Review & PIL"] },
        { name: "Federalism", subs: ["Centre-State Relations","Finance Commission","Emergency Provisions","Inter-State Council"] },
      ],
    },
    {
      name: "Indian Economy",
      short: "Economy",
      icon: "📈",
      color: "#059669",
      bg: "rgba(5,150,105,.09)",
      topics: [
        { name: "Macroeconomic Concepts", subs: ["GDP, GNP, NNP Differences","National Income Methods","Economic Growth vs Development","HDI & Composite Indices","Business Cycles","Inflation — CPI, WPI, Core"] },
        { name: "Money & Banking", subs: ["RBI Functions & Monetary Policy","Repo Rate, CRR, SLR","Monetary Policy Committee","Types of Banks","NBFC & Payment Banks","NPA & Banking Reforms"] },
        { name: "Public Finance", subs: ["Union Budget Components","Revenue vs Capital Account","Fiscal Deficit","FRBM Act","Disinvestment Policy"] },
        { name: "Agriculture & Food", subs: ["MSP — Mechanism & Issues","Food Security Act & PDS","PM Fasal Bima Yojana","e-NAM Platform","Agricultural Credit"] },
        { name: "Industry & Infrastructure", subs: ["Make in India & PLI","Road — Bharatmala","Railway Modernisation","Ports — Sagarmala","MSME Importance"] },
      ],
    },
    {
      name: "Environment",
      short: "Enviro.",
      icon: "🌿",
      color: "#16a34a",
      bg: "rgba(22,163,74,.09)",
      topics: [
        { name: "Ecology Basics", subs: ["Ecosystem Components","Food Chain & Trophic Levels","Energy Flow — 10% Law","Nutrient Cycles","Ecological Succession","Carrying Capacity"] },
        { name: "Biodiversity", subs: ["India's 4 Hotspots","IUCN Red List","India's Endangered Species","In-situ Conservation","Ex-situ Conservation","Biosphere Reserves"] },
        { name: "Protected Areas", subs: ["National Parks of India","Wildlife Sanctuaries","Tiger Reserves","Ramsar Wetlands","Mangroves & Coral Reefs"] },
        { name: "Climate Change", subs: ["Greenhouse Effect & Gases","IPCC — AR6 Findings","UNFCCC & COP","Paris Agreement — NDCs","Carbon Markets"] },
        { name: "Environmental Laws", subs: ["Environment Protection Act 1986","Forest Conservation Act 1980","Wildlife Protection Act 1972","EIA Notification 2006","National Green Tribunal"] },
      ],
    },
    {
      name: "Science & Tech",
      short: "Science",
      icon: "🔬",
      color: "#d97706",
      bg: "rgba(217,119,6,.09)",
      topics: [
        { name: "Space Technology", subs: ["ISRO History & Structure","PSLV & GSLV Rockets","Chandrayaan-1, 2 & 3","Mangalyaan & Aditya-L1","Gaganyaan Programme","NavIC / IRNSS"] },
        { name: "Nuclear Technology", subs: ["Nuclear Fission & Reactors","Nuclear Fusion — ITER","India 3-Stage Programme","NSG & India","CTBT & NPT"] },
        { name: "Biotechnology", subs: ["Recombinant DNA Technology","GMO Crops","CRISPR-Cas9 Gene Editing","Stem Cell Research","Biosafety Protocols"] },
        { name: "IT & Emerging Tech", subs: ["AI & Machine Learning","Blockchain Technology","Internet of Things","5G Technology","Cyber Threats & Security"] },
      ],
    },
    {
      name: "CSAT Paper-II",
      short: "CSAT",
      icon: "🧠",
      color: "#dc2626",
      bg: "rgba(220,38,38,.09)",
      topics: [
        { name: "Reading Comprehension", subs: ["Main Idea & Central Theme","Inference & Implied Meaning","Author Tone & Attitude","Logical Conclusion Questions","Vocabulary in Context"] },
        { name: "Quantitative Aptitude", subs: ["Number Systems","Percentage & Applications","Profit, Loss & Discount","Simple & Compound Interest","Ratio, Proportion","Time & Work","Time, Speed & Distance","Mensuration"] },
        { name: "Data Interpretation", subs: ["Bar Graphs","Pie Charts","Line Graphs","Tables Analysis","Caselets & Mixed DI"] },
        { name: "Logical Reasoning", subs: ["Syllogisms","Blood Relations","Direction & Distance","Coding-Decoding","Number & Letter Series","Statement-Conclusion"] },
      ],
    },
  ],
  mains: [
    {
      name: "Essay Paper",
      short: "Essay",
      icon: "✍️",
      color: "#d97706",
      bg: "rgba(217,119,6,.09)",
      topics: [
        { name: "Essay Craft", subs: ["Impactful Introduction Styles","Thesis & Argument Building","Counter-Argument & Rebuttal","Use of Examples & Data","Strong Conclusion Techniques"] },
        { name: "Thematic Areas", subs: ["Social Justice & Equality","Economic Development","Science Technology Ethics","Environment & Sustainability","Governance & Democracy"] },
      ],
    },
    {
      name: "GS-I Heritage & Society",
      short: "GS-I",
      icon: "🏛",
      color: "#e07b39",
      bg: "rgba(224,123,57,.12)",
      topics: [
        { name: "Modern Indian History", subs: ["1857 Revolt — Impact Analysis","Social Reform Movements","Swadeshi & Home Rule","Non-Cooperation & Civil Disobedience","Independence & Partition Stories"] },
        { name: "World History", subs: ["Industrial Revolution","World Wars Causes & Aftermath","Russian Revolution","Cold War","Decolonisation Asia & Africa"] },
        { name: "Indian Society", subs: ["Salient Features Indian Society","Communalism & Secularism","Caste System Evolution","Tribal Communities & Rights","Role of Women in Society"] },
        { name: "Physical Geography — Disasters", subs: ["Earthquakes & Vulnerability","Floods Causes & Management","Cyclones in India","Landslides — Hotspots","Droughts & Heat Waves"] },
      ],
    },
    {
      name: "GS-II Governance & IR",
      short: "GS-II",
      icon: "⚖️",
      color: "#7c3aed",
      bg: "rgba(124,58,237,.09)",
      topics: [
        { name: "Constitutional Issues", subs: ["Basic Structure Doctrine","Judicial Review Scope","Constitutional Morality","Recent SC Landmark Judgements"] },
        { name: "Federalism Issues", subs: ["Cooperative vs Competitive Federalism","GST Council Functioning","Governor Controversy","Inter-State Water Disputes"] },
        { name: "Social Sector Schemes", subs: ["Health — Ayushman Bharat NHM","Education — NEP 2020 NIPUN","Women — Beti Bachao Beti Padhao","Child — ICDS POSHAN Abhiyan"] },
        { name: "International Relations", subs: ["India-USA Strategic Partnership","India-China Border Relations","India-Russia Ties","India Neighbourhood First","G20 India Presidency Legacy"] },
      ],
    },
    {
      name: "GS-III Economy & Security",
      short: "GS-III",
      icon: "📈",
      color: "#059669",
      bg: "rgba(5,150,105,.09)",
      topics: [
        { name: "Economy Mains", subs: ["Economic Survey Key Themes","Union Budget Analysis","Agricultural Distress Solutions","Labour Reforms — 4 Codes"] },
        { name: "Internal Security", subs: ["Left Wing Extremism Strategy","Terrorism Types & Counter","Cyber Security Policy","Border Management"] },
        { name: "Disaster Management", subs: ["NDMA, SDMA, DDMA Roles","Sendai Framework 2015-30","Flood & Cyclone Management","Post-Disaster Recovery"] },
      ],
    },
    {
      name: "GS-IV Ethics",
      short: "GS-IV",
      icon: "🧭",
      color: "#16a34a",
      bg: "rgba(22,163,74,.09)",
      topics: [
        { name: "Ethics Foundations", subs: ["Essence & Determinants of Ethics","Ethics in Public vs Private Life","Human Values from Great Leaders","Role of Family & Society"] },
        { name: "Moral Thinkers", subs: ["Gandhi — Satyagraha & Ahimsa","Ambedkar — Social Ethics","Kant — Categorical Imperative","Utilitarianism","Rawls — Theory of Justice"] },
        { name: "Governance & Probity", subs: ["Probity in Public Life","Corruption Causes & Remedies","Conflict of Interest","Code of Conduct Civil Servants","RTI & Transparency"] },
      ],
    },
  ],
  optional: [
    {
      name: "Optional Paper-I",
      short: "Paper-I",
      icon: "📖",
      color: "#6d28d9",
      bg: "rgba(109,40,217,.09)",
      topics: [
        { name: "Section A — Core Theory", subs: ["Unit 1 — Foundations & Origins","Unit 2 — Core Theories & Models","Unit 3 — Advanced Concepts","Unit 4 — Schools of Thought"] },
        { name: "Section B — Applied", subs: ["Unit 5 — Applied Analysis","Unit 6 — Case Studies","Unit 7 — Contemporary Issues","Unit 8 — Comparative Analysis"] },
      ],
    },
    {
      name: "Optional Paper-II",
      short: "Paper-II",
      icon: "📗",
      color: "#0891b2",
      bg: "rgba(8,145,178,.09)",
      topics: [
        { name: "Section A — Theory", subs: ["Unit 1 — Advanced Theory","Unit 2 — Historical Context","Unit 3 — Key Thinkers","Unit 4 — Thematic Analysis"] },
        { name: "Section B — Current", subs: ["Unit 5 — Current Debates","Unit 6 — Policy Dimensions","Unit 7 — International Dimensions","Unit 8 — Practice & Revision"] },
      ],
    },
  ],
};

async function seedSyllabus() {
  console.log("Seeding syllabus data...");

  // Clear existing data
  await prisma.syllabusSubTopic.deleteMany();
  await prisma.syllabusTopic.deleteMany();
  await prisma.syllabusSubject.deleteMany();

  for (const [stage, subjects] of Object.entries(SYLLABUS_DATA)) {
    for (let si = 0; si < subjects.length; si++) {
      const subj = subjects[si];
      const dbSubject = await prisma.syllabusSubject.create({
        data: {
          stage,
          name: subj.name,
          short: subj.short,
          icon: subj.icon,
          color: subj.color,
          bg: subj.bg,
          sortOrder: si,
        },
      });
      console.log(`  Created subject: ${stage} > ${subj.name}`);

      for (let ti = 0; ti < subj.topics.length; ti++) {
        const topic = subj.topics[ti];
        const dbTopic = await prisma.syllabusTopic.create({
          data: {
            subjectId: dbSubject.id,
            name: topic.name,
            sortOrder: ti,
          },
        });

        await prisma.syllabusSubTopic.createMany({
          data: topic.subs.map((name, sti) => ({
            topicId: dbTopic.id,
            name,
            sortOrder: sti,
          })),
        });
      }
    }
  }

  console.log("Syllabus seeded successfully!");
}

seedSyllabus()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
