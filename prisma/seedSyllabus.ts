import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
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

type SeedSubject = {
  name: string;
  short: string;
  icon: string;
  color: string;
  bg: string;
  topics: { name: string; subs: string[] }[];
};

type CsvSubject = {
  subject: string;
  subSubjects: { label: string; topics: string[] }[];
};

const PRELIMS_META: Record<string, Omit<SeedSubject, "name" | "short" | "topics"> & { short: string }> = {
  History: {
    short: "History",
    icon: "🏛️",
    color: "#e07b39",
    bg: "rgba(224,123,57,.11)",
  },
  Geography: {
    short: "Geog.",
    icon: "🌍",
    color: "#2e7dd4",
    bg: "rgba(46,125,212,.10)",
  },
  Polity: {
    short: "Polity",
    icon: "⚖️",
    color: "#7c3aed",
    bg: "rgba(124,58,237,.09)",
  },
  Economy: {
    short: "Economy",
    icon: "💰",
    color: "#059669",
    bg: "rgba(5,150,105,.09)",
  },
  "Environment & Ecology": {
    short: "Env.",
    icon: "🌿",
    color: "#16a34a",
    bg: "rgba(22,163,74,.10)",
  },
  "Science & Technology": {
    short: "S&T",
    icon: "🔬",
    color: "#0891b2",
    bg: "rgba(8,145,178,.10)",
  },
  "Current Affairs": {
    short: "Curr. Aff.",
    icon: "📰",
    color: "#dc2626",
    bg: "rgba(220,38,38,.09)",
  },
};

function loadPrelimsFromCsvJson(): SeedSubject[] {
  const jsonPath = path.resolve(__dirname, "..", "..", "upsc_frontend", "data", "syllabus", "prelimsSyllabus.json");
  const csvSubjects = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as CsvSubject[];

  return csvSubjects.map((item) => {
    const meta = PRELIMS_META[item.subject] ?? {
      short: item.subject,
      icon: "📚",
      color: "#0f1f3d",
      bg: "rgba(15,31,61,.08)",
    };

    return {
      name: item.subject,
      short: meta.short,
      icon: meta.icon,
      color: meta.color,
      bg: meta.bg,
      topics: item.subSubjects.map((subSubject) => ({
        name: subSubject.label,
        subs: subSubject.topics,
      })),
    };
  });
}

