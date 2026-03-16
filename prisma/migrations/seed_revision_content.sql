-- ============================================================
-- REVISION TOOLS — CONTENT SEED
-- Run this in Supabase SQL Editor AFTER running add_revision_tools.sql
-- Safe to re-run: uses ON CONFLICT (id) DO NOTHING throughout
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. FLASHCARD DECKS
-- ─────────────────────────────────────────────

-- Remove any existing decks that used auto-generated IDs (from a previous partial run)
-- so our stable IDs take effect
DELETE FROM flashcard_decks
WHERE subject_id IN ('polity','history','geography','economy','science','environment','ethics','current-affairs')
  AND id NOT IN ('deck-polity','deck-history','deck-geography','deck-economy','deck-science','deck-environment','deck-ethics','deck-current-affairs');

INSERT INTO flashcard_decks (id, subject_id, subject, icon) VALUES
  ('deck-polity',          'polity',          'Indian Polity',    '🏛️'),
  ('deck-history',         'history',         'Modern History',   '📜'),
  ('deck-geography',       'geography',       'Geography',        '🌍'),
  ('deck-economy',         'economy',         'Indian Economy',   '💰'),
  ('deck-science',         'science',         'Science & Tech',   '🔬'),
  ('deck-environment',     'environment',     'Environment',      '🌿'),
  ('deck-ethics',          'ethics',          'GS IV — Ethics',   '⚖️'),
  ('deck-current-affairs', 'current-affairs', 'Current Affairs',  '📰')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 2. FLASHCARDS — Indian Polity
-- ─────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, topic_id, topic, question, answer, difficulty) VALUES
-- Constitutional Amendments
('fc-pol-amdt-1', 'deck-polity', 'amendments', 'Constitutional Amendments',
 'What is the significance of the 42nd Amendment Act (1976)?',
 'Called "Mini Constitution". Added Fundamental Duties (Part IV-A), added Secular, Socialist, Integrity to Preamble. Curtailed judicial review. Many provisions later reversed by 44th Amendment.',
 'Hard'),

('fc-pol-amdt-2', 'deck-polity', 'amendments', 'Constitutional Amendments',
 'What does the 44th Amendment Act (1978) restore?',
 'Restored democratic provisions curtailed during Emergency: limited President''s power to declare Emergency, restored right to property as legal right, strengthened fundamental rights.',
 'Medium'),

('fc-pol-amdt-3', 'deck-polity', 'amendments', 'Constitutional Amendments',
 'What does the 73rd Amendment (1992) relate to?',
 'Gave constitutional status to Panchayati Raj institutions. Mandated three-tier structure: Gram Panchayat, Panchayat Samiti, and Zila Parishad. Added Part IX (Articles 243–243O).',
 'Easy'),

('fc-pol-amdt-4', 'deck-polity', 'amendments', 'Constitutional Amendments',
 'What are the three lists in the Seventh Schedule?',
 'Union List (97 subjects — exclusive Parliament jurisdiction), State List (66 subjects — exclusive State jurisdiction), Concurrent List (47 subjects — both can legislate; Centre prevails on conflict).',
 'Easy'),

('fc-pol-amdt-5', 'deck-polity', 'amendments', 'Constitutional Amendments',
 'What did the 61st Amendment Act (1988) do?',
 'Reduced the voting age from 21 years to 18 years for elections to Lok Sabha and State Legislative Assemblies.',
 'Medium'),

-- Fundamental Rights & DPSPs
('fc-pol-fr-1', 'deck-polity', 'fr-dpsp', 'Fundamental Rights & DPSPs',
 'Under which Article can the President suspend Fundamental Rights during National Emergency?',
 'Article 359 allows suspension of right to move courts for enforcement of FRs (except Articles 20 and 21) during National Emergency. Art 20 (protection against conviction) and 21 (right to life) can NEVER be suspended.',
 'Hard'),

('fc-pol-fr-2', 'deck-polity', 'fr-dpsp', 'Fundamental Rights & DPSPs',
 'What is the doctrine of basic structure?',
 'Established in Kesavananda Bharati v. State of Kerala (1973): Parliament cannot amend the Constitution to destroy its basic features. Includes supremacy of Constitution, republican democracy, federalism, secularism, separation of powers, judicial review.',
 'Hard'),

('fc-pol-fr-3', 'deck-polity', 'fr-dpsp', 'Fundamental Rights & DPSPs',
 'Which Part and Articles deal with Directive Principles of State Policy?',
 'Part IV (Articles 36–51). Non-justiciable (not enforceable by courts) but fundamental in governance. Article 37 states they shall be applied in making laws. Inspired by Irish Constitution.',
 'Easy'),

('fc-pol-fr-4', 'deck-polity', 'fr-dpsp', 'Fundamental Rights & DPSPs',
 'What is the difference between Article 32 and Article 226?',
 'Article 32 (Supreme Court): Right to constitutional remedies for FRs only — itself a Fundamental Right. Article 226 (High Courts): Broader power — can issue writs for FRs or any other legal right.',
 'Medium'),

-- Parliament
('fc-pol-parl-1', 'deck-polity', 'parliament', 'Parliament & State Legislature',
 'What is the maximum strength of Rajya Sabha?',
 '250 members: 238 elected by State and UT Legislative Assemblies using Single Transferable Vote, 12 nominated by President for distinguished service in art, literature, science, social service.',
 'Easy'),

('fc-pol-parl-2', 'deck-polity', 'parliament', 'Parliament & State Legislature',
 'What is a Money Bill under Article 110?',
 'Contains only provisions dealing with taxation, borrowing by government, appropriation, custody of Consolidated Fund. Introduced only in Lok Sabha. Rajya Sabha can only recommend (not binding). Speaker certifies it.',
 'Medium'),

('fc-pol-parl-3', 'deck-polity', 'parliament', 'Parliament & State Legislature',
 'What is the quorum required for Lok Sabha?',
 'One-tenth of total membership = 55 members (for 543-member Lok Sabha). Speaker can adjourn if quorum is not present.',
 'Medium'),

-- Judiciary
('fc-pol-jud-1', 'deck-polity', 'judiciary', 'Judiciary & Supreme Court',
 'Name and explain all five writs under Article 32.',
 'Habeas Corpus (produce the body — illegal detention); Mandamus (we command — compel public duty); Prohibition (stop inferior court exceeding jurisdiction); Certiorari (quash inferior court order); Quo Warranto (challenge authority to hold public office).',
 'Medium'),

('fc-pol-jud-2', 'deck-polity', 'judiciary', 'Judiciary & Supreme Court',
 'Under what Article does the Supreme Court have advisory jurisdiction?',
 'Article 143 — President can refer a question of law or fact of public importance to SC for its opinion. SC may give or refuse to give its opinion. Opinion is not binding.',
 'Medium'),

-- Centre-State
('fc-pol-cs-1', 'deck-polity', 'centre-state', 'Centre-State Relations',
 'What is the Sarkaria Commission and its key recommendations?',
 'Set up 1983, reported 1988. Recommended: Inter-State Council be constituted; Article 356 be used sparingly; Governors be neutral; residuary powers stay with Centre; three-language formula.',
 'Hard')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 3. FLASHCARDS — Modern History
