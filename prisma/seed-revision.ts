/**
 * Seed script for Flashcards, Spaced Repetition demo data, and Mindmaps.
 * Run with: npx tsx prisma/seed-revision.ts
 */

import "dotenv/config";
import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────────────────
// FLASHCARD DATA
// ─────────────────────────────────────────────────────────────────────────────

const DECK_DEFS = [
  { subjectId: "polity",          subject: "Indian Polity",    icon: "🏛️" },
  { subjectId: "history",         subject: "Modern History",   icon: "📜" },
  { subjectId: "geography",       subject: "Geography",        icon: "🌍" },
  { subjectId: "economy",         subject: "Indian Economy",   icon: "💰" },
  { subjectId: "science",         subject: "Science & Tech",   icon: "🔬" },
  { subjectId: "environment",     subject: "Environment",      icon: "🌿" },
  { subjectId: "ethics",          subject: "GS IV — Ethics",   icon: "⚖️" },
  { subjectId: "current-affairs", subject: "Current Affairs",  icon: "📰" },
];

type CardDef = { topicId: string; topic: string; question: string; answer: string; difficulty: "Easy" | "Medium" | "Hard" };

const FLASHCARDS: Record<string, CardDef[]> = {
  polity: [
    // Constitutional Amendments
    { topicId: "amendments", topic: "Constitutional Amendments", difficulty: "Hard",
      question: "What is the significance of the 42nd Amendment Act (1976)?",
      answer: "Called 'Mini Constitution'. Added Fundamental Duties (Part IV-A), added Secular, Socialist, Integrity to Preamble. Curtailed judicial review. Many provisions later reversed by 44th Amendment." },
    { topicId: "amendments", topic: "Constitutional Amendments", difficulty: "Medium",
      question: "What does the 44th Amendment Act restore?",
      answer: "Restored democratic provisions curtailed during Emergency: limited President's power to declare Emergency, restored right to property as legal right, and strengthened fundamental rights." },
    { topicId: "amendments", topic: "Constitutional Amendments", difficulty: "Easy",
      question: "What does the 73rd Amendment relate to?",
      answer: "Gave constitutional status to Panchayati Raj institutions. Mandated a three-tier structure at village (Gram Panchayat), block (Panchayat Samiti) and district (Zila Parishad) levels." },
    { topicId: "amendments", topic: "Constitutional Amendments", difficulty: "Easy",
      question: "What are the three lists in the Seventh Schedule?",
      answer: "Union List (97 subjects — exclusive Parliament jurisdiction), State List (66 subjects — exclusive State jurisdiction), Concurrent List (47 subjects — both can legislate; Centre prevails on conflict)." },
    { topicId: "amendments", topic: "Constitutional Amendments", difficulty: "Medium",
      question: "What did the 61st Amendment Act (1988) do?",
      answer: "Reduced the voting age from 21 years to 18 years for elections to Lok Sabha and State Legislative Assemblies." },
    // Fundamental Rights
    { topicId: "fr-dpsp", topic: "Fundamental Rights & DPSPs", difficulty: "Hard",
      question: "Under which Article can the President suspend Fundamental Rights during National Emergency?",
      answer: "Article 359 allows suspension of right to move courts for enforcement of Fundamental Rights (except Articles 20 and 21) during National Emergency. Article 20 (protection against conviction) and 21 (right to life) can never be suspended." },
    { topicId: "fr-dpsp", topic: "Fundamental Rights & DPSPs", difficulty: "Hard",
      question: "What is the doctrine of basic structure?",
      answer: "Established in Kesavananda Bharati v. State of Kerala (1973): Parliament cannot amend the Constitution to destroy its basic/essential features. Includes supremacy of Constitution, republican democracy, federalism, secularism, separation of powers, judicial review." },
    { topicId: "fr-dpsp", topic: "Fundamental Rights & DPSPs", difficulty: "Easy",
      question: "Which Part and Articles deal with Directive Principles of State Policy?",
      answer: "Part IV (Articles 36–51). Non-justiciable (not enforceable by courts) but fundamental in governance. Article 37 states they shall be applied in making laws. Inspired by Irish Constitution." },
    { topicId: "fr-dpsp", topic: "Fundamental Rights & DPSPs", difficulty: "Medium",
      question: "What is the difference between Article 32 and Article 226?",
      answer: "Article 32 (Supreme Court): Right to constitutional remedies for enforcement of FRs only — itself a Fundamental Right. Article 226 (High Courts): Broader power — can issue writs for FRs or any other legal right. HC can be approached even when SC is available." },
    // Parliament
    { topicId: "parliament", topic: "Parliament & State Legislature", difficulty: "Easy",
      question: "What is the maximum strength of Rajya Sabha?",
      answer: "250 members: 238 elected by State and UT Legislative Assemblies using Single Transferable Vote, 12 nominated by President for distinguished service in art, literature, science, social service." },
    { topicId: "parliament", topic: "Parliament & State Legislature", difficulty: "Medium",
      question: "What is a Money Bill under Article 110?",
      answer: "Contains only provisions dealing with taxation, borrowing by government, appropriation, custody of Consolidated Fund, etc. Introduced only in Lok Sabha. Rajya Sabha can only make recommendations (not binding). Speaker certifies it. President cannot withhold assent." },
    { topicId: "parliament", topic: "Parliament & State Legislature", difficulty: "Medium",
      question: "What is the quorum required for Lok Sabha?",
      answer: "One-tenth of total membership = 55 members (for 543-member Lok Sabha). Speaker can adjourn if quorum is not present." },
    // Judiciary
    { topicId: "judiciary", topic: "Judiciary & Supreme Court", difficulty: "Medium",
      question: "Name and explain all five writs under Article 32.",
      answer: "Habeas Corpus ('produce the body') — illegal detention; Mandamus ('we command') — compel public duty; Prohibition — stop inferior court exceeding jurisdiction; Certiorari — quash inferior court order; Quo Warranto — challenge authority to hold public office." },
    { topicId: "judiciary", topic: "Judiciary & Supreme Court", difficulty: "Medium",
      question: "Under what article does the Supreme Court have advisory jurisdiction?",
      answer: "Article 143 — President can refer a question of law or fact of public importance to SC for its opinion. SC may give or refuse to give its opinion. Opinion is not binding." },
    { topicId: "judiciary", topic: "Judiciary & Supreme Court", difficulty: "Hard",
      question: "What is the doctrine of 'Separation of Powers' in Indian context?",
      answer: "India does not have strict separation but functional overlap is limited. Legislature makes law, Executive implements, Judiciary interprets. However, judges are appointed by executive, Parliament can impeach judges, and President exercises quasi-judicial powers." },
    // Centre-State
    { topicId: "centre-state", topic: "Centre-State Relations", difficulty: "Medium",
      question: "What are emergency financial powers of the Centre over States under Article 360?",
      answer: "Financial Emergency: If President is satisfied that financial stability of India or any part is threatened. All money bills of States need Presidential assent. President can reduce salaries of all constitutional functionaries including SC judges." },
    { topicId: "centre-state", topic: "Centre-State Relations", difficulty: "Hard",
      question: "What is the Sarkaria Commission and its key recommendations?",
      answer: "Set up 1983, reported 1988. Recommended: Inter-State Council should be constituted; Article 356 should be used sparingly; Governors should be neutral; residuary powers should stay with Centre; three-language formula." },
  ],

  history: [
    { topicId: "revolt-1857", topic: "Revolt of 1857", difficulty: "Easy",
      question: "Where did the Revolt of 1857 begin and what was the immediate cause?",
      answer: "Began at Meerut on May 10, 1857. Immediate cause: introduction of Enfield rifles with cartridges greased with cow and pig fat — offensive to both Hindu and Muslim sepoys." },
    { topicId: "revolt-1857", topic: "Revolt of 1857", difficulty: "Medium",
      question: "Name four key centres and their leaders in the Revolt of 1857.",
      answer: "Delhi — Bahadur Shah Zafar (last Mughal); Lucknow — Begum Hazrat Mahal; Kanpur — Nana Saheb; Jhansi — Rani Lakshmibai; Bihar (Arrah) — Kunwar Singh." },
    { topicId: "revolt-1857", topic: "Revolt of 1857", difficulty: "Hard",
      question: "What were the long-term consequences of the Revolt of 1857?",
      answer: "East India Company dissolved (Government of India Act 1858). Queen Victoria's Proclamation assured non-interference in religion. Indian Civil Services opened to Indians. Introduction of policy of divide and rule. Reorganisation of army (more British officers)." },
    { topicId: "freedom-movement", topic: "Freedom Movement", difficulty: "Medium",
      question: "What was the significance of the 1905 Partition of Bengal?",
      answer: "Curzon partitioned Bengal into East Bengal & Assam (Hindu minority) and West Bengal (Hindu majority). Led to Swadeshi Movement, boycott of British goods, growth of extremist nationalism. Partition annulled in 1911." },
    { topicId: "freedom-movement", topic: "Freedom Movement", difficulty: "Medium",
      question: "What was the Morley-Minto Reform (1909) and its significance?",
      answer: "Indian Councils Act 1909. Enlarged legislative councils. Introduced separate electorates for Muslims — key step toward communal politics. First time an Indian (Satyendra Prasanna Sinha) joined Viceroy's Executive Council." },
    { topicId: "freedom-movement", topic: "Freedom Movement", difficulty: "Hard",
      question: "What was the significance of the Lucknow Pact (1916)?",
      answer: "Congress and Muslim League came together. Congress accepted separate electorates for Muslims. Demanded self-government and dominion status. Reunification of moderate and extremist factions in Congress. Tilak-Jinnah cooperation." },
    { topicId: "freedom-movement", topic: "Freedom Movement", difficulty: "Medium",
      question: "What was the Rowlatt Act (1919) and why was it opposed?",
      answer: "Also called Black Act. Allowed detention without trial for up to 2 years. No right to appeal. Led to massive protests. Gandhi called hartals. Led to Jallianwala Bagh massacre (April 13, 1919) — General Dyer ordered firing on peaceful crowd, ~400 killed." },
    { topicId: "gandhi-movements", topic: "Gandhian Movements", difficulty: "Easy",
      question: "What were the key features of the Non-Cooperation Movement (1920–22)?",
      answer: "Surrender of titles, boycott of civil services, courts, legislatures, foreign goods, educational institutions. Hartals. Ended after Chauri Chaura violence (Feb 1922) where mob burned police station, killing 22 policemen." },
    { topicId: "gandhi-movements", topic: "Gandhian Movements", difficulty: "Medium",
      question: "What was the significance of the Civil Disobedience Movement (1930)?",
      answer: "Began with Dandi March (March 12–April 6, 1930) — Gandhi walked 241 miles to make salt, defying Salt Law. Led to mass civil disobedience. Resulted in Gandhi-Irwin Pact (1931). India represented itself at Round Table Conferences." },
    { topicId: "gandhi-movements", topic: "Gandhian Movements", difficulty: "Hard",
      question: "What was the Quit India Movement (1942) and why did it fail?",
      answer: "Launched August 8, 1942 after Cripps Mission failure. 'Do or Die' slogan. All Congress leaders immediately arrested. Leaderless movement — turned violent in many places. Crushed by British within 6 weeks. However, it made clear British could not hold India after the war." },
    { topicId: "socio-religious", topic: "Socio-Religious Reforms", difficulty: "Easy",
      question: "Name three key reforms by Raja Ram Mohan Roy and Brahmo Samaj.",
      answer: "Abolition of Sati (1829, supported William Bentinck's Regulation XVII). Widow remarriage. English education. Opposed child marriage. Founded Brahmo Samaj (1828). Published Sambad Kaumudi (newspaper)." },
    { topicId: "socio-religious", topic: "Socio-Religious Reforms", difficulty: "Medium",
      question: "What was the contribution of Arya Samaj to Indian society?",
      answer: "Founded by Dayananda Saraswati (1875). Slogan 'Back to Vedas'. Opposed idol worship, caste rigidity, child marriage. Started Shuddhi movement (reconversion). Established DAV schools. Promoted Hindi and Indian languages. Strong in Punjab." },
  ],

  geography: [
    { topicId: "rivers", topic: "Indian Rivers", difficulty: "Easy",
      question: "Differentiate between Himalayan and Peninsular rivers.",
      answer: "Himalayan: perennial (fed by snow/rainfall), long, large basins, meander, navigable. Examples: Ganga, Indus, Brahmaputra. Peninsular: seasonal (rain-fed), shorter, hard rock beds, flow in valleys, not navigable. Examples: Godavari, Krishna, Cauvery." },
    { topicId: "rivers", topic: "Indian Rivers", difficulty: "Medium",
      question: "Explain the eastward shift of the Kosi river and its consequences.",
      answer: "Kosi has shifted ~120 km westward over last 250 years (not eastward). Deposits huge sediment loads on plains, changes course frequently. Called 'Sorrow of Bihar' — causes devastating floods every year." },
    { topicId: "rivers", topic: "Indian Rivers", difficulty: "Medium",
      question: "What is the Brahmaputra known as in China and Bangladesh?",
      answer: "China: Yarlung Tsangpo (originates from Angsi Glacier in Tibet at ~5,300m). Bangladesh: Jamuna (after merging with Tista). Joins Ganga at Goalundo Ghat forming Padma. World's largest river by volume in Bangladesh." },
    { topicId: "climate", topic: "Climate of India", difficulty: "Easy",
      question: "What are the four seasons of India according to IMD?",
      answer: "Cold weather season (Dec–Feb), Hot weather season (Mar–May), Southwest Monsoon season (Jun–Sep), Retreating Monsoon / Northeast Monsoon season (Oct–Nov)." },
    { topicId: "climate", topic: "Climate of India", difficulty: "Medium",
      question: "Explain the mechanism of the Southwest Monsoon.",
      answer: "Differential heating of land and sea. Low pressure over Thar Desert/Rajasthan draws moisture-laden winds from Indian Ocean. ITCZ shifts northward. Two branches: Arabian Sea branch (stronger, hits Western Ghats first) and Bay of Bengal branch (hits northeast India)." },
    { topicId: "climate", topic: "Climate of India", difficulty: "Hard",
      question: "How does El Niño affect Indian monsoon?",
      answer: "El Niño (warming of Pacific Ocean) weakens Indian Ocean temperature gradient, reducing moisture transport to India. Associated with below-normal monsoon and droughts in India. La Niña (cooling) associated with above-normal monsoon. Not a perfect correlation — ENSO is one of several factors." },
    { topicId: "soils", topic: "Soils of India", difficulty: "Easy",
      question: "Which soil type is most suited for cotton cultivation and why?",
      answer: "Black soil (Regur soil/Black Cotton soil). Derived from Deccan basaltic lava. High moisture retention — swells when wet, shrinks/cracks when dry. Rich in lime, iron, magnesia. Found in Deccan Plateau, Maharashtra, Gujarat, MP." },
    { topicId: "soils", topic: "Soils of India", difficulty: "Medium",
      question: "What is laterite soil and where is it found?",
      answer: "Formed by intense leaching in high temperature and heavy rainfall areas. Rich in iron and aluminium oxides. Low in humus, nitrogen, potash. Poor for cultivation but used for construction (building material). Found in Kerala, Karnataka, Tamil Nadu, Northeast India." },
    { topicId: "vegetation", topic: "Natural Vegetation", difficulty: "Easy",
      question: "What type of forests are found in the Western Ghats and what makes them unique?",
      answer: "Tropical Wet Evergreen Forests (Tropical Rainforests). Rainfall >200cm, temperature >22°C. Multi-layered canopy. Trees never shed leaves at same time. Rich biodiversity — one of 36 global biodiversity hotspots. Dense, no undergrowth. Ebony, mahogany, teak found here." },
    { topicId: "vegetation", topic: "Natural Vegetation", difficulty: "Medium",
      question: "What are mangrove forests and where are the largest in India?",
      answer: "Halophytic (salt-tolerant) forests in tidal zones. Roots above water (pneumatophores). Found in Sundarbans (West Bengal/Bangladesh) — world's largest mangrove. Also in Andaman & Nicobar, Mahanadi delta, Gulf of Kutch. Important for coastal protection, nursery for fish." },
    { topicId: "mountains", topic: "Mountains & Physiography", difficulty: "Medium",
      question: "Name the three ranges of the Himalayas and their key characteristics.",
      answer: "Greater Himalayas (Himadri): highest, permanent snow, avg 6,000m. Middle Himalayas (Himachal): 3,700–4,500m, hill stations (Shimla, Mussoorie), valleys (Kashmir, Kullu, Kangra). Outer Himalayas (Shiwaliks): 900–1,100m, latest, soft rocks, prone to landslides." },
    { topicId: "mountains", topic: "Mountains & Physiography", difficulty: "Easy",
      question: "What is the Deccan Plateau and what type of rocks is it made of?",
      answer: "Triangular plateau south of Vindhya-Satpura ranges. Oldest geological formation. Made of ancient crystalline igneous and metamorphic rocks. Covered partly by Deccan Traps (basaltic lava flows) in Maharashtra-Gujarat region. Tilts gently from west to east — most peninsular rivers flow east." },
  ],

  economy: [
    { topicId: "planning", topic: "Economic Planning", difficulty: "Easy",
      question: "What replaced the Planning Commission and when?",
      answer: "NITI Aayog (National Institution for Transforming India) replaced the Planning Commission on January 1, 2015. Key difference: NITI Aayog is advisory, not executive — it cannot allocate funds. Finance Ministry and Cabinet control funding." },
    { topicId: "planning", topic: "Economic Planning", difficulty: "Medium",
      question: "What is the difference between Fiscal Deficit and Revenue Deficit?",
      answer: "Revenue Deficit = Revenue Expenditure − Revenue Receipts (deficit in day-to-day operations). Fiscal Deficit = Total Expenditure − Total Receipts excluding borrowings (measures total borrowing requirement). Primary Deficit = Fiscal Deficit − Interest Payments." },
    { topicId: "planning", topic: "Economic Planning", difficulty: "Hard",
      question: "What is the FRBM Act and its key targets?",
      answer: "Fiscal Responsibility and Budget Management Act (2003). Originally targeted zero Revenue Deficit and 3% Fiscal Deficit by 2008-09. Targets revised multiple times. NK Singh Committee (2017) recommended: Fiscal Deficit 2.5% of GDP; Debt/GDP ratio 60% (Centre 40%, States 20%)." },
    { topicId: "banking", topic: "Banking & Monetary Policy", difficulty: "Easy",
      question: "What are the instruments of Monetary Policy used by RBI?",
      answer: "Quantitative: Repo Rate (rate at which RBI lends to banks), Reverse Repo Rate, CRR (Cash Reserve Ratio — % deposits kept with RBI), SLR (Statutory Liquidity Ratio — % held as liquid assets). Qualitative: Credit rationing, moral suasion, margin requirements." },
    { topicId: "banking", topic: "Banking & Monetary Policy", difficulty: "Medium",
      question: "What is the difference between CRR and SLR?",
      answer: "CRR: % of Net Demand and Time Liabilities kept as cash with RBI — earns no interest. SLR: % of NDTL maintained in liquid assets (cash, gold, government securities) with bank itself — earns interest. Both control money supply. RBI can change both to control liquidity." },
    { topicId: "banking", topic: "Banking & Monetary Policy", difficulty: "Hard",
      question: "What are Non-Performing Assets (NPAs) and how are they classified?",
      answer: "NPA: loan/advance where interest or principal is overdue for 90+ days. Sub-standard: NPA for up to 12 months. Doubtful: NPA for more than 12 months. Loss assets: identified as uncollectible. Gross NPA = total NPA before provisioning. Net NPA = Gross NPA minus provisions." },
    { topicId: "trade", topic: "International Trade & BOP", difficulty: "Medium",
      question: "What is the difference between Balance of Trade and Balance of Payments?",
      answer: "Balance of Trade: difference between merchandise (visible) exports and imports. Balance of Payments: comprehensive account of all economic transactions between residents and rest of world — includes Current Account (trade in goods/services, transfers) and Capital Account (FDI, FII, loans)." },
    { topicId: "trade", topic: "International Trade & BOP", difficulty: "Hard",
      question: "What is the Washington Consensus and its key prescriptions?",
      answer: "Set of 10 economic policy prescriptions by IMF/World Bank for developing countries: fiscal discipline, reordering public spending, tax reform, interest rate liberalisation, competitive exchange rates, trade liberalisation, FDI liberalisation, privatisation, deregulation, property rights." },
    { topicId: "agriculture", topic: "Agriculture & Food Security", difficulty: "Easy",
      question: "What is the Minimum Support Price (MSP) and who recommends it?",
      answer: "Government-guaranteed minimum price for agricultural produce to protect farmers from price crashes. Recommended by Commission for Agricultural Costs and Prices (CACP). Applies to 22 mandated crops + others. Not legally guaranteed to all farmers — mostly operates through FCI and state agencies." },
    { topicId: "agriculture", topic: "Agriculture & Food Security", difficulty: "Medium",
      question: "What are the features of PM-KISAN scheme?",
      answer: "Pradhan Mantri Kisan Samman Nidhi (2019): ₹6,000 per year in three equal installments (₹2,000 each) to all landholding farmer families. Directly credited to bank accounts (DBT). Excludes institutional land holders, constitutional post holders, income taxpayers, professionals." },
    { topicId: "gdp", topic: "National Income & GDP", difficulty: "Easy",
      question: "What is the difference between GDP and GNP?",
      answer: "GDP (Gross Domestic Product): value of all final goods/services produced within country's boundaries. GNP = GDP + Net Factor Income from Abroad (income earned by residents abroad minus income earned by foreigners in India). GNP measures income of nationals, GDP measures production within territory." },
    { topicId: "gdp", topic: "National Income & GDP", difficulty: "Medium",
      question: "What is GDP deflator and how is it different from CPI?",
      answer: "GDP Deflator = (Nominal GDP / Real GDP) × 100. Measures price changes for all goods in GDP. CPI (Consumer Price Index) measures prices of a fixed basket of consumer goods. GDP deflator has wider coverage but no fixed basket. CPI affects common man more directly. RBI uses CPI for inflation targeting." },
  ],

  science: [
    { topicId: "space", topic: "Space Technology", difficulty: "Easy",
      question: "What is the difference between geostationary and polar orbit satellites?",
      answer: "Geostationary (GEO): 36,000km altitude, same angular velocity as Earth — appears stationary. Used for communication, weather (INSAT series). Polar orbit: ~600-1000km, circles over poles — covers entire Earth in successive passes. Used for earth observation (IRS series), reconnaissance." },
    { topicId: "space", topic: "Space Technology", difficulty: "Medium",
      question: "What are the key achievements of Chandrayaan missions?",
      answer: "Chandrayaan-1 (2008): discovered water molecules on Moon (M3 instrument). Chandrayaan-2 (2019): orbiter still operational; Vikram lander crashed. Chandrayaan-3 (2023): successful soft landing near south pole (Shiv Shakti point) — India first country to land near lunar south pole." },
    { topicId: "space", topic: "Space Technology", difficulty: "Hard",
      question: "What is the Aditya-L1 mission?",
      answer: "India's first dedicated solar observation mission (launched Sept 2023). Placed at Lagrangian point L1 (~1.5 million km from Earth). Carries 7 payloads. Studies solar corona, solar wind, solar flares, CMEs (Coronal Mass Ejections). L1 point allows unobstructed view of Sun." },
    { topicId: "biotech", topic: "Biotechnology", difficulty: "Medium",
      question: "What is CRISPR-Cas9 and its significance?",
      answer: "Clustered Regularly Interspaced Short Palindromic Repeats — a gene-editing tool that acts like 'molecular scissors'. Cas9 protein cuts DNA at precise locations guided by RNA. Can add, remove, or alter genes. Used in medicine (genetic diseases), agriculture (crop improvement). Nobel Prize 2020." },
    { topicId: "biotech", topic: "Biotechnology", difficulty: "Easy",
      question: "What is the difference between mRNA vaccines and conventional vaccines?",
      answer: "Conventional: introduce killed/weakened pathogen or its protein to trigger immune response. mRNA vaccines (Pfizer, Moderna): inject messenger RNA that instructs cells to produce a viral protein (spike protein) — immune system learns to fight it. No actual virus, cannot cause disease, does not alter DNA." },
    { topicId: "defence", topic: "Defence Technology", difficulty: "Medium",
      question: "What is India's DRDO and name four major systems it has developed?",
      answer: "Defence Research and Development Organisation. Agni missile series (ballistic missiles), Prithvi (surface-to-surface missile), BrahMos (supersonic cruise missile, joint India-Russia), Akash (surface-to-air missile), Tejas (light combat aircraft), Arjun (main battle tank), INS Arihant (nuclear submarine)." },
    { topicId: "defence", topic: "Defence Technology", difficulty: "Hard",
      question: "What is hypersonic technology and which countries have demonstrated it?",
      answer: "Hypersonic: Mach 5+ (5× speed of sound). Hypersonic Glide Vehicles: launched on ballistic trajectory then glide unpredictably — hard to intercept. Russia (Avangard), China (DF-17), USA (testing). India: HSTDV (Hypersonic Technology Demonstrator Vehicle) tested 2020. BrahMos-II in development." },
    { topicId: "it-cyber", topic: "IT & Cybersecurity", difficulty: "Medium",
      question: "What is India's Digital India programme? Name its three vision areas.",
      answer: "Flagship programme (2015). Three vision areas: Digital Infrastructure as Core Utility (broadband, mobile connectivity, e-governance), Governance and Services on Demand (online services, digital literacy), Digital Empowerment of Citizens (universal digital literacy, digital resources). Key projects: UPI, Aadhaar, UMANG, DigiLocker." },
    { topicId: "it-cyber", topic: "IT & Cybersecurity", difficulty: "Easy",
      question: "What is Unified Payments Interface (UPI) and which body regulates it?",
      answer: "Real-time payment system launched 2016. Allows instant fund transfer between bank accounts via mobile. Regulated by RBI, operated by NPCI (National Payments Corporation of India). No transaction charge for peer-to-peer. India accounts for ~40% of global real-time digital transactions." },
  ],

  environment: [
    { topicId: "climate-agreements", topic: "Climate Agreements", difficulty: "Easy",
      question: "What are the key features of the Paris Agreement (2015)?",
      answer: "Legally binding (unlike Kyoto Protocol for all). Target: limit warming to well below 2°C, pursue 1.5°C. Each country submits Nationally Determined Contributions (NDCs) — updated every 5 years. No enforcement mechanism. India's NDC: 45% reduction in emission intensity by 2030 vs 2005, 50% electricity from non-fossil sources." },
    { topicId: "climate-agreements", topic: "Climate Agreements", difficulty: "Medium",
      question: "What is the difference between mitigation and adaptation in climate change?",
      answer: "Mitigation: reducing greenhouse gas emissions or enhancing carbon sinks to limit temperature rise. Adaptation: adjusting to actual or expected climate change effects to reduce harm. Both needed. Developed countries responsible for mitigation (historical emissions); developing countries need adaptation support." },
    { topicId: "climate-agreements", topic: "Climate Agreements", difficulty: "Hard",
      question: "What is Loss and Damage in climate negotiations?",
      answer: "Refers to negative impacts of climate change beyond adaptation capacity — irreversible losses (glaciers, biodiversity) and damages (infrastructure from extreme events). Developed at UNFCCC. COP27 (2022) established Loss and Damage Fund. Key demand of vulnerable developing nations. Still contentious — who pays?" },
    { topicId: "biodiversity", topic: "Biodiversity & Conservation", difficulty: "Easy",
      question: "What are the two main international conventions on biodiversity?",
      answer: "CBD (Convention on Biological Diversity, 1992): conservation, sustainable use, fair sharing of benefits. Kunming-Montreal Global Biodiversity Framework (2022): 30×30 target — protect 30% of land and oceans by 2030. Ramsar Convention (1971): protection of wetlands of international importance." },
    { topicId: "biodiversity", topic: "Biodiversity & Conservation", difficulty: "Medium",
      question: "What is Project Tiger and what are its key achievements?",
      answer: "Launched 1973 in response to tiger decline. Creates tiger reserves with core zone (no human activity) and buffer zone. NTCA (National Tiger Conservation Authority) oversees. India has ~70% of world's wild tigers (~3,500 in 2022 census). Tiger count tripled since 1973. 54 tiger reserves across India." },
    { topicId: "biodiversity", topic: "Biodiversity & Conservation", difficulty: "Hard",
      question: "What is the Nagoya Protocol and why is it significant?",
      answer: "Supplementary agreement to CBD (2010, in force 2014). Access and Benefit-Sharing (ABS) from genetic resources. Countries must ensure fair sharing of benefits from using their genetic resources with traditional knowledge communities. Prevents biopiracy. Important for developing countries rich in biodiversity." },
    { topicId: "pollution", topic: "Pollution & Waste Management", difficulty: "Medium",
      question: "What is PM2.5 and why is it more dangerous than PM10?",
      answer: "PM2.5: particulate matter ≤2.5 micrometers. PM10: ≤10 micrometers. PM2.5 more dangerous: penetrates deep into lungs, enters bloodstream, can reach brain. Causes respiratory disease, cardiovascular disease, cancer. India WHO standard: 60μg/m³ annual (PM2.5: 40μg/m³) vs WHO guideline 15μg/m³." },
    { topicId: "pollution", topic: "Pollution & Waste Management", difficulty: "Easy",
      question: "What is Extended Producer Responsibility (EPR)?",
      answer: "Policy approach under which producers are given significant responsibility — financial and/or physical — for the treatment or disposal of post-consumer products. Plastic Waste Management Rules 2022 made EPR mandatory for producers of plastic packaging. Shifts waste management cost from municipalities to producers." },
    { topicId: "environmental-laws", topic: "Environmental Laws", difficulty: "Medium",
      question: "What does the Environment Protection Act (1986) empower the government to do?",
      answer: "EPA 1986 (umbrella legislation post-Bhopal gas tragedy): empowers Central Government to take measures to protect and improve environment. Can set standards for emissions and discharges. Can restrict activities in certain areas. National Green Tribunal (NGT) established under NGT Act 2010 to handle environmental cases." },
    { topicId: "environmental-laws", topic: "Environmental Laws", difficulty: "Easy",
      question: "What is the Precautionary Principle in environmental law?",
      answer: "Where there is serious or irreversible threat to environment, lack of scientific certainty cannot be used as reason to postpone protective measures. Part of Rio Declaration (1992) Principle 15. Applied by Indian courts and NGT in several cases. Burden of proof on those proposing potentially harmful activity." },
  ],

  ethics: [
    { topicId: "foundations", topic: "Foundations of Ethics", difficulty: "Medium",
      question: "Distinguish between ethical relativism and ethical absolutism with examples.",
      answer: "Ethical relativism: moral judgments are relative to culture/context — no universal right or wrong. Example: euthanasia acceptable in Netherlands, not in India. Ethical absolutism (universalism): some actions are always right/wrong regardless of context. Example: torture is always wrong. UPSC favours nuanced view — cultural sensitivity + universal human rights." },
    { topicId: "foundations", topic: "Foundations of Ethics", difficulty: "Hard",
      question: "Explain Kant's Categorical Imperative and its relevance to public service.",
      answer: "Kant: act only according to maxims you could will to become universal law. Two formulations: 1) Universalisability — act only as you'd want everyone to act; 2) Treat humanity never merely as means but always as an end. Relevance: public servants should not make exceptions for themselves, must treat citizens as ends not means (not exploit)." },
    { topicId: "foundations", topic: "Foundations of Ethics", difficulty: "Medium",
      question: "What is utilitarian ethics and what is its main criticism?",
      answer: "Utilitarianism (Bentham, Mill): greatest good of greatest number. Judge actions by consequences — maximize overall happiness. Criticism: can justify sacrificing minority's rights for majority benefit; ignores distribution of happiness; 'ends justify means' problem; difficulty in measuring/comparing happiness." },
    { topicId: "civil-services", topic: "Ethics in Civil Services", difficulty: "Easy",
      question: "What are the Seven Principles of Public Life (Nolan Principles)?",
      answer: "Selflessness, Integrity, Objectivity, Accountability, Openness, Honesty, Leadership. Formulated by Nolan Committee (UK, 1995). Widely referenced in India for standards in public life. Key UPSC value: selflessness means acting in public interest, not personal gain." },
    { topicId: "civil-services", topic: "Ethics in Civil Services", difficulty: "Medium",
      question: "What is the difference between ethics and integrity in public service?",
      answer: "Ethics: system of moral principles guiding behaviour — what is right/wrong. Integrity: wholeness — consistent alignment between values, words and actions; doing right even when no one is watching. An official may know what is ethical (ethics) but lack integrity if they don't act accordingly. Integrity also implies incorruptibility." },
    { topicId: "emotional-intelligence", topic: "Emotional Intelligence", difficulty: "Easy",
      question: "What are the five components of Emotional Intelligence (Daniel Goleman)?",
      answer: "1) Self-awareness (knowing your emotions), 2) Self-regulation (managing emotions), 3) Motivation (internal drive), 4) Empathy (understanding others' emotions), 5) Social skills (managing relationships). EQ often more important than IQ for leadership effectiveness. Relevant for civil servants dealing with public." },
    { topicId: "emotional-intelligence", topic: "Emotional Intelligence", difficulty: "Medium",
      question: "How does emotional intelligence help in conflict resolution for civil servants?",
      answer: "Self-awareness: recognise own biases and reactions. Empathy: understand all parties' perspectives. Self-regulation: remain calm under pressure, avoid reactive decisions. Social skills: facilitate dialogue, find common ground. Example: handling communal tensions requires EQ to listen to all sides, de-escalate, not inflame." },
    { topicId: "case-studies", topic: "Case Studies & Dilemmas", difficulty: "Hard",
      question: "What is the 'whistleblower's dilemma' in bureaucracy and how should it be resolved?",
      answer: "Conflict between loyalty to organization/superior and duty to public interest. Resolution: distinguish between illegal activity (must report) and policy differences (raise internally). Use prescribed channels first (vigilance, ombudsman). Whistleblowers' Protection Act 2014 provides safeguards. Courage and integrity must outweigh fear of consequences when public interest is at stake." },
    { topicId: "case-studies", topic: "Case Studies & Dilemmas", difficulty: "Medium",
      question: "What is the difference between personal ethics and professional ethics for a civil servant?",
      answer: "Personal ethics: values and beliefs from family, religion, culture — subjective. Professional ethics: standards prescribed by the service, constitution, and law — objective, non-negotiable. Conflict example: officer's religion opposes certain policy (e.g., liquor permits in dry state). Must implement law professionally even if personal values differ, but can raise objections through proper channels." },
  ],

  "current-affairs": [
    { topicId: "international", topic: "International Relations", difficulty: "Medium",
      question: "What is India's 'Neighbourhood First' policy and its key elements?",
      answer: "Prioritises relations with SAARC neighbours. Key elements: connectivity (road, rail, digital), development assistance (credit lines to Nepal, Bangladesh, Sri Lanka), power trading, people-to-people ties, disaster management cooperation. Challenges: China's BRI influence, domestic politics in neighbours, trust deficit with Pakistan." },
    { topicId: "international", topic: "International Relations", difficulty: "Hard",
      question: "What is the Quad and what are its key areas of cooperation?",
      answer: "Quadrilateral Security Dialogue — India, USA, Japan, Australia. Revived 2017 after 2007 pause. Not a military alliance. Focus: free and open Indo-Pacific, COVID vaccines (QUAD vaccine initiative), climate change, critical technology (semiconductors), cybersecurity, infrastructure (as alternative to BRI), maritime security." },
    { topicId: "economy-policy", topic: "Economic Policy", difficulty: "Easy",
      question: "What is the Production Linked Incentive (PLI) scheme?",
      answer: "Launched 2020. Gives incentives to companies based on incremental sales from products manufactured in India over base year. Aims to make India global manufacturing hub, reduce import dependence, create jobs. Initially 13 sectors including mobile phones, pharma, auto, textile, solar panels, food processing, specialty steel." },
    { topicId: "economy-policy", topic: "Economic Policy", difficulty: "Medium",
      question: "What is the PM Gati Shakti National Master Plan?",
      answer: "Launched 2021. GIS-based digital platform integrating 16 ministries' infrastructure planning. Aims to eliminate silos in infrastructure development. Maps existing and upcoming infrastructure — roads, railways, waterways, ports, airports, utilities. Uses satellite imagery for real-time monitoring. Builds on NIP (National Infrastructure Pipeline)." },
    { topicId: "governance", topic: "Governance Initiatives", difficulty: "Easy",
      question: "What is the PM Vishwakarma scheme (2023)?",
      answer: "Scheme for traditional artisans and craftspeople (18 trades including blacksmiths, potters, weavers, cobblers). Benefits: recognition with PM Vishwakarma certificate, Rs 15,000 toolkit incentive, credit support (Rs 1 lakh at 5% interest, Rs 2 lakh second tranche), skill training, market linkage through GeM portal." },
    { topicId: "governance", topic: "Governance Initiatives", difficulty: "Medium",
      question: "What are the key features of the National Education Policy (NEP) 2020?",
      answer: "Replaces NPE 1986. Key features: 5+3+3+4 structure (replacing 10+2), mother tongue medium up to Grade 5, multidisciplinary education at university level, academic bank of credits, multiple entry/exit from higher education, 50% GER in higher education by 2035, emphasis on vocational education from Grade 6, ECCE (Early Childhood Care and Education) universalisation." },
    { topicId: "social", topic: "Social Issues", difficulty: "Medium",
      question: "What are the key provisions of the Protection of Women from Domestic Violence Act (2005)?",
      answer: "Defines domestic violence broadly (physical, sexual, verbal, economic abuse). Applies to women in all domestic relationships (not just marriage). Provides: Protection Orders, Residence Orders (cannot be evicted from shared home), Monetary Relief, Custody Orders, Compensation Orders. Magistrate can issue within 3 days. Breach of order is criminal offence." },
    { topicId: "technology-policy", topic: "Technology & Policy", difficulty: "Easy",
      question: "What is India's National Quantum Mission (2023)?",
      answer: "₹6,003 crore mission (2023-31). Aims to make India among top 6 nations in quantum technology. Four thematic hubs: quantum computing (IISc), quantum communication (IIT Madras), quantum sensing & metrology (IIT Bombay), quantum materials & devices (IIT Delhi). Target: 50-qubit quantum computer in 3 years, 1000+ qubit in 8 years." },
    { topicId: "technology-policy", topic: "Technology & Policy", difficulty: "Medium",
      question: "What are the key provisions of the Digital Personal Data Protection Act (2023)?",
      answer: "India's first comprehensive data protection law. Key features: data principal (person) rights: access info, correction, erasure, grievance redressal, nominate someone. Data fiduciary (company) duties: accurate data, security safeguards, notify breaches. Consent required. Data Protection Board adjudicates disputes. Exemptions: national security, research, startups. Cross-border data transfer rules flexible." },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// MINDMAP DATA
// ─────────────────────────────────────────────────────────────────────────────

const MINDMAP_DATA = [
  {
    subject: { name: "Indian Polity", slug: "indian-polity", icon: "🏛️" },
    maps: [
      {
        title: "Structure of Parliament",
        slug: "structure-of-parliament",
        branches: [
          { name: "Lok Sabha", count: 5, color: "#3B82F6" },
          { name: "Rajya Sabha", count: 5, color: "#A855F7" },
          { name: "Sessions", count: 4, color: "#F59E0B" },
          { name: "Legislation", count: 4, color: "#10B981" },
          { name: "Key Officers", count: 3, color: "#EC4899" },
        ],
        nodes: {
          center: "Parliament",
          branches: [
            { x: "35%", y: "28%", label: "Lok Sabha", color: "#3B82F6" },
            { x: "65%", y: "28%", label: "Rajya Sabha", color: "#A855F7" },
            { x: "20%", y: "58%", label: "Key Officers", color: "#EC4899" },
            { x: "63%", y: "68%", label: "Sessions", color: "#F59E0B" },
            { x: "42%", y: "74%", label: "Legislation", color: "#10B981" },
          ],
        },
        quizData: [
          { question: "Who is the presiding officer of Lok Sabha?", options: ["President", "Speaker", "Prime Minister", "Vice President"], correctAnswer: "Speaker" },
          { question: "What is the maximum strength of Rajya Sabha?", options: ["250", "245", "552", "545"], correctAnswer: "250" },
          { question: "Which article deals with Parliament of India?", options: ["Article 79", "Article 80", "Article 81", "Article 75"], correctAnswer: "Article 79" },
          { question: "How many members can the President nominate to Rajya Sabha?", options: ["2", "6", "12", "15"], correctAnswer: "12" },
        ],
      },
      {
        title: "Fundamental Rights",
        slug: "fundamental-rights",
        branches: [
          { name: "Right to Equality", count: 5, color: "#3B82F6" },
          { name: "Right to Freedom", count: 6, color: "#10B981" },
          { name: "Right against Exploitation", count: 2, color: "#F59E0B" },
          { name: "Right to Religion", count: 4, color: "#A855F7" },
          { name: "Cultural & Educational", count: 2, color: "#EC4899" },
        ],
        nodes: {
          center: "Fundamental Rights",
          branches: [
            { x: "30%", y: "25%", label: "Right to Equality", color: "#3B82F6" },
            { x: "68%", y: "25%", label: "Right to Freedom", color: "#10B981" },
            { x: "18%", y: "60%", label: "Anti-Exploitation", color: "#F59E0B" },
            { x: "60%", y: "70%", label: "Right to Religion", color: "#A855F7" },
            { x: "42%", y: "76%", label: "Cultural Rights", color: "#EC4899" },
          ],
        },
        quizData: [
          { question: "Which Part of the Constitution deals with Fundamental Rights?", options: ["Part II", "Part III", "Part IV", "Part V"], correctAnswer: "Part III" },
          { question: "Right to Property is now a —", options: ["Fundamental Right", "Legal Right", "Constitutional Right", "Natural Right"], correctAnswer: "Legal Right" },
          { question: "Which article abolishes untouchability?", options: ["Article 14", "Article 15", "Article 17", "Article 19"], correctAnswer: "Article 17" },
          { question: "Article 19 gives freedom of speech to —", options: ["All persons", "Citizens only", "Resident foreigners", "All adults"], correctAnswer: "Citizens only" },
        ],
      },
      {
        title: "Directive Principles",
        slug: "directive-principles",
        branches: [
          { name: "Socialistic Principles", count: 6, color: "#3B82F6" },
          { name: "Gandhian Principles", count: 5, color: "#10B981" },
          { name: "Liberal Principles", count: 4, color: "#F59E0B" },
          { name: "Conflict with FRs", count: 3, color: "#A855F7" },
        ],
        nodes: {
          center: "DPSPs",
          branches: [
            { x: "28%", y: "28%", label: "Socialistic", color: "#3B82F6" },
            { x: "70%", y: "28%", label: "Gandhian", color: "#10B981" },
            { x: "28%", y: "68%", label: "Liberal", color: "#F59E0B" },
            { x: "70%", y: "68%", label: "FR Conflict", color: "#A855F7" },
          ],
        },
        quizData: [
          { question: "DPSPs are contained in which Part of the Constitution?", options: ["Part III", "Part IV", "Part IV-A", "Part V"], correctAnswer: "Part IV" },
          { question: "Which article mandates Equal Pay for Equal Work?", options: ["Article 38", "Article 39", "Article 40", "Article 41"], correctAnswer: "Article 39" },
          { question: "DPSPs were borrowed from the constitution of —", options: ["USA", "UK", "Ireland", "Canada"], correctAnswer: "Ireland" },
        ],
      },
      {
        title: "Emergency Provisions",
        slug: "emergency-provisions",
        branches: [
          { name: "National Emergency (352)", count: 5, color: "#EF4444" },
          { name: "President's Rule (356)", count: 4, color: "#F59E0B" },
          { name: "Financial Emergency (360)", count: 3, color: "#3B82F6" },
          { name: "44th Amendment Effects", count: 4, color: "#10B981" },
        ],
        nodes: {
          center: "Emergency",
          branches: [
            { x: "28%", y: "28%", label: "Nat. Emergency", color: "#EF4444" },
            { x: "70%", y: "28%", label: "Prez Rule", color: "#F59E0B" },
            { x: "28%", y: "68%", label: "Fin. Emergency", color: "#3B82F6" },
            { x: "70%", y: "68%", label: "44th Amdt", color: "#10B981" },
          ],
        },
        quizData: [
          { question: "National Emergency under Article 352 can be proclaimed on grounds of —", options: ["War only", "War, External Aggression, Armed Rebellion", "Natural Disaster", "Economic Crisis"], correctAnswer: "War, External Aggression, Armed Rebellion" },
          { question: "President's Rule can be imposed initially for —", options: ["6 months", "1 year", "2 years", "3 years"], correctAnswer: "6 months" },
          { question: "Financial Emergency has never been declared in India.", options: ["True", "False"], correctAnswer: "True" },
        ],
      },
      {
        title: "Panchayati Raj",
        slug: "panchayati-raj",
        branches: [
          { name: "73rd Amendment", count: 5, color: "#10B981" },
          { name: "Three-Tier Structure", count: 4, color: "#3B82F6" },
          { name: "State Finance Commission", count: 3, color: "#F59E0B" },
          { name: "Reservation Provisions", count: 3, color: "#A855F7" },
        ],
        nodes: {
          center: "Panchayati Raj",
          branches: [
            { x: "28%", y: "28%", label: "73rd Amdt", color: "#10B981" },
            { x: "70%", y: "28%", label: "Three-Tier", color: "#3B82F6" },
            { x: "28%", y: "68%", label: "State FC", color: "#F59E0B" },
            { x: "70%", y: "68%", label: "Reservations", color: "#A855F7" },
          ],
        },
        quizData: [
          { question: "The 73rd Amendment is related to —", options: ["Urban Local Bodies", "Panchayati Raj Institutions", "Co-operative Societies", "Scheduled Tribes"], correctAnswer: "Panchayati Raj Institutions" },
          { question: "Gram Sabha is defined under which article added by the 73rd Amendment?", options: ["Article 243A", "Article 243B", "Article 243C", "Article 243D"], correctAnswer: "Article 243A" },
          { question: "74th Amendment deals with —", options: ["Panchayati Raj", "Urban Local Bodies", "Cooperative Societies", "Election Commission"], correctAnswer: "Urban Local Bodies" },
        ],
      },
    ],
  },
  {
    subject: { name: "Modern History", slug: "modern-history", icon: "📜" },
    maps: [
      {
        title: "Indian National Congress",
        slug: "indian-national-congress",
        branches: [
          { name: "Formation (1885)", count: 4, color: "#3B82F6" },
          { name: "Moderate Phase", count: 4, color: "#10B981" },
          { name: "Extremist Phase", count: 4, color: "#EF4444" },
          { name: "Gandhi Era", count: 5, color: "#F59E0B" },
        ],
        nodes: {
          center: "INC",
          branches: [
            { x: "28%", y: "28%", label: "Formation", color: "#3B82F6" },
            { x: "70%", y: "28%", label: "Moderates", color: "#10B981" },
            { x: "28%", y: "68%", label: "Extremists", color: "#EF4444" },
            { x: "70%", y: "68%", label: "Gandhi Era", color: "#F59E0B" },
          ],
        },
        quizData: [
          { question: "Who founded the Indian National Congress in 1885?", options: ["Bal Gangadhar Tilak", "A.O. Hume", "Dadabhai Naoroji", "Gopal Krishna Gokhale"], correctAnswer: "A.O. Hume" },
          { question: "The partition of Bengal was done in which year?", options: ["1903", "1905", "1907", "1911"], correctAnswer: "1905" },
          { question: "The Surat Split (1907) divided INC into which two factions?", options: ["Radicals and Liberals", "Moderates and Extremists", "Congress and League", "Socialists and Capitalists"], correctAnswer: "Moderates and Extremists" },
        ],
      },
      {
        title: "Revolt of 1857",
        slug: "revolt-of-1857",
        branches: [
          { name: "Causes", count: 5, color: "#EF4444" },
          { name: "Key Centres", count: 4, color: "#3B82F6" },
          { name: "Leaders", count: 5, color: "#A855F7" },
          { name: "Aftermath", count: 4, color: "#10B981" },
        ],
        nodes: {
          center: "1857 Revolt",
          branches: [
            { x: "28%", y: "28%", label: "Causes", color: "#EF4444" },
            { x: "70%", y: "28%", label: "Key Centres", color: "#3B82F6" },
            { x: "28%", y: "68%", label: "Leaders", color: "#A855F7" },
            { x: "70%", y: "68%", label: "Aftermath", color: "#10B981" },
          ],
        },
        quizData: [
          { question: "The Revolt of 1857 began at —", options: ["Delhi", "Meerut", "Lucknow", "Kanpur"], correctAnswer: "Meerut" },
          { question: "Who was the Governor-General during the Revolt of 1857?", options: ["Lord Dalhousie", "Lord Canning", "Lord Curzon", "Lord Wellesley"], correctAnswer: "Lord Canning" },
          { question: "Rani Lakshmibai was the queen of which princely state?", options: ["Kanpur", "Lucknow", "Jhansi", "Gwalior"], correctAnswer: "Jhansi" },
        ],
      },
      {
        title: "Gandhian Movements",
        slug: "gandhian-movements",
        branches: [
          { name: "Non-Cooperation (1920)", count: 5, color: "#3B82F6" },
          { name: "Civil Disobedience (1930)", count: 5, color: "#10B981" },
          { name: "Quit India (1942)", count: 4, color: "#EF4444" },
          { name: "Satyagraha Principles", count: 4, color: "#F59E0B" },
        ],
        nodes: {
          center: "Gandhi's Movements",
          branches: [
            { x: "25%", y: "25%", label: "Non-Cooperation", color: "#3B82F6" },
            { x: "70%", y: "25%", label: "Civil Disobedience", color: "#10B981" },
            { x: "25%", y: "70%", label: "Quit India", color: "#EF4444" },
            { x: "70%", y: "70%", label: "Satyagraha", color: "#F59E0B" },
          ],
        },
        quizData: [
          { question: "The Non-Cooperation Movement was withdrawn after which incident?", options: ["Jallianwala Bagh", "Chauri Chaura", "Lahore Conspiracy", "Simon Commission"], correctAnswer: "Chauri Chaura" },
          { question: "Gandhi launched Dandi March on —", options: ["March 12, 1930", "January 26, 1930", "August 9, 1942", "April 13, 1919"], correctAnswer: "March 12, 1930" },
          { question: "'Do or Die' slogan was associated with which movement?", options: ["Non-Cooperation", "Civil Disobedience", "Quit India", "Swadeshi"], correctAnswer: "Quit India" },
        ],
      },
    ],
  },
  {
    subject: { name: "Geography", slug: "geography", icon: "🌍" },
    maps: [
      {
        title: "Indian Rivers",
        slug: "indian-rivers",
        branches: [
          { name: "Himalayan Rivers", count: 5, color: "#3B82F6" },
          { name: "Peninsular Rivers", count: 5, color: "#10B981" },
          { name: "River Basins", count: 4, color: "#F59E0B" },
          { name: "River Disputes", count: 3, color: "#EF4444" },
        ],
        nodes: {
          center: "Indian Rivers",
          branches: [
            { x: "28%", y: "28%", label: "Himalayan", color: "#3B82F6" },
            { x: "70%", y: "28%", label: "Peninsular", color: "#10B981" },
            { x: "28%", y: "68%", label: "River Basins", color: "#F59E0B" },
            { x: "70%", y: "68%", label: "Disputes", color: "#EF4444" },
          ],
        },
        quizData: [
          { question: "Which river is known as the 'Sorrow of Bihar'?", options: ["Kosi", "Gandak", "Son", "Mahananda"], correctAnswer: "Kosi" },
          { question: "The river Brahmaputra enters India through which state?", options: ["Assam", "Arunachal Pradesh", "Meghalaya", "Manipur"], correctAnswer: "Arunachal Pradesh" },
          { question: "Which is India's longest river?", options: ["Ganga", "Indus", "Godavari", "Brahmaputra"], correctAnswer: "Ganga" },
        ],
      },
      {
        title: "Climate of India",
        slug: "climate-of-india",
        branches: [
          { name: "Monsoon System", count: 5, color: "#3B82F6" },
          { name: "Seasons", count: 4, color: "#10B981" },
          { name: "Climatic Regions", count: 5, color: "#F59E0B" },
          { name: "El Niño / La Niña", count: 3, color: "#A855F7" },
        ],
        nodes: {
          center: "Indian Climate",
          branches: [
            { x: "28%", y: "28%", label: "Monsoon", color: "#3B82F6" },
            { x: "70%", y: "28%", label: "Seasons", color: "#10B981" },
            { x: "28%", y: "68%", label: "Climatic Regions", color: "#F59E0B" },
            { x: "70%", y: "68%", label: "El Niño", color: "#A855F7" },
          ],
        },
        quizData: [
          { question: "The southwest monsoon arrives in India first at —", options: ["Mumbai", "Chennai", "Kerala", "Goa"], correctAnswer: "Kerala" },
          { question: "Which type of rainfall does the Coromandel Coast receive mostly?", options: ["Southwest Monsoon", "Northeast Monsoon", "Convectional", "Orographic"], correctAnswer: "Northeast Monsoon" },
          { question: "Mawsynram in Meghalaya is the wettest place on Earth. It lies in — hills.", options: ["Garo", "Khasi", "Jaintia", "Lushai"], correctAnswer: "Khasi" },
        ],
      },
      {
        title: "Soils & Vegetation",
        slug: "soils-and-vegetation",
        branches: [
          { name: "Alluvial Soils", count: 4, color: "#F59E0B" },
          { name: "Black / Regur Soils", count: 4, color: "#374151" },
          { name: "Forest Types", count: 5, color: "#10B981" },
          { name: "Grasslands", count: 3, color: "#84CC16" },
        ],
        nodes: {
          center: "Soils & Vegetation",
          branches: [
            { x: "28%", y: "28%", label: "Alluvial", color: "#F59E0B" },
            { x: "70%", y: "28%", label: "Black Soil", color: "#374151" },
            { x: "28%", y: "68%", label: "Forest Types", color: "#10B981" },
            { x: "70%", y: "68%", label: "Grasslands", color: "#84CC16" },
          ],
        },
        quizData: [
          { question: "Black soil is best suited for growing —", options: ["Rice", "Wheat", "Cotton", "Jute"], correctAnswer: "Cotton" },
          { question: "Tropical Evergreen Forests are found in areas with annual rainfall of —", options: [">200cm", "100-200cm", "50-100cm", "<50cm"], correctAnswer: ">200cm" },
          { question: "Laterite soil is found mainly in —", options: ["Rajasthan", "Kerala and Karnataka", "Punjab", "UP"], correctAnswer: "Kerala and Karnataka" },
        ],
      },
    ],
  },
  {
    subject: { name: "Indian Economy", slug: "indian-economy", icon: "💰" },
    maps: [
      {
        title: "Banking & Monetary Policy",
        slug: "banking-monetary-policy",
        branches: [
          { name: "RBI Structure", count: 4, color: "#3B82F6" },
          { name: "Monetary Policy Tools", count: 5, color: "#10B981" },
          { name: "Types of Banks", count: 4, color: "#F59E0B" },
          { name: "Financial Inclusion", count: 3, color: "#A855F7" },
        ],
        nodes: {
          center: "Banking System",
          branches: [
            { x: "28%", y: "28%", label: "RBI Structure", color: "#3B82F6" },
            { x: "70%", y: "28%", label: "Monetary Tools", color: "#10B981" },
            { x: "28%", y: "68%", label: "Types of Banks", color: "#F59E0B" },
            { x: "70%", y: "68%", label: "Fin. Inclusion", color: "#A855F7" },
          ],
        },
        quizData: [
          { question: "RBI was nationalised in which year?", options: ["1935", "1947", "1949", "1955"], correctAnswer: "1949" },
          { question: "CRR is the percentage of deposits kept —", options: ["As gold", "As government securities", "As cash with RBI", "As foreign currency"], correctAnswer: "As cash with RBI" },
          { question: "The Monetary Policy Committee (MPC) has how many members?", options: ["3", "5", "6", "7"], correctAnswer: "6" },
        ],
      },
      {
        title: "India's GDP & Planning",
        slug: "gdp-and-planning",
        branches: [
          { name: "Sectors of Economy", count: 4, color: "#3B82F6" },
          { name: "National Income Concepts", count: 5, color: "#10B981" },
          { name: "NITI Aayog vs Planning Commission", count: 4, color: "#F59E0B" },
          { name: "Fiscal Policy", count: 4, color: "#EF4444" },
        ],
        nodes: {
          center: "GDP & Planning",
          branches: [
            { x: "28%", y: "25%", label: "Sectors", color: "#3B82F6" },
            { x: "70%", y: "25%", label: "National Income", color: "#10B981" },
            { x: "28%", y: "70%", label: "NITI Aayog", color: "#F59E0B" },
            { x: "70%", y: "70%", label: "Fiscal Policy", color: "#EF4444" },
          ],
        },
        quizData: [
          { question: "NITI Aayog replaced Planning Commission in —", options: ["2013", "2014", "2015", "2016"], correctAnswer: "2015" },
          { question: "GDP deflator measures —", options: ["Inflation in consumer goods", "Price changes for all GDP goods", "Import price changes", "Real wages"], correctAnswer: "Price changes for all GDP goods" },
          { question: "Fiscal Deficit = Total Expenditure − (Revenue + Capital receipts excluding —)", options: ["Grants", "Borrowings", "Tax revenue", "Dividends"], correctAnswer: "Borrowings" },
        ],
      },
    ],
  },
  {
    subject: { name: "Environment", slug: "environment", icon: "🌿" },
    maps: [
      {
        title: "Climate Change & Agreements",
        slug: "climate-change-agreements",
        branches: [
          { name: "UNFCCC & Kyoto", count: 4, color: "#3B82F6" },
          { name: "Paris Agreement", count: 5, color: "#10B981" },
          { name: "India's NDC", count: 4, color: "#F59E0B" },
          { name: "Loss & Damage", count: 3, color: "#EF4444" },
        ],
        nodes: {
          center: "Climate Agreements",
          branches: [
            { x: "28%", y: "28%", label: "UNFCCC/Kyoto", color: "#3B82F6" },
            { x: "70%", y: "28%", label: "Paris Agreement", color: "#10B981" },
            { x: "28%", y: "68%", label: "India's NDC", color: "#F59E0B" },
            { x: "70%", y: "68%", label: "Loss & Damage", color: "#EF4444" },
          ],
        },
        quizData: [
          { question: "Paris Agreement targets limiting warming to —", options: ["1°C", "1.5°C (well below 2°C)", "2°C", "2.5°C"], correctAnswer: "1.5°C (well below 2°C)" },
          { question: "India's updated NDC target for 2030 includes —", options: ["Net zero by 2030", "50% electricity from non-fossil sources", "20% reduction in GDP emissions", "100% renewable energy"], correctAnswer: "50% electricity from non-fossil sources" },
          { question: "Loss and Damage Fund was established at —", options: ["COP26 Glasgow", "COP27 Sharm el-Sheikh", "COP28 Dubai", "Rio+20"], correctAnswer: "COP27 Sharm el-Sheikh" },
        ],
      },
      {
        title: "Biodiversity Conservation",
        slug: "biodiversity-conservation",
        branches: [
          { name: "Hotspots", count: 4, color: "#10B981" },
          { name: "Protected Areas", count: 4, color: "#3B82F6" },
          { name: "International Conventions", count: 4, color: "#A855F7" },
          { name: "Flagship Species", count: 4, color: "#F59E0B" },
        ],
        nodes: {
          center: "Biodiversity",
          branches: [
            { x: "28%", y: "28%", label: "Hotspots", color: "#10B981" },
            { x: "70%", y: "28%", label: "Protected Areas", color: "#3B82F6" },
            { x: "28%", y: "68%", label: "Int'l Conventions", color: "#A855F7" },
            { x: "70%", y: "68%", label: "Flagship Species", color: "#F59E0B" },
          ],
        },
        quizData: [
          { question: "How many biodiversity hotspots does India have?", options: ["2", "3", "4", "5"], correctAnswer: "4" },
          { question: "India's tiger population in the 2022 census was approximately —", options: ["1,500", "2,500", "3,500", "4,500"], correctAnswer: "3,500" },
          { question: "The Ramsar Convention deals with protection of —", options: ["Mangroves", "Wetlands", "Coral Reefs", "Mountain Ecosystems"], correctAnswer: "Wetlands" },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding revision tools...\n");

  let totalCards = 0;
  let totalMindmaps = 0;

  // ── FLASHCARD DECKS ──────────────────────────────────────────────────────
  for (const d of DECK_DEFS) {
    const deck = await prisma.flashcardDeck.upsert({
      where: { subjectId: d.subjectId },
      update: {},
      create: d,
    });

    const cards = FLASHCARDS[d.subjectId] ?? [];
    for (const card of cards) {
      const stableId = `${d.subjectId}-${card.topicId}-${card.question.slice(0, 30).replace(/\W+/g, "_")}`;
      await prisma.flashcard.upsert({
        where: { id: stableId },
        update: {},
        create: {
          id: stableId,
          deckId: deck.id,
          topicId: card.topicId,
          topic: card.topic,
          question: card.question,
          answer: card.answer,
          difficulty: card.difficulty,
        },
      });
      totalCards++;
    }
    console.log(`  ✓ ${d.subject}: ${cards.length} cards`);
  }

  // ── MINDMAPS ──────────────────────────────────────────────────────────────
  console.log("");
  for (const { subject, maps } of MINDMAP_DATA) {
    const sub = await prisma.mindmapSubject.upsert({
      where: { slug: subject.slug },
      update: {},
      create: subject,
    });
    console.log(`  ✓ Mindmap subject: ${subject.name}`);

    for (const map of maps) {
      await prisma.mindmap.upsert({
        where: { subjectId_slug: { subjectId: sub.id, slug: map.slug } },
        update: {},
        create: {
          subjectId: sub.id,
          title: map.title,
          slug: map.slug,
          branches: map.branches,
          nodes: map.nodes,
          quizData: map.quizData,
        },
      });
      console.log(`     ↳ ${map.title}`);
      totalMindmaps++;
    }
  }

  console.log("\n✅ Seeding complete!");
  console.log(`  Flashcard decks:  ${DECK_DEFS.length}`);
  console.log(`  Total flashcards: ${totalCards}`);
  console.log(`  Mindmap subjects: ${MINDMAP_DATA.length}`);
  console.log(`  Total mindmaps:   ${totalMindmaps}`);
  console.log("\nSubject breakdown:");
  for (const [subjectId, cards] of Object.entries(FLASHCARDS)) {
    const topics = new Set(cards.map(c => c.topicId)).size;
    console.log(`  ${subjectId.padEnd(15)} ${cards.length} cards across ${topics} topics`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
