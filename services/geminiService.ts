
import { getAiClient, getCleanText } from "./ai/core";
import { supabase } from "./supabase"; 
import { AiResult } from "../types";

export * from "./ai/coaching";
export * from "./ai/generation";
export * from "./ai/summaries";

export const getDailyPrompt = async (): Promise<AiResult<string>> => {
  try {
    const ai = getAiClient();
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: [{ role: 'user', parts: [{ text: "Generate one profound, open-ended reflection question for a couple. One sentence only." }] }],
      config: { 
        temperature: 0.8
      }
    });
    const text = getCleanText(result);
    return { data: text || "What do you appreciate about your partner today?", error: null };
  } catch (e: any) {
    return { data: "What do you appreciate about your partner today?", error: e.message };
  }
};

export const interpretQuizResults = async (title: string, userScores: any[], partnerScores: any[]): Promise<AiResult<string>> => {
  const ai = getAiClient();
  
  const context = {
    quiz: title,
    user: userScores.map(s => ({ cat: s.category, val: s.score })),
    partner: partnerScores.map(s => ({ cat: s.category, val: s.score }))
  };

  const prompt = `Interpret these relationship quiz results and provide a 2-sentence empathetic insight: ${JSON.stringify(context)}`;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    const insight = getCleanText(res);
    
    if (insight && supabase) {
      supabase.from('insights').insert({ title, content: insight }).then();
    }

    return { data: insight || "Reflecting on your connection...", error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};

export const generateLearningPath = async (): Promise<AiResult<any[]>> => {
  const ai = getAiClient();
  
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: "Generate 4 modules for a relationship growth path. Each with 'id', 'title', and 'description'. Return JSON.",
      config: { 
        responseMimeType: "application/json",
      }
    });
    const text = res.text || "[]";
    return { data: JSON.parse(text), error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
};
