'use client';

import React, { useState, useEffect } from 'react';
import { flashcardService } from '@/lib/services';

const SUBJECT_TO_ID: Record<string, string> = {
  'Indian Polity': 'polity',
  'Modern History': 'history',
  'Geography': 'geography',
  'Indian Economy': 'economy',
  'Science & Tech': 'science',
  'Environment': 'environment',
  'GS IV — Ethics': 'ethics',
  'Current Affairs': 'current-affairs',
  'Weak Topics': 'weak',
};

const subjectOptions = [
  'Indian Polity',
  'Modern History',
  'Geography',
  'Indian Economy',
  'Science & Tech',
  'Environment',
  'GS IV — Ethics',
  'Current Affairs',
  'Weak Topics',
];

const deckOptions = [
  'Indian Polity',
  'Modern History',
  'Geography',
  'Indian Economy',
  'Science & Tech',
  'Environment',
  'GS IV — Ethics',
  'Current Affairs',
  'Weak Topics',
];

const inputShadow = '0px 1px 3px 0px rgba(0,0,0,0.4), 0px 1px 2px -1px rgba(0,0,0,0.4)';

type Props = {
  open: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialDeck?: string;
  onCreated?: () => void;
};

export default function CreateFlashcardModal({ open, onClose, initialSubject, initialDeck, onCreated }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [subject, setSubject] = useState(initialSubject || '');
  const [deck, setDeck] = useState(initialDeck || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSubject(initialSubject ?? '');
      setDeck(initialDeck ?? '');
      setError('');
    }
  }, [open, initialSubject, initialDeck]);

  if (!open) return null;

  const getSubjectId = () => {
    const name = deck || subject;
    return SUBJECT_TO_ID[name] ?? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const doSave = async (): Promise<boolean> => {
    if (!question.trim() || !answer.trim()) {
      setError('Question and answer are required.');
      return false;
    }
    const subjectName = deck || subject;
    if (!subjectName) {
      setError('Please select a subject or deck.');
      return false;
    }
    setError('');
    setSaving(true);
    try {
      const res = await flashcardService.createCard({
        subjectId: getSubjectId(),
        subject: subjectName,
        question: question.trim(),
        answer: answer.trim(),
      });
      if (res.status === 'success') {
        onCreated?.();
        return true;
      }
      setError('Failed to save card. Please try again.');
      return false;
    } catch {
      setError('Failed to save card. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCard = async () => {
    const ok = await doSave();
    if (ok) onClose();
  };

  const handleSaveAndAddAnother = async () => {
    const ok = await doSave();
    if (ok) {
      setQuestion('');
      setAnswer('');
      setDeck('');
      setSubject(initialSubject ?? '');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-[16px] bg-white w-full max-w-[753px] overflow-hidden shadow-xl"
        style={{ padding: '32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2
            style={{
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: 24,
              lineHeight: '32px',
              letterSpacing: 0,
              color: '#101828',
            }}
          >
            🗂️ Create Flashcard
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{ background: '#F3F4F6', color: '#364153' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Question / Front */}
        <div className="space-y-3 mb-6">
          <label
            className="block uppercase tracking-[0.3px]"
            style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', color: '#4A5565' }}
          >
            Question / Front
          </label>
          <input
            type="text"
            placeholder="e.g. What is the Sarkaria Commission? What were its key recommendations?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-[10px] px-4 py-3 border outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent placeholder:text-[#4A5565]"
            style={{
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '20px',
              letterSpacing: 0,
              background: '#FFFFFF',
              border: '0.8px solid #E5E7EB',
              boxShadow: inputShadow,
              color: '#101828',
            }}
          />
        </div>

        {/* Answer / Back */}
        <div className="space-y-3 mb-6">
          <label
            className="block uppercase tracking-[0.3px]"
            style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', color: '#4A5565' }}
          >
            Answer / Back
          </label>
          <textarea
            placeholder="Write the answer, key points, or mnemonics..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            className="w-full rounded-[10px] px-4 py-3 border outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent resize-y placeholder:text-[#0A0A0A]/50"
            style={{
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '20px',
              letterSpacing: 0,
              background: '#FFFFFF',
              border: '0.8px solid #E5E7EB',
              boxShadow: inputShadow,
              color: '#101828',
            }}
          />
        </div>

        {/* Subject & Deck side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="space-y-3">
            <label
              className="block uppercase tracking-[0.3px]"
              style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', color: '#4A5565' }}
            >
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-[10px] px-4 py-2.5 border outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                background: '#FFFFFF',
                border: '0.8px solid #E5E7EB',
                boxShadow: inputShadow,
                color: '#101828',
              }}
            >
              <option value="">Select subject</option>
              {subjectOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label
              className="block uppercase tracking-[0.3px]"
              style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', color: '#4A5565' }}
            >
              Deck
            </label>
            <select
              value={deck}
              onChange={(e) => setDeck(e.target.value)}
              className="w-full rounded-[10px] px-4 py-2.5 border outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent"
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                background: '#FFFFFF',
                border: '0.8px solid #E5E7EB',
                boxShadow: inputShadow,
                color: '#101828',
              }}
            >
              <option value="">Select deck</option>
              {deckOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-[10px] px-5 py-2.5 border disabled:opacity-50"
            style={{
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: 14,
              lineHeight: '20px',
              letterSpacing: 0,
              textAlign: 'center',
              color: '#364153',
              background: '#FFFFFF',
              border: '0.8px solid #D1D5DC',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCard}
            disabled={saving}
            className="rounded-[10px] px-5 py-2.5 disabled:opacity-50"
            style={{
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 14,
              lineHeight: '20px',
              letterSpacing: 0,
              textAlign: 'center',
              color: '#FFFFFF',
              background: '#101828',
            }}
          >
            {saving ? 'Saving...' : 'Save Card'}
          </button>
          <button
            type="button"
            onClick={handleSaveAndAddAnother}
            disabled={saving}
            className="rounded-[10px] px-5 py-2.5 disabled:opacity-50"
            style={{
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 14,
              lineHeight: '20px',
              letterSpacing: 0,
              textAlign: 'center',
              color: '#101828',
              background: 'linear-gradient(90deg, #F3A301 0%, #FD7201 100%)',
            }}
          >
            {saving ? 'Saving...' : 'Save & Add Another'}
          </button>
        </div>
      </div>
    </div>
  );
}
