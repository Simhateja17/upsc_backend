// Canonical UPSC subject list with stable emoji icons used across the app.
// Priority order mirrors the "most-important-first" rule.

export const UPSC_SUBJECTS = [
  { id: 'polity', label: 'Polity', emoji: '🏛️', bg: '#EDE9FE', border: '#DDD6FE', color: '#7C3AED' },
  { id: 'economy', label: 'Economy', emoji: '💰', bg: '#FFF7ED', border: '#FED7AA', color: '#EA580C' },
  { id: 'geography', label: 'Geography', emoji: '🌍', bg: '#DBEAFE', border: '#BFDBFE', color: '#1D4ED8' },
  { id: 'environment', label: 'Environment', emoji: '🌱', bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A' },
  { id: 'history', label: 'History', emoji: '📜', bg: '#FEF3C7', border: '#FDE68A', color: '#B45309' },
  { id: 'science-tech', label: 'Science & Tech', emoji: '🔬', bg: '#DBEAFE', border: '#BFDBFE', color: '#0369A1' },
  { id: 'current-affairs', label: 'Current Affairs', emoji: '📰', bg: '#FEE2E2', border: '#FECACA', color: '#B91C1C' },
  { id: 'international-relations', label: 'International Relations', emoji: '🤝', bg: '#F3E8FF', border: '#E9D5FF', color: '#7C3AED' },
  { id: 'ethics', label: 'Ethics', emoji: '⚖️', bg: '#FCE7F3', border: '#FBCFE8', color: '#BE185D' },
  { id: 'society', label: 'Society', emoji: '👥', bg: '#ECFDF5', border: '#D1FAE5', color: '#065F46' },
  { id: 'agriculture', label: 'Agriculture', emoji: '🌾', bg: '#F7FEE7', border: '#BEF264', color: '#3F6212' },
  { id: 'disaster-management', label: 'Disaster Mgmt', emoji: '⚠️', bg: '#FEF3C7', border: '#FDE68A', color: '#92400E' },
] as const;

export const UPSC_SUBJECT_IDS = UPSC_SUBJECTS.map((s) => s.id);

export function getSubjectMeta(labelOrId: string) {
  const s = UPSC_SUBJECTS.find(
    (x) => x.id === labelOrId.toLowerCase() || x.label.toLowerCase() === labelOrId.toLowerCase()
  );
  return s;
}
