
import { GoogleGenAI, Type } from "@google/genai";
import { UserData, Activity, CourseModule, Lesson, QuizQuestion, MicroStep, JournalEntry, ChatMessage, BondScore, WeeklySynthesis, FoundationSummary, Goal } from "../types";
import { ENV } from "../lib/config";

const getAiClient = () => new GoogleGenAI({ apiKey: ENV.API_KEY });

export const getCoachingResponse = async (
  message: string, 
  history: ChatMessage[] = [],
  context?: { 
    journalEntries?: JournalEntry[]; 
    bondScores: BondScore[]; 
    foundationSummary?: string;
  }
): Promise<string> => {
    const ai = getAiClient();
    const contents = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: contents as any,
        config: { 
          systemInstruction: `You are Kindred, a soulful AI coach for couples.`, 
          temperature: 0.7 
        }
    });
    return response.text || "...";
};

// Additional functions for goals, microsteps, synthesis, etc.
export const generateGoalMicroSteps = async (goalTitle: string): Promise<MicroStep[]> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Break down: "${goalTitle}" into 4 micro-steps. Return JSON.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    const steps: string[] = JSON.parse(response.text || "[]");
    return steps.map((text, i) => ({ id: `s-${Date.now()}-${i}`, text, completed: false, lastUpdated: Date.now() }));
};