-- ─────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, topic_id, topic, question, answer, difficulty) VALUES
('fc-his-1857-1', 'deck-history', 'revolt-1857', 'Revolt of 1857',
 'Where did the Revolt of 1857 begin and what was the immediate cause?',
 'Began at Meerut on May 10, 1857. Immediate cause: introduction of Enfield rifles with cartridges greased with cow and pig fat — offensive to both Hindu and Muslim sepoys.',
 'Easy'),

('fc-his-1857-2', 'deck-history', 'revolt-1857', 'Revolt of 1857',
 'Name four key centres and their leaders in the Revolt of 1857.',
 'Delhi — Bahadur Shah Zafar; Lucknow — Begum Hazrat Mahal; Kanpur — Nana Saheb; Jhansi — Rani Lakshmibai; Bihar (Arrah) — Kunwar Singh.',
 'Medium'),

('fc-his-1857-3', 'deck-history', 'revolt-1857', 'Revolt of 1857',
 'What were the long-term consequences of the Revolt of 1857?',
 'East India Company dissolved (GoI Act 1858). Queen Victoria''s Proclamation assured non-interference in religion. Indian Civil Services opened to Indians. Policy of divide and rule intensified. Army reorganised with more British officers.',
 'Hard'),

('fc-his-fm-1', 'deck-history', 'freedom-movement', 'Freedom Movement',
 'What was the significance of the 1905 Partition of Bengal?',
 'Curzon partitioned Bengal into East Bengal & Assam (Muslim majority) and West Bengal (Hindu majority). Led to Swadeshi Movement, boycott of British goods, rise of extremist nationalism. Partition annulled in 1911.',
 'Medium'),

('fc-his-fm-2', 'deck-history', 'freedom-movement', 'Freedom Movement',
 'What was the Rowlatt Act (1919) and why was it opposed?',
 'Allowed detention without trial for up to 2 years. No right to appeal. Led to massive protests. Called "Black Act." Led to Jallianwala Bagh massacre (April 13, 1919) — General Dyer ordered firing on peaceful crowd, ~400 killed.',
 'Medium'),

('fc-his-fm-3', 'deck-history', 'freedom-movement', 'Freedom Movement',
 'What was the significance of the Lucknow Pact (1916)?',
 'Congress and Muslim League came together. Congress accepted separate electorates for Muslims. Demanded self-government and dominion status. Tilak-Jinnah cooperation. Reunification of moderate and extremist factions.',
 'Hard'),

('fc-his-gandhi-1', 'deck-history', 'gandhi-movements', 'Gandhian Movements',
 'What were the key features of the Non-Cooperation Movement (1920–22)?',
 'Surrender of titles, boycott of civil services, courts, legislatures, foreign goods, educational institutions. Ended after Chauri Chaura violence (Feb 1922) where mob burned police station, killing 22 policemen.',
 'Easy'),

('fc-his-gandhi-2', 'deck-history', 'gandhi-movements', 'Gandhian Movements',
 'What was the Civil Disobedience Movement (1930)?',
 'Began with Dandi March (March 12–April 6, 1930) — Gandhi walked 241 miles to make salt, defying Salt Law. Led to mass civil disobedience nationwide. Resulted in Gandhi-Irwin Pact (1931).',
 'Medium'),

('fc-his-gandhi-3', 'deck-history', 'gandhi-movements', 'Gandhian Movements',
 'What was the Quit India Movement (1942) and why did it fail initially?',
 'Launched August 8, 1942 after Cripps Mission failure. "Do or Die" slogan. All Congress leaders immediately arrested. Leaderless movement turned violent in many places. Crushed within 6 weeks. But proved British could not hold India after the war.',
 'Hard'),

('fc-his-sr-1', 'deck-history', 'socio-religious', 'Socio-Religious Reforms',
 'Name three key reforms by Raja Ram Mohan Roy and Brahmo Samaj.',
 'Abolition of Sati (1829, supported Bentinck''s Regulation XVII). Widow remarriage. English education. Opposed child marriage. Founded Brahmo Samaj (1828). Published Sambad Kaumudi.',
 'Easy'),

('fc-his-sr-2', 'deck-history', 'socio-religious', 'Socio-Religious Reforms',
 'What was the contribution of Arya Samaj to Indian society?',
 'Founded by Dayananda Saraswati (1875). Slogan "Back to Vedas". Opposed idol worship, caste rigidity, child marriage. Started Shuddhi movement. Established DAV schools. Promoted Hindi. Strong in Punjab.',
 'Medium')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 4. FLASHCARDS — Geography
-- ─────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, topic_id, topic, question, answer, difficulty) VALUES
('fc-geo-riv-1', 'deck-geography', 'rivers', 'Indian Rivers',
 'Differentiate between Himalayan and Peninsular rivers.',
 'Himalayan: perennial (snow+rain-fed), long, large basins, meander, navigable. Examples: Ganga, Indus, Brahmaputra. Peninsular: seasonal (rain-fed), shorter, hard rock beds, flow in valleys. Examples: Godavari, Krishna, Cauvery.',
 'Easy'),

('fc-geo-riv-2', 'deck-geography', 'rivers', 'Indian Rivers',
 'Why is the Kosi called "Sorrow of Bihar"?',
 'Kosi has shifted ~120km westward over 250 years. Deposits huge sediment, changes course frequently, causing devastating floods every year in Bihar.',
 'Medium'),

('fc-geo-riv-3', 'deck-geography', 'rivers', 'Indian Rivers',
 'What is the Brahmaputra known as in China and Bangladesh?',
 'China: Yarlung Tsangpo (originates from Angsi Glacier in Tibet ~5,300m). Bangladesh: Jamuna (after merging with Tista). Joins Ganga at Goalundo Ghat forming Padma. World''s largest river by volume in Bangladesh.',
 'Medium'),

('fc-geo-cli-1', 'deck-geography', 'climate', 'Climate of India',
 'What are the four seasons of India according to IMD?',
 'Cold weather season (Dec–Feb), Hot weather season (Mar–May), Southwest Monsoon season (Jun–Sep), Retreating / Northeast Monsoon season (Oct–Nov).',
 'Easy'),

('fc-geo-cli-2', 'deck-geography', 'climate', 'Climate of India',
 'Explain the mechanism of the Southwest Monsoon.',
 'Differential heating creates low pressure over Thar Desert/Rajasthan, drawing moisture-laden winds from Indian Ocean. ITCZ shifts northward. Two branches: Arabian Sea branch (hits Western Ghats) and Bay of Bengal branch (hits northeast India).',
 'Medium'),

('fc-geo-cli-3', 'deck-geography', 'climate', 'Climate of India',
 'How does El Niño affect Indian monsoon?',
 'El Niño (warming of Pacific) weakens Indian Ocean temperature gradient, reducing moisture transport to India. Associated with below-normal monsoon and droughts. La Niña (cooling Pacific) associated with above-normal monsoon. Not a perfect correlation.',
 'Hard'),

('fc-geo-soil-1', 'deck-geography', 'soils', 'Soils of India',
 'Which soil type is most suited for cotton cultivation and why?',
 'Black soil (Regur / Black Cotton soil). Derived from Deccan basaltic lava. High moisture retention — swells when wet, cracks when dry. Rich in lime, iron, magnesia. Found in Deccan Plateau, Maharashtra, Gujarat, MP.',
 'Easy'),

('fc-geo-soil-2', 'deck-geography', 'soils', 'Soils of India',
 'What is laterite soil and where is it found?',
 'Formed by intense leaching in high temperature and heavy rainfall areas. Rich in iron and aluminium oxides. Low in humus, nitrogen, potash. Poor for cultivation. Found in Kerala, Karnataka, Tamil Nadu, Northeast India.',
 'Medium'),

