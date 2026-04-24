'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const categories = [
  'All Posts',
  'Strategy',
  'Current Affairs',
  'Answer Writing',
  'GS Concepts',
  'Success Stories',
  'Platform Tips',
  'Prelims Prep',
  'Mains Prep',
];

const blogPosts = [
  {
    category: 'Strategy',
    title: 'How to build a 12-month UPSC roadmap from scratch in 2026',
    description: 'A clear, week-by-week framework for first-time aspirants. From foundational reading to answer writing practice, this roadmap eliminates guesswork.',
    author: 'Abhijeet Soni',
    readTime: '8 min',
    image: '/blog-strategy-1.png',
  },
  {
    category: 'Strategy',
    title: 'The 4-hour focused study method that works better than 10 scattered hours',
    description: 'Why most aspirants waste half their study time and how a structured 4-hour deep work block can transform your preparation efficiency.',
    author: 'Abhijeet Soni',
    readTime: '5 min',
    image: '/blog-strategy-2.png',
  },
  {
    category: 'Strategy',
    title: 'How to revise the entire UPSC syllabus in 45 days before Prelims',
    description: 'A battle-tested revision schedule covering all 7 GS papers, with daily targets and spaced repetition techniques built in.',
    author: 'Priya Singh',
    readTime: '7 min',
    image: '/blog-strategy-3.png',
  },
  {
    category: 'Answer Writing',
    title: 'The exact structure that scores 7.5+ on every UPSC Mains answer',
    description: 'A breakdown of introduction types, body paragraph structures, and conclusion frameworks that consistently score high marks.',
    author: 'Abhijeet Soni',
    readTime: '6 min',
    image: '/blog-answer-1.png',
  },
  {
    category: 'Answer Writing',
    title: '10 examples every UPSC aspirant should have ready for Ethics answers',
    description: 'From Mahatma Gandhi to Dr. B.R. Ambedkar to contemporary examples — the real-world cases that bring your Ethics answers to life.',
    author: 'Priya Singh',
    readTime: '5 min',
    image: '/blog-answer-2.png',
  },
  {
    category: 'Answer Writing',
    title: 'How to use data and statistics effectively in Mains without memorising numbers',
    description: 'You do not need exact figures to impress an examiner. Here is how to use approximate data and trends to strengthen your arguments.',
    author: 'Abhijeet Soni',
    readTime: '4 min',
    image: '/blog-answer-3.png',
  },
  {
    category: 'GS Concepts',
    title: 'Cooperative Federalism vs Competitive Federalism: a complete UPSC explainer',
    description: 'Understanding the constitutional basis, key differences, and where both concepts appear in Prelims and Mains.',
    author: 'Abhijeet Soni',
    readTime: '7 min',
    image: '/blog-gs-1.png',
  },
  {
    category: 'GS Concepts',
    title: 'Carbon markets, carbon credits and carbon taxes: what UPSC actually asks',
    description: 'These three concepts confuse most aspirants. A clean explanation of each, with previous year question references.',
    author: 'Priya Singh',
    readTime: '6 min',
    image: '/blog-gs-2.png',
  },
  {
    category: 'GS Concepts',
    title: 'Monetary policy transmission in India: why rate cuts do not always reach borrowers',
    description: 'A simplified explanation of how RBI decisions travel through the banking system — and where the transmission breaks down.',
    author: 'Abhijeet Soni',
    readTime: '5 min',
    image: '/blog-gs-3.png',
  },
  {
    category: 'Current Affairs',
    title: "India's forest cover rises by 1,540 sq km: reading the State of Forest Report 2025 for UPSC",
    description: 'What the FSI report says, what it means for biodiversity and climate goals, and how to frame answers around it.',
    author: 'Priya Singh',
    readTime: '5 min',
    image: '/blog-ca-1.png',
  },
  {
    category: 'Current Affairs',
    title: "India's space economy target of $44 billion by 2033: policy, players, and UPSC relevance",
    description: "IN-SPACe, NSIL, ISRO reforms, and the commercialisation of India's space sector — everything you need for GS III.",
    author: 'Abhijeet Soni',
    readTime: '6 min',
    image: '/blog-ca-2.png',
  },
  {
    category: 'Current Affairs',
    title: 'The 20 most repeated Polity topics in UPSC Prelims in the last 10 years',
    description: 'A PYQ-based frequency analysis that shows exactly which Polity topics appear most often and how to prioritise them.',
    author: 'Priya Singh',
    readTime: '7 min',
    image: '/blog-ca-3.png',
  },
  {
    category: 'Platform Tips',
    title: '5 Jeet GPT prompts that will transform how you study current affairs',
    description: 'Most aspirants use AI to get definitions. Here are five advanced prompts that turn Jeet GPT into a personal UPSC tutor.',
    author: 'Abhijeet Soni',
    readTime: '4 min',
    image: '/blog-tips-1.png',
  },
  {
    category: 'Platform Tips',
    title: 'How to read your Performance Analytics dashboard and act on what it tells you',
    description: 'Your readiness score, weak area heatmap, and test comparison charts — a complete guide to using data to improve.',
    author: 'Abhijeet Soni',
    readTime: '5 min',
    image: '/blog-tips-2.png',
  },
  {
    category: 'Platform Tips',
    title: 'The spaced repetition technique: how RiseWithJeet flashcards help you remember 90% more',
    description: 'The science behind the Ebbinghaus forgetting curve, and how our flashcard system is designed around it.',
    author: 'Abhijeet Soni',
    readTime: '5 min',
    image: '/blog-tips-3.png',
  },
];

