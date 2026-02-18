
import { Database } from './database.types';

export enum View {
  Dashboard = 'DASHBOARD',
  Activities = 'ACTIVITIES',
  Goals = 'GOALS',
  Profile = 'PROFILE',
  Quiz = 'QUIZ',
  Rituals = 'RITUALS',
  SalsaDeck = 'SALSA_DECK',
  EmotionWheel = 'EMOTION_WHEEL',
  Workbook = 'WORKBOOK',
}

export interface SalsaCard {
  id: string;
  level: 'Mild' | 'Medium' | 'Hot';
  prompt: string;
  twist: string; // A follow-up or extra instruction
}

export interface RitualBlueprint {
  id: string;
  category: string;
  partnerAnswers: Record<string, string>; // userId -> answer mapping
  synthesis?: string;
  lastUpdated: number;
}

export interface UserData {
  id: string;
  userName: string;
  partnerName: string;
  yearsTogether: string;
  focusAreas: string[];
  partnerCode?: string;
  linkedPartnerId?: string;
  syncStatus: 'synced' | 'syncing' | 'offline';
  activeActivity?: Activity | null;
  vibe?: string;
  lastActive?: number;
  lastPulseReceived?: number;
  currentLessonId?: string | null;
  theme?: 'light' | 'midnight';
}

export interface BondScore {
  category: string;
  score: number;
  timestamp: number;
}

export interface GrowthLog {
  id: string;
  timestamp: number;
  category: string;
  delta: number;
  context: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'Reading' | 'Exercise' | 'Prompt';
  description: string;
  longContent: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'locked' | 'completed';
  content?: Lesson[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Activity {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  difficulty: string;
  isGenerated?: boolean;
  startTime?: number;
  reflection?: string;
  startedBy?: string;
}

export interface MicroStep {
  id: string;
  text: string;
  completed: boolean;
  lastUpdated: number;
  createdAt?: number;
}

export interface Goal {
  id: string;
  title: string;
  type: 'Individual' | 'Couple';
  progress: number;
  lastUpdated: number;
  createdAt?: number;
  microSteps?: MicroStep[];
  encouragement?: string;
  isStagnant?: boolean;
  pivotReason?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'open' | 'multiple_choice';
  options?: string[];
}

/**
 * Journaling & Memory Models
 */
export interface JournalEntry {
  id: string;
  authorId: string;
  author: string;
  authorImage?: string;
  date: string;
  timestamp: number;
  text: string;
  image?: string;
  themeTags?: string[];
}

/**
 * AI Synthesis Models
 */
export interface WeeklySynthesis {
  id: string;
  partnerCode: string;
  poem: string;
  insight: string;
  timestamp: number;
  readBy: string[];
}

export interface FoundationSummary {
  content: string;
  timestamp: number;
  entryCountAtSummary: number;
}

/**
 * Mapping Supabase Rows to Frontend Interfaces
 */
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type BondScoreRow = Database['public']['Tables']['bond_scores']['Row'];
export type GoalRow = Database['public']['Tables']['goals']['Row'];
export type GrowthLogRow = Database['public']['Tables']['growth_logs']['Row'];

/**
 * Global AI Result Wrapper
 */
export interface AiResult<T> {
  data: T | null;
  error: string | null;
}