('fc-geo-veg-1', 'deck-geography', 'vegetation', 'Natural Vegetation',
 'What type of forests are found in the Western Ghats and what makes them unique?',
 'Tropical Wet Evergreen Forests. Rainfall >200cm, temperature >22°C. Multi-layered canopy. Trees never shed leaves simultaneously. Rich biodiversity — one of 36 global biodiversity hotspots.',
 'Easy'),

('fc-geo-veg-2', 'deck-geography', 'vegetation', 'Natural Vegetation',
 'What are mangrove forests and where are the largest in India?',
 'Halophytic (salt-tolerant) forests in tidal zones. Roots above water (pneumatophores). Sundarbans (West Bengal) — world''s largest mangrove. Also in Andaman & Nicobar, Mahanadi delta. Important for coastal protection and fish nursery.',
 'Medium'),

('fc-geo-mtn-1', 'deck-geography', 'mountains', 'Mountains & Physiography',
 'Name the three ranges of the Himalayas and their key characteristics.',
 'Greater Himalayas (Himadri): highest, permanent snow, avg 6,000m. Middle Himalayas (Himachal): 3,700–4,500m, hill stations (Shimla, Mussoorie). Outer Himalayas (Shiwaliks): 900–1,100m, latest, soft rocks, prone to landslides.',
 'Medium'),

('fc-geo-mtn-2', 'deck-geography', 'mountains', 'Mountains & Physiography',
 'What is the Deccan Plateau and what type of rocks is it made of?',
 'Triangular plateau south of Vindhya-Satpura ranges. Oldest geological formation. Ancient crystalline igneous and metamorphic rocks. Partly covered by Deccan Traps (basaltic lava) in Maharashtra-Gujarat. Tilts west to east — most peninsular rivers flow east.',
 'Easy')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 5. FLASHCARDS — Indian Economy
-- ─────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, topic_id, topic, question, answer, difficulty) VALUES
('fc-eco-plan-1', 'deck-economy', 'planning', 'Economic Planning',
 'What replaced the Planning Commission and when?',
 'NITI Aayog (National Institution for Transforming India) replaced the Planning Commission on January 1, 2015. Key difference: NITI Aayog is advisory, not executive — cannot allocate funds. Finance Ministry and Cabinet control funding.',
 'Easy'),

('fc-eco-plan-2', 'deck-economy', 'planning', 'Economic Planning',
 'What is the difference between Fiscal Deficit and Revenue Deficit?',
 'Revenue Deficit = Revenue Expenditure − Revenue Receipts (deficit in day-to-day operations). Fiscal Deficit = Total Expenditure − Total Receipts excluding borrowings (total borrowing requirement). Primary Deficit = Fiscal Deficit − Interest Payments.',
 'Medium'),

('fc-eco-plan-3', 'deck-economy', 'planning', 'Economic Planning',
 'What is the FRBM Act and its key targets?',
 'Fiscal Responsibility and Budget Management Act (2003). NK Singh Committee (2017) recommended: Fiscal Deficit 2.5% of GDP; Debt/GDP ratio 60% (Centre 40%, States 20%). Escape clause allows deviation during national calamity, security threats.',
 'Hard'),

('fc-eco-bank-1', 'deck-economy', 'banking', 'Banking & Monetary Policy',
 'What are the instruments of Monetary Policy used by RBI?',
 'Quantitative: Repo Rate (RBI lends to banks), Reverse Repo Rate, CRR (Cash Reserve Ratio — % deposits kept with RBI), SLR (Statutory Liquidity Ratio — % held as liquid assets). Qualitative: Credit rationing, moral suasion, margin requirements.',
 'Easy'),

('fc-eco-bank-2', 'deck-economy', 'banking', 'Banking & Monetary Policy',
 'What is the difference between CRR and SLR?',
 'CRR: % of Net Demand and Time Liabilities kept as cash with RBI — earns no interest. SLR: % of NDTL maintained in liquid assets (cash, gold, govt securities) with bank itself — earns interest. Both control money supply.',
 'Medium'),

('fc-eco-bank-3', 'deck-economy', 'banking', 'Banking & Monetary Policy',
 'What are Non-Performing Assets (NPAs) and how are they classified?',
 'NPA: loan/advance where interest or principal is overdue for 90+ days. Sub-standard: NPA ≤12 months. Doubtful: NPA >12 months. Loss assets: identified as uncollectible. Gross NPA = total NPA before provisioning. Net NPA = Gross NPA minus provisions.',
 'Hard'),

('fc-eco-trade-1', 'deck-economy', 'trade', 'International Trade & BOP',
 'What is the difference between Balance of Trade and Balance of Payments?',
 'Balance of Trade: difference between merchandise (visible) exports and imports. Balance of Payments: all economic transactions — includes Current Account (goods, services, transfers) and Capital Account (FDI, FII, loans).',
 'Medium'),

('fc-eco-agri-1', 'deck-economy', 'agriculture', 'Agriculture & Food Security',
 'What is the Minimum Support Price (MSP) and who recommends it?',
 'Government-guaranteed minimum price for agricultural produce to protect farmers from price crashes. Recommended by Commission for Agricultural Costs and Prices (CACP). Applies to 22 mandated crops. Mostly operates through FCI and state agencies.',
 'Easy'),

('fc-eco-agri-2', 'deck-economy', 'agriculture', 'Agriculture & Food Security',
 'What are the features of PM-KISAN scheme?',
 'Pradhan Mantri Kisan Samman Nidhi (2019): ₹6,000/year in three ₹2,000 instalments to all landholding farmer families. Directly credited via DBT. Excludes institutional land holders, constitutional post holders, income taxpayers, professionals.',
 'Medium'),

('fc-eco-gdp-1', 'deck-economy', 'gdp', 'National Income & GDP',
 'What is the difference between GDP and GNP?',
 'GDP: value of all final goods/services produced within country''s boundaries. GNP = GDP + Net Factor Income from Abroad (income earned by residents abroad minus income earned by foreigners in India). GNP measures national income; GDP measures domestic production.',
 'Easy'),

('fc-eco-gdp-2', 'deck-economy', 'gdp', 'National Income & GDP',
 'What is GDP deflator and how is it different from CPI?',
 'GDP Deflator = (Nominal GDP / Real GDP) × 100. Measures price changes for all goods in GDP. CPI measures prices of a fixed consumer basket. GDP deflator has wider coverage but no fixed basket. RBI uses CPI for inflation targeting (4% ±2%).',
 'Medium')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 6. FLASHCARDS — Science & Tech
-- ─────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, topic_id, topic, question, answer, difficulty) VALUES
('fc-sci-space-1', 'deck-science', 'space', 'Space Technology',
 'What is the difference between geostationary and polar orbit satellites?',
 'Geostationary (GEO): 36,000km altitude, same angular velocity as Earth — appears stationary. Used for communication, weather (INSAT). Polar orbit: ~600-1000km, circles over poles — covers entire Earth. Used for earth observation (IRS), reconnaissance.',
 'Easy'),

