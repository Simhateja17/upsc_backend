'use client';

import Image from 'next/image';
import Link from 'next/link';

// ─── Data ────────────────────────────────────────────────────────────────────

const principles = [
  {
    num: '01',
    iconSrc: '/principle-outcome.png',
    iconBg: '#fce7f3',
    title: 'Outcome-obsessed',
    body: "Every feature is evaluated on one question: does it improve how aspirants prepare and perform? We don't build for vanity metrics. We build for results. If a feature doesn't move the needle for an aspirant, it doesn't ship.",
  },
  {
    num: '02',
    iconSrc: '/principle-ai.png',
    iconBg: '#dbeafe',
    title: 'AI-first, human-always',
    body: "AI brings speed, 60-second mains evaluation, adaptive test generation, instant feedback. But UPSC demands judgment, not just knowledge. That's why every AI feature is grounded in deep, authentic UPSC domain understanding.",
  },
  {
    num: '03',
    emoji: '🇮🇳',
    iconBg: '#f1f5f9',
    title: 'India-first by design',
    body: "We build for the aspirant in Ranchi, Muzaffarpur, and Jalgaon, not just Rajendra Nagar. That means low-bandwidth compatibility, Hindi support, content grounded in India's Constitution and current affairs, and pricing that respects what it means to a family.",
  },
  {
    num: '04',
    iconSrc: '/principle-evidence.png',
    iconBg: '#f3e8ff',
    title: 'Evidence, not instinct',
    body: "Our adaptive test engine doesn't guess your weak areas, it calculates them from your actual response data. Our readiness score updates daily from real performance. Every recommendation is earned, not assumed.",
  },
  {
    num: '05',
    iconSrc: '/principle-community.png',
    iconBg: '#f3e8ff',
    title: 'Community over competition',
    body: 'UPSC is typically a solo journey. We disagree. Our live study rooms, peer review system, and leaderboards are built on the belief that aspirants who hold each other accountable clear the exam together. Alone we can do so little; together we rise so much higher.',
    bottomBorder: true,
  },
  {
    num: '06',
    iconSrc: '/principle-pricing.png',
    iconBg: '#dcfce7',
    title: 'Radically transparent pricing',
    body: 'Data storage, AI model training on UPSC-specific content, infrastructure, it all has real costs. We will only ever charge what it takes to keep this platform running and make it better. Not a rupee more. This is written into our DNA.',
  },
];

