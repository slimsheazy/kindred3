
import React from 'react';

export enum View {
  Dashboard = 'DASHBOARD',
  Journal = 'JOURNAL',
  Activities = 'ACTIVITIES',
  Goals = 'GOALS',
  Profile = 'PROFILE',
  Mediation = 'MEDIATION',
  Quiz = 'QUIZ',
  EsotericLens = 'ESOTERIC_LENS',
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

export interface FoundationSummary {
  content: string;
  timestamp: number;
  entryCountAtSummary: number;
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
  duration: string;
  status: 'active' | 'locked' | 'completed';
  content?: Lesson[];
  rationale?: string; // AI attribution for why this was generated
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

export interface JournalEntry {
  id: string;
  authorId: string;
  author: string;
  authorImage: string;
  date: string;
  timestamp: number;
  text: string;
  image?: string;
  themeTags?: string[];
}

export interface MicroStep {
  id: string;
  text: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  type: 'Individual' | 'Couple';
  progress: number;
  lastUpdated: number;
  microSteps?: MicroStep[];
  encouragement?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'open' | 'multiple_choice';
  options?: string[];
}

export interface QuizSession {
  id: string;
  title: string;
  questions: QuizQuestion[];
  timestamp: number;
}

export interface WeeklySynthesis {
  id: string;
  partnerCode: string;
  poem: string;
  insight: string;
  timestamp: number;
  readBy: string[]; // User IDs who have seen it
}