('fc-sci-space-2', 'deck-science', 'space', 'Space Technology',
 'What are the key achievements of Chandrayaan missions?',
 'Chandrayaan-1 (2008): discovered water molecules on Moon. Chandrayaan-2 (2019): orbiter still operational; Vikram lander crashed. Chandrayaan-3 (2023): successful soft landing near south pole (Shiv Shakti point) — India first to land near lunar south pole.',
 'Medium'),

('fc-sci-space-3', 'deck-science', 'space', 'Space Technology',
 'What is the Aditya-L1 mission?',
 'India''s first dedicated solar observation mission (launched Sept 2023). Placed at Lagrangian point L1 (~1.5 million km from Earth). 7 payloads. Studies solar corona, solar wind, solar flares, CMEs. L1 allows unobstructed view of Sun.',
 'Hard'),

('fc-sci-bio-1', 'deck-science', 'biotech', 'Biotechnology',
 'What is CRISPR-Cas9 and its significance?',
 'Gene-editing tool that acts as "molecular scissors". Cas9 protein cuts DNA at precise locations guided by RNA. Can add, remove, or alter genes. Used in medicine (genetic diseases) and agriculture (crop improvement). Nobel Prize 2020 — Jennifer Doudna and Emmanuelle Charpentier.',
 'Medium'),

('fc-sci-bio-2', 'deck-science', 'biotech', 'Biotechnology',
 'What is the difference between mRNA vaccines and conventional vaccines?',
 'Conventional: introduce killed/weakened pathogen or its protein to trigger immunity. mRNA vaccines (Pfizer, Moderna): inject messenger RNA that instructs cells to produce viral spike protein — immune system learns to fight it. Cannot cause disease, does not alter DNA.',
 'Easy'),

('fc-sci-def-1', 'deck-science', 'defence', 'Defence Technology',
 'What is India''s DRDO? Name four major systems it has developed.',
 'Defence Research and Development Organisation. Key systems: Agni missile series (ballistic missiles), BrahMos (supersonic cruise missile, joint India-Russia), Akash (surface-to-air missile), Tejas (light combat aircraft), Arjun (main battle tank).',
 'Medium'),

('fc-sci-it-1', 'deck-science', 'it-cyber', 'IT & Cybersecurity',
 'What is Unified Payments Interface (UPI) and which body operates it?',
 'Real-time payment system launched 2016. Allows instant fund transfer between bank accounts via mobile. Regulated by RBI, operated by NPCI (National Payments Corporation of India). India accounts for ~40% of global real-time digital transactions.',
 'Easy'),

('fc-sci-it-2', 'deck-science', 'it-cyber', 'IT & Cybersecurity',
 'What are the three vision areas of India''s Digital India programme?',
 '1) Digital Infrastructure as Core Utility (broadband, mobile connectivity, e-governance), 2) Governance and Services on Demand (online services, digital literacy), 3) Digital Empowerment of Citizens. Key projects: UPI, Aadhaar, UMANG, DigiLocker.',
 'Medium')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 7. FLASHCARDS — Environment
-- ─────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, topic_id, topic, question, answer, difficulty) VALUES
('fc-env-clm-1', 'deck-environment', 'climate-agreements', 'Climate Agreements',
 'What are the key features of the Paris Agreement (2015)?',
 'Legally binding (unlike Kyoto for developing nations). Target: limit warming to well below 2°C, pursue 1.5°C. Each country submits NDCs updated every 5 years. No enforcement mechanism. India''s NDC: 45% reduction in emission intensity by 2030 vs 2005, 50% electricity from non-fossil sources.',
 'Easy'),

('fc-env-clm-2', 'deck-environment', 'climate-agreements', 'Climate Agreements',
 'What is the difference between mitigation and adaptation in climate change?',
 'Mitigation: reducing GHG emissions or enhancing carbon sinks to limit temperature rise. Adaptation: adjusting to actual/expected climate effects to reduce harm. Developed countries responsible for mitigation (historical emissions); developing countries need adaptation support.',
 'Medium'),

('fc-env-clm-3', 'deck-environment', 'climate-agreements', 'Climate Agreements',
 'What is Loss and Damage in climate negotiations?',
 'Negative impacts of climate change beyond adaptation capacity — irreversible losses (glaciers, biodiversity) and damages from extreme events. COP27 (2022) established Loss and Damage Fund. Key demand of vulnerable developing nations.',
 'Hard'),

('fc-env-bio-1', 'deck-environment', 'biodiversity', 'Biodiversity & Conservation',
 'What are the two main international conventions on biodiversity?',
 'CBD (Convention on Biological Diversity, 1992): conservation, sustainable use, fair sharing of benefits. Kunming-Montreal Global Biodiversity Framework (2022): 30×30 target — protect 30% of land and oceans by 2030. Ramsar Convention (1971): protection of wetlands.',
 'Easy'),

('fc-env-bio-2', 'deck-environment', 'biodiversity', 'Biodiversity & Conservation',
 'What is Project Tiger and what are its key achievements?',
 'Launched 1973 in response to tiger decline. Creates tiger reserves with core zone (no human activity) and buffer zone. NTCA oversees. India has ~70% of world''s wild tigers (~3,500 in 2022 census). Tiger count tripled since 1973. 54 tiger reserves.',
 'Medium'),

('fc-env-bio-3', 'deck-environment', 'biodiversity', 'Biodiversity & Conservation',
 'What is the Nagoya Protocol and why is it significant?',
 'Supplementary agreement to CBD (2010, in force 2014). Access and Benefit-Sharing (ABS) from genetic resources. Countries must ensure fair sharing of benefits with traditional knowledge communities. Prevents biopiracy.',
 'Hard'),

('fc-env-pol-1', 'deck-environment', 'pollution', 'Pollution & Waste Management',
 'What is PM2.5 and why is it more dangerous than PM10?',
 'PM2.5: particulate matter ≤2.5 micrometers. More dangerous: penetrates deep into lungs, enters bloodstream, can reach brain. Causes respiratory disease, cardiovascular disease, cancer. India standard: 40μg/m³ annual vs WHO guideline 5μg/m³.',
 'Medium'),

('fc-env-pol-2', 'deck-environment', 'pollution', 'Pollution & Waste Management',
 'What is Extended Producer Responsibility (EPR)?',
 'Policy where producers bear financial/physical responsibility for post-consumer product disposal. Plastic Waste Management Rules 2022 made EPR mandatory for plastic packaging producers. Shifts waste management cost from municipalities to producers.',
 'Easy'),

('fc-env-law-1', 'deck-environment', 'environmental-laws', 'Environmental Laws',
 'What does the Environment Protection Act (1986) empower the government to do?',
 'EPA 1986 (umbrella legislation post-Bhopal gas tragedy): empowers Central Government to protect and improve environment. Can set emission/discharge standards. Can restrict activities in certain areas. National Green Tribunal (NGT) handles environmental disputes.',
 'Medium'),

('fc-env-law-2', 'deck-environment', 'environmental-laws', 'Environmental Laws',
 'What is the Precautionary Principle in environmental law?',
 'Where there is serious or irreversible threat to environment, lack of scientific certainty cannot justify postponing protective measures. Part of Rio Declaration (1992) Principle 15. Applied by Indian courts and NGT. Burden of proof on those proposing potentially harmful activity.',
 'Easy')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 8. FLASHCARDS — GS IV Ethics
