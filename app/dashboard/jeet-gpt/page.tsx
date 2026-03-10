'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { jeetAIService } from '@/lib/services';

/* ── Leaf/feather logo ── */
const LeafLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
    <path
      d="M12 2C8 8 12 14 12 20c0 0 4-6 8-12-4 4-8 8-12 10-2-2-4-4-4-6 0-4 4-8 8-12z"
      fill="#4ADE80"
      stroke="#4ADE80"
      strokeWidth="0.5"
    />
  </svg>
);

/* ── Spinner ── */
const Spinner = () => (
  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
  </svg>
);

/* ── Suggestion cards ── */
const suggestionCards = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#92400E]">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 7h8M8 11h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    iconBg: '#FFF7ED',
    title: 'Explain a UPSC topic',
    subtitle: 'Deep explanation with dimensions, UPSC angle & related questions',
    prompt: 'Explain the Bhakti Movement and its socio-religious significance for UPSC preparation',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#7C3AED]">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    iconBg: '#FAF5FF',
    title: 'Ethics case study I should know',
    subtitle: 'Real-world ethics + how to frame and structure your answer',
    prompt: 'Give me an important ethics case study with stakeholders and how to write a UPSC GS Paper 4 answer',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#DC2626]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconBg: '#FEF2F2',
    title: 'Build my study plan',
    subtitle: 'Personalized schedule based on your exam date and syllabus gaps',
    prompt: 'Build me a personalized UPSC study plan for the next 3 months covering all GS papers',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#2563EB]">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconBg: '#EFF6FF',
    title: 'Study strategy & planner',
    subtitle: 'Personalized roadmap, daily schedules + all-topic prioritization',
    prompt: 'What is the best study strategy for a UPSC first-time aspirant? Give me a prioritized roadmap',
  },
];

/* ── Types ── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

interface GroupedConversations {
  today: ConversationSummary[];
  yesterday: ConversationSummary[];
  earlier: ConversationSummary[];
}

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return 'U';
}

function formatTime(dateStr?: string | Date): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  h = h % 12 || 12;
  return h + ':' + m.toString().padStart(2, '0') + ' ' + (am ? 'am' : 'pm');
}

/* ── Simple markdown renderer (bold, code, headings, bullets) ── */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="list-disc pl-5 space-y-1 mb-3">
          {listItems.map((item, i) => (
            <li key={i} className="font-inter text-[14px] leading-6" style={{ color: '#364153' }}>
              {inlineFormat(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Heading 3
    if (trimmed.startsWith('### ')) {
      flushList('list-' + idx);
      elements.push(
        <h3 key={idx} className="font-inter font-bold text-[15px] leading-6 mt-4 mb-1" style={{ color: '#101828' }}>
          {inlineFormat(trimmed.slice(4))}
        </h3>
      );
    // Heading 2
    } else if (trimmed.startsWith('## ')) {
      flushList('list-' + idx);
      elements.push(
        <h2 key={idx} className="font-inter font-bold text-[17px] leading-7 mt-5 mb-2" style={{ color: '#101828' }}>
          {inlineFormat(trimmed.slice(3))}
        </h2>
      );
    // Heading 1
    } else if (trimmed.startsWith('# ')) {
      flushList('list-' + idx);
      elements.push(
        <h1 key={idx} className="font-inter font-bold text-[20px] leading-8 mt-5 mb-2" style={{ color: '#101828' }}>
          {inlineFormat(trimmed.slice(2))}
        </h1>
      );
    // Bullet
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    // Numbered list
    } else if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s/, ''));
    // Blank line
    } else if (trimmed === '') {
      flushList('list-' + idx);
    // Normal paragraph
    } else {
      flushList('list-' + idx);
      elements.push(
        <p key={idx} className="font-inter text-[14px] leading-6 mb-2" style={{ color: '#364153' }}>
          {inlineFormat(trimmed)}
        </p>
      );
    }
  });

  flushList('list-end');
  return <>{elements}</>;
}