// Prelims is loaded from prelimsSyllabus.json via loadPrelimsFromCsvJson()
// This object defines Mains and Optional only
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
    // GS Paper I — History, Geography, Society
    {
      name: "History",
      short: "History",
      icon: "🏛️",
      color: "#e07b39",
      bg: "rgba(224,123,57,.11)",
      topics: [
        { name: "Ancient & Medieval India", subs: ["Prehistoric & Indus Valley Civilisation","Vedic Period & Mahajanapadas","Mauryan, Gupta & Post-Gupta Empires","Bhakti & Sufi Movements","Delhi Sultanate & Mughal Empire","Vijayanagara & Deccan Kingdoms","Art, Architecture & Culture"] },
        { name: "Modern India & Freedom Struggle", subs: ["British Economic Exploitation","Revolt of 1857 — Analysis","Socio-Religious Reform Movements","Early Nationalism — Moderates & Extremists","Gandhian Era — NC, CDM, Quit India","Role of Women, Press & Peasants","Independence & Partition — Impact"] },
        { name: "World History (GS-I)", subs: ["Industrial Revolution & Its Impact","World War I — Causes & Consequences","World War II — Causes & Aftermath","Russian Revolution & Soviet Union","Cold War — Origins, Phases, End","Decolonisation in Asia & Africa","Rise of China & Globalisation"] },
        { name: "Art & Culture", subs: ["Temple Architecture Styles","Performing Arts — Dance, Music","Painting Traditions — Schools","Literature & Languages","Philosophy — Schools of Thought","UNESCO Heritage Sites of India","Contemporary Cultural Developments"] },
      ],
    },
    {
      name: "Geography",
      short: "Geog.",
      icon: "🌍",
      color: "#2e7dd4",
      bg: "rgba(46,125,212,.10)",
      topics: [
        { name: "Physical Geography", subs: ["Geomorphology — Landforms & Evolution","Climatology — Monsoon, Climate Change","Oceanography — Currents & Resources","Natural Hazards & Disaster Linkages"] },
        { name: "Human & Economic Geography", subs: ["Population Distribution & Migration","Urbanisation — Challenges & Smart Cities","Agricultural Geography — Cropping Patterns","Industrial Location Factors","Transport & Communication Networks","Regional Economic Development"] },
        { name: "Indian Geography (Mains)", subs: ["Physiographic Divisions — Significance","River Systems — Disputes & Management","Soil Resources & Degradation","Natural Vegetation — Forests Policy","Mineral & Energy Resources","Regional Disparities & Planning"] },
      ],
    },
    {
      name: "Society",
      short: "Society",
      icon: "👥",
      color: "#0891b2",
      bg: "rgba(8,145,178,.09)",
      topics: [
        { name: "Indian Society", subs: ["Salient Features of Indian Society","Diversity — Religious, Linguistic, Regional","Caste System — Evolution & Change","Tribal Communities & Issues","Role & Status of Women","Population Issues — Ageing, Migration"] },
        { name: "Social Issues", subs: ["Poverty & Deprivation","Communalism & Regionalism","Secularism in India","Effects of Globalisation on Society","Social Empowerment — SC/ST/OBC","Child Labour & Child Rights","Human Trafficking"] },
        { name: "Women & Family", subs: ["Women Empowerment — Legal Framework","Domestic Violence & POCSO","Women in Workforce","Marriage & Family Changing Patterns","Gender Budget","Women in STEM"] },
      ],
    },
    // GS Paper II — Polity, Governance, IR, Social Justice
    {
      name: "Polity",
      short: "Polity",
      icon: "⚖️",
      color: "#7c3aed",
      bg: "rgba(124,58,237,.09)",
      topics: [
        { name: "Constitutional Issues (Mains)", subs: ["Basic Structure Doctrine","Judicial Review & Judicial Overreach","Constitutional Morality vs Social Morality","Recent Supreme Court Landmark Judgements","Constitutional Amendments — Controversies"] },
        { name: "Parliament & Executive", subs: ["Parliamentary Privileges & Functioning","Money Bill vs Finance Bill Controversy","Anti-Defection — Loopholes & Reforms","Role of Governor — Controversies","PM Office — Role & Powers"] },
        { name: "Federalism (Mains)", subs: ["Cooperative Federalism vs Competitive Federalism","GST Council — Functioning & Issues","Inter-State River Water Disputes","Special Category Status","NITI Aayog — Effectiveness"] },
        { name: "Judiciary (Mains)", subs: ["Independence of Judiciary — Challenges","Judicial Appointments — Collegium vs NJAC","PIL — Abuse & Reform","Pendency & Access to Justice","Alternative Dispute Resolution Mechanisms"] },
      ],
    },
    {
      name: "Governance",
      short: "Governance",
      icon: "🏛️",
      color: "#6366f1",
      bg: "rgba(99,102,241,.09)",
      topics: [
        { name: "Good Governance", subs: ["Citizen's Charters","E-Governance & Digital India","Transparency & Accountability Mechanisms","RTI Act — Implementation Issues","Social Audit & Gram Sabha"] },
        { name: "Civil Services & Administration", subs: ["Role of Civil Services in Democracy","Lateral Entry & Civil Services Reform","IAS vs Specialist Debate","District Administration & Collector","Ethics in Public Administration"] },
        { name: "Social Sector Schemes", subs: ["Health — NHM, Ayushman Bharat, PMJAY","Education — NEP 2020, NIPUN, Midday Meal","Women — MGNREGA, SHGs, Beti Bachao","Child — ICDS, POSHAN Abhiyan","Housing — PMAY, Smart Cities Mission"] },
        { name: "Development Processes", subs: ["Role of NGOs & Civil Society","SHGs — Women Empowerment Tool","Welfare Schemes Delivery Challenges","Public Policy Design & Evaluation","DBT — Direct Benefit Transfer"] },
      ],
    },
    {
      name: "International Relations",
      short: "IR",
      icon: "🌐",
      color: "#2563eb",
      bg: "rgba(37,99,235,.09)",
      topics: [
        { name: "India & Neighbours", subs: ["India-Pakistan — Issues & Way Forward","India-China — Border, Trade, Competition","India-Bangladesh — Connectivity & River","India-Nepal & Bhutan Relations","India-Sri Lanka — Ethnic Issue & Trade","India-Afghanistan — Post-Taliban Scenario"] },
        { name: "India & Major Powers", subs: ["India-USA — Strategic Partnership","India-Russia — Defence & Energy","India-EU — Trade & Clean Energy","India-Japan & India-Australia (QUAD)","India's Africa Engagement"] },
        { name: "International Organisations", subs: ["United Nations — Reforms & India","WTO — Agriculture Disputes & India","IMF & World Bank — India's Role","BRICS — Expansion & Relevance","SCO — India's Strategic Interests","G20 — India's Presidency Legacy"] },
        { name: "Foreign Policy", subs: ["Neighbourhood First Policy","Act East Policy","Vaccine Maitri — Soft Power","Non-Alignment & Strategic Autonomy","India's Nuclear Doctrine","Indian Diaspora & Foreign Policy"] },
      ],
    },
    {
      name: "Social Justice",
      short: "Social Justice",
      icon: "⚖️",
      color: "#dc2626",
      bg: "rgba(220,38,38,.09)",
      topics: [
        { name: "Vulnerable Sections", subs: ["SC/ST — Constitutional Safeguards & Issues","OBC Reservation — Creamy Layer Debate","Persons with Disabilities — Rights & Schemes","Senior Citizens — Welfare & Issues","Children — Protection Laws & Implementation","Minorities — Safeguards & Issues"] },
        { name: "Poverty & Hunger", subs: ["Poverty Measurement — Tendulkar, Rangarajan","Multi-Dimensional Poverty Index","Hunger & Malnutrition — NFHS Data","Food Security Act — PDS Reforms","Zero Hunger — SDG Goal 2"] },
        { name: "Health & Education (Social Justice)", subs: ["RTE Act — Implementation Gaps","Higher Education Access — HEFA","NHM — Universal Health Coverage","Mental Health — Policy Gaps","Nutrition — POSHAN Abhiyan"] },
      ],
    },
    // GS Paper III — Economy, Environment, S&T, Agriculture, Security
    {
      name: "Economy",
      short: "Economy",
      icon: "💰",
      color: "#059669",
      bg: "rgba(5,150,105,.09)",
      topics: [
        { name: "Growth & Development", subs: ["GDP Growth — Trends & Drivers","Economic Survey — Key Findings","Union Budget — Revenue & Capital","Labour Reforms — Four Labour Codes","Land Acquisition — Issues","Gig Economy & Informal Sector"] },
        { name: "Agriculture Economics", subs: ["Agrarian Distress — Causes & Solutions","Doubling Farmers' Income — Progress","MSP & Procurement Reforms","Crop Insurance — PMFBY Issues","Agricultural Marketing — e-NAM","Contract Farming","FPOs — Formation & Benefits"] },
        { name: "Sectors & Infrastructure", subs: ["Manufacturing — PLI Scheme","Services Sector — IT, Finance","Logistics — PM Gati Shakti NMP","Electric Vehicles — Charging Ecosystem","Renewable Energy — Solar, Wind Targets","Digital Economy — UPI, ONDC"] },
        { name: "Money, Banking & External Sector", subs: ["RBI Monetary Policy — Decisions","Bank Consolidation & Privatisation","India's External Debt","Current Account Deficit Management","FDI — Top Sectors & Issues","Cryptocurrency Regulation in India"] },
      ],
    },
    {
      name: "Environment & Ecology",
      short: "Enviro.",
      icon: "🌿",
      color: "#16a34a",
      bg: "rgba(22,163,74,.09)",
      topics: [
        { name: "Biodiversity & Ecosystems (Mains)", subs: ["Ecosystem Services — Valuation","Biodiversity Loss — Drivers","IPBES — Key Reports","Wetlands — Ramsar Sites India","Coral Reefs — Threats & Restoration","Forest Rights Act — Implementation"] },
        { name: "Climate Change (Mains)", subs: ["COP Outcomes — Paris to Dubai","India's NDCs — Targets & Progress","Loss & Damage Fund","Just Transition — Coal Regions","Carbon Capture & Storage","Green Hydrogen Mission India"] },
        { name: "Environmental Governance", subs: ["EIA Notification Amendments","Forest Conservation Act Amendment 2023","Compensatory Afforestation","NGT — Powers & Key Orders","Environmental Compliance & Penalties","Plastic Waste — Extended Producer Responsibility"] },
      ],
    },
    {
      name: "Science & Technology",
      short: "Science",
      icon: "🔬",
      color: "#d97706",
      bg: "rgba(217,119,6,.09)",
      topics: [
        { name: "Science Policy & Research", subs: ["STIP 2020 — Key Recommendations","Anusandhan NRF — National R&D","Science & Technology Vision 2035","Academic-Industry Linkage","Start-up India & Technology"] },
        { name: "Emerging Technologies (Mains)", subs: ["AI in Governance & Public Services","Data Protection Bill & Privacy","5G — Rollout & Security Concerns","Fintech & Digital Payments","Drone Policy & Applications","Semiconductor Policy India"] },
        { name: "Space & Defence (Mains)", subs: ["ISRO Missions & Commercial Space","SpaceX & India's Response","Chandrayaan-3 — Strategic Significance","Military Modernisation — DPP","Make in India for Defence","Cyber Warfare & National Security"] },
        { name: "IPR & Innovation", subs: ["Patents — TRIPS Flexibilities & India","Traditional Knowledge & Biopiracy","Compulsory Licensing","National IPR Policy","Pharmaceutical Industry & Generics"] },
      ],
    },
    {
      name: "Agriculture",
      short: "Agriculture",
      icon: "🌾",
      color: "#16a34a",
      bg: "rgba(22,163,74,.10)",
      topics: [
        { name: "Agriculture Sector Overview", subs: ["Contribution to GDP & Employment","Green Revolution Legacy & Issues","Cropping Patterns — Kharif, Rabi, Zaid","Irrigation — Types, Coverage & Efficiency","Agricultural Land Use Statistics"] },
        { name: "Farmer Welfare", subs: ["MSP Mechanism & C2+50% Demand","PM-Kisan — Coverage & Implementation","Kisan Credit Card Scheme","MGNREGA & Rural Employment","Farmer Suicides — Causes & Remedies"] },
        { name: "Technology in Agriculture", subs: ["Precision Farming & IoT in Agriculture","Drone Use in Agriculture","Natural Farming — ZBNF","GM Crops — Bt Cotton & HT Mustard","Drip Irrigation & Micro-irrigation","Soil Health Card Scheme"] },
        { name: "Food Processing & Marketing", subs: ["PMKSY — Pradhan Mantri Krishi Sinchayee Yojana","Food Processing Industry — Potential","APMC Act Reforms","Essential Commodities Act Amendment","Export of Agricultural Commodities","Cold Chain Infrastructure"] },
      ],
    },
    {
      name: "Internal Security",
      short: "Int. Security",
      icon: "🛡️",
      color: "#ea580c",
      bg: "rgba(234,88,12,.09)",
      topics: [
        { name: "Terrorism & Extremism", subs: ["Left Wing Extremism — Status & Strategy","North-East Insurgency","Jammu & Kashmir — Post Art.370 Security","International Terrorism — India's Exposure","Radicalisation — Causes & Counter-measures","UAPA — Provisions & Controversies"] },
        { name: "Cyber & Hybrid Threats", subs: ["Cyberterrorism & Critical Infrastructure","Fake News & Information Warfare","Social Media Radicalization","Dark Web & Illegal Activities","Critical Information Infrastructure Protection"] },
        { name: "Border Management", subs: ["Land Border Management — Fencing","Sea Border — Coastal Security Post-2008","Cross-Border Infiltration Challenges","Border Area Development Programme","Smuggling & Human Trafficking"] },
        { name: "Security Forces & Intelligence", subs: ["Role of NSG, CRPF, BSF, ITBP","Intelligence Bureau & RAW","NIA — Role in Terror Cases","Narco-terrorism & Money Laundering","FATF — India's Compliance","Police Modernisation"] },
      ],
    },
    {
      name: "Disaster Management",
      short: "Disaster Mgmt",
      icon: "🚨",
      color: "#f59e0b",
      bg: "rgba(245,158,11,.09)",
      topics: [
        { name: "Disasters & Vulnerability", subs: ["Natural Hazards — Earthquake, Flood, Cyclone, Drought","Man-Made Disasters — Industrial, Chemical, Nuclear","India's Vulnerability — Disaster Zones","Climate Change & Intensification of Disasters","Urban Disasters — Heat Island, Urban Flooding"] },
        { name: "Disaster Management Framework", subs: ["DM Act 2005 — NDMA, SDMA, DDMA","Sendai Framework 2015-2030","NDRF & SDRF — Roles & Deployment","Early Warning Systems — IMD, INCOIS","Community-Based Disaster Management"] },
        { name: "Response & Recovery", subs: ["International Disaster Relief — India's Role","Post-Disaster Rehabilitation","Build Back Better Principle","Insurance & Financial Risk Transfer","NDRRM — National Disaster Risk Reduction Management"] },
      ],
    },
    // GS Paper IV — Ethics
    {
      name: "Ethics, Integrity & Aptitude",
      short: "Ethics",
      icon: "🧭",
      color: "#6366f1",
      bg: "rgba(99,102,241,.09)",
      topics: [
        { name: "Ethics & Human Interface", subs: ["Essence & Determinants of Ethics","Dimensions — Meta, Normative, Applied","Ethics in Public vs Private Relationships","Human Values — Sources & Influencers","Lessons from Lives of Great Leaders","Role of Family, Society, Educational Institutions"] },
        { name: "Attitude & Aptitude", subs: ["Attitude — Content, Structure, Function","Influence on Behaviour & Decision Making","Moral & Political Attitudes","Social Influence & Persuasion","Foundational Values for Civil Service","Integrity, Impartiality & Non-Partisanship"] },
        { name: "Emotional Intelligence", subs: ["EI Concepts — Salovey-Mayer, Goleman","Self-Awareness & Self-Regulation","Empathy & Social Skills","EI in Administrative Effectiveness","Contributions of Moral Thinkers — Gandhi, Ambedkar, Rawls"] },
        { name: "Public Service Ethics", subs: ["Probity in Governance","Concept of Public Service","Philosophical Basis of Governance","Information Sharing & Transparency","RTI & Accountability","Citizens Charter & Service Delivery"] },
        { name: "Governance & Probity", subs: ["Corruption — Causes, Types & Remedies","Conflict of Interest","Code of Conduct — Government Servants","Whistle-Blower Protection","Role of Media in Governance","Anti-Corruption Mechanisms — CVC, Lokpal"] },
        { name: "Case Studies", subs: ["Ethical Dilemmas in Administration","Stakeholder Analysis","Application of Ethical Frameworks","Values Conflict Resolution","Real-life Administrative Scenarios"] },
      ],
    },
    {
      name: "Current Affairs",
      short: "Curr. Aff.",
      icon: "📰",
      color: "#dc2626",
      bg: "rgba(220,38,38,.09)",
      topics: [
        { name: "National Current Affairs", subs: ["Government Flagship Schemes & Policies","Parliament & Constitutional Developments","Economic Developments — Budget, RBI Policy","Social Sector — Health, Education Updates","Legal & Judicial Updates — Key Judgements"] },
        { name: "International Current Affairs", subs: ["Bilateral Relations & Diplomacy","International Organizations — Recent Decisions","Global Summits & Agreements","Geopolitical Conflicts & India's Stance","Indian Diaspora News"] },
        { name: "Science, Tech & Environment in News", subs: ["ISRO & Space Missions","Defence Technology & Procurement","Environmental Agreements & Climate Policy","Health Emergencies & Medical Breakthroughs","Digital & Cyber Policy Developments"] },
      ],
    },
    // Essay Paper
    {
      name: "Essay Paper",
      short: "Essay",
      icon: "✍️",
      color: "#d97706",
      bg: "rgba(217,119,6,.09)",
      topics: [
        { name: "Essay Writing Skills", subs: ["Introduction Styles — Quote, Definition, Anecdote","Thesis Statement & Argument Building","Counter-Argument & Rebuttal","Use of Data, Examples & Case Studies","Strong Conclusion Techniques","Structure — Linear vs Thematic"] },
        { name: "Essay Themes — Part A (Philosophical)", subs: ["Truth, Morality & Values","Justice, Liberty & Equality","Democracy & Governance","Development vs Environment","Science, Technology & Society"] },
        { name: "Essay Themes — Part B (Socio-Economic)", subs: ["Poverty, Inequality & Inclusive Growth","Women Empowerment & Gender","Education & Skill Development","Agriculture & Rural Development","Urbanisation & Infrastructure","India's Foreign Policy & Global Role"] },
      ],
    },
  ],
  optional: [
    {
      name: "Agriculture",
      short: "Agriculture",
      icon: "🌾",
      color: "#16a34a",
      bg: "rgba(22,163,74,.09)",
      topics: [
        { name: "Agronomy & Soil Science", subs: ["Soil Formation, Composition & Classification","Soil Fertility, pH & Nutrient Management","Tillage Practices","Crop Rotation & Fallowing","Irrigation Methods — Drip, Sprinkler","Weed Management"] },
        { name: "Horticulture & Crop Production", subs: ["Kharif & Rabi Crop Production","Horticultural Crops — Fruits, Vegetables","Floriculture & Medicinal Plants","Post-Harvest Management","Seed Technology"] },
        { name: "Plant Pathology & Entomology", subs: ["Fungal, Bacterial & Viral Diseases","Pest Management — IPM","Pesticides — Types & Safety","Biocontrol Agents","Plant Quarantine"] },
        { name: "Agriculture Economics & Extension", subs: ["Farm Management & Cost Analysis","Agricultural Marketing — APMC","Rural Credit & Finance","Agricultural Extension — Methods","Government Schemes & Policies","WTO & Agriculture"] },
      ],
    },
    {
      name: "Animal Husbandry and Veterinary Science",
      short: "Animal Husb.",
      icon: "🐄",
      color: "#92400e",
      bg: "rgba(146,64,14,.09)",
      topics: [
        { name: "Animal Nutrition & Physiology", subs: ["Digestive System of Ruminants","Nutritional Requirements of Livestock","Feed Formulation & Supplementation","Metabolic Disorders","Reproductive Physiology"] },
        { name: "Livestock Production", subs: ["Cattle Breeds — Indigenous & Exotic","Buffalo, Goat & Sheep Management","Poultry Production Systems","Dairy Technology & Milk Processing","Fodder Crops & Pasture Management"] },
        { name: "Veterinary Science", subs: ["Common Livestock Diseases","Vaccines & Vaccination Programmes","Veterinary Pharmacology","Zoonotic Diseases","Meat & Food Inspection"] },
        { name: "Animal Biotechnology & Policy", subs: ["Artificial Insemination","Embryo Transfer Technology","Animal Cloning & GM Animals","National Livestock Mission","Livestock Insurance Schemes"] },
      ],
    },
    {
      name: "Anthropology",
      short: "Anthropology",
      icon: "🧬",
      color: "#0891b2",
      bg: "rgba(8,145,178,.09)",
      topics: [
        { name: "Physical Anthropology", subs: ["Human Evolution — Fossil Record","Primatology","Human Genetics & Variation","Racial Classification — Critiques","Forensic Anthropology","Growth & Development"] },
        { name: "Social & Cultural Anthropology", subs: ["Kinship, Marriage & Family","Political & Economic Anthropology","Religion & Magic","Language & Communication","Cultural Change & Acculturation","Theories — Evolutionism, Functionalism, Structuralism"] },
        { name: "Archaeological Anthropology", subs: ["Prehistoric Cultures — Palaeolithic to Iron Age","Field Methods — Excavation","Dating Techniques","Indian Prehistoric Cultures"] },
        { name: "Applied Anthropology & Indian Tribes", subs: ["Scheduled Tribes — Constitutional Provisions","Tribal Problems — Land, Forest, Debt","Tribal Development Policies","Assimilation vs Isolation Debate","Tribal Movements in India"] },
      ],
    },
    {
      name: "Botany",
      short: "Botany",
      icon: "🌿",
      color: "#16a34a",
      bg: "rgba(22,163,74,.10)",
      topics: [
        { name: "Plant Taxonomy & Morphology", subs: ["Taxonomy — Systems of Classification","Plant Kingdom Survey","Morphology of Angiosperms","Anatomy of Dicots & Monocots","Embryology"] },
        { name: "Plant Physiology", subs: ["Photosynthesis — Light & Dark Reactions","Respiration — Aerobic & Anaerobic","Transpiration & Water Relations","Mineral Nutrition","Plant Growth Regulators"] },
        { name: "Genetics & Plant Breeding", subs: ["Mendel's Laws","Chromosome Theory","Mutations — Types & Significance","Plant Breeding Methods","Polyploidy & Heterosis"] },
        { name: "Ecology & Economic Botany", subs: ["Plant Communities & Succession","Forest Types of India","Economic Plants — Fibre, Timber, Spices","Medicinal Plants","Biofuels"] },
      ],
    },
    {
      name: "Chemistry",
      short: "Chemistry",
      icon: "🧪",
      color: "#7c3aed",
      bg: "rgba(124,58,237,.09)",
      topics: [
        { name: "Inorganic Chemistry", subs: ["Atomic Structure & Periodic Properties","Chemical Bonding — VBT, MOT","Transition Metals & Coordination Compounds","Main Group Elements","Nuclear Chemistry"] },
        { name: "Organic Chemistry", subs: ["Stereochemistry — Optical & Geometric","Reaction Mechanisms — SN, Elimination, Addition","Functional Group Chemistry","Spectroscopy — IR, NMR, Mass","Natural Products — Alkaloids, Terpenes"] },
        { name: "Physical Chemistry", subs: ["Thermodynamics — Laws & Applications","Chemical Kinetics","Electrochemistry","Surface Chemistry — Adsorption & Catalysis","Quantum Chemistry"] },
        { name: "Industrial Chemistry & Applications", subs: ["Industrial Processes — Haber, Contact","Polymer Chemistry","Environmental Chemistry","Pharmaceutical Chemistry","Green Chemistry"] },
      ],
    },
    {
      name: "Civil Engineering",
      short: "Civil Eng.",
      icon: "🏗️",
      color: "#ea580c",
      bg: "rgba(234,88,12,.09)",
      topics: [
        { name: "Structural Engineering", subs: ["Mechanics of Solids","Steel Structures Design","RCC Design","Structural Analysis — Methods","Bridges — Types & Design","Foundations — Types"] },
        { name: "Geotechnical Engineering", subs: ["Soil Classification & Properties","Permeability & Seepage","Shear Strength — Mohr-Coulomb","Foundation Engineering","Retaining Walls & Slopes"] },
        { name: "Fluid Mechanics & Hydraulics", subs: ["Fluid Properties & Statics","Flow Through Pipes — Bernoulli","Open Channel Flow","Hydraulic Machines","Dams & Spillways"] },
        { name: "Transportation & Environmental Engg.", subs: ["Highway Engineering — Design","Railway Engineering","Traffic Engineering","Water Supply & Treatment","Sewage Treatment — STP Design","Solid Waste Management"] },
      ],
    },
    {
      name: "Commerce and Accountancy",
      short: "Commerce",
      icon: "💼",
      color: "#059669",
      bg: "rgba(5,150,105,.09)",
      topics: [
        { name: "Accounting & Financial Reporting", subs: ["Financial Accounting Standards — GAAP & IFRS","Preparation of Final Accounts","Partnership & Company Accounts","Inventory Valuation Methods","Depreciation — Methods","Auditing Concepts & Standards"] },
        { name: "Management Accounting & Costing", subs: ["Cost Concepts & Classification","Marginal Costing & CVP Analysis","Budgetary Control","Standard Costing & Variance Analysis","Activity-Based Costing"] },
        { name: "Business Finance", subs: ["Capital Structure Theories","Dividend Policy","Working Capital Management","Capital Budgeting — NPV, IRR","Financial Risk Management"] },
        { name: "Business Management & Law", subs: ["Management Functions & Principles","Organisational Theory & Behaviour","Companies Act 2013 — Key Provisions","Consumer Protection Law","Competition Law","Insolvency & Bankruptcy Code"] },
      ],
    },
    {
      name: "Economics",
      short: "Economics",
      icon: "📊",
      color: "#2563eb",
      bg: "rgba(37,99,235,.09)",
      topics: [
        { name: "Microeconomics", subs: ["Demand & Supply Theory","Consumer Behaviour — Utility & Indifference","Production Theory","Cost & Revenue Analysis","Market Structures — PC, Monopoly, Oligopoly","Factor Markets","General Equilibrium & Welfare"] },
        { name: "Macroeconomics", subs: ["National Income Concepts & Methods","Consumption & Investment Functions","IS-LM Model","Money Supply & Demand","Inflation — Theories & Remedies","Unemployment — Types & Theories","Business Cycles"] },
        { name: "Indian Economy", subs: ["Economic Planning — History & Evaluation","Agricultural Sector Issues","Industrial Policy Evolution","Poverty & Inequality Measurement","External Sector — BOP, Exchange Rate","Recent Reforms — GST, IBC, Demonetisation"] },
        { name: "International Economics & Statistics", subs: ["Comparative Advantage Theory","Terms of Trade","Balance of Payments","IMF & World Bank Roles","Correlation & Regression Analysis","Index Numbers & Time Series"] },
      ],
    },
    {
      name: "Electrical Engineering",
      short: "Electrical Eng.",
      icon: "⚡",
      color: "#f59e0b",
      bg: "rgba(245,158,11,.09)",
      topics: [
        { name: "Circuit Theory & Electromagnetics", subs: ["Circuit Analysis — KVL, KCL, Superposition","Transient Analysis — RC, RL, RLC","AC Analysis — Phasors, Resonance","Maxwell's Equations","Electromagnetic Waves"] },
        { name: "Electrical Machines", subs: ["DC Machines — Motor & Generator","Transformers — Types & Equivalent Circuit","Induction Motor — Characteristics","Synchronous Machines","Special Machines — Stepper, BLDC"] },
        { name: "Power Systems", subs: ["Power Transmission Lines","Load Flow Analysis","Fault Analysis","Protection — Relays & Circuit Breakers","Power Quality & Harmonics","Renewable Energy Integration"] },
        { name: "Electronics & Control", subs: ["Semiconductor Devices — Diode, BJT, MOSFET","Operational Amplifiers","Digital Electronics — Logic Gates, Flip-Flops","Microprocessors & Microcontrollers","Control Systems — Transfer Functions, Bode Plot"] },
      ],
    },
    {
      name: "Geography",
      short: "Geography (Opt.)",
      icon: "🌍",
      color: "#2e7dd4",
      bg: "rgba(46,125,212,.10)",
      topics: [
        { name: "Physical Geography (Opt.)", subs: ["Geomorphology — Theories & Landforms","Climatology — Koppen & Thornthwaite","Oceanography — Currents & Marine Resources","Biogeography — Biomes & Biodiversity"] },
        { name: "Human & Economic Geography (Opt.)", subs: ["Population Theories — Malthus, DTM","Models — Christaller, Von Thunen","Urbanisation — Models & Issues","Industrial Location Theory","Regional Development — Core-Periphery"] },
        { name: "India — Regional Geography", subs: ["Physiographic Regions & Economy","North-East India — Issues","Drought Prone & Flood Prone Regions","Coastal Regions & Islands","River Basins — Development Issues"] },
        { name: "Geography of World Affairs", subs: ["Geopolitics — Heartland, Rimland","Ocean Politics & Maritime Boundaries","Resource Wars & Environmental Geopolitics","Globalisation & Spatial Inequalities"] },
      ],
    },
    {
      name: "Geology",
      short: "Geology",
      icon: "🪨",
      color: "#78716c",
      bg: "rgba(120,113,108,.09)",
      topics: [
        { name: "Physical Geology", subs: ["Plate Tectonics Theory","Igneous, Sedimentary & Metamorphic Rocks","Geological Structures — Folds & Faults","Geomorphic Processes","Geomorphology of India"] },
        { name: "Mineralogy & Petrology", subs: ["Mineral Classification & Properties","Crystal Structure & Symmetry","Silicate Minerals","Igneous Petrology","Sedimentary & Metamorphic Petrology"] },
        { name: "Stratigraphy & Palaeontology", subs: ["Stratigraphic Principles","Geological Time Scale","Indian Stratigraphy","Fossil Types & Preservation","Evolution of Life on Earth"] },
        { name: "Economic Geology & Remote Sensing", subs: ["Ore Deposits — Types & Genesis","India's Mineral Resources","Petroleum Geology","Groundwater Geology","Remote Sensing & GIS in Geology"] },
      ],
    },
    {
      name: "History",
      short: "History (Opt.)",
      icon: "📜",
      color: "#e07b39",
      bg: "rgba(224,123,57,.11)",
      topics: [
        { name: "Ancient India (Opt.)", subs: ["Sources — Literary, Archaeological","Prehistoric Cultures","Vedic Civilisation","Mauryan & Post-Mauryan Period","Gupta Empire & Harsha","South Indian Kingdoms","Religion — Buddhism & Jainism"] },
        { name: "Medieval India (Opt.)", subs: ["Delhi Sultanate — Administration","Vijayanagara Empire","Mughal Administration & Culture","Bhakti & Sufi Literature","Decline of Mughal Empire","Rise of Marathas & Sikh Empire"] },
        { name: "Modern India (Opt.)", subs: ["British Conquest & Administration","Socio-Religious Reforms — 19th Century","Nationalist Movement — Phases","Constitutional Development","Economic Policies & Famines","Transfer of Power & Partition"] },
        { name: "World History (Opt.)", subs: ["Renaissance & Reformation","Industrial Revolution — Britain","American & French Revolutions","Imperialism & Colonialism","World Wars — Causes & Consequences","Post-War World Order","End of Cold War"] },
      ],
    },
    {
      name: "Law",
      short: "Law",
      icon: "⚖️",
      color: "#6366f1",
      bg: "rgba(99,102,241,.09)",
      topics: [
        { name: "Constitutional Law", subs: ["Nature of Constitution","Fundamental Rights — Scope & Limitations","DPSP — Significance & Enforceability","Constitutional Amendments — Procedure","Emergency Provisions — Judicial Review","Federalism — Centre-State Relations"] },
        { name: "Jurisprudence", subs: ["Nature & Sources of Law","Schools of Jurisprudence — Natural, Positivist","Theories of Rights","Concept of Justice — Distributive, Corrective","International Law — Sources & Principles"] },
        { name: "Law of Contracts & Torts", subs: ["Essentials of Valid Contract","Quasi-Contracts","Tort Liability — Negligence, Defamation","Consumer Protection Law"] },
        { name: "Criminal & Administrative Law", subs: ["IPC — Offences & Defences","CrPC — Criminal Procedure","Evidence Act — Key Provisions","Administrative Law — Tribunals","RTI & Whistleblower Protection"] },
      ],
    },
    {
      name: "Management",
      short: "Management",
      icon: "📋",
      color: "#0891b2",
      bg: "rgba(8,145,178,.09)",
      topics: [
        { name: "Principles of Management", subs: ["Management Functions — Planning, Organising, Staffing, Directing, Controlling","Schools of Management Thought","Decision Making — Types & Models","Management Information Systems","Corporate Governance"] },
        { name: "Organisational Behaviour", subs: ["Individual Behaviour — Perception, Motivation","Group Dynamics & Team Building","Leadership Theories","Organisational Culture & Climate","Conflict Resolution & Negotiation"] },
        { name: "Strategic Management", subs: ["SWOT & PESTLE Analysis","Competitive Strategy — Porter's Five Forces","Corporate Strategy — Diversification, M&A","Business Process Reengineering","Balanced Scorecard"] },
        { name: "HR, Finance & Marketing", subs: ["Recruitment, Training & Performance Management","Financial Management — Capital Structure","Working Capital & Budgetary Control","Marketing Mix — 4Ps & 7Ps","Market Research & Consumer Behaviour"] },
      ],
    },
    {
      name: "Mathematics",
      short: "Mathematics",
      icon: "📐",
      color: "#7c3aed",
      bg: "rgba(124,58,237,.09)",
      topics: [
        { name: "Linear Algebra & Calculus", subs: ["Matrices & Determinants","Vector Spaces & Linear Transformations","Differential Calculus — Taylor Series","Integral Calculus — Double & Triple Integrals","Differential Equations — ODE & PDE"] },
        { name: "Abstract Algebra & Real Analysis", subs: ["Groups, Rings & Fields","Galois Theory","Real Analysis — Continuity & Differentiability","Riemann Integration","Metric Spaces"] },
        { name: "Complex Analysis & Numerical Methods", subs: ["Complex Functions & Analyticity","Cauchy's Theorem & Residues","Conformal Mapping","Numerical Differentiation & Integration","Numerical Solutions of ODE"] },
        { name: "Statistics & Mechanics", subs: ["Probability Theory","Distributions — Binomial, Normal, Poisson","Statistical Inference — Tests","Classical Mechanics — Lagrangian","Continuum Mechanics"] },
      ],
    },
    {
      name: "Mechanical Engineering",
      short: "Mech. Eng.",
      icon: "⚙️",
      color: "#ea580c",
      bg: "rgba(234,88,12,.09)",
      topics: [
        { name: "Thermodynamics & Heat Transfer", subs: ["Laws of Thermodynamics","Rankine, Brayton & Otto Cycles","Steam Tables & Steam Turbines","Heat Transfer — Conduction, Convection, Radiation","Refrigeration & Air Conditioning"] },
        { name: "Fluid Mechanics & Machines", subs: ["Fluid Statics & Kinematics","Bernoulli's Equation","Viscous Flow — Laminar & Turbulent","Pumps & Turbines","Compressible Flow"] },
        { name: "Strength of Materials & Machine Design", subs: ["Stress & Strain — Theories","Bending & Shear Stress","Deflection of Beams","Fatigue & Fracture Mechanics","Design of Shafts, Keys, Couplings","Gears & Gear Trains"] },
        { name: "Manufacturing & Industrial Engineering", subs: ["Metal Cutting & Machining","Casting, Welding & Forming","CNC & Automation","Operations Research — LPP, PERT/CPM","Quality Control — SPC & Six Sigma"] },
      ],
    },
    {
      name: "Medical Science",
      short: "Medical Sci.",
      icon: "🏥",
      color: "#dc2626",
      bg: "rgba(220,38,38,.09)",
      topics: [
        { name: "Anatomy & Physiology", subs: ["Musculoskeletal System","Cardiovascular System","Respiratory System","Nervous System","Endocrine System","Reproductive System"] },
        { name: "Pathology & Microbiology", subs: ["Infectious Diseases — Bacterial, Viral","Neoplasms — Types & Classification","Immunopathology","Blood Disorders","Organ Pathology"] },
        { name: "Medicine & Surgery", subs: ["Common Medical Conditions — Diabetes, HTN, CVD","Respiratory Diseases","GI Disorders","Surgical Procedures","Emergency Medicine — Trauma, Burns","Orthopaedics"] },
        { name: "Community Medicine & Public Health", subs: ["Epidemiology — Study Designs","National Health Programmes","Maternal & Child Health","Nutrition Disorders","Environmental Health","Health Management Information Systems"] },
      ],
    },
    {
      name: "Philosophy",
      short: "Philosophy",
      icon: "🤔",
      color: "#6366f1",
      bg: "rgba(99,102,241,.09)",
      topics: [
        { name: "Western Philosophy", subs: ["Plato — Theory of Forms","Aristotle — Logic & Ethics","Descartes — Rationalism","Locke, Berkeley & Hume — Empiricism","Kant — Critique of Pure Reason","Hegel & Marx — Dialectics","Utilitarianism — Bentham & Mill","Existentialism"] },
        { name: "Indian Philosophy", subs: ["Vedic & Upanishadic Philosophy","Samkhya & Yoga","Nyaya & Vaisheshika","Mimamsa & Vedanta — Advaita, Dvaita","Jainism & Buddhism — Epistemology","Carvaka — Materialism"] },
        { name: "Logic & Epistemology", subs: ["Classical Logic — Deduction & Induction","Symbolic Logic","Theory of Knowledge","Sources of Knowledge","Truth Theories","Contemporary Epistemology"] },
        { name: "Ethics & Social Philosophy", subs: ["Normative Ethics — Deontology, Consequentialism, Virtue","Metaethics","Social Contract Theories","Justice Theories — Rawls, Nozick","Feminism & Environmental Ethics"] },
      ],
    },
    {
      name: "Physics",
      short: "Physics",
      icon: "⚛️",
      color: "#2563eb",
      bg: "rgba(37,99,235,.09)",
      topics: [
        { name: "Classical Mechanics & Waves", subs: ["Newton's Laws & Dynamics","Lagrangian & Hamiltonian Mechanics","Oscillations — SHM & Damped","Wave Motion & Superposition","Fluid Mechanics"] },
        { name: "Electrodynamics & Optics", subs: ["Maxwell's Equations","Electromagnetic Waves","Geometrical Optics","Physical Optics — Interference, Diffraction","Lasers & Fibre Optics"] },
        { name: "Quantum Mechanics & Thermodynamics", subs: ["Planck's Quantum Hypothesis","Schrödinger's Wave Equation","Heisenberg's Uncertainty Principle","Statistical Mechanics","Laws of Thermodynamics"] },
        { name: "Modern Physics & Electronics", subs: ["Special Theory of Relativity","Nuclear Physics — Structure & Reactions","Elementary Particles","Semiconductor Devices","Digital Electronics"] },
      ],
    },
    {
      name: "Political Science and International Relations",
      short: "Pol Sci & IR",
      icon: "🏛️",
      color: "#0891b2",
      bg: "rgba(8,145,178,.09)",
      topics: [
        { name: "Political Theory", subs: ["Nature & Scope of Political Science","Classical Thinkers — Plato, Aristotle, Machiavelli","Liberal Thinkers — Hobbes, Locke, Rousseau","Marxism & Socialism","Modern Concepts — Pluralism, Feminism, Environmentalism"] },
        { name: "Indian Government & Politics", subs: ["Indian Constitution — Salient Features","Party System & Elections","Coalition Politics","Social Movements — Dalit, Women","Centre-State Relations — Issues","Panchayati Raj in Practice"] },
        { name: "Comparative Politics", subs: ["Comparative Methods","Political Systems — Presidential vs Parliamentary","Federalism — Comparative","Political Parties — Functions & Types","Democratic Transitions"] },
        { name: "International Relations (Opt.)", subs: ["Theories of IR — Realism, Liberalism, Constructivism","Cold War & Post-Cold War Order","India's Foreign Policy — Principles","Nuclear Strategy & Arms Control","Multilateralism & International Institutions","Global Issues — Climate, Terrorism, Migration"] },
      ],
    },
    {
      name: "Psychology",
      short: "Psychology",
      icon: "🧠",
      color: "#9333ea",
      bg: "rgba(147,51,234,.09)",
      topics: [
        { name: "Foundations of Psychology", subs: ["History & Schools — Structuralism, Behaviourism, Gestalt, Cognitive","Research Methods","Biological Basis of Behaviour — Brain & Hormones","Sensation & Perception","States of Consciousness"] },
        { name: "Cognitive & Developmental Psychology", subs: ["Memory — Encoding, Storage, Retrieval","Learning — Classical & Operant Conditioning","Intelligence — Theories & Measurement","Lifespan Development — Piaget, Vygotsky","Language & Thought"] },
        { name: "Social & Personality Psychology", subs: ["Social Cognition — Attitudes & Persuasion","Group Dynamics & Social Influence","Aggression & Prosocial Behaviour","Personality Theories — Trait, Psychoanalytic","Personality Assessment"] },
        { name: "Applied Psychology", subs: ["Psychological Disorders — DSM Classification","Psychotherapy — CBT, Psychoanalysis, Humanistic","Community & Health Psychology","Industrial & Organisational Psychology","Counselling & Positive Psychology"] },
      ],
    },
    {
      name: "Public Administration",
      short: "Pub. Admin",
      icon: "🏛️",
      color: "#059669",
      bg: "rgba(5,150,105,.09)",
      topics: [
        { name: "Theory of Administration", subs: ["Development & Scope of PA","Scientific Management — Taylor","Classical Theories — Fayol, Weber Bureaucracy","Human Relations — Elton Mayo","Behaviouralism — Simon & Bounded Rationality","Systems & Contingency Approaches"] },
        { name: "Organisational Structure", subs: ["Line, Line & Staff, Functional Organisations","Committees in Administration","Delegation & Decentralisation","Span of Control","Coordination Mechanisms","New Public Management"] },
        { name: "Personnel & Financial Administration", subs: ["Recruitment — UPSC & State PSC","Training — In-service, Induction","Performance Appraisal","Budget — Types & Process","Audit — Internal & External","Financial Control & Accountability"] },
        { name: "Indian Administration", subs: ["Constitutional Framework","Union Government — Cabinet Secretariat","Field Administration — District Collectorate","State Administration — Secretariat","Local Government Administration","Administrative Reforms in India"] },
      ],
    },
    {
      name: "Sociology",
      short: "Sociology",
      icon: "👥",
      color: "#e07b39",
      bg: "rgba(224,123,57,.11)",
      topics: [
        { name: "Sociological Theory", subs: ["Classical Sociology — Comte, Spencer","Marx — Historical Materialism & Alienation","Durkheim — Division of Labour & Suicide","Weber — Bureaucracy & Protestant Ethic","Parsons — Structural Functionalism","Contemporary — Giddens, Foucault, Bourdieu"] },
        { name: "Social Structure & Stratification", subs: ["Social Groups — Primary, Secondary, Reference","Social Stratification — Caste, Class, Gender","Social Mobility — Types & Measurement","Poverty & Deprivation","Ethnic & Minority Groups"] },
        { name: "Indian Society", subs: ["Jajmani System & Village Community","Caste System — Srinivas & Ghurye","Tribal Communities — Problems & Policy","Religion in India — Secularism Debate","Agrarian Social Structure","Urbanisation & Migration in India"] },
        { name: "Social Change & Issues", subs: ["Theories of Social Change","Modernisation vs Westernisation","Globalisation Impact on Indian Society","Social Movements — Feminist, Environmental","Dalit Movements & Ambedkar","Communalism & Secularism in India"] },
      ],
    },
    {
      name: "Statistics",
      short: "Statistics",
      icon: "📈",
      color: "#2563eb",
      bg: "rgba(37,99,235,.09)",
      topics: [
        { name: "Probability & Distributions", subs: ["Sample Space, Events & Axioms","Conditional Probability & Bayes' Theorem","Random Variables — Discrete & Continuous","Standard Distributions — Binomial, Poisson, Normal","Bivariate Distributions & Correlation"] },
        { name: "Statistical Inference", subs: ["Estimation — Point & Interval","Properties of Estimators","Testing of Hypotheses — Parametric","Non-parametric Tests","Bayesian Inference"] },
        { name: "Survey & Design of Experiments", subs: ["Sampling Methods — SRS, Stratified, Cluster","Survey Errors","Analysis of Variance — One & Two Way","Factorial Designs","Response Surface Methodology"] },
        { name: "Applied Statistics", subs: ["Regression Analysis — OLS","Time Series Analysis","Index Numbers","Vital Statistics","Statistical Quality Control — Control Charts","Operations Research — LPP, Game Theory"] },
      ],
    },
    {
      name: "Zoology",
      short: "Zoology",
      icon: "🦁",
      color: "#92400e",
      bg: "rgba(146,64,14,.09)",
      topics: [
        { name: "Animal Diversity", subs: ["Classification of Animal Kingdom","Non-Chordata — Porifera to Echinodermata","Chordata — Pisces to Mammalia","Economic Importance of Animals","Endangered Species & Conservation"] },
        { name: "Cell Biology & Genetics", subs: ["Cell Structure — Prokaryotes & Eukaryotes","Cell Division — Mitosis & Meiosis","Genetics — Mendel to Molecular","Mutations & DNA Repair","Developmental Biology"] },
        { name: "Animal Physiology", subs: ["Digestive System — Comparative","Circulatory System","Respiratory System","Nervous System & Endocrinology","Excretory System","Reproductive Physiology"] },
        { name: "Evolution & Ecology", subs: ["Theories of Evolution — Lamarck, Darwin, Synthetic Theory","Speciation & Adaptive Radiation","Biogeography","Population Ecology","Community Ecology","Applied Zoology — Sericulture, Apiculture, Fisheries"] },
      ],
    },
    {
      name: "Literature",
      short: "Literature",
      icon: "📚",
      color: "#7c3aed",
      bg: "rgba(124,58,237,.09)",
      topics: [
        { name: "Indian Language Literatures", subs: ["Ancient Sanskrit Literature — Vedic, Epic, Classical","Pali & Prakrit Literature","Tamil Sangam Literature","Medieval Bhakti & Sufi Poetry","Regional Language Literatures — Hindi, Bengali, Marathi, Telugu, Malayalam etc."] },
        { name: "English Literature", subs: ["Old & Middle English — Chaucer, Beowulf","Renaissance & Elizabethan Literature — Shakespeare","17th Century — Milton, Metaphysical Poets","18th Century — Neo-classicism, Satire","19th Century — Romantic & Victorian","20th Century — Modernism, Post-modernism"] },
        { name: "Literary Theory & Criticism", subs: ["Classical Criticism — Plato, Aristotle","New Criticism & Structuralism","Deconstruction & Post-Structuralism","Post-colonial Theory & Criticism","Feminist Literary Criticism","Indian Poetics — Rasa Theory, Dhvani"] },
        { name: "Prose, Drama & Comparative Literature", subs: ["Novel & Short Story Development","Drama — Western & Indian Traditions","Comparative Literature — Methodology","Translation Studies","World Literature Movements — Magic Realism, Existentialism"] },
      ],
    },
  ],
};