-- ─────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, topic_id, topic, question, answer, difficulty) VALUES
('fc-eth-found-1', 'deck-ethics', 'foundations', 'Foundations of Ethics',
 'Distinguish between ethical relativism and ethical absolutism with examples.',
 'Ethical relativism: moral judgments are relative to culture — no universal right/wrong. Example: euthanasia acceptable in Netherlands, not in India. Ethical absolutism: some actions are always right/wrong. Example: torture is always wrong. UPSC favours nuanced view: cultural sensitivity + universal human rights.',
 'Medium'),

('fc-eth-found-2', 'deck-ethics', 'foundations', 'Foundations of Ethics',
 'Explain Kant''s Categorical Imperative and its relevance to public service.',
 'Kant: act only according to maxims you could will to become universal law. Two formulations: Universalisability (act only as you''d want everyone to); Treat humanity never merely as means but always as an end. Relevance: public servants must treat citizens as ends, not exploit them.',
 'Hard'),

('fc-eth-found-3', 'deck-ethics', 'foundations', 'Foundations of Ethics',
 'What is utilitarian ethics and what is its main criticism?',
 'Utilitarianism (Bentham, Mill): greatest good of greatest number. Judge actions by consequences — maximise overall happiness. Criticism: can justify sacrificing minority rights for majority benefit; ignores distribution of happiness; "ends justify means" problem.',
 'Medium'),

('fc-eth-cs-1', 'deck-ethics', 'civil-services', 'Ethics in Civil Services',
 'What are the Seven Principles of Public Life (Nolan Principles)?',
 'Selflessness, Integrity, Objectivity, Accountability, Openness, Honesty, Leadership. Formulated by Nolan Committee (UK, 1995). Widely referenced in India. Key: Selflessness means acting in public interest, not personal gain.',
 'Easy'),

('fc-eth-cs-2', 'deck-ethics', 'civil-services', 'Ethics in Civil Services',
 'What is the difference between ethics and integrity in public service?',
 'Ethics: system of moral principles guiding behaviour — what is right/wrong. Integrity: consistent alignment between values, words and actions; doing right even when unobserved. An official may know ethics but lack integrity if they don''t act accordingly.',
 'Medium'),

('fc-eth-eq-1', 'deck-ethics', 'emotional-intelligence', 'Emotional Intelligence',
 'What are the five components of Emotional Intelligence (Daniel Goleman)?',
 '1) Self-awareness (knowing your emotions), 2) Self-regulation (managing emotions), 3) Motivation (internal drive), 4) Empathy (understanding others'' emotions), 5) Social skills (managing relationships). EQ often more important than IQ for leadership.',
 'Easy'),

('fc-eth-eq-2', 'deck-ethics', 'emotional-intelligence', 'Emotional Intelligence',
 'How does emotional intelligence help in conflict resolution for civil servants?',
 'Self-awareness: recognise own biases. Empathy: understand all parties'' perspectives. Self-regulation: remain calm, avoid reactive decisions. Social skills: facilitate dialogue, find common ground. Example: handling communal tensions requires EQ to listen to all sides and de-escalate.',
 'Medium'),

('fc-eth-case-1', 'deck-ethics', 'case-studies', 'Case Studies & Dilemmas',
 'What is the "whistleblower''s dilemma" and how should it be resolved?',
 'Conflict between loyalty to organisation and duty to public interest. Resolution: distinguish illegal activity (must report) vs policy differences (raise internally). Use prescribed channels first. Whistleblowers'' Protection Act 2014 provides safeguards. Integrity must outweigh fear when public interest is at stake.',
 'Hard'),

('fc-eth-case-2', 'deck-ethics', 'case-studies', 'Case Studies & Dilemmas',
 'What is the difference between personal ethics and professional ethics for a civil servant?',
 'Personal ethics: values from family, religion, culture — subjective. Professional ethics: standards prescribed by service, constitution, and law — objective, non-negotiable. Must implement law professionally even if personal values differ, but can raise objections through proper channels.',
 'Medium')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 9. FLASHCARDS — Current Affairs
-- ─────────────────────────────────────────────

INSERT INTO flashcards (id, deck_id, topic_id, topic, question, answer, difficulty) VALUES
('fc-ca-ir-1', 'deck-current-affairs', 'international', 'International Relations',
 'What is India''s "Neighbourhood First" policy and its key elements?',
 'Prioritises relations with SAARC neighbours. Key elements: connectivity (road, rail, digital), development assistance (credit lines to Nepal, Bangladesh, Sri Lanka), power trading, people-to-people ties. Challenges: China''s BRI influence, trust deficit with Pakistan.',
 'Medium'),

('fc-ca-ir-2', 'deck-current-affairs', 'international', 'International Relations',
 'What is the Quad and what are its key areas of cooperation?',
 'Quadrilateral Security Dialogue — India, USA, Japan, Australia. Not a military alliance. Focus: free and open Indo-Pacific, COVID vaccines (QUAD vaccine initiative), climate change, critical technology (semiconductors), cybersecurity, infrastructure (alternative to BRI), maritime security.',
 'Hard'),

('fc-ca-eco-1', 'deck-current-affairs', 'economy-policy', 'Economic Policy',
 'What is the Production Linked Incentive (PLI) scheme?',
 'Launched 2020. Gives incentives based on incremental sales from products manufactured in India over base year. Aims to make India global manufacturing hub, reduce import dependence. Initially 13 sectors including mobile phones, pharma, auto, textile, solar panels, food processing.',
 'Easy'),

('fc-ca-eco-2', 'deck-current-affairs', 'economy-policy', 'Economic Policy',
 'What is the PM Gati Shakti National Master Plan?',
 'Launched 2021. GIS-based digital platform integrating 16 ministries'' infrastructure planning. Eliminates silos in infrastructure development. Maps existing and upcoming infrastructure — roads, railways, waterways, ports, airports. Uses satellite imagery for real-time monitoring.',
 'Medium'),

('fc-ca-gov-1', 'deck-current-affairs', 'governance', 'Governance Initiatives',
 'What are the key features of the National Education Policy (NEP) 2020?',
 'Replaces NPE 1986. Key features: 5+3+3+4 structure, mother tongue medium up to Grade 5, multidisciplinary higher education, academic bank of credits, multiple entry/exit, 50% GER in higher education by 2035, emphasis on vocational education from Grade 6.',
 'Medium'),

('fc-ca-gov-2', 'deck-current-affairs', 'governance', 'Governance Initiatives',
 'What is India''s National Quantum Mission (2023)?',
 '₹6,003 crore mission (2023-31). Aims to make India among top 6 nations in quantum technology. Four hubs: quantum computing (IISc), communication (IIT Madras), sensing & metrology (IIT Bombay), materials & devices (IIT Delhi). Target: 50-qubit computer in 3 years.',
 'Hard'),

('fc-ca-soc-1', 'deck-current-affairs', 'social', 'Social Issues',
 'What are the key provisions of the Digital Personal Data Protection Act (2023)?',
 'India''s first comprehensive data protection law. Data principal rights: access info, correction, erasure, grievance redressal. Data fiduciary duties: accurate data, security safeguards, notify breaches. Consent required. Data Protection Board adjudicates disputes.',
 'Medium'),

('fc-ca-tech-1', 'deck-current-affairs', 'technology-policy', 'Technology & Policy',
 'What is India''s G20 Presidency theme (2023) and key outcomes?',
 'Theme: "Vasudhaiva Kutumbakam — One Earth, One Family, One Future". Key outcomes: New Delhi Leaders'' Declaration with consensus on Ukraine; African Union inducted as permanent G20 member; Global Biofuel Alliance launched; Voice of Global South Summit; $1 trillion climate finance for developing nations by 2030.',
 'Hard')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 10. MINDMAP SUBJECTS