const timeline = [
  {
    emoji: '▶️',
    bg: '#dbeafe',
    tagBg: '#dbeafe',
    tagColor: '#1447e6',
    tagEmoji: '▶️',
    tagLabel: 'The spark',
    date: 'February 2025',
    title: 'The YouTube channel goes live',
    body: "Abhijeet publishes the first RiseWithJeet video. The premise is simple: high-quality UPSC content, completely free, for anyone with an internet connection. No paid courses locked behind a wall. No institute affiliation. Just clear, honest teaching for aspirants who deserve better. The early videos gain traction quickly, students bookmark them, come back to them, share them in groups. Something about the teaching style clicks.",
  },
  {
    emoji: '🔥',
    bg: '#ffedd4',
    tagBg: '#ffedd4',
    tagColor: '#ca3500',
    tagEmoji: '🔥',
    tagLabel: 'Viral moment',
    date: 'March – April 2025',
    title: '"108 National Parks in 20 minutes", the video that spread everywhere',
    body: "One video changes the trajectory of the channel. Abhijeet demonstrates how to memorise all 108 National Parks of India in under 20 minutes using structured mnemonics, a topic most aspirants dread. The video travels across Telegram groups, study circles, and classroom chats. It crosses hundreds of thousands of views. Students who had never heard of RiseWithJeet start subscribing. For the first time, the community feels a real energy shift, this isn't just another YouTube channel.",
  },
  {
    emoji: '📱',
    bg: '#dbeafe',
    tagBg: '#dbeafe',
    tagColor: '#1447e6',
    tagEmoji: '📱',
    tagLabel: 'Community grows',
    date: 'Mid 2025',
    title: 'A Telegram community forms, and becomes something real',
    body: 'A Telegram group starts as a simple extension of the channel, a place to ask questions and share notes. Within weeks, it crosses 5,000 members. Abhijeet shows up daily: answering doubts, reviewing answer scripts with personal feedback, holding late-night doubt sessions. What begins as a study group starts to feel like a movement. Students from small towns across India, many without access to quality coaching, find a space where someone actually responds when they ask for help.',
  },
  {
    emoji: '💡',
    bg: '#fef9c2',
    tagBg: '#fef9c2',
    tagColor: '#a65f00',
    tagEmoji: '💡',
    tagLabel: 'The decision',
    date: 'Late 2025',
    title: "The insight that changes everything: a channel isn't enough",
    body: "As the community grows, one pattern becomes impossible to ignore. Aspirants aren't failing from lack of dedication, they're failing from lack of the right feedback, the right structure, and consistent accountability. A YouTube video can inspire. But it can't tell you why your answer scored 5/10 instead of 8/10. It can't adapt to your weaknesses. It can't keep you on track on the days motivation runs out. Abhijeet realises that to truly change outcomes, not just views, the platform needs to go much deeper. He begins building.",
  },
  {
    emoji: '🚀',
    bg: '#f3e8ff',
    tagBg: '#f3e8ff',
    tagColor: '#8200db',
    tagEmoji: '🚀',
    tagLabel: 'Platform launch',
    date: '2026, Platform Launch',
    title: 'RiseWithJeet becomes a complete UPSC preparation ecosystem',
    body: "The platform launches with everything the Telegram community had been asking for: Daily MCQ practice. AI-powered Mains answer evaluation (60-second feedback across 8 parameters), a UPSC-tagged current affairs digest updated every morning at 7 AM, a full syllabus tracker across GS I–IV, adaptive mock tests, and live study rooms for community accountability. Priced at a fair monthly price, less than a single coaching module, and built with complete pricing transparency. The YouTube community's 1M+ views become 50,000+ active platform users.",
  },
  {
    iconSrc: '/our-story-trophy.png',
    bg: '#f0b100',
    tagBg: null,
    tagLabel: null,
    date: '2026, Today',
    title: '50,000 aspirants. 1 million views. The mission continues, unchanged.',
    body: (
      <>
        Today, 50,000+ aspirants use RiseWithJeet daily. The YouTube channel has crossed 1 million views. The Telegram community is thousands strong. The platform has Daily MCQs, AI Mains Evaluation, Current Affairs, Syllabus Tracking, Mock Tests, Flashcards, Study Rooms, and Personal Mentorship, all under one roof, at one honest price. And still: Abhijeet shows up in the community the same way he did on the very first day. Doubt session. Every aspirant seen.{' '}
        <em>Alone we can do so little; together we can rise so much higher.</em>
      </>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OurStoryPage() {
  return (
    <div className="min-h-screen font-sans">

      {/* ── Hero ── */}
      <section
        className="flex flex-col items-center text-center px-6 pt-24 pb-20"
        style={{ background: 'linear-gradient(155.68deg, #0e182d 0%, #17223e 100%)' }}
      >
        {/* Badge */}
        <div className="relative flex items-center gap-3 bg-[#131e33] border-2 border-[#d08700] rounded-full px-6 py-4 mb-8">
          <Image src="/Icon (3).png" alt="RiseWithJeet" width={36} height={36} className="rounded-full" />
          <Image src="/star.png" alt="star" width={28} height={28} />
          <span className="text-white text-2xl font-bold">India's #1 AI-Powered UPSC Platform</span>
        </div>

        {/* Eyebrow */}
        <p className="text-[#d08700] text-xs font-normal tracking-[1.2px] uppercase mb-5">Our Story</p>

        {/* Headline */}
        <h1 className="text-white text-5xl leading-[56px] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Built by an Aspirant,
        </h1>
        <h1 className="text-[#d4af37] text-5xl leading-[56px] mb-8" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          for Every Aspirant
        </h1>

        {/* Sub */}
        <p className="text-[#cad5e2] text-lg leading-[29px] max-w-2xl text-center">
          RiseWithJeet was born from a deep love for governance, a fascination with public service, and one IIT engineer who believed every aspirant deserves a fair shot, regardless of geography or income.
        </p>
      </section>

      {/* ── Beginning section ── */}
      <section className="bg-white px-10 py-20 grid grid-cols-2 gap-16 max-w-[1180px] mx-auto">
        {/* Left */}
        <div>
          <p className="text-[#d08700] text-xs tracking-[1.2px] uppercase mb-4">February 2025 – The Beginning</p>
          <h2 className="text-[#0a0a0a] text-5xl leading-[56px]" style={{ fontFamily: 'Georgia, serif' }}>
            How a YouTube channel
          </h2>
          <h2 className="text-[#1c398e] text-5xl leading-[56px]" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            became a movement
          </h2>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-5 text-[#314158] text-base leading-[26px]">
          <p>
            In February 2025, <strong className="text-[#0f172b]">Abhijeet Soni</strong>, an{' '}
            <strong className="text-[#0f172b]">IIT Kharagpur alumnus</strong> and AI Data Scientist, started something deceptively simple: a free YouTube channel about UPSC. No institute backing. No coaching brand. Just comprehensive content, honest teaching, and a genuine belief that every aspirant deserved better than scattered PDFs and inaccessible classroom coaching.
          </p>
          <p>
            The channel spread fast. His style was different. Complex topics simplified without dumbing them down, methods that actually work, and an energy that felt less like a lecture and more like a conversation with someone who genuinely cared. His{' '}
            <span className="text-[#ff6900]">video on remembering all 108 National Parks in just 20 minutes</span>{' '}
            became a UPSC community favourite, the kind of content that travels through Telegram groups at midnight with a simple message:{' '}
            <em>"bhai ye dekh le ho jayega."</em>
          </p>
          <p>
            A Telegram community formed naturally. Aspirants started sharing notes, clearing doubts, reviewing each other's answers. Within weeks, thousands of students had joined, not because they were marketed to, but because the content was genuinely useful and the community felt real.
          </p>
        </div>
      </section>

      {/* ── Quote 1 ── */}
      <section className="bg-white px-10 pb-16 max-w-[1180px] mx-auto">
        <div className="ml-auto max-w-[540px] border-l-4 border-[#d08700] bg-[#f8fafc] pl-7 pt-4 pb-4">
          <p className="text-[#314158] text-xl leading-[32.5px]" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            "The exam doesn't just test what you know. It tests how clearly you think, how fairly you analyse, and whether you're ready to serve. You can't prepare for that with a PDF alone."
          </p>
        </div>
      </section>

      {/* ── Body paragraphs ── */}
      <section className="bg-white px-10 pb-16 max-w-[1180px] mx-auto flex flex-col gap-5 text-[#314158] text-base leading-[26px]">
        <p>
          But as the community grew, Abhijeet saw a structural problem no YouTube channel alone could fix: the quality of UPSC preparation in India is still largely determined by where you live and what you can afford. A student in a small town in Bihar or Andhra Pradesh was starting from a fundamentally different position than one in South Delhi. Same ambition, wildly unequal access.
        </p>
        <p>
          He knew AI could change that equation. But he also knew that AI alone, without deep UPSC domain knowledge and genuine mentorship, would miss everything the exam really demands. So he decided to build both.{' '}
          <strong className="text-[#0f172b]">AI for speed. Humanized experience for depth. Community for the accountability that turns good intentions into daily habits.</strong>
        </p>
        <p>
          One more thing has guided every decision from the very beginning: radical transparency on pricing. Running this platform, data storage, AI model training on UPSC-specific content, evaluation engines, infrastructure, it all costs real money. RiseWithJeet will only ever charge what it genuinely takes to run and improve this platform. Not a rupee more. That promise is non-negotiable.
        </p>
      </section>

      {/* ── Quote 2 – CEO ── */}
      <section className="bg-white px-10 pb-20 max-w-[1180px] mx-auto">
        <div className="border-l-4 border-[#d08700] bg-[#f8fafc] pl-9 pr-8 pt-8 pb-6 flex flex-col gap-6">
          <p className="text-[#314158] text-lg leading-[29px]" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            "Every year, over{' '}
            <strong style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>10 lakh aspirants appear for UPSC</strong>
            . Only a fraction clear it. Most of those who don't aren't failing because they lack intelligence or dedication. They're failing because they don't have access to the right feedback, the right structure, and the right community at the right time. That's not a talent problem. That's an access problem, and access problems are exactly what technology exists to solve."
          </p>
          <p className="text-[#62748e] text-xs tracking-[1.2px] uppercase">
            Abhijeet Soni, Founder and CEO, RiseWithJeet
          </p>
        </div>
      </section>

      {/* ── Why We Exist ── */}
      <section
        className="px-10 py-20"
        style={{ background: 'linear-gradient(142.92deg, #0e182d 0%, #17223e 100%)' }}
      >
        <div className="max-w-[1180px] mx-auto grid grid-cols-2 gap-16">
          {/* Left */}
          <div className="flex flex-col gap-6">
            <p className="text-[#d08700] text-xs tracking-[1.2px] uppercase">Why We Exist</p>
            <h2 className="text-white text-4xl leading-[40px]" style={{ fontFamily: 'Georgia, serif' }}>
              The UPSC preparation system was{' '}
              <em className="text-[#d4af37]">broken</em> for most aspirants
            </h2>
            <p className="text-[#cad5e2] text-base leading-[26px]">
              Traditional coaching worked well if you lived near a major city and had ₹2-3 lakh to spare. For everyone else, preparation was an uphill battle fought with unequal tools.
            </p>
            <p className="text-[#cad5e2] text-base leading-[26px]">
              We set out to fix the four deepest structural failures, not with incremental tweaks, but by rethinking the entire approach from first principles.
            </p>
          </div>

          {/* Right – cards */}
          <div className="flex flex-col gap-4">
            {[
              {
                emoji: '⏱️',
                title: 'Answer feedback came days later, or never',
                body: 'Most aspirants write answers and get no structured feedback. At best, they wait 7 to 10 days. Jeet AI evaluates in 60 seconds with UPSC examiner-level detail across 8 parameters, content, structure, analysis, examples, and more.',
              },
              {
                emoji: '💸',
                title: 'Quality preparation was simply unaffordable',
                body: "Top coaching institutes charged amounts equalling a year's salary for many families. A student from a small town had to either relocate to Delhi or give up on structured preparation entirely. We believe that gap should not exist.",
              },
              {
                emoji: '🗺️',
                title: 'Geography decided your access to mentorship',
                body: "If you weren't in a metro, personalised mentorship was simply out of reach. We built Mentorship Pro to connect aspirants across India directly with experts, weekly 1-on-1 sessions, personalised roadmaps, entirely remote.",
              },
              {
                emoji: '📊',
                title: 'No one told you where you actually stood',
                body: 'Most aspirants prepare for years without ever knowing their real strengths or weaknesses. Our adaptive engine tracks performance across topics and adjusts recommendations accordingly.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-[#1d293d] border border-[#314158] rounded-[14px] px-6 py-6 flex gap-4"
              >
                <div className="bg-[#314158] rounded-[10px] w-10 h-10 flex items-center justify-center flex-shrink-0 text-2xl">
                  {card.emoji}
                </div>
                <div>
                  <h3 className="text-white text-lg font-semibold leading-[28px] mb-2">{card.title}</h3>
                  <p className="text-[#90a1b9] text-sm leading-[22.75px]">{card.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Mission ── */}
      <section className="py-20 px-10">
        <div
          className="max-w-[1180px] mx-auto rounded-3xl py-20 px-10 text-center"
          style={{ background: 'linear-gradient(155.26deg, #0e182d 0%, #17223e 100%)' }}
        >
          <p className="text-[#d08700] text-xs tracking-[1.2px] uppercase mb-6">Our Mission</p>
          <h2 className="text-white text-4xl leading-[45px] max-w-3xl mx-auto mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            To <em className="text-[#d4af37]">democratise</em> UPSC preparation for every aspirant in India, regardless of geography, language, or financial background.
          </h2>
          <p className="text-[#cad5e2] text-lg leading-[29px] max-w-2xl mx-auto">
            We believe the quality of your civil services preparation should never be determined by your postcode or your parents' income. With AI and the right mentorship, we level the playing field.
          </p>
        </div>
      </section>

      {/* ── Principles ── */}
      <section className="bg-white px-10 pt-4 pb-20">
        <div className="max-w-[1180px] mx-auto">
          <p className="text-[#d08700] text-xs tracking-[1.2px] uppercase mb-3">What Drives Us</p>
          <h2 className="text-[#0a0a0a] text-4xl leading-[40px] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            The principles we build
          </h2>
          <h3 className="text-[#1c398e] text-4xl leading-[40px] mb-14" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            every feature around
          </h3>

          <div className="grid grid-cols-3 gap-6">
            {principles.map((p) => (
              <div
                key={p.num}
                className={`bg-white border-[0.8px] border-[#e2e8f0] rounded-2xl p-8 ${p.bottomBorder ? 'border-b-4' : ''}`}
              >
                <p className="text-[#e2e8f0] text-4xl font-light mb-8">{p.num}</p>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
                  style={{ backgroundColor: p.iconBg }}
                >
                  {p.iconSrc ? (
                    <Image src={p.iconSrc} alt={p.title} width={24} height={24} />
                  ) : (
                    <span className="text-2xl">{p.emoji}</span>
                  )}
                </div>
                <h3 className="text-[#0f172b] text-xl font-semibold leading-[28px] mb-3">{p.title}</h3>
                <p className="text-[#45556c] text-base leading-[26px]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="bg-[#f8fafc] px-10 py-20">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-[#0f172b] text-4xl leading-[40px]" style={{ fontFamily: 'Georgia, serif' }}>
            One year.
          </h2>
          <h3 className="text-[#1c398e] text-4xl leading-[40px] mb-4" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            One mission. Built with love.
          </h3>
          <p className="text-[#45556c] text-base leading-[26px] mb-16 max-w-[660px]">
            Everything you see today, the platform, the community, the AI tools, was built in under a year, from zero, by people who genuinely believe every aspirant deserves a fair shot.
          </p>

          {/* Timeline items */}
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-[#cad5e2]" />

            <div className="flex flex-col gap-12">
              {timeline.map((item, i) => (
                <div key={i} className="flex gap-6">
                  {/* Icon circle */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-2xl z-10"
                    style={{ backgroundColor: item.bg }}
                  >
                    {item.iconSrc ? (
                      <Image src={item.iconSrc} alt="" width={32} height={32} />
                    ) : (
                      <span>{item.emoji}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <p className="text-[#d08700] text-sm leading-[20px] mb-2">{item.date}</p>
                    <h4 className="text-[#0f172b] text-xl font-semibold leading-[28px] mb-3">{item.title}</h4>
                    <p className="text-[#45556c] text-base leading-[26px] mb-4">{item.body}</p>
                    {item.tagLabel && (
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{ backgroundColor: item.tagBg!, color: item.tagColor! }}
                      >
                        <span className="text-xs">{item.tagEmoji}</span>
                        {item.tagLabel}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="px-10 py-24 text-center"
        style={{ background: 'linear-gradient(150.99deg, #0e182d 0%, #17223e 100%)' }}
      >
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-white text-5xl leading-[56px]" style={{ fontFamily: 'Georgia, serif' }}>
            Your UPSC journey
          </h2>
          <h3 className="text-[#d4af37] text-5xl leading-[56px] mb-8" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            starts today
          </h3>
          <p className="text-[#90a1b9] text-lg leading-[28px] max-w-xl mx-auto mb-10">
            Join 50,000+ aspirants already preparing smarter. Started as a YouTube channel. Now a complete preparation ecosystem. Always built for aspirants first.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-[#f0b100] text-[#0f172b] font-semibold text-base px-8 py-4 rounded-[14px] hover:bg-[#d4a000] transition-colors"
            >
              Start Free Trial →
            </Link>
            <button className="border border-[#45556c] text-white font-medium text-base px-8 py-4 rounded-[14px] hover:border-[#62748e] transition-colors flex items-center gap-2">
              <span>▶</span> Watch a Viral Video
            </button>
          </div>
        </div>

        {/* Footer bar */}
        <div className="border-t border-[#1d293d] mt-20 pt-6 flex items-center justify-between max-w-[1150px] mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-[#d08700] rounded w-8 h-8 flex items-center justify-center">
              <span className="text-[#0f172b] font-serif text-sm">R</span>
            </div>
            <span className="text-white text-lg" style={{ fontFamily: 'Georgia, serif' }}>RiseWithJeet</span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/privacy" className="text-[#90a1b9] text-sm hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-[#90a1b9] text-sm hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-[#90a1b9] text-sm hover:text-white transition-colors">
              Contact Us
            </Link>
            <Link href="/blog" className="text-[#90a1b9] text-sm hover:text-white transition-colors">
              Blog
            </Link>
          </div>
          <p className="text-[#62748e] text-sm">
            © 2026 RiseWithJeet Edtech Pvt Ltd · Made with 💛 for every UPSC aspirant
          </p>
        </div>
      </section>
    </div>
  );
}
