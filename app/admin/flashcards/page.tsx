'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

type Deck = { id: string; subject: string; subjectId: string; icon: string; _count: { cards: number } };
type Card = { id: string; deckId: string; topic: string; topicId: string; question: string; answer: string; difficulty: string; deck?: { subject: string } };

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const emptyDeckForm = { subject: '', subjectId: '', icon: '📚' };
const emptyCardForm = { deckId: '', topic: '', topicId: '', question: '', answer: '', difficulty: 'Medium' };

export default function FlashcardManager() {
  const [tab, setTab] = useState<'decks' | 'cards'>('decks');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [filterDeckId, setFilterDeckId] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [showDeckForm, setShowDeckForm] = useState(false);
  const [editDeck, setEditDeck] = useState<Deck | null>(null);
  const [deckForm, setDeckForm] = useState(emptyDeckForm);

  const [showCardForm, setShowCardForm] = useState(false);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [cardForm, setCardForm] = useState(emptyCardForm);

  const loadDecks = () => {
    adminService.getFlashcardDecks()
      .then((res) => setDecks(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadCards = (deckId?: string) => {
    adminService.getFlashcardCards(deckId)
      .then((res) => setCards(res.data || []))
      .catch(() => {});
  };

  useEffect(() => { loadDecks(); }, []);

  useEffect(() => {
    if (tab === 'cards') loadCards(filterDeckId || undefined);
  }, [tab, filterDeckId]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  // Deck handlers
  const openCreateDeck = () => { setEditDeck(null); setDeckForm(emptyDeckForm); setShowDeckForm(true); };
  const openEditDeck = (d: Deck) => { setEditDeck(d); setDeckForm({ subject: d.subject, subjectId: d.subjectId, icon: d.icon }); setShowDeckForm(true); };

  const handleSaveDeck = async () => {
    try {
      if (editDeck) {
        await adminService.updateFlashcardDeck(editDeck.id, deckForm);
        flash('Deck updated!');
      } else {
        await adminService.createFlashcardDeck(deckForm);
        flash('Deck created!');
      }
      setShowDeckForm(false);
      loadDecks();
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  const handleDeleteDeck = async (id: string) => {
    if (!confirm('Delete this deck and all its cards?')) return;
    try {
      await adminService.deleteFlashcardDeck(id);
      flash('Deck deleted.');
      loadDecks();
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  // Card handlers
  const openCreateCard = () => { setEditCard(null); setCardForm(emptyCardForm); setShowCardForm(true); };
  const openEditCard = (c: Card) => { setEditCard(c); setCardForm({ deckId: c.deckId, topic: c.topic, topicId: c.topicId, question: c.question, answer: c.answer, difficulty: c.difficulty }); setShowCardForm(true); };

  const handleSaveCard = async () => {
    try {
      if (editCard) {
        await adminService.updateFlashcardCard(editCard.id, cardForm);
        flash('Card updated!');
      } else {
        await adminService.createFlashcardCard(cardForm);
        flash('Card created!');
      }
      setShowCardForm(false);
      loadCards(filterDeckId || undefined);
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Delete this card?')) return;
    try {
      await adminService.deleteFlashcardCard(id);
      flash('Card deleted.');
      loadCards(filterDeckId || undefined);
    } catch (err: any) { flash(`Error: ${err.message}`); }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';
  const btnPrimary = 'px-4 py-2 rounded-lg text-white text-sm font-medium font-inter';
  const btnDanger = 'text-xs px-2 py-1 rounded text-[#EF4444] hover:bg-[#FEF2F2]';
  const btnEdit = 'text-xs px-2 py-1 rounded text-[#6366F1] hover:bg-[#EEF2FF]';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-inter font-bold text-[#111827]" style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}>
          Flashcard Manager
        </h1>
        <button
          onClick={tab === 'decks' ? openCreateDeck : openCreateCard}
          className={btnPrimary}
          style={{ background: '#6366F1' }}
        >
          {tab === 'decks' ? 'Add Deck' : 'Add Card'}
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-inter" style={{
          background: msg.startsWith('Error') ? '#FEF2F2' : '#ECFDF5',
          color: msg.startsWith('Error') ? '#991B1B' : '#065F46',
          border: `1px solid ${msg.startsWith('Error') ? '#FECACA' : '#A7F3D0'}`,
        }}>
          {msg}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['decks', 'cards'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2.5 text-sm font-medium font-inter capitalize transition-colors"
            style={{
              borderBottom: tab === t ? '2px solid #6366F1' : '2px solid transparent',
              color: tab === t ? '#6366F1' : '#6B7280',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Deck form modal */}
      {showDeckForm && (
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="font-inter font-semibold text-[#111827] mb-4">{editDeck ? 'Edit Deck' : 'Add Deck'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Subject Name *</label>
              <input value={deckForm.subject} onChange={(e) => setDeckForm({ ...deckForm, subject: e.target.value })}
                placeholder="e.g. Indian Polity" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Subject ID (slug) *</label>
              <input value={deckForm.subjectId} onChange={(e) => setDeckForm({ ...deckForm, subjectId: e.target.value })}
                placeholder="e.g. indian-polity" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Icon emoji</label>
              <input value={deckForm.icon} onChange={(e) => setDeckForm({ ...deckForm, icon: e.target.value })}
                placeholder="📚" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveDeck} className={btnPrimary} style={{ background: '#10B981' }}>
              {editDeck ? 'Save Changes' : 'Create Deck'}
            </button>
            <button onClick={() => setShowDeckForm(false)} className={btnPrimary} style={{ background: '#6B7280' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Card form modal */}
      {showCardForm && tab === 'cards' && (
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="font-inter font-semibold text-[#111827] mb-4">{editCard ? 'Edit Card' : 'Add Card'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Deck *</label>
              <select value={cardForm.deckId} onChange={(e) => setCardForm({ ...cardForm, deckId: e.target.value })}
                className={inputCls}>
                <option value="">Select deck...</option>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.subject}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Difficulty</label>
              <select value={cardForm.difficulty} onChange={(e) => setCardForm({ ...cardForm, difficulty: e.target.value })}
                className={inputCls}>
                {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Topic Name *</label>
              <input value={cardForm.topic} onChange={(e) => setCardForm({ ...cardForm, topic: e.target.value })}
                placeholder="e.g. Fundamental Rights" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Topic ID (slug) *</label>
              <input value={cardForm.topicId} onChange={(e) => setCardForm({ ...cardForm, topicId: e.target.value })}
                placeholder="e.g. fundamental-rights" className={inputCls} />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[#6B7280] mb-1">Question *</label>
            <textarea value={cardForm.question} onChange={(e) => setCardForm({ ...cardForm, question: e.target.value })}
              rows={3} className={inputCls} placeholder="Enter the question..." />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[#6B7280] mb-1">Answer *</label>
            <textarea value={cardForm.answer} onChange={(e) => setCardForm({ ...cardForm, answer: e.target.value })}
              rows={3} className={inputCls} placeholder="Enter the answer..." />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveCard} className={btnPrimary} style={{ background: '#10B981' }}>
              {editCard ? 'Save Changes' : 'Create Card'}
            </button>
            <button onClick={() => setShowCardForm(false)} className={btnPrimary} style={{ background: '#6B7280' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Decks tab */}
      {tab === 'decks' && (
        <div className="bg-white rounded-2xl" style={{ border: '1px solid #E5E7EB' }}>
          {loading ? (
            <p className="text-sm text-[#6B7280] py-12 text-center">Loading...</p>
          ) : decks.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-12 text-center">No decks yet. Click "Add Deck" to create one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  {['Icon', 'Subject', 'Subject ID', 'Cards', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decks.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td className="px-4 py-3 text-lg">{d.icon}</td>
                    <td className="px-4 py-3 font-medium text-[#111827]">{d.subject}</td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{d.subjectId}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{d._count?.cards ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditDeck(d)} className={btnEdit}>Edit</button>
                        <button onClick={() => handleDeleteDeck(d.id)} className={btnDanger}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Cards tab */}
      {tab === 'cards' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-[#6B7280]">Filter by deck:</label>
            <select value={filterDeckId} onChange={(e) => setFilterDeckId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All decks</option>
              {decks.map((d) => <option key={d.id} value={d.id}>{d.subject}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-2xl" style={{ border: '1px solid #E5E7EB' }}>
            {cards.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-12 text-center">No cards found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    {['Deck', 'Topic', 'Question', 'Difficulty', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td className="px-4 py-3 text-[#6B7280] text-xs">{c.deck?.subject ?? '—'}</td>
                      <td className="px-4 py-3 text-[#374151]">{c.topic}</td>
                      <td className="px-4 py-3 text-[#111827] max-w-xs">
                        <p className="truncate">{c.question}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          background: c.difficulty === 'Easy' ? '#ECFDF5' : c.difficulty === 'Hard' ? '#FEF2F2' : '#FFF7ED',
                          color: c.difficulty === 'Easy' ? '#065F46' : c.difficulty === 'Hard' ? '#991B1B' : '#92400E',
                        }}>
                          {c.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEditCard(c)} className={btnEdit}>Edit</button>
                          <button onClick={() => handleDeleteCard(c.id)} className={btnDanger}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