-- ─────────────────────────────────────────────

-- Remove any auto-ID subjects so our stable IDs take effect
DELETE FROM mindmap_subjects
WHERE slug IN ('indian-polity','modern-history','geography','indian-economy','environment')
  AND id NOT IN ('msub-polity','msub-history','msub-geography','msub-economy','msub-environment');

INSERT INTO mindmap_subjects (id, name, slug, icon) VALUES
  ('msub-polity',      'Indian Polity',    'indian-polity',   '🏛️'),
  ('msub-history',     'Modern History',   'modern-history',  '📜'),
  ('msub-geography',   'Geography',        'geography',       '🌍'),
  ('msub-economy',     'Indian Economy',   'indian-economy',  '💰'),
  ('msub-environment', 'Environment',      'environment',     '🌿')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 11. MINDMAPS — Indian Polity
-- ─────────────────────────────────────────────

INSERT INTO mindmaps (id, subject_id, title, slug, branches, nodes, quiz_data) VALUES
('mm-parl', 'msub-polity', 'Structure of Parliament', 'structure-of-parliament',
 '[{"name":"Lok Sabha","count":5,"color":"#3B82F6"},{"name":"Rajya Sabha","count":5,"color":"#A855F7"},{"name":"Sessions","count":4,"color":"#F59E0B"},{"name":"Legislation","count":4,"color":"#10B981"},{"name":"Key Officers","count":3,"color":"#EC4899"}]',
 '{"center":"Parliament","branches":[{"x":"35%","y":"28%","label":"Lok Sabha","color":"#3B82F6"},{"x":"65%","y":"28%","label":"Rajya Sabha","color":"#A855F7"},{"x":"20%","y":"58%","label":"Key Officers","color":"#EC4899"},{"x":"63%","y":"68%","label":"Sessions","color":"#F59E0B"},{"x":"42%","y":"74%","label":"Legislation","color":"#10B981"}]}',
 '[{"question":"Who is the presiding officer of Lok Sabha?","options":["President","Speaker","Prime Minister","Vice President"],"correctAnswer":"Speaker"},{"question":"What is the maximum strength of Rajya Sabha?","options":["250","245","552","545"],"correctAnswer":"250"},{"question":"Which article deals with Parliament of India?","options":["Article 79","Article 80","Article 81","Article 75"],"correctAnswer":"Article 79"},{"question":"How many members can the President nominate to Rajya Sabha?","options":["2","6","12","15"],"correctAnswer":"12"}]'),

('mm-fr', 'msub-polity', 'Fundamental Rights', 'fundamental-rights',
 '[{"name":"Right to Equality","count":5,"color":"#3B82F6"},{"name":"Right to Freedom","count":6,"color":"#10B981"},{"name":"Right against Exploitation","count":2,"color":"#F59E0B"},{"name":"Right to Religion","count":4,"color":"#A855F7"},{"name":"Cultural & Educational","count":2,"color":"#EC4899"}]',
 '{"center":"Fundamental Rights","branches":[{"x":"30%","y":"25%","label":"Right to Equality","color":"#3B82F6"},{"x":"68%","y":"25%","label":"Right to Freedom","color":"#10B981"},{"x":"18%","y":"60%","label":"Anti-Exploitation","color":"#F59E0B"},{"x":"60%","y":"70%","label":"Right to Religion","color":"#A855F7"},{"x":"42%","y":"76%","label":"Cultural Rights","color":"#EC4899"}]}',
 '[{"question":"Which Part of the Constitution deals with Fundamental Rights?","options":["Part II","Part III","Part IV","Part V"],"correctAnswer":"Part III"},{"question":"Right to Property is now a —","options":["Fundamental Right","Legal Right","Constitutional Right","Natural Right"],"correctAnswer":"Legal Right"},{"question":"Which article abolishes untouchability?","options":["Article 14","Article 15","Article 17","Article 19"],"correctAnswer":"Article 17"},{"question":"Article 19 gives freedom of speech to —","options":["All persons","Citizens only","Resident foreigners","All adults"],"correctAnswer":"Citizens only"}]'),

('mm-dpsp', 'msub-polity', 'Directive Principles', 'directive-principles',
 '[{"name":"Socialistic Principles","count":6,"color":"#3B82F6"},{"name":"Gandhian Principles","count":5,"color":"#10B981"},{"name":"Liberal Principles","count":4,"color":"#F59E0B"},{"name":"Conflict with FRs","count":3,"color":"#A855F7"}]',
 '{"center":"DPSPs","branches":[{"x":"28%","y":"28%","label":"Socialistic","color":"#3B82F6"},{"x":"70%","y":"28%","label":"Gandhian","color":"#10B981"},{"x":"28%","y":"68%","label":"Liberal","color":"#F59E0B"},{"x":"70%","y":"68%","label":"FR Conflict","color":"#A855F7"}]}',
 '[{"question":"DPSPs are contained in which Part of the Constitution?","options":["Part III","Part IV","Part IV-A","Part V"],"correctAnswer":"Part IV"},{"question":"Which article mandates Equal Pay for Equal Work?","options":["Article 38","Article 39","Article 40","Article 41"],"correctAnswer":"Article 39"},{"question":"DPSPs were borrowed from the constitution of —","options":["USA","UK","Ireland","Canada"],"correctAnswer":"Ireland"}]'),

('mm-emergency', 'msub-polity', 'Emergency Provisions', 'emergency-provisions',
 '[{"name":"National Emergency (352)","count":5,"color":"#EF4444"},{"name":"Presidents Rule (356)","count":4,"color":"#F59E0B"},{"name":"Financial Emergency (360)","count":3,"color":"#3B82F6"},{"name":"44th Amendment Effects","count":4,"color":"#10B981"}]',
 '{"center":"Emergency","branches":[{"x":"28%","y":"28%","label":"Nat. Emergency","color":"#EF4444"},{"x":"70%","y":"28%","label":"Prez Rule","color":"#F59E0B"},{"x":"28%","y":"68%","label":"Fin. Emergency","color":"#3B82F6"},{"x":"70%","y":"68%","label":"44th Amdt","color":"#10B981"}]}',
 '[{"question":"National Emergency under Article 352 can be proclaimed on grounds of —","options":["War only","War, External Aggression, Armed Rebellion","Natural Disaster","Economic Crisis"],"correctAnswer":"War, External Aggression, Armed Rebellion"},{"question":"Presidents Rule can be imposed initially for —","options":["6 months","1 year","2 years","3 years"],"correctAnswer":"6 months"},{"question":"Financial Emergency has never been declared in India.","options":["True","False"],"correctAnswer":"True"}]'),