const successStories = [
  {
    title: '"I cleared Prelims on my third attempt after failing to cross 90 marks twice. Here is what changed."',
    description: 'From a tier-3 town with no coaching to Mains qualified: Rohan\'s preparation story',
    author: 'Rohan Sharma',
    readTime: '5 min',
    image: '/blog-success-1.png',
  },
  {
    title: '"Ananya from Lucknow shares how she restructured her daily MCQ practice, stopped skipping answer writing, and finally broke through."',
    description: 'Community Story',
    author: 'Ananya Gupta',
    readTime: '6 min',
    image: '/blog-success-2.png',
  },
];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All Posts');

  const filteredPosts = activeCategory === 'All Posts'
    ? blogPosts
    : blogPosts.filter(post => post.category === activeCategory);

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>
      {/* ── Hero ─ */}
      <section className="flex flex-col items-center text-center px-6 pt-28 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#131e33] border border-[#2a3550] rounded-full px-5 py-2.5 mb-6">
          <span className="text-[#d08700] text-xs">✍️</span>
          <span className="text-[#90a1b9] text-xs font-medium tracking-wide uppercase">UPSC Insights</span>
        </div>

        {/* Eyebrow */}
        <p className="text-[#d08700] text-xs tracking-[1.5px] uppercase mb-4">Written by Toppers and Educators</p>

        {/* Headline */}
        <h1 className="text-white text-5xl md:text-6xl leading-[1.1] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
          Blog and{' '}
          <span className="text-[#d4af37]" style={{ fontStyle: 'italic' }}>Articles</span>
        </h1>

        {/* Sub */}
        <p className="text-[#90a1b9] text-lg leading-[28px] max-w-2xl mb-10">
          Strategy, current affairs analysis, answer writing tips, GS concepts, success stories and more. Everything written with one goal: your selection.
        </p>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-[#f0b100] text-[#0f172b]'
                  : 'bg-[#131e33] text-[#90a1b9] border border-[#2a3550] hover:border-[#45556c]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ── Blog Posts Grid ── */}
      <section className="px-6 pb-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, i) => (
            <article
              key={i}
              className="bg-[#111827] border border-[#1d293d] rounded-2xl overflow-hidden hover:border-[#2a3550] transition-all cursor-pointer group"
            >
              {/* Image placeholder */}
              <div className="w-full h-48 bg-gradient-to-br from-[#1a2332] to-[#0f172a] flex items-center justify-center">
                <span className="text-4xl opacity-30">📝</span>
              </div>

              <div className="p-6">
                {/* Category tag */}
                <span className="inline-block bg-[#1a2332] text-[#d08700] text-xs font-medium px-3 py-1 rounded-full mb-3">
                  {post.category}
                </span>

                {/* Title */}
                <h3 className="text-white text-lg font-semibold leading-[26px] mb-3 group-hover:text-[#d4af37] transition-colors">
                  {post.title}
                </h3>

                {/* Description */}
                <p className="text-[#90a1b9] text-sm leading-[22px] mb-4">
                  {post.description}
                </p>

                {/* Author & read time */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1a2332] flex items-center justify-center text-xs text-[#d08700] font-bold">
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">{post.author}</p>
                    <p className="text-[#62748e] text-xs">{post.readTime}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Load more */}
        <div className="text-center mt-12">
          <button className="bg-[#f0b100] text-[#0f172b] font-semibold text-base px-8 py-3.5 rounded-[14px] hover:bg-[#d4a000] transition-colors">
            View all →
          </button>
        </div>
      </section>

      {/* ── Success Stories ── */}
      <section className="px-6 pb-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[#d08700] text-xs tracking-[1.5px] uppercase mb-2">Community Stories</p>
              <h2 className="text-white text-3xl" style={{ fontFamily: 'Georgia, serif' }}>
                Success Stories
              </h2>
            </div>
            <Link href="#" className="text-[#d08700] text-sm font-medium hover:text-[#f0b100] transition-colors">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {successStories.map((story, i) => (
              <article
                key={i}
                className="bg-[#111827] border border-[#1d293d] rounded-2xl overflow-hidden hover:border-[#2a3550] transition-all cursor-pointer group"
              >
                <div className="w-full h-48 bg-gradient-to-br from-[#1a2332] to-[#0f172a] flex items-center justify-center">
                  <span className="text-4xl opacity-30">⭐</span>
                </div>
                <div className="p-6">
                  <span className="inline-block bg-[#1a2332] text-[#d08700] text-xs font-medium px-3 py-1 rounded-full mb-3">
                    Success Story
                  </span>
                  <h3 className="text-white text-lg font-semibold leading-[26px] mb-3 group-hover:text-[#d4af37] transition-colors">
                    {story.title}
                  </h3>
                  <p className="text-[#90a1b9] text-sm leading-[22px] mb-4">
                    {story.description}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a2332] flex items-center justify-center text-xs text-[#d08700] font-bold">
                      {story.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{story.author}</p>
                      <p className="text-[#62748e] text-xs">{story.readTime}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter CTA ── */}
      <section className="px-6 pb-20">
        <div className="max-w-[800px] mx-auto rounded-3xl p-10 text-center" style={{ background: 'linear-gradient(155.26deg, #0e182d 0%, #17223e 100%)', border: '1px solid #1d293d' }}>
          <h2 className="text-white text-3xl mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            Weekly UPSC digest
          </h2>
          <p className="text-[#90a1b9] text-base leading-[26px] mb-8 max-w-lg mx-auto">
            Get the week's best articles, key current affairs, and one answer writing prompt, every Sunday morning.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 w-full bg-[#131e33] border border-[#2a3550] rounded-xl px-5 py-3.5 text-white text-sm placeholder:text-[#62748e] focus:outline-none focus:border-[#d08700]"
            />
            <button className="bg-[#f0b100] text-[#0f172b] font-semibold text-sm px-6 py-3.5 rounded-xl hover:bg-[#d4a000] transition-colors whitespace-nowrap">
              Subscribe free →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer Bar ── */}
      <footer className="border-t border-[#1d293d] px-6 py-6">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-[#d08700] rounded w-8 h-8 flex items-center justify-center">
              <span className="text-[#0f172b] font-serif text-sm font-bold">R</span>
            </div>
            <span className="text-white text-lg" style={{ fontFamily: 'Georgia, serif' }}>RiseWithJeet</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-[#90a1b9] hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-[#90a1b9] hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="text-[#90a1b9] hover:text-white transition-colors">Contact Us</Link>
            <Link href="/blog" className="text-[#90a1b9] hover:text-white transition-colors">Blog</Link>
          </div>
          <p className="text-[#62748e] text-sm">
            © 2026 RiseWithJeet Edtech Pvt Ltd · Made with 💛 for every UPSC aspirant
          </p>
        </div>
      </footer>
    </div>
  );
}