async function seedSyllabus() {
  console.log("Seeding syllabus data...");
  const seedData = {
    ...SYLLABUS_DATA,
    prelims: loadPrelimsFromCsvJson(),
  };

  for (const [stage, subjects] of Object.entries(seedData)) {
    for (let si = 0; si < subjects.length; si++) {
      const subj = subjects[si];
      const dbSubject = await prisma.syllabusSubject.upsert({
        where: { stage_name: { stage, name: subj.name } },
        update: {
          short: subj.short,
          icon: subj.icon,
          color: subj.color,
          bg: subj.bg,
          sortOrder: si,
        },
        create: {
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
        const dbTopic = await prisma.syllabusTopic.upsert({
          where: { subjectId_name: { subjectId: dbSubject.id, name: topic.name } },
          update: {
            sortOrder: ti,
          },
          create: {
            subjectId: dbSubject.id,
            name: topic.name,
            sortOrder: ti,
          },
        });

        for (let sti = 0; sti < topic.subs.length; sti++) {
          const name = topic.subs[sti];
          await prisma.syllabusSubTopic.upsert({
            where: { topicId_name: { topicId: dbTopic.id, name } },
            update: { sortOrder: sti },
            create: { topicId: dbTopic.id, name, sortOrder: sti },
          });
        }
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
