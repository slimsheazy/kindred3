
import { Type } from "@google/genai";
import { MicroStep, Goal, QuizQuestion, Activity, AiResult } from "../../types";
import { getAiClient, getCleanText, extractJson } from "./core";
import * as schemas from "../../lib/schemas";

export const generateGoalMicroSteps = async (goalTitle: string): Promise<AiResult<MicroStep[]>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: `Break down the following relationship goal into 4 actionable micro-steps: "${goalTitle}". Return a simple JSON array of strings.`, 
      config: { 
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      } 
    });
    const raw = JSON.parse(extractJson(getCleanText(response)));
    const steps = schemas.MicroStepsResponseSchema.parse(raw);
    const data = steps.map((text, i) => ({ 
      id: `s-${Date.now()}-${i}`, 
      text, 
      completed: false, 
      lastUpdated: Date.now() 
    }));
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

export const pivotGoalMicroSteps = async (goal: Goal): Promise<AiResult<{ steps: MicroStep[], reason: string }>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The following relationship goal has stalled: "${goal.title}". Suggest 4 new, refreshed micro-steps and provide a brief reason why this pivot helps. Return as JSON.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { 
            steps: { type: Type.ARRAY, items: { type: Type.STRING } }, 
            reason: { type: Type.STRING } 
          },
          required: ["steps", "reason"]
        }
      }
    });
    const raw = JSON.parse(extractJson(getCleanText(response)));
    const parsed = schemas.GoalPivotResponseSchema.parse(raw);
    const data = { 
      steps: parsed.steps.map((text, i) => ({ 
        id: `pivot-${Date.now()}-${i}`, 
        text: text, 
        completed: false, 
        lastUpdated: Date.now() 
      })),
      reason: parsed.reason 
    };
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

export const generateQuizQuestions = async (topic: string): Promise<AiResult<QuizQuestion[]>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: `Generate 5 insightful and collaborative questions for a couple's quiz about: "${topic}". Include multiple choice options where appropriate. Return as a JSON array.`, 
      config: { responseMimeType: "application/json" } 
    });
    const raw = JSON.parse(extractJson(getCleanText(response)));
    const data = schemas.QuizQuestionsResponseSchema.parse(raw);
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

export const generateActivities = async (vibe: string): Promise<AiResult<Activity[]>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Generate 3 high-quality relationship activities based on the vibe: "${vibe}". Return as JSON.`, 
      config: { responseMimeType: "application/json" } 
    });
    const raw = JSON.parse(extractJson(getCleanText(response)));
    const data = schemas.ActivitiesResponseSchema.parse(raw);
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

export const getGoalEncouragement = async (title: string, progress: number): Promise<AiResult<string>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The couple is working on the goal: "${title}". They are at ${progress}% progress. Give them one soulful, encouraging, and highly poetic sentence of support.`,
      config: { temperature: 0.9 }
    });
    const text = getCleanText(response);
    return { data: text || "Your journey together is the destination.", error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

/**
 * Esoteric / Visual Interpretations
 */
export const interpretSynchronicity = async (base64Image: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Describe the relationship metaphor or synchronicity hidden in this image for a couple. One poetic paragraph." }
          ]
        }
      ]
    });
    return getCleanText(response) || "A vision of connection.";
  } catch (e) {
    return "The lens is blurred.";
  }
};

/**
 * Utility: Tagging Reflections
 */
export const tagJournalEntry = async (text: string): Promise<string[]> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Extract 3 emotional themes as tags from this reflection: "${text}". Return as a JSON array of strings.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return JSON.parse(extractJson(getCleanText(response)) || "[]");
  } catch (e) {
    return ["Reflection"];
  }
};
