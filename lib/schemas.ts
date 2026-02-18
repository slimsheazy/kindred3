
import { z } from "zod";

/**
 * INPUT SCHEMAS (Forms)
 */
export const UserNameSchema = z.string().min(1, "Name is required").max(50);
export const EmailSchema = z.string().email("Invalid email address");
export const VibeSchema = z.string().min(1).max(30);
export const GoalTitleSchema = z.string().min(3, "Title too short").max(100);
export const ChatMessageSchema = z.string().min(1).max(1000);

// Fix: Add JournalTextSchema for validation
export const JournalTextSchema = z.string().min(3, "Reflection too short").max(5000);

export const OnboardingProfileSchema = z.object({
  userName: UserNameSchema,
  partnerName: UserNameSchema,
});

/**
 * API RESPONSE SCHEMAS (Gemini)
 */
export const MicroStepsResponseSchema = z.array(z.string());

export const GoalPivotResponseSchema = z.object({
  steps: z.array(z.string()),
  reason: z.string(),
});

export const QuizQuestionsResponseSchema = z.array(z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["open", "multiple_choice"]),
  options: z.array(z.string()).optional(),
}));

export const ActivitiesResponseSchema = z.array(z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string(),
  duration: z.string(),
  difficulty: z.string(),
}));

export const InteractionAnalysisResponseSchema = z.array(z.object({
  category: z.string(),
  delta: z.number(),
}));
