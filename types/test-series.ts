// Test Series Type Definitions
// Based on RiseWithJeet Test Series Design

export type SeriesCategory = 
  | 'foundation' 
  | 'current-affairs' 
  | 'pyq' 
  | 'mock' 
  | 'mains' 
  | 'csat' 
  | 'gs' 
  | 'optional';

export type SeriesStatus = 
  | 'open' 
  | 'live' 
  | 'free' 
  | 'enrolling' 
  | 'upcoming';

export type TestStatus = 
  | 'open' 
  | 'live' 
  | 'done' 
  | 'upcoming' 
  | 'locked';

export type DifficultyLevel = 
  | 'Beginner' 
  | 'Intermediate' 
  | 'Advanced' 
  | 'Expert';

export interface TestSchedule {
  no: number;
  name: string;
  date: string;
  qs: number;
  dur: string;
  status: TestStatus;
  score: number | string | null;
}

export interface SyllabusModule {
  u: string; // Unit name
  sub: string; // Subtitle
  topics: string[];
}

export interface Review {
  name: string;
  rank: string;
  stars: number;
  text: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  city: string;
  score: number | null;
  acc: number | null;
  me: boolean;
}

export interface TestSeries {
  id: string;
  cat: SeriesCategory;
  name: string; // Hindi/display name
  nameEn: string; // English name
  tagline: string;
  icon: string;
  cardGrad: string; // CSS gradient for card header
  color: string; // Primary color
  colorBg: string; // Background tint color
  gradFrom: string; // Gradient start
  gradTo: string; // Gradient end
  tags: string[];
  diff: DifficultyLevel;
  tests: number;
  dur: string;
  enrolled: number;
  rating: number;
  reviewCount: number; // Number of reviews
  status: SeriesStatus;
  progress: number | null; // percentage or null if not enrolled
  price: number;
  oldPrice: number | null;
  features: string[];
  schedule: TestSchedule[];
  syllabus: SyllabusModule[];
  reviews: Review[];
  leaderboard: LeaderboardEntry[];
}

export interface Question {
  q: string;
  opts: string[];
  correct: number; // index of correct option
  exp: string; // explanation
}

export interface TestAttempt {
  seriesId: string;
  testId: string;
  questions: Question[];
  answers: Record<number, number>; // question index -> selected option index
  bookmarks: Record<number, boolean>; // question index -> bookmarked
  timeLeft: number; // seconds remaining
  startTime: Date;
}

export interface TestResult {
  seriesId: string;
  testId: string;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  totalMarks: number;
  percentage: number;
  rank: number | null;
  percentile: number | null;
  timeTaken: number; // seconds
  submittedAt: Date;
}

export interface PaymentInfo {
  seriesId: string;
  name: string;
  email: string;
  phone: string;
  agreedToTerms: boolean;
}

export interface FilterOption {
  id: string;
  label: string;
}

export const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'All Series' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'current-affairs', label: 'Current Affairs' },
  { id: 'pyq', label: 'PYQ' },
  { id: 'gs', label: 'GS Papers' },
  { id: 'mock', label: 'Full Mocks' },
  { id: 'mains', label: 'Mains' },
  { id: 'csat', label: 'CSAT' },
  { id: 'optional', label: 'Optional' },
];