('mm-pri', 'msub-polity', 'Panchayati Raj', 'panchayati-raj',
 '[{"name":"73rd Amendment","count":5,"color":"#10B981"},{"name":"Three-Tier Structure","count":4,"color":"#3B82F6"},{"name":"State Finance Commission","count":3,"color":"#F59E0B"},{"name":"Reservation Provisions","count":3,"color":"#A855F7"}]',
 '{"center":"Panchayati Raj","branches":[{"x":"28%","y":"28%","label":"73rd Amdt","color":"#10B981"},{"x":"70%","y":"28%","label":"Three-Tier","color":"#3B82F6"},{"x":"28%","y":"68%","label":"State FC","color":"#F59E0B"},{"x":"70%","y":"68%","label":"Reservations","color":"#A855F7"}]}',
 '[{"question":"The 73rd Amendment is related to —","options":["Urban Local Bodies","Panchayati Raj Institutions","Co-operative Societies","Scheduled Tribes"],"correctAnswer":"Panchayati Raj Institutions"},{"question":"Gram Sabha is defined under which article?","options":["Article 243A","Article 243B","Article 243C","Article 243D"],"correctAnswer":"Article 243A"},{"question":"74th Amendment deals with —","options":["Panchayati Raj","Urban Local Bodies","Cooperative Societies","Election Commission"],"correctAnswer":"Urban Local Bodies"}]')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 12. MINDMAPS — Modern History
-- ─────────────────────────────────────────────

INSERT INTO mindmaps (id, subject_id, title, slug, branches, nodes, quiz_data) VALUES
('mm-inc', 'msub-history', 'Indian National Congress', 'indian-national-congress',
 '[{"name":"Formation (1885)","count":4,"color":"#3B82F6"},{"name":"Moderate Phase","count":4,"color":"#10B981"},{"name":"Extremist Phase","count":4,"color":"#EF4444"},{"name":"Gandhi Era","count":5,"color":"#F59E0B"}]',
 '{"center":"INC","branches":[{"x":"28%","y":"28%","label":"Formation","color":"#3B82F6"},{"x":"70%","y":"28%","label":"Moderates","color":"#10B981"},{"x":"28%","y":"68%","label":"Extremists","color":"#EF4444"},{"x":"70%","y":"68%","label":"Gandhi Era","color":"#F59E0B"}]}',
 '[{"question":"Who founded the Indian National Congress in 1885?","options":["Bal Gangadhar Tilak","A.O. Hume","Dadabhai Naoroji","Gopal Krishna Gokhale"],"correctAnswer":"A.O. Hume"},{"question":"The partition of Bengal was done in which year?","options":["1903","1905","1907","1911"],"correctAnswer":"1905"},{"question":"The Surat Split (1907) divided INC into —","options":["Radicals and Liberals","Moderates and Extremists","Congress and League","Socialists and Capitalists"],"correctAnswer":"Moderates and Extremists"}]'),

('mm-1857', 'msub-history', 'Revolt of 1857', 'revolt-of-1857',
 '[{"name":"Causes","count":5,"color":"#EF4444"},{"name":"Key Centres","count":4,"color":"#3B82F6"},{"name":"Leaders","count":5,"color":"#A855F7"},{"name":"Aftermath","count":4,"color":"#10B981"}]',
 '{"center":"1857 Revolt","branches":[{"x":"28%","y":"28%","label":"Causes","color":"#EF4444"},{"x":"70%","y":"28%","label":"Key Centres","color":"#3B82F6"},{"x":"28%","y":"68%","label":"Leaders","color":"#A855F7"},{"x":"70%","y":"68%","label":"Aftermath","color":"#10B981"}]}',
 '[{"question":"The Revolt of 1857 began at —","options":["Delhi","Meerut","Lucknow","Kanpur"],"correctAnswer":"Meerut"},{"question":"Who was the Governor-General during the Revolt of 1857?","options":["Lord Dalhousie","Lord Canning","Lord Curzon","Lord Wellesley"],"correctAnswer":"Lord Canning"},{"question":"Rani Lakshmibai was the queen of —","options":["Kanpur","Lucknow","Jhansi","Gwalior"],"correctAnswer":"Jhansi"}]'),

('mm-gandhi', 'msub-history', 'Gandhian Movements', 'gandhian-movements',
 '[{"name":"Non-Cooperation (1920)","count":5,"color":"#3B82F6"},{"name":"Civil Disobedience (1930)","count":5,"color":"#10B981"},{"name":"Quit India (1942)","count":4,"color":"#EF4444"},{"name":"Satyagraha Principles","count":4,"color":"#F59E0B"}]',
 '{"center":"Gandhis Movements","branches":[{"x":"25%","y":"25%","label":"Non-Cooperation","color":"#3B82F6"},{"x":"70%","y":"25%","label":"Civil Disobedience","color":"#10B981"},{"x":"25%","y":"70%","label":"Quit India","color":"#EF4444"},{"x":"70%","y":"70%","label":"Satyagraha","color":"#F59E0B"}]}',
 '[{"question":"The Non-Cooperation Movement was withdrawn after —","options":["Jallianwala Bagh","Chauri Chaura","Lahore Conspiracy","Simon Commission"],"correctAnswer":"Chauri Chaura"},{"question":"Gandhi launched Dandi March on —","options":["March 12, 1930","January 26, 1930","August 9, 1942","April 13, 1919"],"correctAnswer":"March 12, 1930"},{"question":"Do or Die slogan was associated with which movement?","options":["Non-Cooperation","Civil Disobedience","Quit India","Swadeshi"],"correctAnswer":"Quit India"}]')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 13. MINDMAPS — Geography
-- ─────────────────────────────────────────────

INSERT INTO mindmaps (id, subject_id, title, slug, branches, nodes, quiz_data) VALUES
('mm-rivers', 'msub-geography', 'Indian Rivers', 'indian-rivers',
 '[{"name":"Himalayan Rivers","count":5,"color":"#3B82F6"},{"name":"Peninsular Rivers","count":5,"color":"#10B981"},{"name":"River Basins","count":4,"color":"#F59E0B"},{"name":"River Disputes","count":3,"color":"#EF4444"}]',
 '{"center":"Indian Rivers","branches":[{"x":"28%","y":"28%","label":"Himalayan","color":"#3B82F6"},{"x":"70%","y":"28%","label":"Peninsular","color":"#10B981"},{"x":"28%","y":"68%","label":"River Basins","color":"#F59E0B"},{"x":"70%","y":"68%","label":"Disputes","color":"#EF4444"}]}',
 '[{"question":"Which river is known as the Sorrow of Bihar?","options":["Kosi","Gandak","Son","Mahananda"],"correctAnswer":"Kosi"},{"question":"The river Brahmaputra enters India through —","options":["Assam","Arunachal Pradesh","Meghalaya","Manipur"],"correctAnswer":"Arunachal Pradesh"},{"question":"Which is India''s longest river?","options":["Ganga","Indus","Godavari","Brahmaputra"],"correctAnswer":"Ganga"}]'),

('mm-climate', 'msub-geography', 'Climate of India', 'climate-of-india',
 '[{"name":"Monsoon System","count":5,"color":"#3B82F6"},{"name":"Seasons","count":4,"color":"#10B981"},{"name":"Climatic Regions","count":5,"color":"#F59E0B"},{"name":"El Nino / La Nina","count":3,"color":"#A855F7"}]',
 '{"center":"Indian Climate","branches":[{"x":"28%","y":"28%","label":"Monsoon","color":"#3B82F6"},{"x":"70%","y":"28%","label":"Seasons","color":"#10B981"},{"x":"28%","y":"68%","label":"Climatic Regions","color":"#F59E0B"},{"x":"70%","y":"68%","label":"El Nino","color":"#A855F7"}]}',
 '[{"question":"The southwest monsoon arrives in India first at —","options":["Mumbai","Chennai","Kerala","Goa"],"correctAnswer":"Kerala"},{"question":"Which type of rainfall does the Coromandel Coast receive mostly?","options":["Southwest Monsoon","Northeast Monsoon","Convectional","Orographic"],"correctAnswer":"Northeast Monsoon"},{"question":"Mawsynram (wettest place on Earth) lies in — hills.","options":["Garo","Khasi","Jaintia","Lushai"],"correctAnswer":"Khasi"}]'),

