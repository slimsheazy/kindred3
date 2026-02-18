
// Fix: Importing Type from @google/genai as it is a library enum, not a local type.
import { Type } from "@google/genai";
import { AiResult } from "../../types";
import { getAiClient, getCleanText, extractJson } from "./core";

export const generateMediationDebrief = async (transcript: string): Promise<AiResult<string>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Synthesize a compassionate, professional, and insightful mediation debrief for this dialogue. Identify points of connection and paths forward: \n${transcript}`,
      config: { 
        systemInstruction: "You are Kindred, a world-class relationship mediator. Provide a concise reflection in markdown.",
        temperature: 0.7
      }
    });
    const text = getCleanText(response);
    return { data: text || "The dialogue has ended in peace.", error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

/**
 * Ritual Blueprint Synthesis
 */
export const synthesizeRitualBlueprints = async (category: string, myAnswers: any, partnerAnswers: any): Promise<AiResult<string>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze these separate relationship ritual blueprints for the category: "${category}". 
      Partner 1: ${JSON.stringify(myAnswers)}
      Partner 2: ${JSON.stringify(partnerAnswers)}
      
      Task: 
      1. Identify core alignment (where visions match).
      2. Identify creative friction (where preferences differ).
      3. Propose a "Unified Ritual Design" that honors both needs, specifically following Gottman Method principles for shared meaning.
      Use soulful, architectural language and markdown formatting.`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    const text = getCleanText(response);
    return { data: text || "Synthesis complete.", error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

/**
 * Weekly Reveal Synthesis
 */
export const generateWeeklySynthesis = async (entries: any[], activities: any[]): Promise<{ poem: string, insight: string }> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Synthesize the following shared memories and activities into a poetic weekly reveal. Include a short 'poem' and a deep 'insight'. Memories: ${JSON.stringify(entries)}. Activities: ${JSON.stringify(activities)}. Return JSON.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            poem: { type: Type.STRING },
            insight: { type: Type.STRING }
          },
          required: ["poem", "insight"]
        }
      }
    });
    return JSON.parse(extractJson(getCleanText(response)) || "{}");
  } catch (e) {
    return { poem: "A week of quiet growth.", insight: "Your bond continues to deepen." };
  }
};

/**
 * Archive Synthesis (Echoes)
 */
export const generateJournalEchoes = async (history: any[]): Promise<{ synthesis: string, themes: string[] }> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Synthesize these reflections into shared 'echoes' (a collective synthesis) and extract 3 recurring 'themes'. Reflections: ${JSON.stringify(history)}. Return JSON.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            synthesis: { type: Type.STRING },
            themes: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["synthesis", "themes"]
        }
      }
    });
    return JSON.parse(extractJson(getCleanText(response)) || "{}");
  } catch (e) {
    return { synthesis: "Quiet whispers of a shared journey.", themes: ["Connection"] };
  }
};

/**
 * Foundation Logic
 */
export const updateFoundationSummary = async (newEntries: any[], currentFoundation?: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Update the following relationship 'foundation' summary with these new reflections: \n\nExisting Foundation: ${currentFoundation || "N/A"}\n\nNew Reflections: ${JSON.stringify(newEntries)}. Provide a updated, concise 2-paragraph summary of their core connection.`,
    });
    return getCleanText(response) || currentFoundation || "The foundation is being built.";
  } catch (e) {
    return currentFoundation || "The foundation is stable.";
  }
};