function inlineFormat(text: string): React.ReactNode {
  // Split on **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#101828' }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded text-[13px]" style={{ background: '#F3F4F6', color: '#1447E6', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

const DAILY_QUERY_LIMIT = 10;

/* ══════════════════════════════════════════════════════════════════════════ */
export default function JeetGPTPage() {
  const { user } = useAuth();

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queriesUsed, setQueriesUsed] = useState(0);
  const [proCardDismissed, setProCardDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<GroupedConversations>({
    today: [],
    yesterday: [],
    earlier: [],
  });
  const [sidebarLoading, setSidebarLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchConversations = useCallback(async () => {
    try {
      setSidebarLoading(true);
      const res = await jeetAIService.getConversations();
      if (res.status === 'success' && res.data) {
        setConversations(res.data);
      }
    } catch {
      // silent
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadConversation = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await jeetAIService.getConversation(id);
      if (res.status === 'success' && res.data) {
        setMessages(res.data.messages as Message[]);
        setActiveConversationId(id);
        setQueriesUsed(0);
        setError(null);
      }
    } catch {
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await jeetAIService.deleteConversation(id);
      if (activeConversationId === id) startNewConversation();
      fetchConversations();
    } catch {
      // silent
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setActiveConversationId(null);
    setInputValue('');
    setQueriesUsed(0);
    setError(null);
    setProCardDismissed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading || queriesUsed >= DAILY_QUERY_LIMIT) return;

    const tempId = 'temp-' + Date.now();
    const tempUserMsg: Message = { id: tempId, role: 'user', content: trimmed, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await jeetAIService.sendMessage(trimmed, activeConversationId ?? undefined);
      if (res.status === 'success' && res.data) {
        const { conversationId, reply } = res.data;
        setActiveConversationId(conversationId);
        setQueriesUsed((prev) => prev + 1);
        const aiMsg: Message = { id: 'ai-' + Date.now(), role: 'assistant', content: reply, createdAt: new Date().toISOString() };
        setMessages((prev) => [...prev, aiMsg]);
        fetchConversations();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response. Please try again.');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsLoading(false);
    }
  };

  const queriesExhausted = queriesUsed >= DAILY_QUERY_LIMIT;
  const showChat = messages.length > 0;
  const displayName = user
    ? ((user.firstName ?? '') + (user.firstName && user.lastName ? ' ' : '') + (user.lastName ?? '')).trim() || user.email
    : 'Loading...';
  const initials = getInitials(user?.firstName, user?.lastName, user?.email);
  const userPlan = user?.role === 'admin' ? 'Admin' : 'Free user';
  const hasConversations = conversations.today.length > 0 || conversations.yesterday.length > 0 || conversations.earlier.length > 0;

  return (
    <div className="flex overflow-hidden bg-white" style={{ height: 'calc(100vh - clamp(90px, 5.78vw, 111px))' }}>

      {/* ── Left Sidebar ── */}
      <aside className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: '266px', background: '#0A1628' }}>
        <div className="pt-6 px-4 pb-2">
          <Link href="/dashboard" className="flex items-start gap-2">
            <LeafLogo />
            <div>
              <div className="font-inter font-bold text-[18px] leading-7 text-white">Rise with Jeet IAS</div>
              <div className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mt-0.5" style={{ color: '#99A1AF' }}>India&apos;s Premier UPSC Platform</div>
            </div>
          </Link>
        </div>

        <div className="px-4 pt-4">
          <button type="button" onClick={startNewConversation} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[10px] font-inter font-semibold text-[14px] leading-5 text-white" style={{ background: 'linear-gradient(90deg, #F0B100 0%, #FF6900 100%)' }}>
            ⚡ New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {sidebarLoading ? (
            <div className="flex justify-center py-8 text-white/50"><Spinner /></div>
          ) : !hasConversations ? (
            <p className="font-inter text-[12px] text-center py-6" style={{ color: '#6A7282' }}>No conversations yet. Start chatting!</p>
          ) : (
            <>
              {conversations.today.length > 0 && (
                <div>
                  <div className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mb-2" style={{ color: '#6A7282' }}>Today</div>
                  {conversations.today.map((item) => <ConvItem key={item.id} item={item} active={activeConversationId === item.id} onClick={() => loadConversation(item.id)} onDelete={(e) => deleteConversation(item.id, e)} />)}
                </div>
              )}
              {conversations.yesterday.length > 0 && (
                <div>
                  <div className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mb-2" style={{ color: '#6A7282' }}>Yesterday</div>
                  {conversations.yesterday.map((item) => <ConvItem key={item.id} item={item} active={activeConversationId === item.id} onClick={() => loadConversation(item.id)} onDelete={(e) => deleteConversation(item.id, e)} />)}
                </div>
              )}
              {conversations.earlier.length > 0 && (
                <div>
                  <div className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mb-2" style={{ color: '#6A7282' }}>Earlier</div>
                  {conversations.earlier.map((item) => <ConvItem key={item.id} item={item} active={activeConversationId === item.id} onClick={() => loadConversation(item.id)} onDelete={(e) => deleteConversation(item.id, e)} />)}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="font-inter text-[10px] leading-[15px] tracking-[0.5px] uppercase mb-2" style={{ color: '#6A7282' }}>Daily Queries</div>
          <div className="rounded-[10px] p-3 mb-3" style={{ border: '1px solid #787C82', background: 'rgba(217, 217, 217, 0.1)' }}>
            <div className="flex justify-between items-center font-inter text-[12px]" style={{ color: '#D1D5DC' }}>
              <span>{queriesUsed}/{DAILY_QUERY_LIMIT}</span>
              {queriesExhausted && <span className="text-[10px]" style={{ color: '#FB2C36' }}>Limit reached</span>}
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: ((queriesUsed / DAILY_QUERY_LIMIT) * 100) + '%', background: queriesExhausted ? '#FB2C36' : '#3B82F6' }} />
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-[10px] hover:bg-white/5 cursor-pointer">
            <div className="w-6 h-6 rounded-full flex items-center justify-center font-inter font-bold text-[10px] text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #51A2FF 0%, #155DFC 100%)' }}>{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="font-inter font-semibold text-[12px] leading-4 text-white truncate">{displayName}</div>
              <div className="font-inter text-[10px] leading-[15px]" style={{ color: '#99A1AF' }}>{userPlan}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 text-white/70"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: '#FFFFFF' }}>
        <header className="flex-shrink-0 flex flex-col gap-0.5 py-3 px-6" style={{ borderBottom: '0.8px solid #E5E7EB' }}>
          <div className="flex items-baseline gap-2">
            <span className="font-inter font-bold text-[18px] leading-7" style={{ color: '#101828' }}>Jeet AI</span>
            <span className="font-inter text-[14px] leading-5" style={{ color: '#6A7282' }}>—</span>
            <span className="font-inter text-[14px] leading-5" style={{ color: '#6A7282' }}>Your UPSC Mentor</span>
          </div>
          <div className="font-inter text-[12px] leading-4" style={{ color: '#99A1AF' }}>Ask anything about UPSC preparation</div>
        </header>

        {queriesExhausted && !showChat ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-[672px] rounded-[24px] p-6 flex flex-col gap-5" style={{ borderTop: '0.8px solid #364153', background: 'linear-gradient(180deg, #0F1A2E 0%, #1A2942 100%)', boxShadow: '0px 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div className="flex items-center justify-between">
                <span className="font-inter font-bold text-[14px] uppercase tracking-[1.4px]" style={{ color: '#99A1AF' }}>Daily Queries</span>
                <span className="font-inter font-bold text-[48px] leading-[48px]">
                  <span style={{ color: '#FDC700' }}>{DAILY_QUERY_LIMIT}</span>
                  <span style={{ color: '#99A1AF' }}>/{DAILY_QUERY_LIMIT} used</span>
                </span>
              </div>
              <div className="w-full h-3 rounded-full" style={{ background: 'linear-gradient(90deg, #FB2C36 0%, #FF6900 50%, #E7000B 100%)' }} />
              <p className="font-inter text-[14px] text-center" style={{ color: '#99A1AF' }}>Resets daily at midnight</p>
            </div>
          </div>
        ) : !showChat ? (
          /* Welcome screen */
          <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-8">
            <div className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-6" style={{ background: '#1E3A5F' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h1 className="font-inter font-bold text-[30px] leading-9 text-center mb-4" style={{ color: '#101828' }}>
              Hi {user?.firstName || 'there'}, I&apos;m <span className="font-bold italic" style={{ color: '#D08700' }}>Jeet AI</span>.
            </h1>
            <p className="font-inter text-[16px] leading-6 text-center max-w-[561px] mb-4" style={{ color: '#4A5565' }}>
              I&apos;m your intelligent UPSC preparation partner — from ancient history to current affairs, revision strategy, or just thinking through a topic together.
            </p>
            <p className="font-inter text-[18px] leading-5 mb-10" style={{ color: '#99A1AF' }}>How can I help you today in your preparation?</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[800px] w-full mb-10">
              {suggestionCards.map((card, i) => (
                <button key={i} type="button" onClick={() => setInputValue(card.prompt)} className="text-left p-6 rounded-[16px] border transition-colors hover:border-[#D08700]/50 hover:shadow-md" style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF' }}>
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center mb-4" style={{ background: card.iconBg }}>{card.icon}</div>
                  <h3 className="font-inter font-bold text-[18px] leading-[27px] mb-2" style={{ color: '#101828' }}>{card.title}</h3>
                  <p className="font-inter text-[14px] leading-5" style={{ color: '#6A7282' }}>{card.subtitle}</p>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-[968px]">
              <div className="flex items-center gap-3 px-4 py-3 rounded-[16px]" style={{ border: '0.8px solid #E5E7EB', background: '#F9FAFB' }}>
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask me anything about your preparation..." className="flex-1 bg-transparent font-inter text-[16px] outline-none" style={{ color: '#101828' }} disabled={isLoading} />
                <button type="submit" disabled={!inputValue.trim() || isLoading} className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50" style={{ background: '#1E3A5F' }}>
                  {isLoading ? <Spinner /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>}
                </button>
              </div>
              {error && <p className="font-inter text-[12px] text-center mt-2" style={{ color: '#FB2C36' }}>{error}</p>}
              <p className="font-inter text-[12px] leading-4 text-center mt-3 italic" style={{ color: '#99A1AF' }}>
                Jeet AI can make mistakes. Verify important facts from NCERT &amp; official sources.
              </p>
            </form>
          </div>
        ) : (
          /* Chat view */
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex flex-col items-end gap-1">
                    <div className="max-w-[672px] py-3 px-6 rounded-[24px] font-inter text-[14px] leading-5 text-white" style={{ background: '#0F1C2E' }}>{msg.content}</div>
                    <span className="font-inter text-[12px]" style={{ color: '#99A1AF' }}>{formatTime(msg.createdAt)}</span>
                  </div>
                ) : (
                  <div key={msg.id} className="flex flex-col gap-1">
                    <div className="max-w-[840px] rounded-[16px] p-6 border" style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF', boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1)' }}>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1E3A5F' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0B100" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">{renderMarkdown(msg.content)}</div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <span className="font-inter text-[12px]" style={{ color: '#99A1AF' }}>{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              )}

              {isLoading && (
                <div className="flex flex-col gap-1">
                  <div className="max-w-[840px] rounded-[16px] p-6 border" style={{ border: '0.8px solid #E5E7EB', background: '#FFFFFF' }}>
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1E3A5F' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0B100" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#D08700', animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#D08700', animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#D08700', animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-center">
                  <div className="rounded-[10px] px-4 py-2 font-inter text-[13px]" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>{error}</div>
                </div>
              )}

              {queriesUsed >= 5 && !proCardDismissed && (
                <div className="max-w-[896px] rounded-[24px] flex items-center justify-between gap-4 p-5" style={{ borderTop: '1.6px solid #FFD6A8', background: 'linear-gradient(90deg, #FFFBEB 0%, #FFF7ED 100%)', boxShadow: '0px 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <div className="w-9 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 text-white text-lg" style={{ background: 'linear-gradient(135deg, #FF8904 0%, #FB2C36 100%)' }}>✨</div>
                  <p className="font-inter text-[14px] leading-5 flex-1 min-w-0" style={{ color: '#364153' }}>You&apos;re making great progress! <strong>Pro members</strong> get unlimited queries, saved notes, and priority answer evaluation.</p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link href="/dashboard/free-trial">
                      <button type="button" className="font-inter font-bold text-[14px] text-white py-2.5 px-5 rounded-[14px] whitespace-nowrap" style={{ background: 'linear-gradient(90deg, #FF6900 0%, #FB2C36 100%)' }}>Explore Pro →</button>
                    </Link>
                    <button type="button" onClick={() => setProCardDismissed(true)} className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-gray-100" style={{ background: '#E5E7EB' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 pt-4 px-6 pb-6 border-t" style={{ borderTop: '0.8px solid #E5E7EB', background: '#FFFFFF' }}>
              <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3.5 rounded-[16px]" style={{ border: '0.8px solid #E5E7EB', background: '#F9FAFB' }}>
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask Jeet AI anything about UPSC..." className="flex-1 bg-transparent font-inter text-[14px] outline-none min-w-0" style={{ color: '#101828' }} disabled={isLoading || queriesExhausted} />
                <button type="submit" disabled={!inputValue.trim() || isLoading || queriesExhausted} className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50" style={{ background: '#1E3A5F' }}>
                  {isLoading ? <Spinner /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>}
                </button>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ── Sidebar conversation item ── */
function ConvItem({ item, active, onClick, onDelete }: { item: ConversationSummary; active: boolean; onClick: () => void; onDelete: (e: React.MouseEvent) => void; }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()} className="group flex items-center gap-2 py-2 px-3 rounded-[10px] mb-1 cursor-pointer hover:bg-white/5 transition-colors" style={active ? { background: 'rgba(255,255,255,0.1)' } : {}}>
      <span className="font-inter text-[12px] leading-4 flex-1 truncate" style={{ color: '#D1D5DC' }}>{item.title}</span>
      <button type="button" onClick={onDelete} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-opacity hover:bg-white/10" title="Delete">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#99A1AF" strokeWidth="1.5"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
