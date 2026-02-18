
import { Type } from "@google/genai";
import { MicroStep, Goal, QuizQuestion, Activity, AiResult, SalsaCard } from "../../types";
import { getAiClient, getCleanText, extractJson } from "./core";
import * as schemas from "../../lib/schemas";

export const generateEmotionSoulPrompt = async (emotion: string): Promise<AiResult<string>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user has identified their current state as: "${emotion}". 
      As a relationship coach, generate ONE deep, soulful reflection question that helps them explore this feeling 
      specifically in the context of their relationship. The question should be intimate and non-judgmental. 
      Return just the question string.`,
      config: { temperature: 0.9 }
    });
    return { data: getCleanText(response), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

export const generateSalsaCards = async (level: 'Mild' | 'Medium' | 'Hot'): Promise<AiResult<SalsaCard[]>> => {
  const ai = getAiClient();
  const promptContext = {
    Mild: "Lighthearted, playful, and curious questions that build friendship. Think 'Zesty'.",
    Medium: "Emotionally vulnerable, deep, and slightly provocative questions that build intimacy. Think 'Fuego'.",
    Hot: "Daring, passionate, and physically intimate questions or actions that build desire. Think 'Inferno'."
  }[level];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 unique relationship cards for the intensity level: "${level}". 
      Intensity Context: ${promptContext}
      Format: Return a JSON array of objects. Each object must have:
      - "id": a unique string
      - "level": "${level}"
      - "prompt": a compelling question or task
      - "twist": a surprising follow-up question or a specific instruction to heighten the moment.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              level: { type: Type.STRING, enum: ["Mild", "Medium", "Hot"] },
              prompt: { type: Type.STRING },
              twist: { type: Type.STRING }
            },
            required: ["id", "level", "prompt", "twist"]
          }
        }
      }
    });
    const raw = JSON.parse(extractJson(getCleanText(response)));
    return { data: raw, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

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
      contents: `Generate 5 insightful and collaborative questions for a couple's assessment about: "${topic}". 
      IMPORTANT: Draw from established relationship psychology frameworks like the Gottman Method, Attachment Theory, or Chapman's Love Languages. 
      Ensure questions are constructive, non-judgmental, and encourage shared reflection. 
      Include a mix of multiple choice and open-ended questions. Return as a JSON array.`, 
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["open", "multiple_choice"] },
              options: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["id", "question", "type"]
          }
        }
      } 
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
      contents: `Generate 3 high-quality relationship activities based on the vibe: "${vibe}". Return as JSON. 
      Each activity should be unique, engaging, and focused on building a deeper connection.`, 
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              duration: { type: Type.STRING },
              difficulty: { type: Type.STRING }
            },
            required: ["id", "title", "category", "description", "duration", "difficulty"]
          }
        }
      } 
    });
    const raw = JSON.parse(extractJson(getCleanText(response)));
    const data = schemas.ActivitiesResponseSchema.parse(raw);
    return { data, error: null };
  } catch (e: any) {
    console.error("Failed to generate activities:", e);
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