('mm-soils', 'msub-geography', 'Soils & Vegetation', 'soils-and-vegetation',
 '[{"name":"Alluvial Soils","count":4,"color":"#F59E0B"},{"name":"Black / Regur Soils","count":4,"color":"#374151"},{"name":"Forest Types","count":5,"color":"#10B981"},{"name":"Grasslands","count":3,"color":"#84CC16"}]',
 '{"center":"Soils & Vegetation","branches":[{"x":"28%","y":"28%","label":"Alluvial","color":"#F59E0B"},{"x":"70%","y":"28%","label":"Black Soil","color":"#374151"},{"x":"28%","y":"68%","label":"Forest Types","color":"#10B981"},{"x":"70%","y":"68%","label":"Grasslands","color":"#84CC16"}]}',
 '[{"question":"Black soil is best suited for growing —","options":["Rice","Wheat","Cotton","Jute"],"correctAnswer":"Cotton"},{"question":"Tropical Evergreen Forests are found where annual rainfall is —","options":[">200cm","100-200cm","50-100cm","<50cm"],"correctAnswer":">200cm"},{"question":"Laterite soil is found mainly in —","options":["Rajasthan","Kerala and Karnataka","Punjab","UP"],"correctAnswer":"Kerala and Karnataka"}]')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 14. MINDMAPS — Indian Economy
-- ─────────────────────────────────────────────

INSERT INTO mindmaps (id, subject_id, title, slug, branches, nodes, quiz_data) VALUES
('mm-banking', 'msub-economy', 'Banking & Monetary Policy', 'banking-monetary-policy',
 '[{"name":"RBI Structure","count":4,"color":"#3B82F6"},{"name":"Monetary Policy Tools","count":5,"color":"#10B981"},{"name":"Types of Banks","count":4,"color":"#F59E0B"},{"name":"Financial Inclusion","count":3,"color":"#A855F7"}]',
 '{"center":"Banking System","branches":[{"x":"28%","y":"28%","label":"RBI Structure","color":"#3B82F6"},{"x":"70%","y":"28%","label":"Monetary Tools","color":"#10B981"},{"x":"28%","y":"68%","label":"Types of Banks","color":"#F59E0B"},{"x":"70%","y":"68%","label":"Fin. Inclusion","color":"#A855F7"}]}',
 '[{"question":"RBI was nationalised in which year?","options":["1935","1947","1949","1955"],"correctAnswer":"1949"},{"question":"CRR is the percentage of deposits kept —","options":["As gold","As government securities","As cash with RBI","As foreign currency"],"correctAnswer":"As cash with RBI"},{"question":"The Monetary Policy Committee (MPC) has how many members?","options":["3","5","6","7"],"correctAnswer":"6"}]'),

('mm-gdp', 'msub-economy', 'GDP & Planning', 'gdp-and-planning',
 '[{"name":"Sectors of Economy","count":4,"color":"#3B82F6"},{"name":"National Income Concepts","count":5,"color":"#10B981"},{"name":"NITI Aayog vs Planning","count":4,"color":"#F59E0B"},{"name":"Fiscal Policy","count":4,"color":"#EF4444"}]',
 '{"center":"GDP & Planning","branches":[{"x":"28%","y":"25%","label":"Sectors","color":"#3B82F6"},{"x":"70%","y":"25%","label":"National Income","color":"#10B981"},{"x":"28%","y":"70%","label":"NITI Aayog","color":"#F59E0B"},{"x":"70%","y":"70%","label":"Fiscal Policy","color":"#EF4444"}]}',
 '[{"question":"NITI Aayog replaced Planning Commission in —","options":["2013","2014","2015","2016"],"correctAnswer":"2015"},{"question":"GDP deflator measures —","options":["Inflation in consumer goods","Price changes for all GDP goods","Import price changes","Real wages"],"correctAnswer":"Price changes for all GDP goods"},{"question":"Fiscal Deficit = Total Expenditure minus total receipts excluding —","options":["Grants","Borrowings","Tax revenue","Dividends"],"correctAnswer":"Borrowings"}]')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 15. MINDMAPS — Environment
-- ─────────────────────────────────────────────

INSERT INTO mindmaps (id, subject_id, title, slug, branches, nodes, quiz_data) VALUES
('mm-climate-agr', 'msub-environment', 'Climate Change & Agreements', 'climate-change-agreements',
 '[{"name":"UNFCCC & Kyoto","count":4,"color":"#3B82F6"},{"name":"Paris Agreement","count":5,"color":"#10B981"},{"name":"Indias NDC","count":4,"color":"#F59E0B"},{"name":"Loss & Damage","count":3,"color":"#EF4444"}]',
 '{"center":"Climate Agreements","branches":[{"x":"28%","y":"28%","label":"UNFCCC/Kyoto","color":"#3B82F6"},{"x":"70%","y":"28%","label":"Paris Agreement","color":"#10B981"},{"x":"28%","y":"68%","label":"Indias NDC","color":"#F59E0B"},{"x":"70%","y":"68%","label":"Loss & Damage","color":"#EF4444"}]}',
 '[{"question":"Paris Agreement targets limiting warming to —","options":["1 degree C","1.5 degree C (well below 2)","2 degree C","2.5 degree C"],"correctAnswer":"1.5 degree C (well below 2)"},{"question":"India''s updated NDC target for 2030 includes —","options":["Net zero by 2030","50% electricity from non-fossil sources","20% reduction in GDP emissions","100% renewable energy"],"correctAnswer":"50% electricity from non-fossil sources"},{"question":"Loss and Damage Fund was established at —","options":["COP26 Glasgow","COP27 Sharm el-Sheikh","COP28 Dubai","Rio+20"],"correctAnswer":"COP27 Sharm el-Sheikh"}]'),

('mm-biodiversity', 'msub-environment', 'Biodiversity Conservation', 'biodiversity-conservation',
 '[{"name":"Hotspots","count":4,"color":"#10B981"},{"name":"Protected Areas","count":4,"color":"#3B82F6"},{"name":"International Conventions","count":4,"color":"#A855F7"},{"name":"Flagship Species","count":4,"color":"#F59E0B"}]',
 '{"center":"Biodiversity","branches":[{"x":"28%","y":"28%","label":"Hotspots","color":"#10B981"},{"x":"70%","y":"28%","label":"Protected Areas","color":"#3B82F6"},{"x":"28%","y":"68%","label":"Intl Conventions","color":"#A855F7"},{"x":"70%","y":"68%","label":"Flagship Species","color":"#F59E0B"}]}',
 '[{"question":"How many biodiversity hotspots does India have?","options":["2","3","4","5"],"correctAnswer":"4"},{"question":"India''s tiger population in the 2022 census was approximately —","options":["1,500","2,500","3,500","4,500"],"correctAnswer":"3,500"},{"question":"The Ramsar Convention deals with protection of —","options":["Mangroves","Wetlands","Coral Reefs","Mountain Ecosystems"],"correctAnswer":"Wetlands"}]')

ON CONFLICT (id) DO NOTHING;
